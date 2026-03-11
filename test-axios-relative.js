function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}
function isAbsoluteURL(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

console.log('1.', buildFullPath('/api/v1', '/conversations'));
console.log('2.', buildFullPath('http://localhost:3001/api/v1', '/conversations'));
console.log('3.', buildFullPath('http://localhost:3001/api/v1', 'conversations'));
console.log('4.', buildFullPath('/api/v1', 'conversations'));
