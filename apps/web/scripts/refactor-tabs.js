#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/page.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = fileContent.split('\n');

// Find the start and end of the large conditional block
let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('[') && lines[i+1] && lines[i+1].trim().includes('"docs",') && lines[i+2] && lines[i+2].trim().includes('"ai",')) {
    startLine = i;
  }
  if (startLine !== -1 && lines[i].trim() === ')}') {
    // Check if this is the closing of the main conditional
    if (lines[i+1] && lines[i+1].trim() === '</div>') {
      if (lines[i+2] && lines[i+2].trim() === '</div>') {
        if (lines[i+3] && lines[i+3].trim().includes('<SettingsDialog')) {
          endLine = i;
          break;
        }
      }
    }
  }
}

console.log('Start line:', startLine);
console.log('End line:', endLine);

if (startLine !== -1 && endLine !== -1) {
  console.log('Lines to replace:', lines.slice(startLine, endLine + 1).length);
}
