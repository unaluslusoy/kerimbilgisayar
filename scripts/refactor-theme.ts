import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (filepath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

walkDir('./src', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/bg-\[\#2271b1\]/g, 'bg-primary');
  content = content.replace(/text-\[\#2271b1\]/g, 'text-primary');
  content = content.replace(/border-\[\#2271b1\]/g, 'border-primary');
  content = content.replace(/ring-\[\#2271b1\]/g, 'ring-primary');
  content = content.replace(/bg-\[\#135e96\]/g, 'bg-secondary');
  content = content.replace(/text-\[\#135e96\]/g, 'text-secondary');
  content = content.replace(/hover:bg-\[\#135e96\]/g, 'hover:bg-secondary');
  
  // Public layout standard colors
  content = content.replace(/bg-blue-600/g, 'bg-primary');
  content = content.replace(/text-blue-600/g, 'text-primary');
  content = content.replace(/border-blue-600/g, 'border-primary');
  content = content.replace(/hover:text-blue-600/g, 'hover:text-primary');
  content = content.replace(/hover:bg-blue-700/g, 'hover:bg-secondary');
  content = content.replace(/from-blue-600/g, 'from-primary');
  content = content.replace(/to-blue-800/g, 'to-secondary');
  
  // Custom radius
  content = content.replace(/rounded-lg/g, 'rounded-theme');
  content = content.replace(/rounded-xl/g, 'rounded-theme');
  content = content.replace(/rounded-2xl/g, 'rounded-theme');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Updated', filepath);
  }
});
console.log('Done!');
