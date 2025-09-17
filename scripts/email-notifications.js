/**
 * Email Notification System for Second Chance
 * Sends test results and system events to exiledev8668@gmail.com
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Email configuration
const EMAIL_CONFIG = {
  recipient: 'exiledev8668@gmail.com',
  from: 'secondchance.notifications@gmail.com',
  subject_prefix: '[Second Chance]',
  
  // SMTP configuration (using Gmail as example)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'secondchance.notifications@gmail.com',
      pass: process.env.SMTP_PASS || '' // App-specific password needed
    }
  }
};

// Email templates
const TEMPLATES = {
  test_results: {
    subject: 'Test Results',
    priority: 'normal'
  },
  test_failure: {
    subject: '⚠️ Test Failure Detected',
    priority: 'high'
  },
  build_success: {
    subject: '✅ Build Successful',
    priority: 'normal'
  },
  build_failure: {
    subject: '❌ Build Failed',
    priority: 'high'
  },
  security_alert: {
    subject: '🚨 Security Alert',
    priority: 'urgent'
  },
  performance_issue: {
    subject: '⚡ Performance Issue Detected',
    priority: 'high'
  },
  bug_report: {
    subject: '🐛 Bug Report Received',
    priority: 'normal'
  },
  crisis_system_error: {
    subject: '🆘 Crisis System Error',
    priority: 'urgent'
  }
};

class EmailNotificationService {
  constructor() {
    this.transporter = null;
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the email service
   */
  async initialize() {
    try {
      // Create transporter
      this.transporter = nodemailer.createTransport(EMAIL_CONFIG.smtp);
      
      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      console.log('📝 Please configure SMTP settings in environment variables:');
      console.log('   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      return false;
    }
  }

  /**
   * Send an email notification
   */
  async sendNotification(type, data) {
    const template = TEMPLATES[type] || TEMPLATES.bug_report;
    
    const emailData = {
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.recipient,
      subject: `${EMAIL_CONFIG.subject_prefix} ${template.subject}`,
      html: this.generateEmailBody(type, data),
      priority: template.priority,
      headers: {
        'X-Priority': template.priority === 'urgent' ? '1' : template.priority === 'high' ? '2' : '3',
        'X-Second-Chance-Type': type,
        'X-Second-Chance-Timestamp': new Date().toISOString()
      }
    };

    // Add to queue
    this.queue.push(emailData);
    
    // Process queue
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Process email queue
   */
  async processQueue() {
    if (this.queue.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const email = this.queue.shift();
      
      try {
        if (this.transporter) {
          const info = await this.transporter.sendMail(email);
          console.log(`✅ Email sent: ${email.subject} (${info.messageId})`);
        } else {
          // Fallback: Log to file if email service not available
          await this.logToFile(email);
        }
      } catch (error) {
        console.error(`❌ Failed to send email: ${error.message}`);
        await this.logToFile(email);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Generate email body HTML
   */
  generateEmailBody(type, data) {
    const timestamp = new Date().toLocaleString();
    
    let body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 10px; background: #e5e7eb; text-align: center; font-size: 12px; }
          .data { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .error { color: #dc2626; font-weight: bold; }
          .success { color: #16a34a; font-weight: bold; }
          .warning { color: #ea580c; font-weight: bold; }
          pre { background: #1f2937; color: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Second Chance Notification</h1>
          <p>Type: ${type} | Time: ${timestamp}</p>
        </div>
        <div class="content">
    `;

    // Add type-specific content
    switch(type) {
      case 'test_failure':
        body += this.formatTestFailure(data);
        break;
      case 'build_failure':
        body += this.formatBuildFailure(data);
        break;
      case 'security_alert':
        body += this.formatSecurityAlert(data);
        break;
      case 'crisis_system_error':
        body += this.formatCrisisError(data);
        break;
      default:
        body += this.formatGenericData(data);
    }

    body += `
        </div>
        <div class="footer">
          <p>Second Chance Recovery Support System - Automated Notification</p>
          <p>For critical issues, please check the system immediately</p>
        </div>
      </body>
      </html>
    `;

    return body;
  }

  formatTestFailure(data) {
    return `
      <h2 class="error">Test Failure Detected</h2>
      <div class="data">
        <p><strong>Test Suite:</strong> ${data.suite || 'Unknown'}</p>
        <p><strong>Failed Tests:</strong> ${data.failed || 0}</p>
        <p><strong>Passed Tests:</strong> ${data.passed || 0}</p>
        ${data.errors ? `<pre>${JSON.stringify(data.errors, null, 2)}</pre>` : ''}
        ${data.suggestions ? `<p><strong>Suggested Actions:</strong></p><ul>${data.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
      </div>
    `;
  }

  formatBuildFailure(data) {
    return `
      <h2 class="error">Build Failed</h2>
      <div class="data">
        <p><strong>Build Type:</strong> ${data.type || 'Unknown'}</p>
        <p><strong>Error:</strong> ${data.error || 'Unknown error'}</p>
        ${data.log ? `<pre>${data.log}</pre>` : ''}
      </div>
    `;
  }

  formatSecurityAlert(data) {
    return `
      <h2 class="error">🚨 Security Alert</h2>
      <div class="data">
        <p><strong>Severity:</strong> ${data.severity || 'Unknown'}</p>
        <p><strong>Issue:</strong> ${data.issue || 'Unknown issue'}</p>
        <p><strong>Affected Components:</strong> ${data.components || 'Unknown'}</p>
        <p><strong>Immediate Action Required:</strong> ${data.action || 'Review security logs'}</p>
      </div>
    `;
  }

  formatCrisisError(data) {
    return `
      <h2 class="error">🆘 CRITICAL: Crisis System Error</h2>
      <div class="data" style="border: 2px solid red;">
        <p class="error">IMMEDIATE ATTENTION REQUIRED</p>
        <p><strong>Error:</strong> ${data.error || 'Unknown error'}</p>
        <p><strong>Affected System:</strong> ${data.system || 'Crisis Support System'}</p>
        <p><strong>Impact:</strong> ${data.impact || 'Users may not be able to access crisis resources'}</p>
        <p><strong>Action Required:</strong></p>
        <ol>
          <li>Check crisis support endpoints immediately</li>
          <li>Verify offline crisis resources are accessible</li>
          <li>Test 988 and 741741 links</li>
          <li>Deploy hotfix if needed</li>
        </ol>
      </div>
    `;
  }

  formatGenericData(data) {
    return `
      <div class="data">
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }

  /**
   * Fallback: Log email to file if SMTP not available
   */
  async logToFile(email) {
    const logDir = path.join(__dirname, '..', 'logs', 'email-notifications');
    await fs.mkdir(logDir, { recursive: true });
    
    const filename = `${new Date().toISOString().replace(/:/g, '-')}_${email.headers['X-Second-Chance-Type']}.json`;
    const filepath = path.join(logDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      ...email,
      timestamp: new Date().toISOString(),
      status: 'queued_for_manual_send'
    }, null, 2));
    
    console.log(`📝 Email queued to file: ${filepath}`);
  }

  /**
   * Send test results summary
   */
  async sendTestResults(results) {
    const hasFailures = results.failed > 0;
    const type = hasFailures ? 'test_failure' : 'test_results';
    
    await this.sendNotification(type, {
      suite: results.suite,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      duration: results.duration,
      errors: results.errors,
      suggestions: hasFailures ? [
        'Review failed test logs',
        'Check recent code changes',
        'Run tests locally to reproduce',
        'Create TODO items for fixes'
      ] : null
    });
  }

  /**
   * Send build status
   */
  async sendBuildStatus(success, details) {
    const type = success ? 'build_success' : 'build_failure';
    await this.sendNotification(type, details);
  }

  /**
   * Send crisis system alert
   */
  async sendCrisisAlert(error) {
    await this.sendNotification('crisis_system_error', {
      error: error.message,
      system: error.system,
      impact: error.impact,
      stack: error.stack
    });
  }
}

// Export singleton instance
const emailService = new EmailNotificationService();

module.exports = {
  emailService,
  EmailNotificationService,
  EMAIL_CONFIG,
  TEMPLATES
};

// CLI usage
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const command = args[0];
    
    await emailService.initialize();
    
    switch(command) {
      case 'test':
        console.log('Sending test email...');
        await emailService.sendNotification('test_results', {
          suite: 'Test Suite',
          passed: 10,
          failed: 0,
          duration: '5.2s'
        });
        break;
        
      case 'test-failure':
        console.log('Sending test failure email...');
        await emailService.sendTestResults({
          suite: 'E2E Tests',
          passed: 8,
          failed: 2,
          errors: ['Crisis button not responding', 'Login timeout']
        });
        break;
        
      case 'crisis':
        console.log('Sending crisis alert...');
        await emailService.sendCrisisAlert({
          message: 'Crisis support endpoint not responding',
          system: '988 Hotline Integration',
          impact: 'Critical - Users cannot access crisis resources'
        });
        break;
        
      default:
        console.log('Usage: node email-notifications.js [test|test-failure|crisis]');
    }
    
    // Allow time for emails to send
    setTimeout(() => process.exit(0), 5000);
  })();
}