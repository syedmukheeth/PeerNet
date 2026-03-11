const axios = require('axios');
const url = new URL('conversations', 'http://localhost:3001/api/v1');
console.log('Native URL resolve:', url.href);

const url2 = new URL('conversations', 'http://localhost:3001/api/v1/');
console.log('Native URL resolve (with slash):', url2.href);

function axiosCombine(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}
console.log('Axios combine:', axiosCombine('http://localhost:3001/api/v1', 'conversations'));
