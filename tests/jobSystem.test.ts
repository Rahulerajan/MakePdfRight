import assert from 'assert';
import { StorageJobStore } from '../server/storage/StorageJobStore.js';
import { JobService } from '../server/services/JobService.js';
import { WorkerService } from '../server/services/WorkerService.js';
import { StorageService } from '../server/services/StorageService.js';
import { isValidJobTransition } from '../server/storage/IJobStore.js';

async function runJobSystemTests() {
  console.log('--- Running Section 4 Job Queue & Worker Unit Tests ---');

  const ownerA = 'usr_test_owner_A';
  const ownerB = 'usr_test_owner_B';

  // Test 1: Job Creation & Persistent Store
  console.log('Test 1: Job creation and persistence...');
  const storeInstance1 = new StorageJobStore();
  const job1 = await storeInstance1.createJob({
    ownerId: ownerA,
    operation: 'compress',
    payload: { level: 'recommended' }
  });

  assert.ok(job1.id, 'Job must have a valid ID');
  assert.strictEqual(job1.status, 'queued', 'Initial job status must be queued');
  assert.strictEqual(job1.ownerId, ownerA, 'Owner ID must match creator');
  console.log('✅ Test 1 Passed: Job creation and persistence succeeded.');

  // Test 2: Process Restart Test (Process/Runtime Re-initialization)
  console.log('Test 2: Process restart persistence test (Request A -> process restart -> Request B)...');
  // Simulate process termination by instantiating a completely new StorageJobStore instance without in-memory state
  const storeInstance2 = new StorageJobStore();
  const retrievedAfterRestart = await storeInstance2.getJob(job1.id, ownerA);

  assert.ok(retrievedAfterRestart, 'Job MUST be retrievable from persistent storage after process restart');
  assert.strictEqual(retrievedAfterRestart.id, job1.id, 'Retrieved job ID must match original job ID');
  assert.strictEqual(retrievedAfterRestart.status, 'queued', 'Status must be restored from persistent store');
  console.log('✅ Test 2 Passed: Job survived process restart successfully.');

  // Test 3: Ownership Protection & IDOR Isolation
  console.log('Test 3: Ownership protection and authorization isolation...');
  const unauthorizedAccess = await storeInstance2.getJob(job1.id, ownerB);
  assert.strictEqual(unauthorizedAccess, null, 'Unauthorized user (Owner B) MUST NOT be able to access Owner A job');

  const unauthorizedCancel = await storeInstance2.cancelJob(job1.id, ownerB);
  assert.strictEqual(unauthorizedCancel, false, 'Unauthorized user MUST NOT be able to cancel Owner A job');
  console.log('✅ Test 3 Passed: Job ownership protection verified.');

  // Test 4: Job State Machine Transitions
  console.log('Test 4: Job state machine transition validation...');
  assert.strictEqual(isValidJobTransition('queued', 'processing'), true, 'queued -> processing valid');
  assert.strictEqual(isValidJobTransition('processing', 'completed'), true, 'processing -> completed valid');
  assert.strictEqual(isValidJobTransition('processing', 'failed'), true, 'processing -> failed valid');
  assert.strictEqual(isValidJobTransition('completed', 'processing'), false, 'completed -> processing MUST be rejected');
  assert.strictEqual(isValidJobTransition('cancelled', 'completed'), false, 'cancelled -> completed MUST be rejected');

  await assert.rejects(async () => {
    await storeInstance2.updateJob(job1.id, ownerA, { status: 'completed' });
    await storeInstance2.updateJob(job1.id, ownerA, { status: 'processing' });
  }, /Invalid job state transition/, 'Forbidden state transition must throw AppError');
  console.log('✅ Test 4 Passed: Strict state machine transitions enforced.');

  // Test 5: Idempotency Key Duplicate Prevention
  console.log('Test 5: Idempotency Key protection...');
  const idemKey = `idem_test_${Date.now()}`;
  const jobSub1 = await storeInstance2.createJob({
    ownerId: ownerA,
    operation: 'compress',
    payload: { level: 'extreme' }
  }, idemKey);

  const jobSub2 = await storeInstance2.createJob({
    ownerId: ownerA,
    operation: 'compress',
    payload: { level: 'extreme' }
  }, idemKey);

  assert.strictEqual(jobSub1.id, jobSub2.id, 'Duplicate request with same idempotency key must return same job instance');
  console.log('✅ Test 5 Passed: Idempotency protection verified.');

  // Test 6: Job Cancellation
  console.log('Test 6: Job cancellation handling...');
  const cancelJob = await storeInstance2.createJob({
    ownerId: ownerA,
    operation: 'merge',
    payload: {}
  });

  const cancelledOk = await storeInstance2.cancelJob(cancelJob.id, ownerA);
  assert.strictEqual(cancelledOk, true, 'Queued job must be cancellable');

  const cancelledJobState = await storeInstance2.getJob(cancelJob.id, ownerA);
  assert.strictEqual(cancelledJobState?.status, 'cancelled', 'Cancelled job status must be cancelled');
  console.log('✅ Test 6 Passed: Job cancellation works as expected.');

  // Test 7: Stale Job Recovery & Retry Handling
  console.log('Test 7: Stale job recovery and retry limits...');
  const staleJob = await storeInstance2.createJob({
    ownerId: ownerA,
    operation: 'compress',
    payload: {}
  });

  // Manually set workerStartedAt to 10 minutes ago
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await storeInstance2.updateJob(staleJob.id, ownerA, {
    status: 'processing',
    workerStartedAt: tenMinsAgo,
    attemptCount: 1
  });

  WorkerService.setStore(storeInstance2);
  await WorkerService.sweepStaleJobs();

  const recoveredJob = await storeInstance2.getJob(staleJob.id, ownerA);
  assert.strictEqual(recoveredJob?.status, 'queued', 'Stale job with attemptCount < 3 must be reset to queued for retry');
  console.log('✅ Test 7 Passed: Stale job recovery succeeded.');

  console.log('\n🎉 ALL SECTION 4 JOB QUEUE TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
}

runJobSystemTests().catch((err) => {
  console.error('❌ Job Queue unit tests failed:', err);
  process.exit(1);
});
