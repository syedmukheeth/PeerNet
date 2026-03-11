const axios = require('axios');

const api = axios.create({
    baseURL: '/api/v1',
});

api.interceptors.request.use(config => {
    console.log('Resulting baseURL:', config.baseURL);
    console.log('Resulting URL:', config.url);
    console.log('Combined:', axios.getUri(config));
    return config;
});

api.post('conversations', {}, { baseURL: 'http://localhost:3001/api/v1' }).catch(err => console.log('error'));
