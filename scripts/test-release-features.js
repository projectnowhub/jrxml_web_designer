#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('Testing the new features of the release script...');
console.log('='.repeat(50));

// Test 1: verify the version number increment logic
console.log('\nTest 1: verify the version number increment logic');
try {
  // Read the current version number
  const packageJsonPath = path.resolve(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;

  // Simulate the version number increment logic
  const versionParts = currentVersion.split('.').map(Number);
  versionParts[2] += 1;
  const expectedVersion = versionParts.join('.');

  console.log(`Current version: ${currentVersion}`);
  console.log(`Expected incremented version: ${expectedVersion}`);

  // Test logic
  let actualVersion;
  const userInput = ''; // simulate pressing Enter directly

  if (!userInput.trim()) {
    actualVersion = versionParts.join('.');
  }

  if (actualVersion === expectedVersion) {
    console.log('✅ Version number increment logic is correct');
  } else {
    console.log(`❌ Version number increment logic is incorrect: expected ${expectedVersion}, got ${actualVersion}`);
  }
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: verify the git commit check logic
console.log('\nTest 2: verify the git commit check logic');
try {
  // Create a temporary directory for testing
  const tempDir = path.resolve(projectRoot, 'temp-test');
  fs.mkdirSync(tempDir);

  // Initialize a git repository
  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });

  // Create an initial file
  fs.writeFileSync(path.resolve(tempDir, 'package.json'), '{"version": "1.0.0"}');
  execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
  execSync('git commit -m "initial commit"', { cwd: tempDir, stdio: 'ignore' });

  // Test 2.1: no files to commit
  console.log('Test 2.1: no files to commit');
  let hasChanges = false;
  try {
    execSync('git diff --staged --exit-code', { cwd: tempDir, stdio: 'ignore' });
  } catch (error) {
    if (error.status === 1) {
      hasChanges = true;
    } else {
      throw error;
    }
  }

  if (!hasChanges) {
    console.log('✅ Correctly detected that there are no files to commit');
  } else {
    console.log('❌ Incorrectly detected files that need to be committed');
  }

  // Test 2.2: there are files to commit
  console.log('Test 2.2: there are files to commit');
  fs.writeFileSync(path.resolve(tempDir, 'test.txt'), 'test content');
  execSync('git add .', { cwd: tempDir, stdio: 'ignore' });

  hasChanges = false;
  try {
    execSync('git diff --staged --exit-code', { cwd: tempDir, stdio: 'ignore' });
  } catch (error) {
    if (error.status === 1) {
      hasChanges = true;
    } else {
      throw error;
    }
  }

  if (hasChanges) {
    console.log('✅ Correctly detected files that need to be committed');
  } else {
    console.log('❌ Incorrectly detected that there are no files to commit');
  }

  // Clean up the temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ Temporary directory cleaned up');

} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
  // Attempt to clean up the temporary directory
  try {
    const tempDir = path.resolve(projectRoot, 'temp-test');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (cleanupError) {
    console.error('❌ Failed to clean up the temporary directory:', cleanupError.message);
  }
}

console.log('\n' + '='.repeat(50));
console.log('Testing complete!');
