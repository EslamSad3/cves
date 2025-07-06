# Wiz CVE Scraper

A robust Node.js web-scraping tool using Puppeteer to extract CVE (Common Vulnerabilities and Exposures) data from the Wiz vulnerability database. This tool handles infinite scroll pagination, extracts detailed CVE information, and provides both CLI and API interfaces.

## 🚀 Features

- **Comprehensive CVE Data Extraction**: Scrapes CVE IDs, severity levels, CVSS scores, technologies, components, and publish dates
- **Infinite Scroll Handling**: Automatically loads all available CVE entries by clicking "Load more" buttons
- **Detail Page Processing**: Visits individual CVE pages to extract additional resources and links
- **Concurrent Processing**: Configurable concurrency for faster scraping with rate limiting
- **Robust Error Handling**: Retry mechanisms, graceful error recovery, and comprehensive logging
- **Checkpoint System**: Resume interrupted scraping sessions from the last checkpoint
- **Analytics Generation**: Automatic generation of statistics and trends from scraped data
- **REST API**: Web API for triggering scraping operations and managing schedules
- **Scheduled Scraping**: Cron-based scheduling for automated data collection
- **Data Validation**: Built-in validation for scraped CVE data
- **Multiple Output Formats**: JSON output with timestamps and structured data

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager
- At least 2GB of available RAM
- Stable internet connection

## 🛠️ Installation

1. **Clone or download the project**:
   ```bash
   git clone <repository-url>
   cd wiz-cve-scraper
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file to customize configuration:
   ```env
   HEADLESS=false
   MAX_CONCURRENCY=3
   DELAY_BETWEEN_REQUESTS=1000
   OUTPUT_DIR=./output
   LOG_LEVEL=info
   ```

4. **Create required directories**:
   ```bash
   mkdir -p output logs checkpoints
   ```

## 🎯 Usage

### Command Line Interface (CLI)

#### Basic Scraping
```bash
# Start basic scraping operation
npm run scrape

# Or use the direct command
node src/app.js scrape
```

#### Advanced Options
```bash
# Scrape with custom concurrency and delay
node src/app.js scrape --concurrency 5 --delay 2000

# Limit the number of CVEs to process
node src/app.js scrape --max-cves 100

# Run in headless mode
node src/app.js scrape --headless

# Custom output filename
node src/app.js scrape --output my_cve_data

# Resume from last checkpoint
node src/app.js scrape --resume
```

#### Analytics and Validation
```bash
# Generate analytics from existing data
node src/app.js analytics output/cve_data_latest.json

# Validate data file structure
node src/app.js validate output/cve_data_latest.json

# Check for available checkpoints
node src/app.js resume
```

### REST API

#### Start the API Server
```bash
# Start the API server
npm run api

# Or directly
node src/api.js
```

The API server will start on `http://localhost:3000` by default.

#### API Endpoints

**Health Check**
```bash
GET /health
```

**Start Scraping**
```bash
POST /api/scrape
Content-Type: application/json

{
  "maxConcurrency": 3,
  "delayBetweenRequests": 1000,
  "maxCVEs": 100,
  "outputFilename": "custom_output"
}
```

**Get Scraping Status**
```bash
GET /api/status
GET /api/scrape/{jobId}
```

**Schedule Scraping**
```bash
POST /api/schedule
Content-Type: application/json

{
  "name": "daily_scrape",
  "cronExpression": "0 2 * * *",
  "options": {
    "maxConcurrency": 2,
    "outputFilename": "daily_cve_data"
  }
}
```

**Generate Analytics**
```bash
POST /api/analytics
Content-Type: application/json

{
  "filePath": "./output/cve_data_latest.json"
}
```

**List Output Files**
```bash
GET /api/files
```

## 📊 Output Format

The scraper generates JSON files with the following structure:

```json
{
  "scrapeDate": "2025-01-07T10:30:00.000Z",
  "totalCVEs": 1500,
  "cveData": [
    {
      "cveId": "CVE-2025-0001",
      "severity": "HIGH",
      "score": 8.8,
      "technologies": ["Linux", "Apache"],
      "component": "httpd",
      "publishedDate": "Jan 05, 2025",
      "detailUrl": "https://www.wiz.io/vulnerability-database/cve/CVE-2025-0001",
      "additionalResources": [
        {
          "title": "NVD Reference",
          "url": "https://nvd.nist.gov/vuln/detail/CVE-2025-0001"
        },
        {
          "title": "Vendor Advisory",
          "url": "https://httpd.apache.org/security/vulnerabilities_24.html"
        }
      ]
    }
  ]
}
```

## 📈 Analytics Output

Analytics files include comprehensive statistics:

```json
{
  "generatedAt": "2025-01-07T10:35:00.000Z",
  "dataSource": "./output/cve_data_2025-01-07.json",
  "analytics": {
    "total": 1500,
    "averageScore": "7.2",
    "severityDistribution": {
      "CRITICAL": 45,
      "HIGH": 312,
      "MEDIUM": 890,
      "LOW": 253
    },
    "scoreDistribution": {
      "0-3": 180,
      "3-7": 720,
      "7-9": 480,
      "9-10": 120
    },
    "topTechnologies": {
      "Linux": 456,
      "Windows": 234,
      "Apache": 189
    },
    "topComponents": {
      "kernel": 123,
      "openssl": 89,
      "nginx": 67
    },
    "withAdditionalResources": 1245
  }
}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HEADLESS` | `false` | Run browser in headless mode |
| `BROWSER_TIMEOUT` | `30000` | Browser timeout in milliseconds |
| `MAX_CONCURRENCY` | `3` | Maximum concurrent page processing |
| `DELAY_BETWEEN_REQUESTS` | `1000` | Delay between requests in milliseconds |
| `RETRY_ATTEMPTS` | `3` | Number of retry attempts for failed operations |
| `OUTPUT_DIR` | `./output` | Directory for output files |
| `LOG_LEVEL` | `info` | Logging level (error, warn, info, debug) |
| `API_PORT` | `3000` | API server port |
| `SAVE_CHECKPOINTS` | `true` | Enable checkpoint saving |
| `CHECKPOINT_INTERVAL` | `100` | Save checkpoint every N processed CVEs |

### Browser Configuration

The scraper uses Puppeteer with optimized settings:
- Disabled images, stylesheets, and fonts for faster loading
- Custom user agent to avoid detection
- Request interception for resource optimization
- Configurable viewport size
- Robust error handling for page crashes

## 🔧 Troubleshooting

### Common Issues

**1. Browser Launch Failures**
```bash
# Install required dependencies (Linux)
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

# Or run with additional flags
node src/app.js scrape --headless
```

**2. Memory Issues**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 src/app.js scrape

# Reduce concurrency
node src/app.js scrape --concurrency 1
```

**3. Network Timeouts**
```bash
# Increase delays and reduce concurrency
node src/app.js scrape --delay 3000 --concurrency 1
```

**4. Selector Issues**
- The scraper includes multiple fallback selectors
- Check the logs for specific selector failures
- Update selectors in `src/config/index.js` if the website structure changes

### Debugging

**Enable Debug Logging**
```bash
# Set log level to debug
LOG_LEVEL=debug node src/app.js scrape
```

**Run with Browser Visible**
```bash
# Disable headless mode to see browser actions
HEADLESS=false node src/app.js scrape
```

**Check Logs**
```bash
# View recent logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## 📁 Project Structure

```
wiz-cve-scraper/
├── src/
│   ├── config/
│   │   └── index.js          # Configuration management
│   ├── scraper/
│   │   └── WizCVEScraper.js  # Main scraper class
│   ├── utils/
│   │   ├── logger.js         # Logging utilities
│   │   └── helpers.js        # Helper functions
│   ├── app.js                # CLI application
│   └── api.js                # REST API server
├── output/                   # Generated data files
├── logs/                     # Log files
├── checkpoints/              # Checkpoint files
├── tests/                    # Test files
├── package.json
├── .env.example
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

- This tool is for educational and research purposes only
- Respect the target website's robots.txt and terms of service
- Use appropriate delays to avoid overwhelming the server
- The tool includes built-in rate limiting and respectful scraping practices

## 🔗 References

- [Wiz Vulnerability Database](https://www.wiz.io/vulnerability-database/cve/search)
- [Puppeteer Documentation](https://pptr.dev/)
- [CVE Details Format](https://cve.mitre.org/)
- [CVSS Scoring](https://www.first.org/cvss/)

---

**Happy Scraping! 🕷️**