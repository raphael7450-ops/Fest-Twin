import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, 'artifacts');
const zipPath = path.join(artifactsDir, 'fest-twin-submission-package.zip');

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log('📦 Building Fest-Twin submission zip package...');

try {
  // Use PowerShell Compress-Archive for native zip creation
  const psCommand = `powershell -Command "Compress-Archive -Path '${rootDir}\\docs', '${rootDir}\\README.md', '${rootDir}\\package.json' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  console.log(`✅ Submission zip successfully created at: ${zipPath}`);
} catch (error) {
  console.error('❌ Failed to create submission zip archive:', error);
  process.exit(1);
}
