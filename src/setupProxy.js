const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Proxies /api/* to the Express review server (default port 3001).
 * Override with REVIEW_PROXY_TARGET in .env.development.local (no trailing slash).
 */
module.exports = function proxyReviewApi(app) {
  const target =
    process.env.REVIEW_PROXY_TARGET?.trim() || 'http://127.0.0.1:3001';

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
