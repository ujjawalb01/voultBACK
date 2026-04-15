const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api';
let TOKEN = '';

async function run() {
  try {
    // 1. Register/Login to get Token
    const user = { name: 'TestUser', email: `test${Date.now()}@example.com`, password: 'password123' };
    await axios.post(`${BASE_URL}/user/register`, user).catch(() => {}); // Ignore if exists
    const loginRes = await axios.post(`${BASE_URL}/user/login`, { email: user.email, password: user.password });
    TOKEN = loginRes.data.token;
    console.log('Got Token');

    // 2. Create a dummy file
    fs.writeFileSync('test.txt', 'Hello World');
    const form = new FormData();
    form.append('file', fs.createReadStream('test.txt'));

    // 3. Upload File
    const uploadRes = await axios.post(`${BASE_URL}/file/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${TOKEN}` }
    });
    const fileId = uploadRes.data.files[0]._id;
    console.log(`Uploaded File: ${fileId}`);

    // 4. Delete File
    await axios.delete(`${BASE_URL}/file/${fileId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('Deleted File');

    // 5. Check "My Files" (Should NOT be here)
    const myFilesRes = await axios.get(`${BASE_URL}/file`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const foundInMyFiles = myFilesRes.data.find(f => f._id === fileId);
    if (foundInMyFiles) console.error('FAIL: File still in My Files');
    else console.log('PASS: File removed from My Files');

    // 6. Check "Trash" (SHOULD be here)
    const trashRes = await axios.get(`${BASE_URL}/file/trash`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const foundInTrash = trashRes.data.find(f => f._id === fileId);
    if (foundInTrash) console.log('PASS: File found in Trash');
    else console.error('FAIL: File NOT found in Trash (Hard Deleted?)');

    // Cleanup local test file
    if (fs.existsSync('test.txt')) {
        fs.unlinkSync('test.txt');
        console.log('Cleaned up local test file');
    }

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

run();


