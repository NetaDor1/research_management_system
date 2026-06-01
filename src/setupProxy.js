const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Proxies /api/* to the Express review server (default port 3001).
 * Override with REVIEW_PROXY_TARGET in .env.development.local (no trailing slash).
 */
module.exports = function proxyReviewApi(app) {
  const target =
    process.env.REVIEW_PROXY_TARGET?.trim() || 'http://127.0.0.1:3001';

  // Gemini can take 30–90s; default proxy timeouts return 504.
  const proxyTimeoutMs =
    Number(process.env.REVIEW_PROXY_TIMEOUT_MS) || 300000;

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      proxyTimeout: proxyTimeoutMs,
      timeout: proxyTimeoutMs,
      on: {
        error(err, _req, res) {
          console.error('[review-proxy]', err.code || err.message);
          if (res.writeHead && !res.headersSent) {
            res.writeHead(503, {
              'Content-Type': 'application/json; charset=utf-8',
            });
          }
          res.end(
            JSON.stringify({
              error:
                'שרת ה-AI לא רץ על פורט 3001. בטרמינל: cd client && npm run start:server (ודאו שיש GEMINI_API_KEY ב-server/.env).',
              code: 'UPSTREAM_UNAVAILABLE',
            })
          );
        },
      },
    })
  );
};
