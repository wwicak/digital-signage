#!/usr/bin/env node

/**
 * Automated FontAwesome to Lucide React Migration Script
 * This script automatically replaces FontAwesome icons with Lucide equivalents
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git'];

// FontAwesome to Lucide mapping
const iconMappings = {
  // Import mappings
  "  "  "  "  "  
  // Icon usage mappings
  'LucideIcon': 'LucideIcon',
  'icon={Edit}': 'icon={Edit}',
  'icon={X}': 'icon={X}',
  'icon={Trash2}': 'icon={Trash2}',
  'icon={Plus}': 'icon={Plus}',
  'icon={Minus}': 'icon={Minus}',
  'icon={Eye}': 'icon={Eye}',
  'icon={User}': 'icon={User}',
  'icon={Settings}': 'icon={Settings}',
  'icon={Settings}': 'icon={Settings}',
  'icon={Key}': 'icon={Key}',
  'icon={Tv}': 'icon={Tv}',
  'icon={Grid3X3}': 'icon={Grid3X3}',
  'icon={Grid2X2}': 'icon={Grid2X2}',
  'icon={Images}': 'icon={Images}',
  'icon={Image}': 'icon={Image}',
  'icon={Play}': 'icon={Play}',
  'icon={Pause}': 'icon={Pause}',
  'icon={Stop}': 'icon={Stop}',
  'icon={Clock}': 'icon={Clock}',
  'icon={Calendar}': 'icon={Calendar}',
  'icon={ExternalLink}': 'icon={ExternalLink}',
  'icon={ExternalLink}': 'icon={ExternalLink}',
  'icon={Download}': 'icon={Download}',
  'icon={Upload}': 'icon={Upload}',
  'icon={Save}': 'icon={Save}',
  'icon={LogOut}': 'icon={LogOut}',
  'icon={LogOut}': 'icon={LogOut}',
  'icon={ChevronDown}': 'icon={ChevronDown}',
  'icon={ChevronDown}': 'icon={ChevronDown}',
  'icon={ChevronUp}': 'icon={ChevronUp}',
  'icon={Layout}': 'icon={Layout}',
  'icon={Cast}': 'icon={Cast}',
  'icon={Smartphone}': 'icon={Smartphone}',
  'icon={Tablet}': 'icon={Tablet}',
  'icon={Monitor}': 'icon={Monitor}',
  'icon={Monitor}': 'icon={Monitor}',
  
  // Component usage patterns
  '<LucideIcon icon={': '<',
  '': '',
  ' className=': ' className=',
  ' className=': ' className=',
  '': '',
  '': '',
  'LucideIcon,': 'LucideIcon,',
  'LucideIcon': 'LucideIcon',
  'LucideIcon': 'LucideIcon',
};

// Lucide imports to add
const lucideImports = [
  'Edit', 'X', 'Trash2', 'Plus', 'Minus', 'Eye', 'User', 'Settings', 'Key',
  'Tv', 'Grid3X3', 'Grid2X2', 'Images', 'Image', 'Play', 'Pause', 'Stop',
  'Clock', 'Calendar', 'ExternalLink', 'Download', 'Upload', 'Save', 'LogOut',
  'ChevronDown', 'ChevronUp', 'Layout', 'Cast', 'Smartphone', 'Tablet', 'Monitor'
];

class FontAwesomeMigrator {
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

  // Process a single file
  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      this.filesProcessed++;
      
      // Check if file contains FontAwesome usage
      if (!content.includes('FontAwesome') && !content.includes('@fortawesome')) {
        return;
      }
      
      console.log(`Processing: ${filePath}`);
      
      // Remove FontAwesome imports
      content = content.replace(/      content = content.replace(/      content = content.replace(/      
      // Add Lucide imports if not already present
      if (!content.includes('lucide-react')) {
        const importLine = `import { ${lucideImports.join(', ')} } from 'lucide-react'\n`;
        
        // Find the last import statement
        const importRegex = /import.*from.*\n/g;
        const imports = content.match(importRegex) || [];
        if (imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          content = content.replace(lastImport, lastImport + importLine);
        } else {
          // Add at the beginning if no imports found
          content = importLine + content;
        }
      }
      
      // Apply icon mappings
      for (const [oldPattern, newPattern] of Object.entries(iconMappings)) {
        const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, newPattern);
      }
      
      // Replace FontAwesome component usage patterns
      content = content.replace(/<LucideIcon\s+icon=\{([^}]+)\}[^>]*\/>/g, (match, iconName) => {
        const cleanIconName = iconName.replace(/\s+as\s+LucideIcon/, '').trim();
        return `<${cleanIconName} className="w-4 h-4" />`;
      });
      
      // Clean up empty lines and formatting
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      content = content.replace(/^\s*\n/, '');
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.filesModified++;
        console.log(`  ✅ Modified: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Run migration
  run() {
    console.log('🔄 Starting FontAwesome to Lucide migration...\n');
    
    const files = this.findFiles('.');
    files.forEach(file => this.processFile(file));
    
    console.log('\n📊 Migration Summary:');
    console.log(`  Files processed: ${this.filesProcessed}`);
    console.log(`  Files modified: ${this.filesModified}`);
    
    if (this.filesModified > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('🔧 Next steps:');
      console.log('  1. Review the changes');
      console.log('  2. Run type check: npm run type-check');
      console.log('  3. Test the application');
      console.log('  4. Remove FontAwesome dependencies if no longer needed');
    } else {
      console.log('\n✅ No files needed migration.');
    }
  }
}

// Run the migrator
if (require.main === module) {
  const migrator = new FontAwesomeMigrator();
  migrator.run();
}

module.exports = FontAwesomeMigrator;
