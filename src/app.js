#!/usr/bin/env node

const path = require('path');
const { Command } = require('commander');
const WizCVEScraper = require('./scraper/WizCVEScraper');
const logger = require('./utils/logger');
const { 
  saveToJson, 
  loadLatestCheckpoint, 
  generateAnalytics 
} = require('./utils/helpers');
const config = require('./config');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

class CVEScraperApp {
  constructor() {
    this.scraper = null;
    this.program = new Command();
    this.setupCLI();
  }

  setupCLI() {
    this.program
      .name('wiz-cve-scraper')
      .description('A robust Node.js web-scraping tool for extracting CVE data from Wiz vulnerability database')
      .version('1.0.0');

    this.program
      .command('scrape')
      .description('Start scraping CVE data')
      .option('-d, --delay <number>', 'Delay between requests in ms', parseInt, config.scraping.delayBetweenRequests)
      .option('-r, --retry <number>', 'Number of retry attempts', parseInt, config.scraping.retryAttempts)
      .option('-m, --max-cves <number>', 'Maximum number of CVEs to process', parseInt)
      .option('-o, --output <string>', 'Output filename (without extension)', config.output.filename)
      .option('--resume', 'Resume from last checkpoint')
      .option('--no-analytics', 'Skip analytics generation')
      .action(this.handleScrapeCommand.bind(this));

    this.program
      .command('analytics <file>')
      .description('Generate analytics from existing CVE data file')
      .option('-o, --output <string>', 'Output filename for analytics', 'analytics')
      .action(this.handleAnalyticsCommand.bind(this));

    this.program
      .command('validate <file>')
      .description('Validate CVE data file structure')
      .action(this.handleValidateCommand.bind(this));

    this.program
      .command('resume')
      .description('Resume scraping from the latest checkpoint')
      .action(this.handleResumeCommand.bind(this));
  }

  async handleScrapeCommand(options) {
    try {
      logger.info('Starting CVE scraping operation...');
      logger.info('Options:', options);

      // Create scraper with options
      this.scraper = new WizCVEScraper({
        delayBetweenRequests: options.delay,
        retryAttempts: options.retry,
        maxCVEs: options.maxCves,
        resumeFromCheckpoint: options.resume
      });

      // Check for resume option
      if (options.resume) {
        const checkpoint = await loadLatestCheckpoint();
        if (checkpoint) {
          logger.info(`Resuming from checkpoint with ${checkpoint.processedCount} processed CVEs`);
          // Implementation for resume functionality would go here
        } else {
          logger.info('No checkpoint found, starting fresh scrape');
        }
      }

      // Start scraping
      const startTime = Date.now();
      const result = await this.scraper.scrapeAllCVEs();
      const duration = Date.now() - startTime;

      // Save results
      const outputPath = await saveToJson(options.output, result);
      
      // Generate analytics if not disabled
      if (options.analytics !== false && result.cveData.length > 0) {
        const analytics = generateAnalytics(result.cveData);
        const analyticsResult = {
          generatedAt: new Date().toISOString(),
          dataSource: outputPath,
          analytics
        };
        
        await saveToJson(`${options.output}_analytics`, analyticsResult);
        logger.info('Analytics generated and saved');
      }

      // Display summary
      this.displaySummary(result, duration);
      
      logger.info('Scraping operation completed successfully');
      process.exit(0);
      
    } catch (error) {
      logger.error('Scraping operation failed:', error);
      process.exit(1);
    }
  }

  async handleAnalyticsCommand(file, options) {
    try {
      logger.info(`Generating analytics for file: ${file}`);
      
      const data = require(path.resolve(file));
      
      if (!data.cveData || !Array.isArray(data.cveData)) {
        throw new Error('Invalid CVE data file format');
      }
      
      const analytics = generateAnalytics(data.cveData);
      const result = {
        generatedAt: new Date().toISOString(),
        dataSource: file,
        analytics
      };
      
      await saveToJson(options.output, result);
      
      // Display analytics summary
      console.log('\n=== CVE Data Analytics ===');
      console.log(`Total CVEs: ${analytics.total}`);
      console.log(`Average Score: ${analytics.averageScore}`);
      console.log(`CVEs with Additional Resources: ${analytics.withAdditionalResources}`);
      console.log('\nSeverity Distribution:');
      Object.entries(analytics.severityDistribution).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });
      
      logger.info('Analytics generation completed');
      
    } catch (error) {
      logger.error('Analytics generation failed:', error);
      process.exit(1);
    }
  }

  async handleValidateCommand(file) {
    try {
      logger.info(`Validating file: ${file}`);
      
      const data = require(path.resolve(file));
      
      // Basic structure validation
      const requiredFields = ['scrapeDate', 'totalCVEs', 'cveData'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      if (!Array.isArray(data.cveData)) {
        throw new Error('cveData must be an array');
      }
      
      // Validate individual CVE entries
      let validCount = 0;
      let invalidCount = 0;
      
      data.cveData.forEach((cve, index) => {
        if (cve.cveId && cve.cveId.match(/^CVE-\d{4}-\d+$/)) {
          validCount++;
        } else {
          invalidCount++;
          logger.warn(`Invalid CVE at index ${index}:`, cve.cveId);
        }
      });
      
      console.log('\n=== Validation Results ===');
      console.log(`Total CVEs: ${data.cveData.length}`);
      console.log(`Valid CVEs: ${validCount}`);
      console.log(`Invalid CVEs: ${invalidCount}`);
      console.log(`Validation: ${invalidCount === 0 ? 'PASSED' : 'FAILED'}`);
      
      if (invalidCount === 0) {
        logger.info('File validation passed');
      } else {
        logger.warn(`File validation failed with ${invalidCount} invalid entries`);
      }
      
    } catch (error) {
      logger.error('File validation failed:', error);
      process.exit(1);
    }
  }

  async handleResumeCommand() {
    try {
      const checkpoint = await loadLatestCheckpoint();
      
      if (!checkpoint) {
        logger.info('No checkpoint found to resume from');
        return;
      }
      
      logger.info(`Found checkpoint with ${checkpoint.processedCount} processed CVEs`);
      logger.info(`Checkpoint created at: ${checkpoint.timestamp}`);
      
      // Ask user if they want to resume
      console.log('\nDo you want to resume from this checkpoint? (y/n)');
      
      // For now, just log the checkpoint info
      // In a full implementation, you'd integrate this with the scraper
      logger.info('Resume functionality would continue from here...');
      
    } catch (error) {
      logger.error('Resume operation failed:', error);
      process.exit(1);
    }
  }

  displaySummary(result, duration) {
    const durationSeconds = (duration / 1000).toFixed(2);
    const avgTimePerCVE = result.totalCVEs > 0 ? (duration / result.totalCVEs).toFixed(2) : 0;
    
    console.log('\n' + '='.repeat(50));
    console.log('           SCRAPING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total CVEs Processed: ${result.totalCVEs}`);
    console.log(`Total Duration: ${durationSeconds} seconds`);
    console.log(`Average Time per CVE: ${avgTimePerCVE} ms`);
    console.log(`Scrape Date: ${result.scrapeDate}`);
    
    if (result.cveData.length > 0) {
      const severities = result.cveData.reduce((acc, cve) => {
        if (cve.severity) {
          acc[cve.severity] = (acc[cve.severity] || 0) + 1;
        }
        return acc;
      }, {});
      
      console.log('\nSeverity Distribution:');
      Object.entries(severities).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });
      
      const withResources = result.cveData.filter(cve => 
        cve.additionalResources && cve.additionalResources.length > 0
      ).length;
      
      console.log(`\nCVEs with Additional Resources: ${withResources}`);
    }
    
    console.log('='.repeat(50));
  }

  async run() {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      logger.error('Application error:', error);
      process.exit(1);
    }
  }
}

// Run the application if this file is executed directly
if (require.main === module) {
  const app = new CVEScraperApp();
  app.run();
}

module.exports = CVEScraperApp;