window.STUDY_CONFIG = {
  api: location.hostname === '127.0.0.1' || location.hostname === 'localhost'
    ? 'http://127.0.0.1:8787'
    : 'https://uner.digital/study-alexey-api',
  sharedEnabled: true
};
