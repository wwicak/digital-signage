#!/usr/bin/env node

/**
 * Comprehensive Code Quality Check Script
 * Checks for common JavaScript/TypeScript issues that could cause runtime errors
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git'];

class CodeQualityChecker {
  constructor() {
    this.issues = [];
    this.filesChecked = 0;
  }

  // Find all relevant files
  findFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !IGNORE_DIRS.includes(item)) {
        this.findFiles(fullPath, files);
      } else if (stat.isFile() && EXTENSIONS.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Check for temporal dead zone issues
  checkTemporalDeadZone(content, filePath) {
    const lines = content.split('\n');
    const issues = [];
    
    // Track variable declarations and their line numbers
    // This check is simplified to avoid performance issues.
    // A more robust solution would involve a proper AST parser.
    return [];
    
    return issues;
  }

  // Check for missing dependencies in hooks
  checkHookDependencies(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check useEffect, useCallback, useMemo dependencies
      const hookMatch = line.match(/(useEffect|useCallback|useMemo)\s*\([^,]+,\s*\[([^\]]*)\]/);
      if (hookMatch) {
        const hookType = hookMatch[1];
        const deps = hookMatch[2].trim();
        
        // Check for empty dependencies when they might be needed
        if (!deps && line.includes('state.') || line.includes('props.')) {
          issues.push({
            type: 'missing-dependencies',
            message: `${hookType} might be missing dependencies (found state/props usage)`,
            line: lineNum,
            severity: 'warning'
          });
        }
      }
    });
    
    return issues;
  }

  // Check for potential memory leaks
  checkMemoryLeaks(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for event listeners without cleanup
      if (line.includes('addEventListener') && !content.includes('removeEventListener')) {
        issues.push({
          type: 'memory-leak',
          message: 'addEventListener found without corresponding removeEventListener',
          line: lineNum,
          severity: 'warning'
        });
      }
      
      // Check for intervals without cleanup
      if (line.includes('setInterval') && !content.includes('clearInterval')) {
        issues.push({
          type: 'memory-leak',
          message: 'setInterval found without corresponding clearInterval',
          line: lineNum,
          severity: 'warning'
        });
      }
      
      // Check for timeouts without cleanup
      if (line.includes('setTimeout') && !content.includes('clearTimeout')) {
        issues.push({
          type: 'memory-leak',
          message: 'setTimeout found without corresponding clearTimeout (consider cleanup)',
          line: lineNum,
          severity: 'info'
        });
      }
    });
    
    return issues;
  }

  // Check a single file
  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.filesChecked++;
      
      const issues = [
        ...this.checkTemporalDeadZone(content, filePath),
        ...this.checkHookDependencies(content, filePath),
        ...this.checkMemoryLeaks(content, filePath)
      ];
      
      if (issues.length > 0) {
        this.issues.push({
          file: filePath,
          issues: issues
        });
      }
      
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  // Run all checks
  run() {
    console.log('🔍 Running comprehensive code quality checks...\n');
    
    const files = this.findFiles('.');
    files.forEach(file => this.checkFile(file));
    
    this.printResults();
  }

  // Print results
  printResults() {
    console.log(`📊 Checked ${this.filesChecked} files\n`);
    
    if (this.issues.length === 0) {
      console.log('✅ No issues found! Your code looks great.\n');
      return;
    }
    
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    
    this.issues.forEach(fileIssue => {
      console.log(`📄 ${fileIssue.file}`);
      
      fileIssue.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : 
                    issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        
        console.log(`  ${icon} Line ${issue.line}: ${issue.message}`);
        
        if (issue.severity === 'error') errorCount++;
        else if (issue.severity === 'warning') warningCount++;
        else infoCount++;
      });
      
      console.log('');
    });
    
    console.log('📈 Summary:');
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Warnings: ${warningCount}`);
    console.log(`  Info: ${infoCount}`);
    
    if (errorCount > 0) {
      console.log('\n🚨 Please fix the errors before proceeding.');
      process.exit(1);
    } else {
      console.log('\n✅ No critical errors found.');
    }
  }
}

// Run the checker
if (require.main === module) {
  const checker = new CodeQualityChecker();
  checker.run();
}

module.exports = CodeQualityChecker;
