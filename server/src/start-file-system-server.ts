import os from 'os';
import { initFileSystemServer } from '.';

const basePath = `${os.homedir()}/.nuclia`;
const startServer = async () => {
  const server = await initFileSystemServer({ basePath });
  server.start();
};

startServer();
