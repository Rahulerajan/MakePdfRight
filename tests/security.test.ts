import assert from 'assert';
import { StorageService } from '../server/services/StorageService';
import { ValidationService } from '../server/services/ValidationService';
import { JobService } from '../server/services/JobService';

async function runSecurityTests() {
  console.log('--- Running Security Unit Tests ---');

  // Test 1: StorageService Path Traversal Prevention
  console.log('Test 1: Path Traversal Prevention...');
  assert.strictEqual(StorageService.isPathContained('../../../etc/passwd'), false, 'Directory traversal relative path must be rejected');
  assert.strictEqual(StorageService.isPathContained('/etc/passwd'), false, 'Absolute path outside tempDir must be rejected');
  
  const validTempPath = StorageService.writeTempFile(Buffer.from('hello pdf'), 'sample.pdf');
  assert.strictEqual(StorageService.isPathContained(validTempPath), true, 'Valid temp path must be allowed');
  StorageService.deleteTempFile(validTempPath);
  console.log('✅ Test 1 Passed: Path traversal prevention works as expected.');

  // Test 2: ValidationService Base64 & Magic Bytes Checks
  console.log('Test 2: ValidationService Magic Bytes & Base64 Checks...');
  assert.throws(() => {
    ValidationService.validateStrictBase64('invalid base64!!!');
  }, /Invalid Base64 encoding/, 'Invalid base64 characters must be rejected');

  const pdfHeaderBuf = Buffer.from('%PDF-1.7 sample data');
  assert.doesNotThrow(() => {
    ValidationService.validateMagicBytes(pdfHeaderBuf, 'pdf');
  }, 'Valid PDF magic bytes must pass');

  const fakePdfBuf = Buffer.from('NOT_A_PDF_DATA');
  assert.throws(() => {
    ValidationService.validateMagicBytes(fakePdfBuf, 'pdf');
  }, /Invalid PDF file/, 'Non-PDF magic bytes must be rejected');

  const pngMagicBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.doesNotThrow(() => {
    ValidationService.validateMagicBytes(pngMagicBuf, 'image');
  }, 'Valid PNG magic bytes must pass');

  console.log('✅ Test 2 Passed: Magic bytes and Base64 validation work as expected.');

  // Test 3: JobService Ownership & Cryptographic UUID Isolation
  console.log('Test 3: JobService Ownership Isolation & Cryptographic UUIDs...');
  const user1 = 'usr_owner_111';
  const user2 = 'usr_owner_222';

  const job1 = await JobService.createJob('compress', user1);
  assert.ok(job1.id.length >= 32, 'Job ID must be a secure UUID');
  
  // User 1 should retrieve job 1
  const retrievedByUser1 = await JobService.getJob(job1.id, user1);
  assert.ok(retrievedByUser1, 'Owner 1 must be able to retrieve their own job');
  assert.strictEqual(retrievedByUser1.id, job1.id);

  // User 2 should NOT retrieve job 1
  const retrievedByUser2 = await JobService.getJob(job1.id, user2);
  assert.strictEqual(retrievedByUser2, null, 'Owner 2 MUST NOT be able to retrieve Owner 1 job');

  // User 2 cannot cancel User 1 job
  const cancelResult = await JobService.cancelJob(job1.id, user2);
  assert.strictEqual(cancelResult, false, 'Owner 2 MUST NOT be able to cancel Owner 1 job');

  // User 1 cancels job 1
  const validCancel = await JobService.cancelJob(job1.id, user1);
  assert.strictEqual(validCancel, true, 'Owner 1 must be able to cancel their job');

  console.log('✅ Test 3 Passed: Job ownership isolation and security verified.');

  // Test 4: Payload Boundary Validation
  console.log('Test 4: Input Boundary Payload Validation...');
  assert.throws(() => {
    ValidationService.validateMergeFilesPayload(new Array(25).fill({ name: 'doc.pdf', data: 'A' }));
  }, /Cannot merge more than 20 PDF documents/, 'Oversized merge file count must be rejected');

  assert.throws(() => {
    ValidationService.validateWatermarkText('A'.repeat(250));
  }, /Watermark text must not exceed 200 characters/, 'Oversized watermark text must be rejected');

  assert.throws(() => {
    ValidationService.validateTextPrompt('A'.repeat(2500), 2000);
  }, /Prompt length exceeds maximum allowable limit/, 'Oversized prompt text must be rejected');

  console.log('✅ Test 4 Passed: Input boundary payload validation works as expected.');

  console.log('\n🎉 ALL SECURITY UNIT TESTS PASSED SUCCESSFULLY! 🎉\n');
  process.exit(0);
}

runSecurityTests().catch((err) => {
  console.error('❌ Security unit tests failed:', err);
  process.exit(1);
});
