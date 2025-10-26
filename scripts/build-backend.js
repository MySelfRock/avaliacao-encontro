#!/usr/bin/env node

import { execSync } from 'child_process';
import { renameSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

console.log('🔨 Building backend...');

// Step 1: Compile TypeScript to CommonJS
execSync('tsc server/index.ts server/database.ts --outDir dist/server --module commonjs --moduleResolution node --esModuleInterop true --skipLibCheck true --resolveJsonModule true', {
  stdio: 'inherit'
});

console.log('✅ TypeScript compiled to CommonJS');

// Step 2: Fix imports in .js files to use .cjs extension
function fixImports(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      fixImports(fullPath);
    } else if (extname(file) === '.js') {
      let content = readFileSync(fullPath, 'utf8');
      // Fix require('./module') to require('./module.cjs')
      // Fix require('../module') to require('../module.cjs')
      content = content.replace(/require\(["'](\.\.[\/\\][\w\/\\-]+)["']\)/g, 'require("$1.cjs")');
      content = content.replace(/require\(["'](\.[\/\\][\w\/\\-]+)["']\)/g, 'require("$1.cjs")');
      writeFileSync(fullPath, content, 'utf8');
    }
  }
}

fixImports('dist/server');
console.log('✅ Fixed imports to use .cjs extension');

// Step 3: Rename all .js files to .cjs recursively
function renameJsToCjs(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      renameJsToCjs(fullPath);
    } else if (extname(file) === '.js') {
      const newPath = fullPath.replace(/\.js$/, '.cjs');
      renameSync(fullPath, newPath);
      console.log(`  Renamed: ${file} → ${file.replace('.js', '.cjs')}`);
    }
  }
}

renameJsToCjs('dist/server');

console.log('✅ All .js files renamed to .cjs');
console.log('🎉 Backend build complete!');
