#!/usr/bin/env node
/**
 * Clean script - cross-platform alternative to rm -rf
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const dirsToClean = ['dist'];

function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

console.log('[*] Cleaning build artifacts...');

dirsToClean.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    deleteFolderRecursive(fullPath);
    console.log(`[OK] Removed: ${dir}`);
  }
});

console.log('[OK] Clean complete');
