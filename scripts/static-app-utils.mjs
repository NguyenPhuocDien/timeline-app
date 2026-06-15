import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '..');
export const webRoot = path.join(repoRoot, 'apps', 'web');

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walkFiles(root, options = {}) {
  const { ignoredDirectories = new Set() } = options;
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await visit(root);
  return files;
}

export function stripUrlDecorations(value) {
  return value.split('#', 1)[0].split('?', 1)[0];
}

export function localAssetPath(value) {
  const clean = stripUrlDecorations(value.trim());
  if (!clean || clean.startsWith('#') || clean.startsWith('//')) return null;
  if (/^(?:[a-z]+:|data:|mailto:|tel:)/i.test(clean)) return null;
  return clean.replace(/^\.?\//, '');
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}
