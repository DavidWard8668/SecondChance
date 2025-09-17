/**
 * Email Bug Monitoring System
 * Monitors email inbox for bug reports and processes them automatically
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const { emailService } = require('./email-notifications');

// Email monitoring configuration
const MONITOR_CONFIG = {
  email: 'exiledev8668@gmail.com',
  
  imap: {
    user: process.env.IMAP_USER || 'exiledev8668@gmail.com',
    password: process.env.IMAP_PASS || '',
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: process.env.IMAP_PORT || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  },
  
  // Bug report detection patterns
  patterns: {
    bug: /bug|issue|problem|error|crash|fail/i,
    critical: /critical|urgent|emergency|crisis|down/i,
    security: /security|vulnerability|exploit|breach/i,
    performance: /slow|lag|freeze|performance|timeout/i
  },
  
  // Folders to monitor
  folders: ['INBOX'],
  
  // Check interval (ms)
  checkInterval: 60000 // 1 minute
};

class EmailBugMonitor {
  constructor() {
    this.imap = null;
    this.isMonitoring = false;
    this.processedUIDs = new Set();
    this.bugReports = [];
  }

  /**
   * Start monitoring emails
   */
  async startMonitoring() {
    console.log('🔍 Starting email bug monitoring...');
    
    try {
      await this.connect();
      this.isMonitoring = true;
      
      // Initial check
      await this.checkForBugReports();
      
      // Set up interval
      this.monitorInterval = setInterval(async () => {
        if (this.isMonitoring) {
          await this.checkForBugReports();
        }
      }, MONITOR_CONFIG.checkInterval);
      
      console.log('✅ Email monitoring started successfully');
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error.message);
      throw error;
    }
  }

  /**
   * Connect to IMAP server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.imap = new Imap(MONITOR_CONFIG.imap);
      
      this.imap.once('ready', () => {
        console.log('✅ Connected to IMAP server');
        resolve();
      });
      
      this.imap.once('error', (err) => {
        console.error('❌ IMAP error:', err.message);
        reject(err);
      });
      
      this.imap.once('end', () => {
        console.log('🔚 IMAP connection ended');
      });
      
      this.imap.connect();
    });
  }

  /**
   * Check for bug reports in emails
   */
  async checkForBugReports() {
    try {
      for (const folder of MONITOR_CONFIG.folders) {
        await this.checkFolder(folder);
      }
    } catch (error) {
      console.error('❌ Error checking for bug reports:', error.message);
    }
  }

  /**
   * Check a specific folder for bug reports
   */
  checkFolder(folderName) {
    return new Promise((resolve, reject) => {
      this.imap.openBox(folderName, false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Search for unread emails
        this.imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (results.length === 0) {
            resolve();
            return;
          }
          
          console.log(`📧 Found ${results.length} unread emails`);
          
          const fetch = this.imap.fetch(results, {
            bodies: '',
            markSeen: true
          });
          
          fetch.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Parse error:', err);
                  return;
                }
                
                await this.processEmail(parsed);
              });
            });
          });
          
          fetch.once('error', (err) => {
            console.error('Fetch error:', err);
            reject(err);
          });
          
          fetch.once('end', () => {
            resolve();
          });
        });
      });
    });
  }

  /**
   * Process an email for bug reports
   */
  async processEmail(email) {
    const bugReport = {
      id: this.generateBugId(),
      from: email.from?.text || 'Unknown',
      subject: email.subject || 'No subject',
      date: email.date || new Date(),
      body: email.text || email.html || '',
      attachments: email.attachments || [],
      priority: 'normal',
      category: 'general',
      status: 'new'
    };

    // Detect bug type and priority
    const content = `${bugReport.subject} ${bugReport.body}`.toLowerCase();
    
    if (MONITOR_CONFIG.patterns.critical.test(content)) {
      bugReport.priority = 'critical';
    } else if (MONITOR_CONFIG.patterns.security.test(content)) {
      bugReport.priority = 'high';
      bugReport.category = 'security';
    } else if (MONITOR_CONFIG.patterns.performance.test(content)) {
      bugReport.category = 'performance';
    }
    
    // Check if it's actually a bug report
    if (MONITOR_CONFIG.patterns.bug.test(content)) {
      console.log(`🐛 Bug report detected: ${bugReport.subject}`);
      
      // Save bug report
      await this.saveBugReport(bugReport);
      
      // Create TODO item
      await this.createTodoFromBug(bugReport);
      
      // Send acknowledgment
      await this.sendAcknowledgment(bugReport);
    }
  }

  /**
   * Generate unique bug ID
   */
  generateBugId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `BUG-${timestamp}-${random}`;
  }

  /**
   * Save bug report to file
   */
  async saveBugReport(bugReport) {
    const bugDir = path.join(__dirname, '..', 'bug-reports');
    await fs.mkdir(bugDir, { recursive: true });
    
    const filename = `${bugReport.id}.json`;
    const filepath = path.join(bugDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(bugReport, null, 2));
    
    console.log(`💾 Bug report saved: ${filepath}`);
    
    this.bugReports.push(bugReport);
  }

  /**
   * Create TODO item from bug report
   */
  async createTodoFromBug(bugReport) {
    const todoDir = path.join(__dirname, '..', 'todos');
    await fs.mkdir(todoDir, { recursive: true });
    
    const todo = {
      id: `TODO-${bugReport.id}`,
      title: `Fix: ${bugReport.subject}`,
      description: bugReport.body.substring(0, 500),
      priority: bugReport.priority,
      category: bugReport.category,
      status: 'pending',
      created: new Date().toISOString(),
      bugReportId: bugReport.id,
      assignee: null,
      labels: ['bug', 'auto-generated', bugReport.category]
    };
    
    const filename = `${todo.id}.json`;
    const filepath = path.join(todoDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(todo, null, 2));
    
    console.log(`✅ TODO created: ${todo.title}`);
    
    // Send notification about new TODO
    await emailService.sendNotification('bug_report', {
      bugId: bugReport.id,
      title: bugReport.subject,
      priority: bugReport.priority,
      todoId: todo.id
    });
  }

  /**
   * Send acknowledgment for bug report
   */
  async sendAcknowledgment(bugReport) {
    console.log(`📨 Sending acknowledgment for bug ${bugReport.id}`);
    
    // In a real implementation, this would send an email back to the reporter
    // For now, just log it
    const ack = {
      to: bugReport.from,
      subject: `RE: ${bugReport.subject} - Bug Report Received`,
      body: `
        Thank you for reporting this issue.
        
        Bug ID: ${bugReport.id}
        Priority: ${bugReport.priority}
        Category: ${bugReport.category}
        
        Our team will investigate this issue and provide updates.
        
        For critical issues affecting user safety or crisis support,
        please contact our emergency support line immediately.
        
        Second Chance Support Team
      `
    };
    
    // Log acknowledgment
    const ackDir = path.join(__dirname, '..', 'bug-reports', 'acknowledgments');
    await fs.mkdir(ackDir, { recursive: true });
    await fs.writeFile(
      path.join(ackDir, `${bugReport.id}-ack.json`),
      JSON.stringify(ack, null, 2)
    );
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    console.log('🛑 Stopping email monitoring...');
    
    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
    
    console.log('✅ Email monitoring stopped');
  }

  /**
   * Get bug report statistics
   */
  getStatistics() {
    const stats = {
      total: this.bugReports.length,
      byPriority: {},
      byCategory: {},
      recent: this.bugReports.slice(-5)
    };
    
    for (const bug of this.bugReports) {
      stats.byPriority[bug.priority] = (stats.byPriority[bug.priority] || 0) + 1;
      stats.byCategory[bug.category] = (stats.byCategory[bug.category] || 0) + 1;
    }
    
    return stats;
  }
}

// Export
const bugMonitor = new EmailBugMonitor();

module.exports = {
  bugMonitor,
  EmailBugMonitor,
  MONITOR_CONFIG
};

// CLI usage
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch(command) {
      case 'start':
        console.log('Starting bug monitoring service...');
        await bugMonitor.startMonitoring();
        
        // Keep running
        process.on('SIGINT', () => {
          console.log('\n🛑 Shutting down...');
          bugMonitor.stopMonitoring();
          process.exit(0);
        });
        break;
        
      case 'test':
        console.log('Testing bug report processing...');
        await bugMonitor.processEmail({
          from: { text: 'test@example.com' },
          subject: 'Critical bug in login system',
          text: 'Users cannot login. This is critical and needs urgent attention.',
          date: new Date()
        });
        console.log('Test completed');
        process.exit(0);
        break;
        
      case 'stats':
        console.log('Bug Report Statistics:');
        console.log(JSON.stringify(bugMonitor.getStatistics(), null, 2));
        process.exit(0);
        break;
        
      default:
        console.log('Usage: node email-bug-monitor.js [start|test|stats]');
        console.log('');
        console.log('Environment variables needed:');
        console.log('  IMAP_USER - Email address to monitor');
        console.log('  IMAP_PASS - Email password');
        console.log('  IMAP_HOST - IMAP server (default: imap.gmail.com)');
        console.log('  IMAP_PORT - IMAP port (default: 993)');
        process.exit(1);
    }
  })();
}