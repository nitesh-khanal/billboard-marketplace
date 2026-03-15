const { createProxyMiddleware } = require('http-proxy-middleware');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

module.exports = function(app) {
  app.use('/api', createProxyMiddleware({ target: API_URL, changeOrigin: true }));
  app.use('/uploads', createProxyMiddleware({ target: API_URL, changeOrigin: true }));
};
