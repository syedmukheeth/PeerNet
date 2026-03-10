const axios = require('axios');
const mongoose = require('mongoose');

async function testApi() {
    try {
        const { data: { data: { accessToken } } } = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'syedmukheeth09@gmail.com', // guess or we can create a user
            password: 'password123'
        }).catch(err => {
            console.log('Login failed', err.response?.data);
            return { data: { data: { accessToken: null } } };
        });

        if (!accessToken) {
            console.log("No token, registering dummy user to get token...");
            const res = await axios.post('http://localhost:3000/api/v1/auth/register', {
                username: 'testuser123', email: 'test1234@example.com', password: 'password123', fullName: 'test'
            }).catch(e => console.log(e.response?.data));
            const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
                email: 'test1234@example.com', password: 'password123'
            })
            var token = loginRes.data.data.accessToken;
        } else {
            var token = accessToken;
        }

        console.log('Got token, fetching search...');
        const { data } = await axios.get('http://localhost:3000/api/v1/users/search?q=syed', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Search res:', data);
    } catch (err) {
        console.error('API Error:', err.response?.data || err.message);
    }
}
testApi();
