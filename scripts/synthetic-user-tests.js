/**
 * Daily Synthetic User Tests for Second Chance
 * Simulates real user interactions with critical crisis support features
 */

const puppeteer = require('puppeteer');
const { emailService } = require('./email-notifications');
const { todoGenerator } = require('./todo-generator');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3001',
  headless: process.env.HEADLESS !== 'false',
  slowMo: 50, // Slow down actions for stability
  timeout: 30000, // 30 second timeout per test

  // Critical features to test
  criticalPaths: [
    'crisis-hotline-access',
    'offline-crisis-resources',
    'user-login',
    'admin-request',
    'recovery-tracking'
  ],

  // Schedule (cron format)
  schedule: {
    daily: '0 6 * * *', // 6 AM daily
    hourly: '0 * * * *', // Every hour for critical features
    continuous: '*/15 * * * *' // Every 15 minutes for crisis resources
  }
};

class SyntheticUserTests {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.criticalFailures = [];
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: TEST_CONFIG.headless,
        slowMo: TEST_CONFIG.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();

      // Set viewport for mobile
      await this.page.setViewport({
        width: 375,
        height: 812,
        isMobile: true
      });

      // Set user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) SecondChance/1.0'
      );

      console.log('✅ Browser initialized for synthetic testing');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Test 1: Crisis Hotline Access (CRITICAL)
   */
  async testCrisisHotlineAccess() {
    const testName = 'Crisis Hotline Access';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      await this.page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });

      // Check if crisis button is visible
      const crisisButton = await this.page.$('[data-testid="crisis-button"], .crisis-button, #crisis-help');
      if (!crisisButton) {
        throw new Error('Crisis button not found on page');
      }

      // Click crisis button
      await crisisButton.click();
      await this.page.waitForTimeout(1000);

      // Verify crisis resources are displayed
      const resources = await this.page.evaluate(() => {
        const text = document.body.innerText;
        return {
          has988: text.includes('988'),
          has741741: text.includes('741741'),
          hasSAMHSA: text.includes('SAMHSA') || text.includes('1-800-662')
        };
      });

      if (!resources.has988 || !resources.has741741) {
        throw new Error('Critical crisis resources not displayed');
      }

      // Test phone links
      const phoneLinks = await this.page.$$('a[href^="tel:"]');
      if (phoneLinks.length < 2) {
        throw new Error('Crisis phone links not functional');
      }

      this.recordSuccess(testName, 'All crisis resources accessible');
    } catch (error) {
      this.recordFailure(testName, error.message, true); // Critical failure

      // Immediate escalation for crisis system failure
      await this.escalateCrisisFailure(error);
    }
  }

  /**
   * Test 2: Offline Crisis Resources
   */
  async testOfflineCrisisResources() {
    const testName = 'Offline Crisis Resources';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      // Load page normally first
      await this.page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });

      // Go offline
      await this.page.setOfflineMode(true);
      console.log('📵 Gone offline');

      // Try to access crisis resources
      await this.page.reload({ waitUntil: 'domcontentloaded' });

      // Check if crisis resources are still available
      const offlineResources = await this.page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('988') || text.includes('741741');
      });

      if (!offlineResources) {
        throw new Error('Crisis resources not available offline');
      }

      // Go back online
      await this.page.setOfflineMode(false);

      this.recordSuccess(testName, 'Crisis resources work offline');
    } catch (error) {
      this.recordFailure(testName, error.message, true); // Critical failure
    }
  }

  /**
   * Test 3: User Login Flow
   */
  async testUserLogin() {
    const testName = 'User Login';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      await this.page.goto(`${TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' });

      // Fill login form
      await this.page.type('#email, [name="email"]', 'test.user@secondchance.com');
      await this.page.type('#password, [name="password"]', 'TestPassword123!');

      // Submit form
      await this.page.click('[type="submit"], #login-button');

      // Wait for navigation or success message
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        .catch(() => this.page.waitForSelector('.success-message, .dashboard', { timeout: 10000 }));

      // Check if logged in
      const isLoggedIn = await this.page.evaluate(() => {
        return document.body.innerText.includes('Dashboard') ||
               document.body.innerText.includes('Welcome') ||
               document.querySelector('.user-menu') !== null;
      });

      if (!isLoggedIn) {
        throw new Error('Login flow not working');
      }

      this.recordSuccess(testName, 'User login successful');
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * Test 4: Admin Request Flow
   */
  async testAdminRequest() {
    const testName = 'Admin Request';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      await this.page.goto(`${TEST_CONFIG.baseUrl}/request-access`, { waitUntil: 'networkidle2' });

      // Fill request form
      await this.page.type('#user-name, [name="name"]', 'Test User');
      await this.page.type('#reason, [name="reason"]', 'Synthetic test - please ignore');

      // Submit request
      await this.page.click('[type="submit"], #submit-request');

      // Wait for confirmation
      await this.page.waitForSelector('.confirmation, .success', { timeout: 10000 });

      this.recordSuccess(testName, 'Admin request submitted');
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * Test 5: Recovery Tracking
   */
  async testRecoveryTracking() {
    const testName = 'Recovery Tracking';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      // First login
      await this.testUserLogin();

      // Navigate to recovery dashboard
      await this.page.goto(`${TEST_CONFIG.baseUrl}/recovery`, { waitUntil: 'networkidle2' });

      // Check recovery elements
      const hasRecoveryFeatures = await this.page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('recovery') ||
               text.includes('progress') ||
               text.includes('days clean') ||
               text.includes('milestone');
      });

      if (!hasRecoveryFeatures) {
        throw new Error('Recovery tracking features not found');
      }

      this.recordSuccess(testName, 'Recovery tracking accessible');
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * Test 6: App Monitoring Display
   */
  async testAppMonitoring() {
    const testName = 'App Monitoring';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      await this.page.goto(`${TEST_CONFIG.baseUrl}/monitoring`, { waitUntil: 'networkidle2' });

      // Check for monitored apps list
      const hasMonitoringFeatures = await this.page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('snapchat') ||
               text.includes('telegram') ||
               text.includes('instagram') ||
               text.includes('monitoring');
      });

      if (!hasMonitoringFeatures) {
        throw new Error('App monitoring features not displayed');
      }

      this.recordSuccess(testName, 'App monitoring functional');
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * Test 7: Performance Check
   */
  async testPerformance() {
    const testName = 'Performance';
    console.log(`\n🧪 Testing: ${testName}`);

    try {
      const startTime = Date.now();

      await this.page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle2' });

      const loadTime = Date.now() - startTime;

      if (loadTime > 3000) {
        throw new Error(`Page load time ${loadTime}ms exceeds 3 second threshold`);
      }

      // Check Core Web Vitals
      const metrics = await this.page.evaluate(() => {
        return {
          FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          LCP: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime,
          CLS: 0 // Would need more sophisticated measurement
        };
      });

      if (metrics.LCP > 2500) {
        throw new Error(`LCP ${metrics.LCP}ms exceeds threshold`);
      }

      this.recordSuccess(testName, `Load time: ${loadTime}ms`);
    } catch (error) {
      this.recordFailure(testName, error.message);
    }
  }

  /**
   * Run all synthetic tests
   */
  async runAllTests() {
    console.log('\n🚀 Starting Synthetic User Tests');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`🌐 URL: ${TEST_CONFIG.baseUrl}`);
    console.log('=' .repeat(50));

    this.results = [];
    this.criticalFailures = [];

    try {
      await this.initialize();

      // Run tests in sequence
      await this.testCrisisHotlineAccess();
      await this.testOfflineCrisisResources();
      await this.testUserLogin();
      await this.testAdminRequest();
      await this.testRecoveryTracking();
      await this.testAppMonitoring();
      await this.testPerformance();

    } catch (error) {
      console.error('❌ Test suite error:', error);
    } finally {
      await this.cleanup();
      await this.generateReport();
      await this.handleFailures();
    }
  }

  /**
   * Record test success
   */
  recordSuccess(testName, details) {
    console.log(`✅ PASS: ${testName}`);
    if (details) console.log(`   ${details}`);

    this.results.push({
      test: testName,
      status: 'passed',
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record test failure
   */
  recordFailure(testName, error, critical = false) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Error: ${error}`);

    const failure = {
      test: testName,
      status: 'failed',
      error,
      critical,
      timestamp: new Date().toISOString(),
      screenshot: null
    };

    this.results.push(failure);

    if (critical) {
      this.criticalFailures.push(failure);
    }

    // Take screenshot on failure
    this.takeScreenshot(testName);
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(testName) {
    try {
      const screenshotDir = path.join(__dirname, '..', 'test-screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });

      const filename = `${testName.replace(/\s+/g, '-')}-${Date.now()}.png`;
      const filepath = path.join(screenshotDir, filename);

      await this.page.screenshot({ path: filepath, fullPage: true });
      console.log(`📸 Screenshot saved: ${filename}`);

      return filename;
    } catch (error) {
      console.error('Failed to take screenshot:', error.message);
    }
  }

  /**
   * Escalate crisis system failure
   */
  async escalateCrisisFailure(error) {
    console.error('\n🚨 CRITICAL: CRISIS SYSTEM FAILURE DETECTED 🚨');

    // Create urgent TODO
    await todoGenerator.generateFromCrisisSystemFailure({
      component: 'Crisis Hotline Access',
      error: error.message,
      impact: 'Users cannot access crisis support resources',
      timestamp: new Date().toISOString()
    });

    // Send emergency notification
    await emailService.sendCrisisAlert({
      message: error.message,
      system: 'Crisis Support System',
      impact: 'Critical - Users cannot access crisis resources'
    });

    // Log to emergency file
    const emergencyLog = path.join(__dirname, '..', 'EMERGENCY-CRISIS-FAILURE.log');
    await fs.appendFile(emergencyLog, `
[${new Date().toISOString()}]
CRISIS SYSTEM FAILURE
Error: ${error.message}
Action Required: IMMEDIATE
---
`);
  }

  /**
   * Generate test report
   */
  async generateReport() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const critical = this.criticalFailures.length;

    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    if (critical > 0) {
      console.log(`🚨 CRITICAL FAILURES: ${critical}`);
    }
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    // Save report to file
    const reportDir = path.join(__dirname, '..', 'synthetic-test-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const reportFile = path.join(reportDir, `report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed,
        failed,
        critical,
        successRate: ((passed / this.results.length) * 100).toFixed(1)
      },
      results: this.results,
      criticalFailures: this.criticalFailures
    }, null, 2));

    console.log(`\n📝 Report saved: ${reportFile}`);
  }

  /**
   * Handle test failures
   */
  async handleFailures() {
    if (this.results.filter(r => r.status === 'failed').length === 0) {
      console.log('\n🎉 All tests passed!');
      return;
    }

    // Generate TODOs for failures
    const failures = this.results.filter(r => r.status === 'failed');

    if (failures.length > 0) {
      await todoGenerator.generateFromTestFailure({
        suite: 'Synthetic User Tests',
        failures: failures.map(f => ({
          name: f.test,
          error: f.error,
          severity: f.critical ? 'critical' : 'normal'
        }))
      });
    }

    // Send email notification
    await emailService.sendTestResults({
      suite: 'Synthetic User Tests',
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: failures.length,
      errors: failures.map(f => `${f.test}: ${f.error}`)
    });
  }

  /**
   * Cleanup browser
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('\n🧹 Browser closed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }
}

// Export
const syntheticTests = new SyntheticUserTests();

module.exports = {
  syntheticTests,
  SyntheticUserTests,
  TEST_CONFIG
};

// CLI usage
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const command = args[0];

    switch(command) {
      case 'run':
        await syntheticTests.runAllTests();
        break;

      case 'crisis':
        // Test only crisis features
        await syntheticTests.initialize();
        await syntheticTests.testCrisisHotlineAccess();
        await syntheticTests.testOfflineCrisisResources();
        await syntheticTests.cleanup();
        await syntheticTests.generateReport();
        break;

      case 'schedule':
        console.log('Setting up scheduled synthetic tests...');
        const cron = require('node-cron');

        // Every 15 minutes for crisis features
        cron.schedule(TEST_CONFIG.schedule.continuous, async () => {
          console.log('\n⏰ Running scheduled crisis tests...');
          await syntheticTests.initialize();
          await syntheticTests.testCrisisHotlineAccess();
          await syntheticTests.cleanup();
        });

        // Daily full test suite
        cron.schedule(TEST_CONFIG.schedule.daily, async () => {
          console.log('\n⏰ Running daily full test suite...');
          await syntheticTests.runAllTests();
        });

        console.log('✅ Scheduled tests are running');
        console.log('Press Ctrl+C to stop');
        break;

      default:
        console.log('Usage: node synthetic-user-tests.js [run|crisis|schedule]');
        console.log('  run      - Run all tests once');
        console.log('  crisis   - Run only crisis feature tests');
        console.log('  schedule - Start scheduled test runner');
    }
  })()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}