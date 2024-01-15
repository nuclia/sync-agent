import { constants } from 'fs';
import fs from 'fs/promises';
import path from 'path';

export async function writeFile(path: string, content: string | Uint8Array): Promise<void> {
  await fs.writeFile(path, content);
}

export async function appendFile(path: string, content: string | Uint8Array): Promise<void> {
  await fs.appendFile(path, content);
}

export async function createDirectory(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

export async function deleteDirectory(path: string): Promise<void> {
  await fs.rmdir(path, { recursive: true });
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(path: string) {
  return await fs.readFile(path, 'utf-8');
}

export async function deleteFile(path: string) {
  await fs.rm(path);
}

export async function findFilesInDirectory(directory: string, extensions: string[]): Promise<string[]> {
  const result: string[] = [];

  async function walk(currentPath: string) {
    const items = await fs.readdir(currentPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        await walk(path.join(currentPath, item.name));
      } else {
        if (extensions.some((ext) => item.name.endsWith(ext))) {
          result.push(path.join(currentPath, item.name));
        }
      }
    }
  }

  await walk(directory);
  return result;
}
