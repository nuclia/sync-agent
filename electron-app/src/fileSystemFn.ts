import { constants } from "fs";
import fs from "fs/promises";
import path from "path";

export async function createFile(
  path: string,
  content: string | Uint8Array
): Promise<void> {
  try {
    await fs.writeFile(path, content);
    console.log(`File created at ${path}`);
  } catch (error) {
    console.error("Error creating file:", error);
  }
}

export async function createDirectory(path: string): Promise<void> {
  try {
    await fs.mkdir(path, { recursive: true });
    console.log(`Directory deleted at ${path}`);
  } catch (error) {
    console.error("Error delete directory:", error);
  }
}

export async function deleteDirectory(path: string): Promise<void> {
  try {
    await fs.rmdir(path, { recursive: true });
    console.log(`Directory created at ${path}`);
  } catch (error) {
    console.error("Error creating directory:", error);
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findFilesInDirectory(
  directory: string,
  extensions: string[]
): Promise<string[]> {
  let result: string[] = [];

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
