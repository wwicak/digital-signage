#!/usr/bin/env node

/**
 * Styled-JSX to Tailwind CSS Migration Script
 * Converts styled-jsx blocks to Tailwind CSS classes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git'];

// CSS to Tailwind mappings
const cssToTailwind = {
  // Layout & Display
  'display: flex': 'flex',
  'display: inline-flex': 'inline-flex',
  'display: block': 'block',
  'display: inline-block': 'inline-block',
  'display: none': 'hidden',
  'flex-direction: row': 'flex-row',
  'flex-direction: column': 'flex-col',
  'justify-content: center': 'justify-center',
  'justify-content: space-between': 'justify-between',
  'justify-content: flex-start': 'justify-start',
  'justify-content: flex-end': 'justify-end',
  'align-items: center': 'items-center',
  'align-items: flex-start': 'items-start',
  'align-items: flex-end': 'items-end',
  'flex: 1': 'flex-1',
  'flex-wrap: wrap': 'flex-wrap',
  
  // Positioning
  'position: relative': 'relative',
  'position: absolute': 'absolute',
  'position: fixed': 'fixed',
  'position: sticky': 'sticky',
  
  // Spacing
  'margin: 0': 'm-0',
  'margin: auto': 'm-auto',
  'margin-top: 8px': 'mt-2',
  'margin-top: 16px': 'mt-4',
  'margin-top: 20px': 'mt-5',
  'margin-top: 24px': 'mt-6',
  'margin-bottom: 8px': 'mb-2',
  'margin-bottom: 16px': 'mb-4',
  'margin-bottom: 20px': 'mb-5',
  'margin-bottom: 24px': 'mb-6',
  'margin-left: 8px': 'ml-2',
  'margin-left: 16px': 'ml-4',
  'margin-right: 8px': 'mr-2',
  'margin-right: 16px': 'mr-4',
  'margin-right: 24px': 'mr-6',
  'padding: 8px': 'p-2',
  'padding: 16px': 'p-4',
  'padding: 20px': 'p-5',
  'padding: 24px': 'p-6',
  'padding-top: 8px': 'pt-2',
  'padding-bottom: 8px': 'pb-2',
  'padding-left: 8px': 'pl-2',
  'padding-right: 8px': 'pr-2',
  'padding-left: 16px': 'pl-4',
  'padding-right: 16px': 'pr-4',
  'padding-left: 10px': 'pl-2.5',
  'padding-right: 10px': 'pr-2.5',
  
  // Typography
  'font-family: \'Open Sans\', sans-serif': 'font-sans',
  'font-size: 14px': 'text-sm',
  'font-size: 16px': 'text-base',
  'font-size: 18px': 'text-lg',
  'font-size: 24px': 'text-2xl',
  'font-weight: 400': 'font-normal',
  'font-weight: 600': 'font-semibold',
  'font-weight: bold': 'font-bold',
  'text-align: center': 'text-center',
  'text-align: left': 'text-left',
  'text-align: right': 'text-right',
  'text-transform: uppercase': 'uppercase',
  'text-decoration: none': 'no-underline',
  'white-space: nowrap': 'whitespace-nowrap',
  'text-overflow: ellipsis': 'text-ellipsis',
  'overflow: hidden': 'overflow-hidden',
  'overflow: auto': 'overflow-auto',
  'overflow-y: auto': 'overflow-y-auto',
  
  // Colors
  'color: #4f4f4f': 'text-gray-600',
  'color: #6f6e6e': 'text-gray-500',
  'color: #828282': 'text-gray-500',
  'color: #878787': 'text-gray-500',
  'color: #928f8f': 'text-gray-500',
  'color: #666': 'text-gray-600',
  'color: #ffffff': 'text-white',
  'color: white': 'text-white',
  'color: #7bc043': 'text-primary',
  'background: white': 'bg-white',
  'background: #ffffff': 'bg-white',
  'background: #ededed': 'bg-gray-200',
  'background: #dfdfdf': 'bg-gray-300',
  'background: #f0f0f0': 'bg-gray-100',
  'background: #7bc043': 'bg-primary',
  'background: #e74c3c': 'bg-red-500',
  'background: #3ca9e7': 'bg-blue-500',
  'background-color: transparent': 'bg-transparent',
  
  // Borders
  'border: none': 'border-0',
  'border: 1px solid #eee': 'border border-gray-200',
  'border: 1px solid #e9ecef': 'border border-gray-200',
  'border-radius: 4px': 'rounded',
  'border-radius: 6px': 'rounded-md',
  'border-radius: 8px': 'rounded-lg',
  'border-radius: 50%': 'rounded-full',
  'border-bottom: 3px solid #aaa': 'border-b-2 border-gray-400',
  'border-b: 1px solid #gray-100': 'border-b border-gray-100',
  
  // Sizing
  'width: 100%': 'w-full',
  'height: 100%': 'h-full',
  'min-width: 256px': 'min-w-64',
  'min-width: 200px': 'min-w-48',
  'min-height: 64px': 'min-h-16',
  'max-width: 640px': 'max-w-2xl',
  'height: 32px': 'h-8',
  'height: 48px': 'h-12',
  'height: 64px': 'h-16',
  'min-height: 40px': 'min-h-10',
  
  // Effects
  'box-shadow: 0 1px 3px rgba(0,0,0,0.1)': 'shadow-sm',
  'box-shadow: 0 2px 6px rgba(0,0,0,0.15)': 'shadow-md',
  'transition: background-color 0.2s ease-in-out': 'transition-colors duration-200',
  'transition: box-shadow 0.2s ease-in-out': 'transition-shadow duration-200',
  'transition: colors 0.2s': 'transition-colors duration-200',
  'cursor: pointer': 'cursor-pointer',
  'outline: none': 'outline-none',
  
  // Hover states
  'hover:bg-gray-50': 'hover:bg-gray-50',
  'hover:bg-gray-100': 'hover:bg-gray-100',
  'hover:bg-green-600': 'hover:bg-green-600',
  'hover:text-gray-700': 'hover:text-gray-700',
  
  // Misc
  'vertical-align: middle': 'align-middle',
  'box-sizing: border-box': 'box-border',
  '-webkit-appearance: none': 'appearance-none',
  'list-style: none': 'list-none',
  'transform: scale(2)': 'scale-200',
};

class StyledJsxMigrator {
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

  // Convert CSS properties to Tailwind classes
  cssToTailwindClasses(cssText) {
    let classes = [];
    
    // Split CSS into individual properties
    const properties = cssText.split(';').map(prop => prop.trim()).filter(prop => prop);
    
    for (const property of properties) {
      const normalizedProp = property.replace(/\s+/g, ' ').trim();
      
      if (cssToTailwind[normalizedProp]) {
        classes.push(cssToTailwind[normalizedProp]);
      } else {
        // Handle numeric values dynamically
        const match = normalizedProp.match(/^(margin|padding|width|height|top|left|right|bottom)-?(top|bottom|left|right)?: (\d+)px$/);
        if (match) {
          const [, property, direction, value] = match;
          const tailwindValue = Math.round(parseInt(value) / 4); // Convert px to Tailwind scale
          
          let prefix = '';
          if (property === 'margin') prefix = 'm';
          else if (property === 'padding') prefix = 'p';
          else if (property === 'width') prefix = 'w';
          else if (property === 'height') prefix = 'h';
          
          if (direction) {
            if (direction === 'top') prefix += 't';
            else if (direction === 'bottom') prefix += 'b';
            else if (direction === 'left') prefix += 'l';
            else if (direction === 'right') prefix += 'r';
          }
          
          if (tailwindValue <= 96) { // Reasonable Tailwind scale limit
            classes.push(`${prefix}-${tailwindValue}`);
          }
        }
      }
    }
    
    return classes.join(' ');
  }

  // Process a single file
  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      this.filesProcessed++;
      
      // Skip if no styled-jsx
      if (!content.includes('<style jsx>') && !content.includes('style jsx')) {
        return;
      }
      
      console.log(`Processing: ${filePath}`);
      
      // Extract and convert styled-jsx blocks
      const styledJsxRegex = /<style jsx[^>]*>\s*\{\s*`([^`]+)`\s*\}\s*<\/style>/gs;
      const matches = [...content.matchAll(styledJsxRegex)];
      
      if (matches.length === 0) return;
      
      // Remove styled-jsx blocks
      content = content.replace(styledJsxRegex, '');
      
      // Extract CSS rules and convert to Tailwind
      for (const match of matches) {
        const cssContent = match[1];
        const rules = cssContent.match(/\.([^{]+)\s*\{([^}]+)\}/g) || [];
        
        for (const rule of rules) {
          const [, selector, properties] = rule.match(/\.([^{]+)\s*\{([^}]+)\}/) || [];
          if (selector && properties) {
            const tailwindClasses = this.cssToTailwindClasses(properties);
            if (tailwindClasses) {
              // Replace className references in the component
              const classNameRegex = new RegExp(`className=['"]${selector.trim()}['"]`, 'g');
              content = content.replace(classNameRegex, `className="${tailwindClasses}"`);
              
              // Also handle className={`${selector}`} patterns
              const templateClassNameRegex = new RegExp(`className=\\{\`${selector.trim()}\`\\}`, 'g');
              content = content.replace(templateClassNameRegex, `className="${tailwindClasses}"`);
            }
          }
        }
      }
      
      // Clean up empty lines
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      content = content.trim();
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.filesModified++;
        console.log(`  ✅ Migrated: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  // Run migration
  run() {
    console.log('🎨 Starting styled-jsx to Tailwind migration...\n');
    
    const files = this.findFiles('.');
    files.forEach(file => this.processFile(file));
    
    console.log('\n📊 Migration Summary:');
    console.log(`  Files processed: ${this.filesProcessed}`);
    console.log(`  Files modified: ${this.filesModified}`);
    
    if (this.filesModified > 0) {
      console.log('\n✅ Styled-jsx migration completed successfully!');
      console.log('🔧 Next steps:');
      console.log('  1. Review the converted Tailwind classes');
      console.log('  2. Test the styling in the browser');
      console.log('  3. Fine-tune any custom styles');
      console.log('  4. Remove styled-jsx dependency if no longer needed');
    } else {
      console.log('\n✅ No styled-jsx found to migrate.');
    }
  }
}

// Run the migrator
if (require.main === module) {
  const migrator = new StyledJsxMigrator();
  migrator.run();
}

module.exports = StyledJsxMigrator;
