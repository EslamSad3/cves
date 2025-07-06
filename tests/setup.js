// Jest setup file
// This file runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging during tests
process.env.BROWSER_HEADLESS = 'true';
process.env.SCRAPING_MAX_CONCURRENCY = '1';
process.env.SCRAPING_DELAY_BETWEEN_REQUESTS = '100';
process.env.OUTPUT_ENABLE_CHECKPOINTS = 'false';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during testing
const originalConsole = global.console;

beforeAll(() => {
  // Mock console methods but keep error for important messages
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: originalConsole.error // Keep error for debugging
  };
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up any remaining resources after each test
afterEach(async () => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Helper function to create mock CVE data
global.createMockCVE = (overrides = {}) => {
  return {
    cveId: 'CVE-2025-0001',
    severity: 'HIGH',
    score: 8.5,
    technologies: ['Linux', 'Apache'],
    component: 'httpd',
    publishedDate: 'Jan 05, 2025',
    detailUrl: 'https://example.com/cve/CVE-2025-0001',
    additionalResources: [
      {
        title: 'NVD',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-0001'
      }
    ],
    ...overrides
  };
};

// Helper function to create mock browser page
global.createMockPage = () => {
  return {
    setUserAgent: jest.fn(),
    setRequestInterception: jest.fn(),
    on: jest.fn(),
    goto: jest.fn(),
    // waitForTimeout removed - deprecated in newer Puppeteer versions
    waitForSelector: jest.fn(),
    $: jest.fn(),
    $$: jest.fn(),
    evaluate: jest.fn(),
    click: jest.fn(),
    type: jest.fn(),
    screenshot: jest.fn(),
    pdf: jest.fn(),
    close: jest.fn(),
    url: jest.fn(() => 'https://example.com'),
    title: jest.fn(() => 'Test Page')
  };
};

// Helper function to create mock browser
global.createMockBrowser = () => {
  return {
    newPage: jest.fn(() => Promise.resolve(createMockPage())),
    close: jest.fn(),
    pages: jest.fn(() => Promise.resolve([])),
    version: jest.fn(() => '1.0.0')
  };
};

// Helper to wait for async operations in tests
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create temporary test files
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

global.createTempDir = async () => {
  const tempDir = path.join(os.tmpdir(), 'wiz-cve-scraper-test-' + Date.now());
  await fs.ensureDir(tempDir);
  return tempDir;
};

global.cleanupTempDir = async (tempDir) => {
  if (tempDir && await fs.pathExists(tempDir)) {
    await fs.remove(tempDir);
  }
};

// Mock fetch for API tests
global.fetch = jest.fn();

// Reset fetch mock before each test
beforeEach(() => {
  fetch.mockClear();
});