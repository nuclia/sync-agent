import { program } from 'commander';
import os from 'os';
import { initFileSystemServer } from '.';

const basePath = `${os.homedir()}/.nuclia`;
program
  .option('-das, --disable-auto-sync <boolean>', 'Disable auto sync process', false)
  .option('-bp, --base-path <string>', 'Path to save the data', basePath)
  .option('-p, --port <type> <number>', 'Port', '8090')
  .option('-s, --seconds [number]', 'Seconds for auto sync', '3600')
  .parse();

const options = program.opts();
const startServer = async () => {
  const server = await initFileSystemServer({
    basePath: options.basePath,
    secondsForAutoSync: parseInt(options.seconds),
    port: parseInt(options.port),
    startAutoSyncProcess: !options['disableAutoSync'],
  });
  server.start();
};

startServer();
