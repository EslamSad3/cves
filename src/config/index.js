const path = require('path');
require('dotenv').config();

const config = {
  // Algolia API Configuration
  algolia: {
    baseUrl: 'https://hdr4182jve-dsn.algolia.net/1/indexes/*/queries',
    apiKey: process.env.ALGOLIA_API_KEY || '2023c7fbf68076909d1a85ec42cea550',
    applicationId: process.env.ALGOLIA_APPLICATION_ID || 'HDR4182JVE',
    indexName: 'cve-db',
    hitsPerPage: parseInt(process.env.HITS_PER_PAGE) || 20,
    maxPages: parseInt(process.env.MAX_PAGES) || 100,
    timeout: parseInt(process.env.API_TIMEOUT) || 30000
  },

  // Scraping Configuration
  scraping: {
    delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 1000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    maxCVEs: parseInt(process.env.MAX_CVES) || null,
    targetUrl: process.env.TARGET_URL || 'https://www.wiz.io/vulnerability-database/cve/search'
  },

  // Output Configuration
  output: {
    dir: process.env.OUTPUT_DIR || './output',
    filename: process.env.OUTPUT_FILENAME || 'cve_data',
    saveCheckpoints: process.env.SAVE_CHECKPOINTS === 'true',
    checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL) || 100
  },

  // API Configuration
  api: {
    port: parseInt(process.env.API_PORT) || 3000,
    host: process.env.API_HOST || 'localhost'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/scraper.log'
  },

  // Data transformation settings
  dataTransform: {
    includeDescription: process.env.INCLUDE_DESCRIPTION !== 'false',
    includeAffectedSoftware: process.env.INCLUDE_AFFECTED_SOFTWARE !== 'false',
    includeAffectedTechnologies: process.env.INCLUDE_AFFECTED_TECHNOLOGIES !== 'false',
    maxDescriptionLength: parseInt(process.env.MAX_DESCRIPTION_LENGTH) || 1000
  },

  // Paths
  paths: {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    output: path.resolve(__dirname, '../../output'),
    logs: path.resolve(__dirname, '../../logs'),
    checkpoints: path.resolve(__dirname, '../../checkpoints')
  }
};

module.exports = config;