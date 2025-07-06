const axios = require('axios');
const ProgressBar = require('progress');
const pLimit = require('p-limit');
const logger = require('../utils/logger');
const config = require('../config');
const {
  sleep,
  retryWithBackoff,
  saveCheckpoint,
  ensureDirectoryExists,
  validateCVEData,
  cleanText
} = require('../utils/helpers');

class WizCVEScraper {
  constructor(options = {}) {
    this.cveData = [];
    this.processedCount = 0;
    this.startTime = null;
    this.options = {
      delayBetweenRequests: options.delayBetweenRequests || config.scraping.delayBetweenRequests,
      retryAttempts: options.retryAttempts || config.scraping.retryAttempts,
      resumeFromCheckpoint: options.resumeFromCheckpoint || false,
      maxCVEs: options.maxCVEs || config.scraping.maxCVEs,
      hitsPerPage: options.hitsPerPage || config.algolia.hitsPerPage,
      maxPages: options.maxPages || config.algolia.maxPages,
      ...options
    };
    
    // Algolia API configuration
    this.algoliaConfig = {
      baseUrl: config.algolia.baseUrl,
      apiKey: config.algolia.apiKey,
      applicationId: config.algolia.applicationId,
      indexName: config.algolia.indexName,
      timeout: config.algolia.timeout
    };
  }

  /**
   * Initialize the scraper
   */
  async initialize() {
    try {
      logger.info('Initializing Algolia API scraper...');
      
      // Test API connectivity
      await this.testApiConnectivity();
      
      logger.info('Algolia API scraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scraper:', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  async testApiConnectivity() {
    try {
      logger.info('Testing Algolia API connectivity...');
      
      const response = await this.makeAlgoliaRequest(0, 1);
      
      if (response && response.results && response.results[0]) {
        const totalHits = response.results[0].nbHits || 0;
        logger.info(`API connectivity test successful. Total CVEs available: ${totalHits}`);
        return totalHits;
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      logger.error('API connectivity test failed:', error);
      throw error;
    }
  }

  /**
   * Make a request to the Algolia API
   */
  async makeAlgoliaRequest(page = 0, hitsPerPage = null) {
    try {
      const requestPayload = {
        requests: [{
          indexName: this.algoliaConfig.indexName,
          facets: [
            'affectedTechnologies.filter',
            'exploitable',
            'hasCisaKevExploit',
            'hasFix',
            'isHighProfileThreat',
            'publishedAt',
            'severity',
            'sourceFeeds.filter'
          ],
          highlightPostTag: '__/ais-highlight__',
          highlightPreTag: '__ais-highlight__',
          hitsPerPage: hitsPerPage || this.options.hitsPerPage,
          maxValuesPerFacet: 200,
          page: page,
          query: ''
        }]
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-algolia-agent': 'Algolia for JavaScript (5.25.0); Search (5.25.0); Browser; instantsearch.js (4.78.3); react (19.1.0); react-instantsearch (7.15.8); react-instantsearch-core (7.15.8); next.js (15.3.3); JS Helper (3.25.0)',
        'x-algolia-api-key': this.algoliaConfig.apiKey,
        'x-algolia-application-id': this.algoliaConfig.applicationId
      };

      const response = await axios.post(this.algoliaConfig.baseUrl, requestPayload, { headers });
      return response.data;
    } catch (error) {
      logger.error('Algolia API request failed:', error.message);
      throw error;
    }
  }

  /**
   * Load all CVEs using Algolia API pagination
   */
  async loadAllCVEs() {
    try {
      logger.info('Starting to load all CVEs via Algolia API...');
      
      // First, get total count
      const initialResponse = await this.makeAlgoliaRequest(0, 1);
      const totalHits = initialResponse.results[0].nbHits || 0;
      const totalPages = Math.ceil(totalHits / this.options.hitsPerPage);
      
      logger.info(`Total CVEs available: ${totalHits}, Total pages: ${totalPages}`);
      
      // Determine how many CVEs to actually fetch
      const maxCVEs = this.options.maxCVEs || totalHits;
      const pagesToFetch = Math.min(totalPages, Math.ceil(maxCVEs / this.options.hitsPerPage));
      
      logger.info(`Will fetch ${pagesToFetch} pages (up to ${maxCVEs} CVEs)`);
      
      // Create progress bar
      const progressBar = new ProgressBar('Loading CVEs [:bar] :current/:total (:percent) ETA: :etas', {
        complete: '█',
        incomplete: '░',
        width: 40,
        total: pagesToFetch
      });
      
      // Fetch all pages
      for (let page = 0; page < pagesToFetch; page++) {
        try {
          const response = await this.makeAlgoliaRequest(page, this.options.hitsPerPage);
          const hits = response.results[0].hits || [];
          
          // Process each CVE from this page
          for (const hit of hits) {
            if (this.cveData.length >= maxCVEs) {
              break;
            }
            
            const cveData = await this.transformAlgoliaHitToCVE(hit);
            if (cveData && validateCVEData(cveData)) {
              this.cveData.push(cveData);
            }
            
            // Add small delay between CVE detail page requests
            await sleep(100);
          }
          
          progressBar.tick();
          
          // Add delay between requests
          if (page < pagesToFetch - 1) {
            await sleep(this.options.delayBetweenRequests);
          }
          
          if (this.cveData.length >= maxCVEs) {
            logger.info(`Reached maximum CVE limit: ${maxCVEs}`);
            break;
          }
          
        } catch (error) {
          logger.error(`Failed to fetch page ${page}:`, error.message);
          // Continue with next page
        }
      }
      
      logger.info(`Finished loading CVEs. Total collected: ${this.cveData.length}`);
    } catch (error) {
      logger.error('Error during CVE loading:', error);
      throw error;
    }
  }

  /**
   * Extract additional resources from Wiz.io CVE detail page
   */
  async extractAdditionalResources(cveId) {
    try {
      const detailUrl = `https://www.wiz.io/vulnerability-database/cve/${cveId.toLowerCase()}`;
      const response = await axios.get(detailUrl, {
        timeout: this.algoliaConfig.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = response.data;
      const additionalResources = [];
      
      // Extract links from the "Additional resources" section
      const resourcesMatch = html.match(/<h2[^>]*>Additional resources<\/h2>[\s\S]*?<div[^>]*class="[^"]*prose[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      
      if (resourcesMatch && resourcesMatch[1]) {
        const resourcesSection = resourcesMatch[1];
        
        // Extract all links with their text
        const linkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        let linkMatch;
        
        while ((linkMatch = linkRegex.exec(resourcesSection)) !== null) {
          const url = linkMatch[1].trim();
          const title = linkMatch[2].trim();
          
          if (url && title && url.startsWith('http')) {
            additionalResources.push({
              title: title,
              url: url,
              type: this.categorizeResourceType(url, title)
            });
          }
        }
      }
      
      return additionalResources;
    } catch (error) {
      logger.warn(`Failed to extract additional resources for ${cveId}:`, error.message);
      return [];
    }
  }
  
  /**
   * Categorize resource type based on URL and title
   */
  categorizeResourceType(url, title) {
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    if (lowerUrl.includes('nvd.nist.gov')) return 'NVD';
    if (lowerUrl.includes('github.com')) return 'GitHub';
    if (lowerUrl.includes('vuldb.com')) return 'VulDB';
    if (lowerUrl.includes('cve.mitre.org')) return 'MITRE';
    if (lowerUrl.includes('exploit-db.com')) return 'Exploit-DB';
    if (lowerUrl.includes('security.') || lowerTitle.includes('advisory')) return 'Security Advisory';
    if (lowerTitle.includes('patch') || lowerTitle.includes('fix')) return 'Patch/Fix';
    if (lowerTitle.includes('poc') || lowerTitle.includes('proof of concept')) return 'Proof of Concept';
    
    return 'Other';
  }

  /**
   * Transform Algolia hit data to CVE format
   */
  async transformAlgoliaHitToCVE(hit) {
    try {
      const cveId = hit.externalId || hit.name || hit.id;
      
      // Extract additional resources from Wiz.io detail page
      const additionalResourcesFromPage = await this.extractAdditionalResources(cveId);
      
      return {
        id: cveId,
        severity: hit.severity || 'N/A',
        score: hit.cvssScore || hit.score || 'N/A',
        technologies: hit.affectedTechnologies ? 
          hit.affectedTechnologies.map(tech => tech.name).join(', ') : 'N/A',
        component: hit.affectedSoftware ? 
          hit.affectedSoftware.slice(0, 3).join(', ') + 
          (hit.affectedSoftware.length > 3 ? '...' : '') : 'N/A',
        publishDate: hit.publishedAt ? new Date(hit.publishedAt).toISOString().split('T')[0] : 'N/A',
        description: cleanText(hit.description || ''),
        sourceUrl: hit.sourceUrl || '',
        hasCisaKevExploit: hit.hasCisaKevExploit || false,
        hasFix: hit.hasFix || false,
        isHighProfileThreat: hit.isHighProfileThreat || false,
        exploitable: hit.exploitable || false,
        additionalResources: {
          sourceUrl: hit.sourceUrl || '',
          affectedSoftware: hit.affectedSoftware || [],
          affectedTechnologies: hit.affectedTechnologies || [],
          externalLinks: additionalResourcesFromPage
        }
      };
    } catch (error) {
      logger.error('Error transforming Algolia hit:', error);
      return null;
    }
  }

  /**
   * Extract CVE list (now just returns the loaded data)
   */
  async extractCVEList() {
    try {
      logger.info('CVE list already extracted via API calls');
      return this.cveData;
    } catch (error) {
      logger.error('Failed to return CVE list:', error);
      throw error;
    }
  }

  /**
   * Process CVE details (now simplified since data comes from API)
   */
  async processCVEDetails(cve) {
    try {
      // CVE details are already included in the API response
      // Just validate the data
      const validation = validateCVEData(cve);
      if (validation.error) {
        logger.warn(`CVE validation failed for ${cve.id}:`, validation.error.message);
          // Use the original data even if validation fails
        }
        
        return cve;
      } catch (error) {
        logger.error(`Error processing CVE ${cve.id}:`, error);
        return cve;
      }
  }

  /**
   * Main scraping method
   */
  async scrapeAllCVEs() {
    try {
      this.startTime = Date.now();
      logger.scrapeStart('Wiz CVE Database via Algolia API');
      
      await this.initialize();
      await this.loadAllCVEs();
      
      const cveList = await this.extractCVEList();
      
      if (cveList.length === 0) {
        logger.warn('No CVEs found via API');
        return {
          scrapeDate: new Date().toISOString(),
          totalCVEs: 0,
          cveData: []
        };
      }
      
      logger.info(`Processing ${cveList.length} CVEs...`);
      
      // Process CVEs (minimal processing since data comes from API)
      const processedCVEs = [];
      for (const cve of cveList) {
        try {
          const processedCVE = await this.processCVEDetails(cve);
          processedCVEs.push(processedCVE);
          
          this.processedCount++;
          
          if (logger.cveProcessed) {
            logger.cveProcessed(cve.id, this.processedCount, cveList.length);
          }
          
          // Save checkpoint periodically
          if (this.processedCount % (config.output?.checkpointInterval || 100) === 0) {
            await saveCheckpoint(processedCVEs, this.processedCount);
          }
          
        } catch (error) {
          if (logger.cveError) {
            logger.cveError(cve.id, error);
          }
          // Return the original CVE data
          processedCVEs.push(cve);
        }
      }
      
      const duration = Date.now() - this.startTime;
      if (logger.scrapeComplete) {
        logger.scrapeComplete(processedCVEs.length, duration);
      }
      
      return {
        scrapeDate: new Date().toISOString(),
        totalCVEs: processedCVEs.length,
        cveData: processedCVEs.sort((a, b) => a.id.localeCompare(b.id))
      };
      
    } catch (error) {
      if (logger.scrapeError) {
        logger.scrapeError(error);
      }
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // No browser to clean up in API-based approach
      logger.info('Cleanup completed successfully');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Get scraping statistics
   */
  getStats() {
    const duration = this.startTime ? Date.now() - this.startTime : 0;
    return {
      processedCount: this.processedCount,
      duration,
      averageTimePerCVE: this.processedCount > 0 ? duration / this.processedCount : 0
    };
  }
}

module.exports = WizCVEScraper;