const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
  try {
    // 1. Create a brand new user to get token
    const randomUser = `testuser${Date.now()}`;
    const registerRes = await axios.post('http://localhost:3000/api/v1/auth/register', {
      username: randomUser,
      email: `${randomUser}@example.com`,
      password: 'Password123!',
      fullName: 'Test User'
    });
    
    const token = registerRes.data.data.accessToken;
    console.log('Got token:', token ? 'yes' : 'no');

    // 2. We already created dummy.png via cli

    // 3. Upload file
    const form = new FormData();
    form.append('media', fs.createReadStream('dummy.png'), {
      filename: 'dummy.png',
      contentType: 'image/png'
    });
    form.append('caption', 'Test upload from script');

    console.log('Sending upload request...');
    const uploadRes = await axios.post('http://localhost:3000/api/v1/posts', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Upload success:', uploadRes.data);
  } catch (error) {
    if (error.response) {
      console.error('Upload failed with status', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Upload failed with error:', error.message);
    }
  } finally {
    if (fs.existsSync('dummy.png')) {
      fs.unlinkSync('dummy.png');
    }
  }
}

testUpload();
