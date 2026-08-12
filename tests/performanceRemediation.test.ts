import assert from 'assert';
import { JobDispatcherFactory } from '../server/dispatchers/JobDispatcherFactory.js';
import { LocalJobDispatcher } from '../server/dispatchers/LocalJobDispatcher.js';
import { CloudTaskJobDispatcher } from '../server/dispatchers/CloudTaskJobDispatcher.js';
import { ValidationService } from '../server/services/ValidationService.js';
import { PDFDocument } from 'pdf-lib';

async function runPerformanceRemediationTests() {
  console.log('--- Running Section 7.6 Production Performance Remediation Verification ---');

  // Test 1: Job Dispatcher Abstraction & Factory Selection
  console.log('Test 1: Job Dispatcher Abstraction & Factory Selection...');
  delete process.env.CLOUD_TASKS_QUEUE;
  delete process.env.WORKER_ENDPOINT;

  const defaultDispatcher = JobDispatcherFactory.getDispatcher();
  assert.ok(defaultDispatcher instanceof LocalJobDispatcher, 'Default dispatcher without Cloud Tasks env vars must be LocalJobDispatcher');

  let dispatched = await defaultDispatcher.dispatch({
    jobId: 'test_job_1',
    ownerId: 'test_owner_1',
    operation: 'compress'
  });
  assert.strictEqual(dispatched, true, 'LocalJobDispatcher.dispatch must return true');
  console.log('✅ Test 1 Passed: Job Dispatcher default local fallback verified.');

  // Test 2: Validation Service Fast Integrity Check
  console.log('Test 2: Validation Service single-pass PDF integrity check...');
  const doc = await PDFDocument.create();
  doc.addPage([600, 400]);
  const pdfBytes = Buffer.from(await doc.save());

  const checkResult = await ValidationService.checkEncryptionAndIntegrity(pdfBytes);
  assert.strictEqual(checkResult.pageCount, 1, 'Pre-check must detect 1 page');
  assert.strictEqual(checkResult.isEncrypted, false, 'Pre-check must detect unencrypted state');
  console.log('✅ Test 2 Passed: Single-pass PDF pre-check verified.');

  // Test 3: Output Validation Sampling Strategy
  console.log('Test 3: Output validation page dimension sampling...');
  const multiPageDoc = await PDFDocument.create();
  for (let i = 0; i < 10; i++) {
    multiPageDoc.addPage([500, 500]);
  }
  const multiPageBytes = Buffer.from(await multiPageDoc.save());

  const isValidOutput = await ValidationService.validateCompressedOutput(multiPageBytes, 10);
  assert.strictEqual(isValidOutput, true, 'Multi-page document output validation must pass');
  console.log('✅ Test 3 Passed: Output validation sampling verified.');

  console.log('\n🎉 ALL SECTION 7.6 PERFORMANCE REMEDIATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
}

runPerformanceRemediationTests().catch((err) => {
  console.error('❌ Performance remediation tests failed:', err);
  process.exit(1);
});
