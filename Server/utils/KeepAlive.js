let cron;
try {
  cron = require('node-cron');
} catch(e) {
  // node-cron not installed - skip keep-alive
}

const https  = require('https');
const http   = require('http');
const logger = require('./logger');

function ping(url) {
  const client = url.startsWith('https') ? https : http;
  const req = client.get(url, function(res) {
    logger.info('[KeepAlive] Ping OK ' + res.statusCode + ' — ' + new Date().toISOString());
    res.resume();
  });
  req.on('error', function(err) {
    logger.warn('[KeepAlive] Ping failed: ' + err.message);
  });
  req.setTimeout(10000, function() {
    logger.warn('[KeepAlive] Ping timeout');
    req.destroy();
  });
}

function startKeepAlive() {
  if (!cron) {
    logger.warn('[KeepAlive] node-cron not installed — skipping. Run: npm install node-cron');
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[KeepAlive] Skipped in development');
    return;
  }
  const url = (process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 5000)) + '/api/health';
  cron.schedule('*/5 * * * *', function() { ping(url); });
  logger.info('[KeepAlive] Pinging ' + url + ' every 5 minutes');
}

module.exports = startKeepAlive;