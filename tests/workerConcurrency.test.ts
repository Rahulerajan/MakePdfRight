import assert from 'assert';
import test from 'node:test';
import { StorageJobStore } from '../server/storage/StorageJobStore.js';
import { WorkerService } from '../server/services/WorkerService.js';

test('Worker Concurrency & Lease Claiming Tests', async () => {
  console.log('--- Running Section 4.1 Worker Concurrency & Lease Claiming Tests ---');

  const ownerId = 'usr_concurrency_test';
  const store = new StorageJobStore();
  WorkerService.setStore(store);

  // Test 1: 10 Concurrent Workers Attempting to Claim the Same Queued Job
  console.log('Test 1: 10 Concurrent workers claiming the same queued job...');
  const job1 = await store.createJob({
    ownerId,
    operation: 'compress',
    payload: { level: 'recommended' }
  });

  const workerIds = Array.from({ length: 10 }, (_, i) => `worker_instance_${i + 1}`);

  // All 10 workers attempt claim concurrently
  const claimPromises = workerIds.map(wId => store.claimJob(job1.id, ownerId, wId, 30000));
  const claimResults = await Promise.all(claimPromises);

  const successfulClaims = claimResults.filter(r => r.success);
  const failedClaims = claimResults.filter(r => !r.success);

  assert.strictEqual(successfulClaims.length, 1, 'EXACTLY ONE worker must successfully claim the queued job');
  assert.strictEqual(failedClaims.length, 9, 'All other 9 workers must have their claims rejected');

  const winningWorker = successfulClaims[0].job?.workerId;
  assert.ok(winningWorker, 'Winning job must have workerId recorded');
  console.log(`✅ Test 1 Passed: Exactly 1 worker (${winningWorker}) claimed job out of 10 concurrent attempts.`);

  // Test 2: Lease Renewal / Heartbeat Mechanism
  console.log('Test 2: Lease renewal / heartbeat extension...');
  const activeWorkerId = winningWorker!;
  const originalJob = await store.getJob(job1.id, ownerId, true);
  const initialLeaseExpiresAt = originalJob?.leaseExpiresAt;

  // Renew lease
  const renewed = await store.renewLease(job1.id, ownerId, activeWorkerId, 60000);
  assert.strictEqual(renewed, true, 'Active lease holder must be able to renew lease');

  const renewedJob = await store.getJob(job1.id, ownerId, true);
  assert.ok(
    new Date(renewedJob!.leaseExpiresAt!).getTime() > new Date(initialLeaseExpiresAt!).getTime(),
    'Lease expiration time must be extended after renewal'
  );

  // Unauthorized worker cannot renew lease
  const unauthorizedRenewal = await store.renewLease(job1.id, ownerId, 'unauthorized_worker_999', 60000);
  assert.strictEqual(unauthorizedRenewal, false, 'Non-owner worker MUST NOT be able to renew lease');
  console.log('✅ Test 2 Passed: Worker heartbeat lease renewal verified.');

  // Test 3: Crash Recovery & Expired Lease Reclaim
  console.log('Test 3: Crash recovery and reclaiming expired lease...');
  const crashJob = await store.createJob({
    ownerId,
    operation: 'merge',
    payload: {}
  });

  const workerA = 'worker_A_crashed';
  const workerB = 'worker_B_recoverer';

  // Worker A claims job with a very short lease (10ms)
  const claimA = await store.claimJob(crashJob.id, ownerId, workerA, 10); // 10ms lease
  assert.strictEqual(claimA.success, true, 'Worker A claims job');

  // Wait 50ms for Worker A lease to expire
  await new Promise(r => setTimeout(r, 50));

  // Worker B claims expired lease job
  const claimB = await store.claimJob(crashJob.id, ownerId, workerB, 30000);
  assert.strictEqual(claimB.success, true, 'Worker B MUST be able to reclaim job with expired lease');
  assert.strictEqual(claimB.job?.workerId, workerB, 'Worker ID must now be Worker B');

  // Worker A attempts to complete the job after losing lease
  const workerACompletion = await store.completeJobWithLeaseCheck(crashJob.id, ownerId, workerA, {
    status: 'completed',
    result: { output: 'fake_output_from_crashed_worker_A' }
  });
  assert.strictEqual(workerACompletion, null, 'Crashed Worker A MUST NOT be allowed to mark job completed after losing lease');

  // Worker B completes the job successfully
  const workerBCompletion = await store.completeJobWithLeaseCheck(crashJob.id, ownerId, workerB, {
    status: 'completed',
    result: { output: 'valid_output_from_worker_B' }
  });
  assert.ok(workerBCompletion, 'Worker B must successfully complete job');
  assert.strictEqual(workerBCompletion?.status, 'completed');
  assert.strictEqual(workerBCompletion?.result.output, 'valid_output_from_worker_B');
  console.log('✅ Test 3 Passed: Crash recovery and stale worker protection verified.');

  // Test 4: Output Race Protection & Duplicate Completion Rejection
  console.log('Test 4: Output race protection & duplicate completion rejection...');
  const raceJob = await store.createJob({
    ownerId,
    operation: 'compress',
    payload: { level: 'recommended' }
  });

  const worker1 = 'worker_race_1';
  const worker2 = 'worker_race_2';

  const claimRace1 = await store.claimJob(raceJob.id, ownerId, worker1, 30000);
  assert.strictEqual(claimRace1.success, true);

  // Worker 1 completes job
  const complete1 = await store.completeJobWithLeaseCheck(raceJob.id, ownerId, worker1, {
    status: 'completed',
    result: { output: 'valid_output_1' }
  });
  assert.ok(complete1);

  // Worker 2 attempts duplicate completion
  const complete2 = await store.completeJobWithLeaseCheck(raceJob.id, ownerId, worker2, {
    status: 'completed',
    result: { output: 'corrupted_output_2' }
  });
  assert.strictEqual(complete2, null, 'Duplicate completion by non-lease holder worker 2 MUST be rejected');

  console.log('✅ Test 4 Passed: Output race protection and duplicate completion rejection verified.');

  console.log('\n🎉 ALL SECTION 4.1 WORKER CONCURRENCY & CLAIMING TESTS PASSED SUCCESSFULLY! 🎉\n');
});
