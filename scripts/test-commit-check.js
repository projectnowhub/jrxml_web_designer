#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('Testing the git commit check logic...');
console.log('='.repeat(50));

// Test 1: when there are no files to commit
console.log('\nTest 1: when there are no files to commit');
try {
  execSync('git add .', { cwd: projectRoot, stdio: 'ignore' });

  let hasChanges = false;
  try {
    execSync('git diff --staged --exit-code', { cwd: projectRoot, stdio: 'ignore' });
  } catch (error) {
    if (error.status === 1) {
      hasChanges = true;
    } else {
      throw error;
    }
  }

  if (hasChanges) {
    console.log('❌ Expected: no files to commit, actual: files to commit were detected');
  } else {
    console.log('✅ Expected: no files to commit, actual: no files to commit were detected');
  }
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: when there are files to commit
console.log('\nTest 2: when there are files to commit');
try {
  // Create a temporary file
  const tempFilePath = path.resolve(projectRoot, 'temp-test-file.txt');
  fs.writeFileSync(tempFilePath, 'test content');

  execSync('git add .', { cwd: projectRoot, stdio: 'ignore' });

  let hasChanges = false;
  try {
    execSync('git diff --staged --exit-code', { cwd: projectRoot, stdio: 'ignore' });
  } catch (error) {
    if (error.status === 1) {
      hasChanges = true;
    } else {
      throw error;
    }
  }

  if (hasChanges) {
    console.log('✅ Expected: files to commit, actual: files to commit were detected');
  } else {
    console.log('❌ Expected: files to commit, actual: no files to commit were detected');
  }

  // Clean up the temporary file
  fs.unlinkSync(tempFilePath);
  execSync('git restore --staged .', { cwd: projectRoot, stdio: 'ignore' });
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
  // Attempt to clean up the temporary file
  try {
    const tempFilePath = path.resolve(projectRoot, 'temp-test-file.txt');
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      execSync('git restore --staged .', { cwd: projectRoot, stdio: 'ignore' });
    }
  } catch (cleanupError) {
    console.error('❌ Failed to clean up the temporary file:', cleanupError.message);
  }
}

console.log('\n' + '='.repeat(50));
console.log('Testing complete!');
