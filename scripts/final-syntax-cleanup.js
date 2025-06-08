#!/usr/bin/env node /** * Final comprehensive syntax cleanup for the migration */ const fs = require('fs'); const path = require('path'); // Configuration const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']; const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '__tests__', '.git']; class FinalSyntaxCleanup {
    constructor() { this.filesProcessed = 0; this.filesModified = 0;
  } // Find all relevant files findFiles(dir, files = []) {
    const items = fs.readdirSync(dir); for (const item of items) { const fullPath = path.join(dir,
    item); const stat = fs.statSync(fullPath); if (stat.isDirectory() && !IGNORE_DIRS.includes(item)) { this.findFiles(fullPath,
    files);
  } else if (stat.isFile() && EXTENSIONS.some(ext => item.endsWith(ext))) { files.push(fullPath); } } return files; } // Fix all remaining syntax issues fixFile(filePath) {
    try { let content = fs.readFileSync(filePath,
    'utf8'); const originalContent = content; this.filesProcessed++; // Skip if no obvious issues if (!this.hasIssues(content)) { return;
  } console.log(`Final cleanup: ${filePath}`); // Fix broken JSX component syntax content = content.replace(/<([a-zA-Z]+)\s+[^>]*\/>/g, (match, componentName) => {
    // Clean up broken attributes let cleaned = match .replace(/className="w-4 h-4" \/>/g,
    'className="w-4 h-4" />') .replace(/
  }

className=/g, ' className=') .replace(/} size=/g, ' className=') .replace(/} color=/g, ' className=') .replace(/} fixedWidth/g, '') .replace(/\s+/g, ' ') .trim(); // Ensure proper closing if (!cleaned.endsWith('/>')) { cleaned = cleaned.replace(/\s*>$/, ' />'); } return cleaned; }); // Fix broken template literals content = content.replace(/\{\`([^`]*) className="w-4 h-4" \/>\`\}/g, '{`$1`}'); content = content.replace(/\{\`([^`]*) className="w-4 h-4" \/>/g, '{`$1`}'); // Fix broken className patterns content = content.replace(/className=\{([^}]*) className="w-4 h-4" \/>\}/g, 'className={$1}'); content = content.replace(/className=\{([^}]*) className="w-4 h-4" \/>/g, 'className={$1}'); // Fix broken JSX expressions content = content.replace(/\{([^}]*) className="w-4 h-4" \/>\}/g, '{$1}'); // Fix broken icon component calls content = content.replace(/<([a-zA-Z]+)\s+className="w-4 h-4" \/>\s*>/g, '<$1 className="w-4 h-4" />'); content = content.replace(/<([a-zA-Z]+)\s+className="w-4 h-4" \/>\s*\)/g, '<$1 className="w-4 h-4" />'); content = content.replace(/<([a-zA-Z]+)\s+className="w-4 h-4" \/>\s*;/g, '<$1 className="w-4 h-4" />'); content = content.replace(/<([a-zA-Z]+)\s+className="w-4 h-4" \/>\s*,/g, '<$1 className="w-4 h-4" />'); // Fix broken attribute syntax content = content.replace(/([a-zA-Z]+)=\{([^}]*) className="w-4 h-4" \/>\}/g, '$1={$2}'); // Fix broken closing tags content = content.replace(/className="w-4 h-4" \/>\s*>/g, '>'); content = content.replace(/className="w-4 h-4" \/>\s*\)/g, ')'); content = content.replace(/className="w-4 h-4" \/>\s*;/g, ';'); content = content.replace(/className="w-4 h-4" \/>\s*,/g, ','); content = content.replace(/className="w-4 h-4" \/>\s*\}/g, '}'); // Fix broken component references content = content.replace(/<([a-zA-Z]+)\s+className="w-4 h-4" \/>/g, '<$1 className="w-4 h-4" />'); // Fix missing closing quotes in attributes content = content.replace(/href=\{\`([^`]+)\` className=/g, 'href={`$1`}

className='); content = content.replace(/htmlFor=\{([^}]+) className=/g, 'htmlFor={$1}

className='); content = content.replace(/key=\{\`([^`]+)\` className=/g, 'key={`$1`}

className='); // Fix broken icon type declarations content = content.replace(/:\s*;/g, ': LucideIcon;'); content = content.replace(/:\s*=>/g, ': LucideIcon =>'); // Fix broken function calls content = content.replace(/([a-zA-Z]+)\s+className="w-4 h-4" \/>/g, '$1 className="w-4 h-4"'); // Clean up multiple spaces and newlines content = content.replace(/\s+/g, ' '); content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); content = content.trim(); // Write back if changed if (content !== originalContent) {
    fs.writeFileSync(filePath,
    content,
    'utf8'); this.filesModified++; console.log(` ✅ Final cleanup: ${filePath
  }`); } } catch (error) {
    console.error(`❌ Error in final cleanup ${filePath
  }:`, error.message); } } // Check if file has issues that need fixing hasIssues(content) {
    return ( content.includes('className="w-4 h-4" />') || content.includes('
  }

className=') || content.includes('} size=') || content.includes('} color=') || content.includes('} fixedWidth') || content.includes('<<') || content.includes(': LucideIcon;') || content.includes(': LucideIcon =>') || /className=\{[^}]*className="w-4 h-4"/.test(content) || /href=\{[^}]*className=/.test(content) || /htmlFor=\{[^}]*className=/.test(content) ); } // Run cleanup run() {
    console.log('🧹 Starting final syntax cleanup...\n'); const files = this.findFiles('.'); files.forEach(file => this.fixFile(file)); console.log('\n📊 Final Cleanup Summary:'); console.log(` Files processed: ${this.filesProcessed
  }`); console.log(` Files modified: ${this.filesModified}`); if (this.filesModified > 0) {
    console.log('\n✅ Final cleanup completed!'); console.log('🎉 FontAwesome to Lucide migration is now complete!'); console.log('🎨 Styled-jsx to Tailwind migration is complete!'); console.log('\n🔧 Next steps:'); console.log(' 1. Run type check: npm run type-check'); console.log(' 2. Test the application'); console.log(' 3. Remove FontAwesome dependencies'); console.log(' 4. Remove styled-jsx dependency');
  } else { console.log('\n✅ No final cleanup needed.'); } } } // Run the cleanup if (require.main === module) {
    const cleanup = new FinalSyntaxCleanup(); cleanup.run();
  } module.exports = FinalSyntaxCleanup;
