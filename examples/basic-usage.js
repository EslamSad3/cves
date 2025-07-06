#!/usr/bin/env node

/**
 * Basic Usage Example for Wiz CVE Scraper
 * 
 * This example demonstrates how to use the WizCVEScraper programmatically
 * and shows various configuration options and usage patterns.
 */

const path = require('path');
const fs = require('fs-extra');
const WizCVEScraper = require('../src/scraper/WizCVEScraper');
const { generateAnalytics, saveToJson } = require('../src/utils/helpers');
const logger = require('../src/utils/logger');

// Example 1: Basic scraping with minimal configuration
async function basicScraping() {
  console.log('\n=== Example 1: Basic Scraping ===');
  
  const scraper = new WizCVEScraper({
    maxCVEs: 10, // Limit to 10 CVEs for demo
    maxConcurrency: 2,
    delayBetweenRequests: 1000
  });

  try {
    logger.info('Starting basic scraping example...');
    
    const results = await scraper.scrape();
    
    console.log(`✅ Successfully scraped ${results.cves.length} CVEs`);
    console.log(`📊 Stats: ${JSON.stringify(scraper.getStats(), null, 2)}`);
    
    // Save results
    const outputPath = path.join(__dirname, '../output/basic-example.json');
    await saveToJson(outputPath, results);
    console.log(`💾 Results saved to: ${outputPath}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Basic scraping failed:', error.message);
    throw error;
  } finally {
    await scraper.cleanup();
  }
}

// Example 2: Advanced scraping with custom options
async function advancedScraping() {
  console.log('\n=== Example 2: Advanced Scraping ===');
  
  const scraper = new WizCVEScraper({
    maxCVEs: 25,
    maxConcurrency: 3,
    delayBetweenRequests: 500,
    retryAttempts: 3,
    enableCheckpoints: true,
    headless: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  try {
    logger.info('Starting advanced scraping example...');
    
    // Add progress callback
    scraper.on('progress', (data) => {
      console.log(`📈 Progress: ${data.processed}/${data.total} CVEs processed`);
    });
    
    // Add error callback
    scraper.on('error', (error) => {
      console.warn(`⚠️  Non-fatal error: ${error.message}`);
    });
    
    const results = await scraper.scrape();
    
    console.log(`✅ Successfully scraped ${results.cves.length} CVEs`);
    
    // Generate analytics
    const analytics = generateAnalytics(results.cves);
    console.log('📊 Analytics:', JSON.stringify(analytics, null, 2));
    
    // Save results with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, `../output/advanced-example-${timestamp}.json`);
    await saveToJson(outputPath, { ...results, analytics });
    console.log(`💾 Results with analytics saved to: ${outputPath}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Advanced scraping failed:', error.message);
    throw error;
  } finally {
    await scraper.cleanup();
  }
}

// Example 3: Resume from checkpoint
async function resumeFromCheckpoint() {
  console.log('\n=== Example 3: Resume from Checkpoint ===');
  
  const scraper = new WizCVEScraper({
    maxCVEs: 50,
    enableCheckpoints: true,
    checkpointInterval: 5 // Save checkpoint every 5 CVEs
  });

  try {
    logger.info('Starting resume example...');
    
    // Check if checkpoint exists
    const checkpointPath = path.join(__dirname, '../output/checkpoints');
    const hasCheckpoint = await fs.pathExists(checkpointPath);
    
    if (hasCheckpoint) {
      console.log('📂 Found existing checkpoint, resuming...');
    } else {
      console.log('🆕 No checkpoint found, starting fresh...');
    }
    
    const results = await scraper.scrape();
    
    console.log(`✅ Successfully scraped ${results.cves.length} CVEs`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Resume scraping failed:', error.message);
    throw error;
  } finally {
    await scraper.cleanup();
  }
}

// Example 4: Filter and analyze specific CVE types
async function filterAndAnalyze() {
  console.log('\n=== Example 4: Filter and Analyze ===');
  
  const scraper = new WizCVEScraper({
    maxCVEs: 30,
    maxConcurrency: 2
  });

  try {
    logger.info('Starting filter and analyze example...');
    
    const results = await scraper.scrape();
    
    // Filter high severity CVEs
    const highSeverityCVEs = results.cves.filter(cve => 
      cve.severity === 'CRITICAL' || cve.severity === 'HIGH'
    );
    
    // Filter by technology
    const linuxCVEs = results.cves.filter(cve => 
      cve.technologies.some(tech => tech.toLowerCase().includes('linux'))
    );
    
    // Filter by CVSS score
    const highScoreCVEs = results.cves.filter(cve => 
      cve.score && cve.score >= 8.0
    );
    
    console.log(`🔍 Analysis Results:`);
    console.log(`   Total CVEs: ${results.cves.length}`);
    console.log(`   High/Critical Severity: ${highSeverityCVEs.length}`);
    console.log(`   Linux-related: ${linuxCVEs.length}`);
    console.log(`   High CVSS Score (≥8.0): ${highScoreCVEs.length}`);
    
    // Save filtered results
    const filteredResults = {
      metadata: results.metadata,
      summary: {
        total: results.cves.length,
        highSeverity: highSeverityCVEs.length,
        linuxRelated: linuxCVEs.length,
        highScore: highScoreCVEs.length
      },
      highSeverityCVEs,
      linuxCVEs: linuxCVEs.slice(0, 10), // Limit to first 10
      highScoreCVEs: highScoreCVEs.slice(0, 10) // Limit to first 10
    };
    
    const outputPath = path.join(__dirname, '../output/filtered-analysis.json');
    await saveToJson(outputPath, filteredResults);
    console.log(`💾 Filtered analysis saved to: ${outputPath}`);
    
    return filteredResults;
    
  } catch (error) {
    console.error('❌ Filter and analyze failed:', error.message);
    throw error;
  } finally {
    await scraper.cleanup();
  }
}

// Example 5: Error handling and retry logic
async function errorHandlingExample() {
  console.log('\n=== Example 5: Error Handling ===');
  
  const scraper = new WizCVEScraper({
    maxCVEs: 15,
    retryAttempts: 3,
    delayBetweenRequests: 2000, // Slower to avoid rate limiting
    timeout: 30000 // 30 second timeout
  });

  try {
    logger.info('Starting error handling example...');
    
    // Track errors
    const errors = [];
    scraper.on('error', (error) => {
      errors.push({
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    const results = await scraper.scrape();
    
    console.log(`✅ Completed with ${results.cves.length} CVEs`);
    
    if (errors.length > 0) {
      console.log(`⚠️  Encountered ${errors.length} non-fatal errors:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message} (${error.timestamp})`);
      });
    } else {
      console.log('🎉 No errors encountered!');
    }
    
    return { results, errors };
    
  } catch (error) {
    console.error('❌ Error handling example failed:', error.message);
    throw error;
  } finally {
    await scraper.cleanup();
  }
}

// Main execution function
async function runExamples() {
  console.log('🚀 Starting Wiz CVE Scraper Examples');
  console.log('=====================================');
  
  try {
    // Ensure output directory exists
    await fs.ensureDir(path.join(__dirname, '../output'));
    
    // Run examples sequentially
    await basicScraping();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between examples
    
    await advancedScraping();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await filterAndAnalyze();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await errorHandlingExample();
    
    console.log('\n🎉 All examples completed successfully!');
    console.log('📁 Check the output/ directory for generated files.');
    
  } catch (error) {
    console.error('\n💥 Example execution failed:', error.message);
    process.exit(1);
  }
}

// Export functions for individual use
module.exports = {
  basicScraping,
  advancedScraping,
  resumeFromCheckpoint,
  filterAndAnalyze,
  errorHandlingExample,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}