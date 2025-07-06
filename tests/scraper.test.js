const { validateCVEData, cleanText, parseCVSSScore } = require('../src/utils/helpers');

// Simple test without complex mocking
describe('Helper Functions', () => {
  describe('validateCVEData', () => {
    test('should validate correct CVE data', () => {
      const validCVE = {
        cveId: 'CVE-2025-0001',
        severity: 'HIGH',
        score: 8.5,
        technologies: ['Linux', 'Apache'],
        component: 'httpd',
        publishedDate: 'Jan 05, 2025',
        detailUrl: 'https://example.com/cve',
        additionalResources: [
          { title: 'NVD', url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-0001' }
        ]
      };

      const result = validateCVEData(validCVE);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid CVE ID', () => {
      const invalidCVE = {
        cveId: 'INVALID-ID',
        severity: 'HIGH',
        score: 8.5
      };

      const result = validateCVEData(invalidCVE);
      expect(result.error).toBeDefined();
    });
  });

  describe('cleanText', () => {
    test('should clean whitespace and newlines', () => {
      const dirtyText = '  Hello\n\tWorld  \r\n  ';
      const cleaned = cleanText(dirtyText);
      expect(cleaned).toBe('Hello World');
    });

    test('should handle empty and null values', () => {
      expect(cleanText('')).toBe('');
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
    });
  });

  describe('parseCVSSScore', () => {
    test('should parse valid scores', () => {
      expect(parseCVSSScore('8.5')).toBe(8.5);
      expect(parseCVSSScore('CVSS: 7.2')).toBe(7.2);
      expect(parseCVSSScore('10')).toBe(10);
      expect(parseCVSSScore('0.0')).toBe(0.0);
    });

    test('should handle invalid scores', () => {
      expect(parseCVSSScore('')).toBeNull();
      expect(parseCVSSScore(null)).toBeNull();
      expect(parseCVSSScore('No score')).toBeNull();
    });
  });
});