const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');

// Ensure logs directory exists
fs.ensureDirSync(config.paths.logs);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'wiz-cve-scraper' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(config.paths.logs, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Custom methods for specific logging scenarios
logger.scrapeStart = (url) => {
  logger.info('Starting scrape operation', { url, timestamp: new Date().toISOString() });
};

logger.scrapeComplete = (totalCVEs, duration) => {
  logger.info('Scrape operation completed', {
    totalCVEs,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

logger.scrapeError = (error, context = {}) => {
  logger.error('Scrape operation failed', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

logger.cveProcessed = (cveId, index, total) => {
  if (index % 10 === 0 || index === total) {
    logger.info('CVE processing progress', {
      cveId,
      progress: `${index}/${total}`,
      percentage: `${((index / total) * 100).toFixed(1)}%`
    });
  }
};

logger.cveError = (cveId, error) => {
  logger.warn('Failed to process CVE', {
    cveId,
    error: error.message,
    timestamp: new Date().toISOString()
  });
};

logger.checkpoint = (count, filename) => {
  logger.info('Checkpoint saved', {
    processedCount: count,
    checkpointFile: filename,
    timestamp: new Date().toISOString()
  });
};

logger.performance = (operation, duration, details = {}) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;