
## 1. Project Overview
Build a robust Node.js web‑scraping tool using Puppeteer to extract CVE data from the Wiz vulnerability database. The app should:
- Navigate to the CVE search page  
- Handle infinite scroll / “Load more” pagination  
- Scrape CVE IDs and metadata  
- Visit each CVE's detail page  
- Extract "Additional resources" links  
- Output structured JSON data  

---

## 2. Core Requirements

- **Target URL**: `https://www.wiz.io/vulnerability-database/cve/search`
- **Infinite‑scroll handling**: Auto-click the “Load more” button until all entries are loaded
- **Data extraction**: Scrape CVE IDs, severity, score, technologies, component, publish date
- **Detail‑page navigation**: Click into each CVE detail page for extra info
- **Additional resources**: Extract titles + URLs from each CVE’s "Additional resources" section
- **JSON output**: Return a structured JSON, e.g.:

```json
{
  "scrapeDate": "2025-07-07T00:32:00.000Z",
  "totalCVEs": 140558,
  "cveData": [
    {
      "cveId": "CVE-2025-6926",
      "severity": "HIGH",
      "score": 8.8,
      "technologies": ["Linux","Debian"],
      "component": "mediawiki",
      "publishedDate": "Jul 03, 2025",
      "detailUrl": "...",
      "additionalResources": [
        { "title": "NVD CVE", "url": "..." },
        { "title": "Wordfence Analysis", "url": "..." }
      ]
    }
  ]
}
````

---

## 3. Technical Implementation

### 3.1. Project Setup

```bash
mkdir wiz-cve-scraper
cd wiz-cve-scraper
npm init -y
npm install puppeteer fs-extra
```

### 3.2. Dependencies

* **puppeteer**: Browser automation + scraping
* **fs‑extra**: JSON read/write utilities
* Headless browser setup with viewport config and user‑agent

### 3.3. Core Code Structure (e.g. `app.js`)

```js
const puppeteer = require('puppeteer');
const fs = require('fs-extra');

class WizCVEScraper {
  constructor(){ this.browser = null; this.page = null; this.cveData = []; }
  async initialize(){
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox','--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  }
  async scrapeAllCVEs(){
    await this.page.goto('https://www.wiz.io/vulnerability-database/cve/search', {
      waitUntil: 'networkidle2', timeout: 30000
    });
    await this.loadAllCVEs();
    const cveList = await this.extractCVEList();
    for(const c of cveList){
      const details = await this.processCVEDetails(c);
      this.cveData.push(details);
    }
    return this.cveData;
  }
  async loadAllCVEs(){
    // Repeatedly click “Load more” until no more to load
  }
  async extractCVEList(){
    // Scrape table rows → CVE IDs, scores, metadata + URLs
  }
  async processCVEDetails(cve){
    // Open CVE detail page, extract links from “Additional resources”
  }
}
```

---

## 4. Handle Infinite Scroll

* Detect “Load more” button via CSS selectors
* Click until disabled or hidden
* Wait for new entries to render (e.g. `networkidle`, DOM changes)
* Retry logic + timeouts

---

## 5. Data Extraction Strategy

### 5.1. CVE Table

* Use `page.$$eval()` to collect rows
* Extract fields: ID, severity, score, technologies, component, publish date, URL

### 5.2. CVE Detail Pages

* Visit each CVE URL
* Query "Additional resources" section
* Return list of link titles + URLs

---

## 6. JSON Output Structure

Top-level JSON should include:

* `scrapeDate` (ISO timestamp)
* `totalCVEs` (count)
* `cveData` (array of detailed objects, each with fields as above)

---

## 7. Error Handling & Robustness

* Use `try/catch` for all navigation & scraping steps
* Retry on network failures or timeouts
* Respect rate limiting: use delays (e.g. `await page.waitForTimeout(...)`)
* Gracefully log errors; skip problematic entries

---

## 8. Performance Optimizations

* Fetch detail pages concurrently (with a concurrency cap)
* Use a pool of browser pages
* Cache processed CVEs to avoid duplicates
* Optimize DOM queries (minimal selectors)
* Show progress (e.g. via console logs or a progress bar)

---

## 9. Configuration / Customization

* Accept config options: max concurrency, delay between loads, filters (date range, severity)
* Support resume functionality via checkpoints
* Allow output filename customization

---

## 10. Testing & Validation

* Unit tests for helper functions (e.g. extractors)
* Validate output JSON schema
* Include sample run results
* Monitor performance (time, memory)

---

## 11. Bonus Features

* **API Endpoint**: Use Express.js to trigger scraping
* **Scheduler**: Cron-based triggering
* **Analytics**: Generate stats & trends

---

## ✅ Deliverables Checklist

* [ ] Fully functional Node.js app as per specs
* [ ] `README.md` with installation, usage & troubleshooting
* [ ] `package.json` with scripts (e.g. `start`, `test`)
* [ ] Example JSON output files
* [ ] Logging and robust error handling
* [ ] (Optional) Bonus features if implemented

---

### References

1. Wiz CVE search: `https://www.wiz.io/vulnerability-database/cve/search`
2. Puppeteer infinite scroll patterns, etc.
3. JSON parsing & storage guides

---