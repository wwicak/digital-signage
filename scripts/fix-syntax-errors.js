#!/usr/bin/env node

/**
 * Fix syntax errors caused by migration scripts
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git'];

class SyntaxErrorFixer {
  constructor() {
    this.filesProcessed = 0;
    this.filesModified = 0;
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

  // Fix syntax errors in a single file
  fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      this.filesProcessed++;
      
      // Skip if no obvious syntax issues
      if (!content.includes('<<') && !content.includes('') && !content.includes(' className=')) {
        return;
      }
      
      console.log(`Fixing: ${filePath}`);
      
      // Fix broken icon syntax patterns
      content = content.replace(/<<([a-zA-Z]+)\s+[^>]*\/>/g, '<$1 ');
      content = content.replace(/<<([a-zA-Z]+)\s+[^>]*>/g, '<$1 className="w-4 h-4">');
      content = content.replace(/<<([a-zA-Z]+)/g, '<$1');
      
      // Fix broken className patterns
      content = content.replace(/className="w-4 h-4" \/>/g, '');
      content = content.replace(/ className="w-4 h-4" \/>/g, '}');
      content = content.replace(/className="w-4 h-4" \/>\s*>/g, '>');
      content = content.replace(/className="w-4 h-4" \/>\s*\)/g, ')');
      content = content.replace(/className="w-4 h-4" \/>\s*;/g, ';');
      content = content.replace(/className="w-4 h-4" \/>\s*,/g, ',');
      content = content.replace(/className="w-4 h-4" \/>\s*\}/g, '}');
      
      // Fix broken JSX patterns
      content = content.replace(/\) className="w-4 h-4" \/>/g, ')');
      content = content.replace(/ className=/g, ' className=');
      content = content.replace(/ className=/g, ' className=');
      content = content.replace(/ className=/g, ' className=');
      content = content.replace(//g, '');
      
      // Fix broken icon component patterns
      content = content.replace(/<\s+icon=\{([^}]+)\}[^>]*\/>/g, '<$1 ');
      content = content.replace(/<\s+icon=\{([^}]+)\}[^>]*>/g, '<$1 className="w-4 h-4">');
      
      // Fix broken template literals in className
      content = content.replace(/className=\{\`([^`]*) className="w-4 h-4" \/>\`\}/g, 'className={`$1`}');
      content = content.replace(/className=\{\`([^`]*) className="w-4 h-4" \/>/g, 'className={`$1`}');
      
      // Fix missing closing quotes
      content = content.replace(/href=\{\`([^`]+)\` className=/g, 'href={`$1`} className=');
      content = content.replace(/htmlFor=\{([^}]+) className=/g, 'htmlFor={$1} className=');
      
      // Fix broken icon type declarations
      content = content.replace(/icon:\s*;/g, 'icon: LucideIcon;');
      content = content.replace(/:\s*=>/g, ': LucideIcon =>');
      
      // Fix broken JSX expressions
      content = content.replace(/\{\s*\(\s*\)\s*className="w-4 h-4" \/>\s*\}/g, '');
      
      // Clean up empty lines and formatting
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      content = content.trim();
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.filesModified++;
        console.log(`  ✅ Fixed: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  }

  // Run fixer
  run() {
    console.log('🔧 Starting syntax error fixes...\n');
    
    const files = this.findFiles('.');
    files.forEach(file => this.fixFile(file));
    
    console.log('\n📊 Fix Summary:');
    console.log(`  Files processed: ${this.filesProcessed}`);
    console.log(`  Files modified: ${this.filesModified}`);
    
    if (this.filesModified > 0) {
      console.log('\n✅ Syntax fixes completed!');
    } else {
      console.log('\n✅ No syntax errors found.');
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new SyntaxErrorFixer();
  fixer.run();
}

module.exports = SyntaxErrorFixer;