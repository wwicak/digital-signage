#!/usr/bin/env node

/**
 * Cleanup script for FontAwesome to Lucide migration
 * Fixes issues caused by the automated migration
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git'];

class MigrationCleanup {
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

  // Clean up a single file
  cleanupFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      this.filesProcessed++;
      
      // Skip if no issues to fix
      if (!content.includes('') && !content.includes(' className=')) {
        return;
      }
      
      console.log(`Cleaning: ${filePath}`);
      
      // Fix broken icon syntax
      content = content.replace(/ icon=\{([^}]+)\}/g, '<$1 className="w-4 h-4" />');
      content = content.replace(//g, '');
      
      // Fix broken className patterns
      content = content.replace(/ className=/g, ' className=');
      content = content.replace(/ className=/g, ' className=');
      content = content.replace(/ className=/g, ' className=');
      content = content.replace(//g, '');
      
      // Fix broken icon references
      content = content.replace(/icon=\{fa([A-Z][a-zA-Z]*)\}/g, (match, iconName) => {
        // Map common FontAwesome icons to Lucide equivalents
        const iconMap = {
          'Check': 'Check',
          'Times': 'X',
          'Edit': 'Edit',
          'Trash': 'Trash2',
          'Plus': 'Plus',
          'Minus': 'Minus',
          'Eye': 'Eye',
          'User': 'User',
          'Cog': 'Settings',
          'Gear': 'Settings',
          'Key': 'Key',
          'Tv': 'Tv',
          'ThLarge': 'Grid3X3',
          'Th': 'Grid2X2',
          'Images': 'Images',
          'Image': 'Image',
          'Play': 'Play',
          'Pause': 'Pause',
          'Stop': 'Stop',
          'Clock': 'Clock',
          'Calendar': 'Calendar',
          'Link': 'ExternalLink',
          'ExternalLink': 'ExternalLink',
          'Download': 'Download',
          'Upload': 'Upload',
          'Save': 'Save',
          'SignOut': 'LogOut',
          'SignOutAlt': 'LogOut',
          'CaretDown': 'ChevronDown',
          'ChevronDown': 'ChevronDown',
          'ChevronUp': 'ChevronUp',
          'WindowRestore': 'Layout',
          'Chromecast': 'Cast',
          'Mobile': 'Smartphone',
          'Tablet': 'Tablet',
          'Desktop': 'Monitor',
          'Laptop': 'Monitor',
          'AngleLeft': 'ChevronLeft'
        };
        
        const lucideIcon = iconMap[iconName] || iconName;
        return `<${lucideIcon className="w-4 h-4" />`;
      });
      
      // Remove excessive imports
      const lines = content.split('\n');
      const cleanedLines = lines.filter(line => {
        // Remove lines with excessive Lucide imports
        if (line.includes('import {') && line.includes('lucide-react') && line.length > 200) {
          return false;
        }
        return true;
      });
      
      content = cleanedLines.join('\n');
      
      // Clean up empty lines and formatting
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      content = content.replace(/^\s*\n/, '');
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.filesModified++;
        console.log(`  ✅ Cleaned: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error cleaning ${filePath}:`, error.message);
    }
  }

  // Run cleanup
  run() {
    console.log('🧹 Starting migration cleanup...\n');
    
    const files = this.findFiles('.');
    files.forEach(file => this.cleanupFile(file));
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`  Files processed: ${this.filesProcessed}`);
    console.log(`  Files modified: ${this.filesModified}`);
    
    if (this.filesModified > 0) {
      console.log('\n✅ Cleanup completed successfully!');
    } else {
      console.log('\n✅ No files needed cleanup.');
    }
  }
}

// Run the cleanup
if (require.main === module) {
  const cleanup = new MigrationCleanup();
  cleanup.run();
}

module.exports = MigrationCleanup;
