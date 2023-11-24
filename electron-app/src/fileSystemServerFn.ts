import { createDirectory, createFile, pathExists } from './fileSystemFn';

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

  const configPath = `${basePath}/config.json`;
  if (!(await pathExists(configPath))) {
    await createFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  const syncPath = `${basePath}/sync.json`;
  if (!(await pathExists(syncPath))) {
    await createFile(syncPath, JSON.stringify({}, null, 2));
  }
}
