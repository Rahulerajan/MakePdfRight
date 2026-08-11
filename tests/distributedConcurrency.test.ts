import assert from 'assert';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { StorageJobStore } from '../server/storage/StorageJobStore.js';
import { WorkerService } from '../server/services/WorkerService.js';
import { LocalStorageProvider } from '../server/storage/LocalStorageProvider.js';
import { StorageService } from '../server/services/StorageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Child process worker entry point for multi-process Cloud Run simulation
if (process.argv[2] === '--child-worker') {
  const jobId = process.argv[3];
  const ownerId = process.argv[4];
  const workerId = process.argv[5];

  const store = new StorageJobStore();
  
  store.claimJob(jobId, ownerId, workerId, 30000)
    .then((result) => {
      if (process.send) {
        process.send({ workerId, success: result.success, version: result.job?.version });
      }
      process.exit(0);
    })
    .catch((err) => {
      if (process.send) {
        process.send({ workerId, success: false, error: err.message });
      }
      process.exit(1);
    });
} else {
  // Main test suite runner
  runDistributedConcurrencyTests().catch((err) => {
    console.error('❌ Distributed Concurrency tests failed:', err);
    process.exit(1);
  });
}

async function runDistributedConcurrencyTests() {
  console.log('--- Running Section 4.2 Distributed Worker Locking & Conditional Write Tests ---');

  const ownerId = 'usr_dist_test';
  const store = new StorageJobStore();
  WorkerService.setStore(store);

  // Test 1: Conditional Claim Success & Version Counter Increment
  console.log('Test 1: Conditional claim success and version increment...');
  const job1 = await store.createJob({
    ownerId,
    operation: 'compress',
    payload: { level: 'recommended' }
  });

  assert.strictEqual(job1.version, 1, 'Initial job version must be 1');

  const claim1 = await store.claimJob(job1.id, ownerId, 'worker_1', 30000);
  assert.strictEqual(claim1.success, true, 'Worker 1 should claim job successfully');
  assert.ok(claim1.job, 'Claimed job must be returned');
  assert.strictEqual(claim1.job.version, 2, 'Claimed job version must increment to 2');
  console.log('✅ Test 1 Passed: Conditional claim succeeded with version incremented from 1 to 2.');

  // Test 2: Conditional Claim Conflict & Version Mismatch Rejection
  console.log('Test 2: Version mismatch rejection on concurrent update...');
  const job2 = await store.createJob({
    ownerId,
    operation: 'rotate',
    payload: { angle: 90 }
  });

  // Manually modify underlying storage to simulate a concurrent worker version bump
  const provider = StorageService.getStorageProvider();
  const key = `users/${ownerId}/jobs/${job2.id}.json`;
  const staleVersion = job2.version || 1;

  // Simulate another instance bumping version to 5 behind our back
  const modifiedJob = { ...job2, status: 'processing', workerId: 'worker_fast', version: 5 };
  await provider.upload(key, Buffer.from(JSON.stringify(modifiedJob, null, 2), 'utf-8'));

  // Now attempt to update or claim assuming version 1
  const claimConflict = await store.claimJob(job2.id, ownerId, 'worker_slow', 30000);
  assert.strictEqual(claimConflict.success, false, 'Claim MUST fail due to version mismatch precondition error');
  console.log('✅ Test 2 Passed: Version mismatch conflict correctly rejected claim.');

  // Test 3: Multi-Process Simulation (10 Independent Child Processes / Cloud Run Instances)
  console.log('Test 3: Simulating 10 independent child worker processes claiming the same queued job...');
  const multiProcessJob = await store.createJob({
    ownerId,
    operation: 'merge',
    payload: {}
  });

  const workerCount = 10;
  const childPromises: Promise<{ workerId: string; success: boolean }>[] = [];

  for (let i = 0; i < workerCount; i++) {
    const workerId = `cloudrun_instance_${i + 1}`;
    const p = new Promise<{ workerId: string; success: boolean }>((resolve) => {
      const child = fork(__filename, ['--child-worker', multiProcessJob.id, ownerId, workerId]);
      child.on('message', (msg: any) => resolve(msg));
      child.on('error', () => resolve({ workerId, success: false }));
    });
    childPromises.push(p);
  }

  const results = await Promise.all(childPromises);
  const successfulClaims = results.filter(r => r.success);
  const failedClaims = results.filter(r => !r.success);

  assert.strictEqual(successfulClaims.length, 1, 'EXACTLY ONE independent worker process must claim the job');
  assert.strictEqual(failedClaims.length, workerCount - 1, 'All other 9 independent worker processes must fail claim');

  const winner = successfulClaims[0];
  console.log(`✅ Test 3 Passed: Multi-process simulation verified! Winner: ${winner.workerId}, 9 processes rejected.`);

  // Test 4: Lease Renewal Rejection After Reclaim by Another Worker
  console.log('Test 4: Lease renewal rejection after job reclaimed by Worker B...');
  const reclaimJob = await store.createJob({
    ownerId,
    operation: 'watermark',
    payload: { text: 'CONFIDENTIAL' }
  });

  const workerA = 'worker_A_stale';
  const workerB = 'worker_B_reclaimer';

  // Worker A claims job with short 10ms lease
  const claimA = await store.claimJob(reclaimJob.id, ownerId, workerA, 10);
  assert.strictEqual(claimA.success, true);

  // Wait 30ms for lease to expire
  await new Promise(r => setTimeout(r, 30));

  // Worker B reclaims job
  const claimB = await store.claimJob(reclaimJob.id, ownerId, workerB, 30000);
  assert.strictEqual(claimB.success, true, 'Worker B reclaims expired lease job');

  // Worker A attempts lease renewal
  const renewalA = await store.renewLease(reclaimJob.id, ownerId, workerA, 60000);
  assert.strictEqual(renewalA, false, 'Stale Worker A MUST NOT be allowed to renew lease after Worker B reclaimed job');
  console.log('✅ Test 4 Passed: Lease renewal rejection after reclaim verified.');

  // Test 5: Stale Worker Completion & Output Publication Rejection
  console.log('Test 5: Stale worker completion and output publication rejection...');
  const staleWorkerCompletion = await store.completeJobWithLeaseCheck(reclaimJob.id, ownerId, workerA, {
    status: 'completed',
    outputObjectKey: 'users/usr_dist_test/stale_output.pdf',
    result: { corrupt: true }
  });

  assert.strictEqual(staleWorkerCompletion, null, 'Stale Worker A completion MUST be rejected');

  // Verify Worker B can legitimately complete job
  const validCompletion = await store.completeJobWithLeaseCheck(reclaimJob.id, ownerId, workerB, {
    status: 'completed',
    outputObjectKey: 'users/usr_dist_test/valid_output.pdf',
    result: { success: true }
  });

  assert.ok(validCompletion, 'Active lease holder Worker B must complete job');
  assert.strictEqual(validCompletion?.outputObjectKey, 'users/usr_dist_test/valid_output.pdf');
  console.log('✅ Test 5 Passed: Stale worker completion and output publication prevention verified.');

  // Test 6: Fail-Closed Storage Provider Fallback Check
  console.log('Test 6: Fail-closed check when storage provider does not support conditional writes...');
  class UnsupportedStorageProvider extends LocalStorageProvider {
    supportsConditionalWrites(): boolean {
      return false;
    }
  }

  StorageService.setStorageProvider(new UnsupportedStorageProvider());

  try {
    const unsuppJob = {
      id: 'job_test_fail_closed',
      ownerId,
      operation: 'compress',
      status: 'queued' as const,
      progress: 0,
      createdAt: new Date().toISOString()
    };
    // Attempting to persist job on an unsupported provider must throw
    await (store as any).persistJob(unsuppJob);
    assert.fail('Should have thrown AppError when conditional writes are unsupported');
  } catch (err: any) {
    assert.ok(
      err.message?.includes('Configuration Error') || err.message?.includes('requires a storage provider'),
      `Must throw clear configuration error, got: ${err.message}`
    );
    assert.strictEqual(err.statusCode || err.status, 500);
    console.log('✅ Test 6 Passed: Fail-closed configuration check verified when conditional writes are unsupported.');
  }

  // Restore LocalStorageProvider
  StorageService.setStorageProvider(new LocalStorageProvider());

  console.log('\n🎉 ALL SECTION 4.2 DISTRIBUTED WORKER LOCKING & CONDITIONAL WRITE TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
}
