import { createDirectory, createFile, pathExists } from "./fileSystemFn";

const defaultConfig = {
  syncPeriod: 3600, // In seconds
};

export async function beforeStartServer(basePath: string) {
  if (!(await pathExists(basePath))) {
    await createDirectory(basePath);
  }

  if (!(await pathExists(`${basePath}/sources`))) {
    await createDirectory(`${basePath}/sources`);
  }

  const configPath = `${basePath}/config.json`;
  if (!(await pathExists(configPath))) {
    await createFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  const sourcesPath = `${basePath}/sources.json`;
  if (!(await pathExists(sourcesPath))) {
    await createFile(sourcesPath, JSON.stringify({}, null, 2));
  }
}
