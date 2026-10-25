import { test } from '@japa/runner'

// Reasons are real Cloudinary fetch errors seen when importing from links.
test.group('FileService.importErrorMessage', () => {
  test('explains each kind of failed link import', async ({ assert }) => {
    const { default: FileService } = await import('#services/file_service')
    const cases: [string, string][] = [
      ['Resource not found - Error in loading https://example.com/ - HTML response', 'web page'],
      ['Raw file format svg not allowed', 'not a supported image'],
      [
        'Error in loading https://upload.wikimedia.org/x.jpg - 429 Too Many Requests',
        'download the image',
      ],
      ['Resource not found - https://example.com/missing.jpg', 'Nothing was found'],
      ['Error in loading https://nope.test/car.jpg - ERR_DNS_FAIL 0', 'Nothing was found'],
      ['Something unexpected', 'Try again'],
    ]
    for (const [reason, expected] of cases) {
      assert.include(FileService.importErrorMessage(reason).toLowerCase(), expected.toLowerCase())
    }
  })
})
