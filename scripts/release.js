#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read package.json
const packageJsonPath = path.resolve(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Read tauri.conf.json
const tauriConfPath = path.resolve(projectRoot, 'src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

// Get the current version number
const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// Prompt the user for the new version number
import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the new version number (format: x.y.z, press Enter to default to a patch bump): ', (userInput) => {
  rl.close();

  let newVersion;

  // If the user didn't enter a version number, default to bumping the patch version
  if (!userInput.trim()) {
    console.log('No version number entered, defaulting to a patch bump...');
    const versionParts = currentVersion.split('.').map(Number);
    versionParts[2] += 1;
    newVersion = versionParts.join('.');
    console.log(`Default version: ${newVersion}`);
  } else {
    // Validate the format of the version number entered by the user
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(userInput)) {
      console.error('Error: incorrect version number format, should be x.y.z');
      process.exit(1);
    }
    newVersion = userInput;
  }

  console.log(`\nStarting release of new version: ${newVersion}`);
  console.log('='.repeat(50));

  try {
    // 1. Update the version number in package.json
    console.log('1. Updating the version number in package.json...');
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✓ package.json version updated');

    // 2. Update the version number in tauri.conf.json
    console.log('2. Updating the version number in src-tauri/tauri.conf.json...');
    tauriConf.version = newVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
    console.log('✓ src-tauri/tauri.conf.json version updated');

    // 3. Run tests
    console.log('3. Running tests...');
    execSync('pnpm test', { cwd: projectRoot, stdio: 'inherit' });
    console.log('✓ Tests passed');

    // 4. Commit the code
    console.log('4. Committing the code...');
    execSync('git add .', { cwd: projectRoot, stdio: 'inherit' });

    // Check whether there are files that need to be committed
    let hasChanges = false;
    try {
      execSync('git diff --staged --exit-code', { cwd: projectRoot, stdio: 'ignore' });
    } catch (error) {
      // An exit code of 1 means there are files to commit
      if (error.status === 1) {
        hasChanges = true;
      } else {
        // Some other error, rethrow it
        throw error;
      }
    }

    if (hasChanges) {
      execSync(`git commit -m "chore(release): v${newVersion}"`, { cwd: projectRoot, stdio: 'inherit' });
      console.log('✓ Code committed');
    } else {
      console.log('✓ No files to commit, skipping commit');
    }

    // 5. Create the tag
    console.log('5. Creating the tag...');
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: projectRoot, stdio: 'inherit' });
    console.log('✓ Tag created');

    // 6. Push master and tags
    console.log('6. Pushing code and tags...');
    execSync('git push origin master', { cwd: projectRoot, stdio: 'inherit' });
    execSync('git push origin --tags', { cwd: projectRoot, stdio: 'inherit' });
    console.log('✓ Code and tags pushed');

    console.log('='.repeat(50));
    console.log(`🎉 New version v${newVersion} released successfully!`);

  } catch (error) {
    console.error('❌ Release failed:', error.message);
    process.exit(1);
  }
});
