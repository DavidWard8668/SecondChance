/**
 * Automated TODO Generation System
 * Creates TODO items from test failures and system issues
 */

const fs = require('fs').promises;
const path = require('path');
const { emailService } = require('./email-notifications');

class TodoGenerator {
  constructor() {
    this.todoDir = path.join(__dirname, '..', 'todos');
    this.failurePatterns = {
      test: /test.*fail|fail.*test|error.*test|test.*error/i,
      build: /build.*fail|compilation.*error|bundle.*fail/i,
      security: /security|vulnerability|exploit|unsafe/i,
      performance: /timeout|slow|performance|memory.*leak/i,
      crisis: /crisis|988|741741|emergency|hotline/i
    };
  }

  /**
   * Initialize TODO generator
   */
  async initialize() {
    await fs.mkdir(this.todoDir, { recursive: true });
    await fs.mkdir(path.join(this.todoDir, 'archive'), { recursive: true });
    console.log('✅ TODO Generator initialized');
  }

  /**
   * Generate TODO from test failure
   */
  async generateFromTestFailure(testResult) {
    const todos = [];

    // Process each failed test
    for (const failure of testResult.failures || []) {
      const priority = this.determinePriority(failure);
      const category = this.determineCategory(failure);

      const todo = {
        id: this.generateTodoId('TEST'),
        title: `Fix test: ${failure.name || failure.test || 'Unknown test'}`,
        description: this.formatFailureDescription(failure),
        priority,
        category,
        status: 'pending',
        created: new Date().toISOString(),
        source: 'test-failure',
        metadata: {
          suite: testResult.suite,
          file: failure.file,
          line: failure.line,
          error: failure.error,
          stack: failure.stack
        },
        assignee: null,
        labels: ['auto-generated', 'test-failure', category],
        estimatedEffort: this.estimateEffort(failure)
      };

      await this.saveTodo(todo);
      todos.push(todo);
    }

    // Send notification if high priority todos were created
    const highPriorityTodos = todos.filter(t => t.priority === 'critical' || t.priority === 'high');
    if (highPriorityTodos.length > 0) {
      await emailService.sendNotification('test_failure', {
        suite: testResult.suite,
        failed: testResult.failures.length,
        highPriorityCount: highPriorityTodos.length,
        todos: highPriorityTodos.map(t => ({ id: t.id, title: t.title }))
      });
    }

    return todos;
  }

  /**
   * Generate TODO from build failure
   */
  async generateFromBuildFailure(buildResult) {
    const todo = {
      id: this.generateTodoId('BUILD'),
      title: `Fix build failure: ${buildResult.project || 'Unknown project'}`,
      description: this.formatBuildFailure(buildResult),
      priority: 'high',
      category: 'build',
      status: 'pending',
      created: new Date().toISOString(),
      source: 'build-failure',
      metadata: buildResult,
      assignee: null,
      labels: ['auto-generated', 'build-failure'],
      estimatedEffort: 'medium'
    };

    await this.saveTodo(todo);

    // Send notification
    await emailService.sendNotification('build_failure', {
      project: buildResult.project,
      error: buildResult.error,
      todoId: todo.id
    });

    return todo;
  }

  /**
   * Generate TODO from security issue
   */
  async generateFromSecurityIssue(issue) {
    const todo = {
      id: this.generateTodoId('SEC'),
      title: `Security: ${issue.title || issue.vulnerability || 'Security issue detected'}`,
      description: this.formatSecurityIssue(issue),
      priority: 'critical',
      category: 'security',
      status: 'pending',
      created: new Date().toISOString(),
      source: 'security-scan',
      metadata: issue,
      assignee: null,
      labels: ['auto-generated', 'security', issue.severity || 'high'],
      estimatedEffort: 'high',
      deadline: this.calculateDeadline(issue.severity)
    };

    await this.saveTodo(todo);

    // Send urgent notification
    await emailService.sendNotification('security_alert', {
      severity: issue.severity,
      issue: issue.title,
      components: issue.components,
      todoId: todo.id,
      action: `Review and fix TODO ${todo.id} immediately`
    });

    return todo;
  }

  /**
   * Generate TODO from performance issue
   */
  async generateFromPerformanceIssue(perfData) {
    const todo = {
      id: this.generateTodoId('PERF'),
      title: `Performance: ${perfData.metric} exceeds threshold`,
      description: this.formatPerformanceIssue(perfData),
      priority: perfData.severity === 'critical' ? 'high' : 'medium',
      category: 'performance',
      status: 'pending',
      created: new Date().toISOString(),
      source: 'performance-monitoring',
      metadata: perfData,
      assignee: null,
      labels: ['auto-generated', 'performance', perfData.metric],
      estimatedEffort: 'medium'
    };

    await this.saveTodo(todo);
    return todo;
  }

  /**
   * Generate TODO from crisis system failure
   */
  async generateFromCrisisSystemFailure(failure) {
    const todo = {
      id: this.generateTodoId('CRISIS'),
      title: `🚨 CRITICAL: Crisis system failure - ${failure.component}`,
      description: this.formatCrisisFailure(failure),
      priority: 'critical',
      category: 'crisis-system',
      status: 'pending',
      created: new Date().toISOString(),
      source: 'crisis-monitoring',
      metadata: failure,
      assignee: 'emergency-team',
      labels: ['auto-generated', 'crisis', 'urgent', 'safety-critical'],
      estimatedEffort: 'immediate',
      deadline: new Date(Date.now() + 3600000).toISOString() // 1 hour deadline
    };

    await this.saveTodo(todo);

    // Send emergency notification
    await emailService.sendCrisisAlert({
      message: failure.error,
      system: failure.component,
      impact: 'Users cannot access crisis resources',
      todoId: todo.id
    });

    return todo;
  }

  /**
   * Determine priority based on failure details
   */
  determinePriority(failure) {
    const errorText = `${failure.error} ${failure.message}`.toLowerCase();

    if (this.failurePatterns.crisis.test(errorText)) {
      return 'critical';
    }
    if (this.failurePatterns.security.test(errorText)) {
      return 'critical';
    }
    if (failure.severity === 'critical' || failure.blocking) {
      return 'high';
    }
    if (this.failurePatterns.performance.test(errorText)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine category based on failure details
   */
  determineCategory(failure) {
    const errorText = `${failure.error} ${failure.message} ${failure.name}`.toLowerCase();

    if (this.failurePatterns.crisis.test(errorText)) {
      return 'crisis-system';
    }
    if (this.failurePatterns.security.test(errorText)) {
      return 'security';
    }
    if (this.failurePatterns.performance.test(errorText)) {
      return 'performance';
    }
    if (this.failurePatterns.build.test(errorText)) {
      return 'build';
    }
    return 'general';
  }

  /**
   * Estimate effort required
   */
  estimateEffort(failure) {
    if (failure.complexity === 'high' || failure.dependencies > 3) {
      return 'high';
    }
    if (failure.complexity === 'medium' || failure.dependencies > 1) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate deadline for critical issues
   */
  calculateDeadline(severity) {
    const now = Date.now();
    const deadlines = {
      critical: 3600000,    // 1 hour
      high: 86400000,       // 24 hours
      medium: 259200000,    // 3 days
      low: 604800000        // 1 week
    };
    return new Date(now + (deadlines[severity] || deadlines.medium)).toISOString();
  }

  /**
   * Format failure description
   */
  formatFailureDescription(failure) {
    return `
## Test Failure Details

**Test**: ${failure.name || 'Unknown'}
**File**: ${failure.file || 'Unknown'}
**Line**: ${failure.line || 'Unknown'}

### Error Message
\`\`\`
${failure.error || failure.message || 'No error message'}
\`\`\`

### Stack Trace
\`\`\`
${failure.stack || 'No stack trace available'}
\`\`\`

### Reproduction Steps
1. Run test suite: ${failure.suite || 'Unknown'}
2. Test will fail at: ${failure.file}:${failure.line}
3. Review error message and stack trace

### Suggested Actions
- Review recent code changes in affected file
- Check test dependencies and mocks
- Verify test data and fixtures
- Run test in isolation to confirm failure
`.trim();
  }

  /**
   * Format build failure
   */
  formatBuildFailure(buildResult) {
    return `
## Build Failure Details

**Project**: ${buildResult.project || 'Unknown'}
**Build Type**: ${buildResult.type || 'Unknown'}
**Time**: ${buildResult.timestamp || new Date().toISOString()}

### Error
\`\`\`
${buildResult.error || 'No error details'}
\`\`\`

### Build Log (last 100 lines)
\`\`\`
${buildResult.log || 'No log available'}
\`\`\`

### Suggested Actions
- Check dependencies and package versions
- Clear build cache and retry
- Review recent code changes
- Check build configuration
`.trim();
  }

  /**
   * Format security issue
   */
  formatSecurityIssue(issue) {
    return `
## Security Issue Details

⚠️ **SECURITY VULNERABILITY DETECTED** ⚠️

**Vulnerability**: ${issue.vulnerability || 'Unknown'}
**Severity**: ${issue.severity || 'High'}
**Component**: ${issue.component || 'Unknown'}
**CVSS Score**: ${issue.cvss || 'N/A'}

### Description
${issue.description || 'No description available'}

### Affected Components
${issue.components ? issue.components.map(c => `- ${c}`).join('\n') : 'Unknown'}

### Remediation
${issue.remediation || 'Update to latest secure version'}

### References
${issue.references ? issue.references.map(r => `- ${r}`).join('\n') : 'No references available'}

### Required Actions
1. **IMMEDIATE**: Review and assess impact
2. Apply recommended fixes
3. Test thoroughly
4. Deploy patch
5. Notify affected users if necessary
`.trim();
  }

  /**
   * Format performance issue
   */
  formatPerformanceIssue(perfData) {
    return `
## Performance Issue Details

**Metric**: ${perfData.metric || 'Unknown'}
**Current Value**: ${perfData.value || 'N/A'}
**Threshold**: ${perfData.threshold || 'N/A'}
**Exceeded By**: ${perfData.exceededBy || 'N/A'}

### Impact
${perfData.impact || 'Performance degradation detected'}

### Affected Areas
${perfData.areas ? perfData.areas.map(a => `- ${a}`).join('\n') : 'Unknown'}

### Suggested Optimizations
- Profile application to identify bottlenecks
- Review database queries
- Check for memory leaks
- Optimize bundle size
- Implement caching
`.trim();
  }

  /**
   * Format crisis system failure
   */
  formatCrisisFailure(failure) {
    return `
# 🚨 CRITICAL: CRISIS SYSTEM FAILURE 🚨

**THIS IS AN EMERGENCY - IMMEDIATE ACTION REQUIRED**

## Failure Details

**Component**: ${failure.component || 'Unknown'}
**Error**: ${failure.error || 'Unknown error'}
**Time**: ${failure.timestamp || new Date().toISOString()}
**Impact**: ${failure.impact || 'Crisis resources may be unavailable'}

## IMMEDIATE ACTIONS REQUIRED

1. ✅ **Verify Crisis Hotlines**
   - Test 988 Suicide Prevention Lifeline
   - Test 741741 Crisis Text Line
   - Ensure offline access works

2. ✅ **Deploy Hotfix**
   - Revert to last known good version if needed
   - Deploy emergency patch
   - Verify fix in production

3. ✅ **Monitor Systems**
   - Check all crisis endpoints
   - Monitor error rates
   - Verify user access

4. ✅ **Communication**
   - Alert on-call team
   - Prepare status page update
   - Draft user communication if needed

## Error Details
\`\`\`
${failure.stack || failure.error || 'No error details available'}
\`\`\`

**⏰ Deadline: ${new Date(Date.now() + 3600000).toLocaleString()} (1 hour)**
`.trim();
  }

  /**
   * Generate unique TODO ID
   */
  generateTodoId(prefix = 'TODO') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Save TODO to file
   */
  async saveTodo(todo) {
    const filename = `${todo.id}.json`;
    const filepath = path.join(this.todoDir, filename);

    await fs.writeFile(filepath, JSON.stringify(todo, null, 2));
    console.log(`✅ TODO created: ${todo.id} - ${todo.title}`);

    // Also create markdown version for better readability
    const mdFilepath = path.join(this.todoDir, `${todo.id}.md`);
    const mdContent = this.generateMarkdown(todo);
    await fs.writeFile(mdFilepath, mdContent);
  }

  /**
   * Generate markdown for TODO
   */
  generateMarkdown(todo) {
    return `
# TODO: ${todo.title}

**ID**: ${todo.id}
**Priority**: ${todo.priority}
**Category**: ${todo.category}
**Status**: ${todo.status}
**Created**: ${todo.created}
${todo.deadline ? `**Deadline**: ${todo.deadline}` : ''}
${todo.assignee ? `**Assignee**: ${todo.assignee}` : ''}

## Description

${todo.description}

## Labels

${todo.labels.map(l => `\`${l}\``).join(' ')}

## Metadata

\`\`\`json
${JSON.stringify(todo.metadata, null, 2)}
\`\`\`
`.trim();
  }

  /**
   * Get all TODOs
   */
  async getAllTodos() {
    const files = await fs.readdir(this.todoDir);
    const todos = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = path.join(this.todoDir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        todos.push(JSON.parse(content));
      }
    }

    return todos;
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const todos = await this.getAllTodos();

    const stats = {
      total: todos.length,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      overdue: 0,
      critical: 0
    };

    const now = Date.now();

    for (const todo of todos) {
      stats.byStatus[todo.status] = (stats.byStatus[todo.status] || 0) + 1;
      stats.byPriority[todo.priority] = (stats.byPriority[todo.priority] || 0) + 1;
      stats.byCategory[todo.category] = (stats.byCategory[todo.category] || 0) + 1;

      if (todo.priority === 'critical') stats.critical++;
      if (todo.deadline && new Date(todo.deadline).getTime() < now) stats.overdue++;
    }

    return stats;
  }
}

// Export
const todoGenerator = new TodoGenerator();

module.exports = {
  todoGenerator,
  TodoGenerator
};

// CLI usage
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const command = args[0];

    await todoGenerator.initialize();

    switch(command) {
      case 'test-failure':
        console.log('Generating TODO from test failure...');
        const testTodos = await todoGenerator.generateFromTestFailure({
          suite: 'E2E Tests',
          failures: [
            {
              name: 'Crisis button should be accessible',
              error: 'Crisis button not found',
              file: 'tests/e2e/crisis.test.js',
              line: 42
            }
          ]
        });
        console.log(`Created ${testTodos.length} TODOs`);
        break;

      case 'crisis':
        console.log('Generating TODO from crisis system failure...');
        const crisisTodo = await todoGenerator.generateFromCrisisSystemFailure({
          component: '988 Hotline Integration',
          error: 'Connection timeout to crisis API',
          impact: 'Users cannot access crisis resources'
        });
        console.log(`Created critical TODO: ${crisisTodo.id}`);
        break;

      case 'stats':
        console.log('TODO Statistics:');
        const stats = await todoGenerator.getStatistics();
        console.log(JSON.stringify(stats, null, 2));
        break;

      case 'list':
        console.log('All TODOs:');
        const todos = await todoGenerator.getAllTodos();
        todos.forEach(todo => {
          console.log(`- [${todo.priority}] ${todo.id}: ${todo.title}`);
        });
        break;

      default:
        console.log('Usage: node todo-generator.js [test-failure|crisis|stats|list]');
    }

    process.exit(0);
  })();
}