// Deploy-time configuration. Railway or CI overwrites this file
// with the correct API URL. For local dev, the fallback in
// jurocompliant.html uses http://localhost:3000.
if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  window.JURO_API_URL = 'https://api.jurocompliant.com';
}
