import { Menu, Tray, app, nativeImage } from 'electron';
import os from 'os';
import path from 'path';

import { EVENTS, eventEmitter, initFileSystemServer } from './sync-agent';

let contextMenu: Electron.Menu;
let tray = null;
const basePath = `${os.homedir()}/.nuclia`;

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

const createWindow = async () => {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../public/logo_16x16.png'));
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
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Nuclia sync');
  tray.setContextMenu(contextMenu);
  server.start();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

eventEmitter.subscribe(EVENTS.START_LISTENING, updateTrayAfterStartServer);
eventEmitter.subscribe(EVENTS.STOP_LISTENING, updateTrayAfterStopServer);
