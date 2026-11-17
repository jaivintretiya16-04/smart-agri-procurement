import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSuite(testFile) {
  return new Promise((resolve) => {
    console.log(`\n======================================================`);
    console.log(`🧪 Running Test Suite: ${testFile}`);
    console.log(`======================================================`);

    const child = spawn(process.execPath, ['--test', path.join(__dirname, testFile)], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({ file: testFile, passed: code === 0 });
    });
  });
}

async function main() {
  const files = fs.readdirSync(__dirname)
    .filter((f) => f.endsWith('.test.js'))
    .sort();

  console.log(`🔍 Discovered ${files.length} test suite(s): ${files.join(', ')}`);

  const results = [];
  for (const file of files) {
    const res = await runSuite(file);
    results.push(res);
  }

  console.log(`\n======================================================`);
  console.log(`📊 MASTER TEST SUMMARY`);
  console.log(`======================================================`);
  let allPassed = true;
  for (const r of results) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} : ${r.file}`);
    if (!r.passed) allPassed = false;
  }

  if (allPassed) {
    console.log(`\n🎉 ALL TEST SUITES PASSED!`);
    process.exit(0);
  } else {
    console.error(`\n💥 SOME TEST SUITES FAILED!`);
    process.exit(1);
  }
}

main();
