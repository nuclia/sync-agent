import { Menu, Tray, app, nativeImage, dialog, shell } from 'electron';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { EVENTS, eventEmitter, initFileSystemServer } from './sync-agent';
import { killPortProcess } from 'kill-port-process';

let contextMenu: Electron.Menu;
let tray = null;
const basePath = `${os.homedir()}/.nuclia`;

const VERSION = '99999.99999.99999';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const updateTrayAfterStartServer = () => {
  contextMenu.items[0].visible = false;
  contextMenu.items[1].visible = true;
};
const updateTrayAfterStopServer = () => {
  contextMenu.items[0].visible = true;
  contextMenu.items[1].visible = false;
};

const checkUpdates = async () => {
  const data = await fetch('https://raw.githubusercontent.com/nuclia/sync-agent/main/package.json').then((response) =>
    response.json(),
  );

  if (semver.gt(data.version, VERSION)) {
    await dialog.showMessageBox({
      message: `A new version is available. Please download version ${data.version} and install it.`,
    });
    shell.openExternal(`https://github.com/nuclia/sync-agent/releases/tag/${data.version}`);
  }
};

const createWindow = async () => {
  // await checkUpdates();
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/logo_16x16.png'));
  // kill any previous hanging process
  await killPortProcess(8090);
  const server = await initFileSystemServer({ basePath });
  tray = new Tray(icon);
  contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start App',
      click: () => {
        server.start();
      },
      icon: nativeImage.createFromPath(path.join(__dirname, '../public/play.png')),
    },
    {
      label: 'Stop App',
      click: () => {
        server.close();
      },
      visible: false,
      icon: nativeImage.createFromPath(path.join(__dirname, '../public/square.png')),
    },
    {
      label: 'Exit',
      click: () => {
        server.close();
        app.quit();
      },
    },
    {
      label: 'About',
      click: () => dialog.showMessageBoxSync({ message: `Version: ${VERSION}` }),
    },
  ]);
  tray.setToolTip('Nuclia sync');
  tray.setContextMenu(contextMenu);
  server.start();
  dialog.showMessageBoxSync({
    message: 'The Nuclia Sync Agent is running. You can manage your syncs from the online Nuclia Dashboard.',
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

eventEmitter.subscribe(EVENTS.START_LISTENING, updateTrayAfterStartServer);
eventEmitter.subscribe(EVENTS.STOP_LISTENING, updateTrayAfterStopServer);
