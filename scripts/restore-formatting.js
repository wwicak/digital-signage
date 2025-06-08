#!/usr/bin/env node

/**
 * Restore proper formatting after aggressive cleanup
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git'];

class FormattingRestorer {
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

  // Restore proper formatting
  restoreFormatting(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      this.filesProcessed++;
      
      // Skip if file looks properly formatted (has multiple lines)
      const lineCount = content.split('\n').length;
      if (lineCount > 5) {
        return;
      }
      
      console.log(`Restoring formatting: ${filePath}`);
      
      // Add newlines after imports
      content = content.replace(/import ([^']+from [^']+['"][^'"]*['"])/g, 'import $1\n');
      
      // Add newlines after interface/type declarations
      content = content.replace(/(\})\s*(interface|type|const|class|function)/g, '$1\n\n$2');
      
      // Add newlines before and after function declarations
      content = content.replace(/(\})\s*(const\s+[a-zA-Z]+\s*[:=])/g, '$1\n\n$2');
      
      // Add newlines around JSX return statements
      content = content.replace(/(\})\s*(return\s*\()/g, '$1\n\n  $2');
      
      // Add newlines around component definitions
      content = content.replace(/(\})\s*(export\s+default)/g, '$1\n\n$2');
      
      // Add proper indentation for JSX
      content = content.replace(/(<[^>]+>)([^<]+)(<\/[^>]+>)/g, '$1\n    $2\n  $3');
      
      // Add newlines around object/array literals
      content = content.replace(/(\{[^}]{50,}\})/g, (match) => {
        return match.replace(/,\s*/g, ',\n    ').replace(/\{\s*/, '{\n    ').replace(/\s*\}/, '\n  }');
      });
      
      // Clean up excessive newlines
      content = content.replace(/\n{3,}/g, '\n\n');
      
      // Ensure file ends with newline
      if (!content.endsWith('\n')) {
        content += '\n';
      }
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.filesModified++;
        console.log(`  ✅ Restored: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error restoring ${filePath}:`, error.message);
    }
  }

  // Run restoration
  run() {
    console.log('📝 Restoring proper formatting...\n');
    
    const files = this.findFiles('.');
    files.forEach(file => this.restoreFormatting(file));
    
    console.log('\n📊 Formatting Restoration Summary:');
    console.log(`  Files processed: ${this.filesProcessed}`);
    console.log(`  Files modified: ${this.filesModified}`);
    
    if (this.filesModified > 0) {
      console.log('\n✅ Formatting restoration completed!');
      console.log('🔧 Recommendation: Run Prettier or your code formatter for final cleanup');
    } else {
      console.log('\n✅ No formatting restoration needed.');
    }
  }
}

// Run the restorer
if (require.main === module) {
  const restorer = new FormattingRestorer();
  restorer.run();
}

module.exports = FormattingRestorer;
