import { createDirectory, pathExists, writeFile } from './fileSystemFn';

const defaultConfig = {
  syncPeriod: 3600, // In seconds
};

export async function beforeStartServer(basePath: string) {
  if (!(await pathExists(basePath))) {
    await createDirectory(basePath);
  }

  if (!(await pathExists(`${basePath}/sync`))) {
    await createDirectory(`${basePath}/sync`);
  }

  if (!(await pathExists(`${basePath}/logs`))) {
    await createDirectory(`${basePath}/logs`);
  }

  const configPath = `${basePath}/config.json`;
  if (!(await pathExists(configPath))) {
    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  const syncPath = `${basePath}/sync.json`;
  if (!(await pathExists(syncPath))) {
    await writeFile(syncPath, JSON.stringify({}, null, 2));
  }
}
