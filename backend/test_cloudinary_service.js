import { validateBase64Image, isCloudinaryConfigured, uploadImage } from './src/services/cloudinaryService.js';
import assert from 'assert';

console.log('🧪 Starting Cloudinary Storage & Image Service Unit Tests...\n');

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`, err.message);
    failed++;
  }
};

const runSuite = async () => {
  // Test 1: Empty payload rejected
  await test('Reject empty or non-string image data', () => {
    try {
      validateBase64Image(null);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Image data is required/i);
    }
  });

  // Test 2: Invalid Data URI scheme rejected
  await test('Reject malformed data URI scheme', () => {
    try {
      validateBase64Image('not-a-valid-data-uri');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Invalid image format/i);
    }
  });

  // Test 3: Unsupported MIME type rejected (e.g., text/plain, image/gif, application/pdf)
  await test('Reject unsupported MIME type (text/plain)', () => {
    try {
      validateBase64Image('data:text/plain;base64,SGVsbG8gV29ybGQ=');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Unsupported image format/i);
    }
  });

  // Test 4: Oversized image rejected (>5MB)
  await test('Reject image exceeding 5MB payload', () => {
    const hugeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a'); // 6MB
    const hugeBase64 = `data:image/png;base64,${hugeBuffer.toString('base64')}`;
    try {
      validateBase64Image(hugeBase64);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /exceeds maximum limit of 5MB/i);
    }
  });

  // Test 5: Valid PNG image passes validation
  await test('Validate legitimate 1x1 PNG data URI', () => {
    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = validateBase64Image(samplePng);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.mimeType, 'image/png');
    assert.strictEqual(result.ext, 'png');
    assert.ok(result.buffer.length > 0);
  });

  // Test 6: Valid JPEG image passes validation
  await test('Validate legitimate JPEG data URI with correct extension', () => {
    const sampleJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const result = validateBase64Image(sampleJpeg);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.strictEqual(result.ext, 'jpg');
  });

  // Test 7: Cloudinary configuration detector
  await test('isCloudinaryConfigured returns boolean flag accurately', () => {
    const configured = isCloudinaryConfigured();
    assert.strictEqual(typeof configured, 'boolean');
  });

  // Test 8: uploadImage handles image and returns standard response contract
  await test('uploadImage executes and returns standard image response contract', async () => {
    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await uploadImage(samplePng, { folder: 'test_folder' });
    assert.strictEqual(res.success, true);
    assert.ok(typeof res.imageUrl === 'string' && res.imageUrl.length > 0);
    assert.ok(['cloudinary', 'local'].includes(res.provider));
  });

  console.log('\n========================================');
  console.log(`🏁 CLOUDINARY UNIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
