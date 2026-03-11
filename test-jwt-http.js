const axios = require('axios');
const { signAccessToken } = require('./backend/src/utils/jwt.utils');
require('dotenv').config({ path: './.env' });

async function testFlow() {
    try {
        const mockUser = { userId: "60c72b2f9b1d8e001f3e4b5c", role: "user" };
        const token = signAccessToken(mockUser);
        console.log("Token:", token);

        const res = await axios.get('http://localhost:3001/api/v1/conversations', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success! HTTP Status:", res.status);
    } catch (err) {
        console.error("HTTP Error Message:", err.response?.data || err.message);
    }
}

testFlow();
