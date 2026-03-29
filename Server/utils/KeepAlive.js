const cron = require('node-cron');
const https = require('https');
const http  = require('http');
const logger = require('./logger');

const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 5000);
const PING_URL    = BACKEND_URL + '/api/health';

function ping() {
  const client = PING_URL.startsWith('https') ? https : http;

  const req = client.get(PING_URL, function(res) {
    logger.info('[KeepAlive] Ping OK — status: ' + res.statusCode + ' — ' + new Date().toISOString());
    res.resume(); // drain response
  });

  req.on('error', function(err) {
    logger.warn('[KeepAlive] Ping failed: ' + err.message);
  });

  req.setTimeout(10000, function() {
    logger.warn('[KeepAlive] Ping timed out');
    req.destroy();
  });
}

function startKeepAlive() {
  // Only run on Render (production) — no point pinging localhost in dev
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[KeepAlive] Skipped — not in production');
    return;
  }

  // Ping every 5 minutes: "*/5 * * * *"
  cron.schedule('*/5 * * * *', function() {
    ping();
  });

  logger.info('[KeepAlive] Started — pinging ' + PING_URL + ' every 5 minutes');
}

module.exports = startKeepAlive;