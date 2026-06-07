import fs from "node:fs";
import path from "node:path";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");
const TEST_DATA_DIR = path.resolve(__dirname, "../../e2e/test-data");

/**
 * Copy fixture files to a fresh test-data directory.
 * Called before each test file to ensure clean state.
 */
export function resetTestData() {
  // Remove old test data
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }

  // Copy fixtures
  copyDirSync(FIXTURES_DIR, TEST_DATA_DIR);

  // Ensure .Trash exists
  const trashDir = path.join(TEST_DATA_DIR, ".Trash");
  if (!fs.existsSync(trashDir)) {
    fs.mkdirSync(trashDir, { recursive: true });
  }
}

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
