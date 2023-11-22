import { Menu, Tray, app, nativeImage } from "electron";
import path from "path";
import { startToListen, stopToListen } from "./server";

let contextMenu: Electron.Menu;
let tray = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
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

const createWindow = () => {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "../public/logo.png")
  );

  tray = new Tray(icon);
  contextMenu = Menu.buildFromTemplate([
    {
      label: "Start App",
      click: () => {
        startToListen(updateTrayAfterStartServer);
      },
      icon: nativeImage.createFromPath(
        path.join(__dirname, "../public/play.png")
      ),
    },
    {
      label: "Stop App",
      click: () => {
        stopToListen(updateTrayAfterStopServer);
      },
      visible: false,
      icon: nativeImage.createFromPath(
        path.join(__dirname, "../public/square.png")
      ),
    },
    {
      label: "Exit",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Nuclia sync");
  tray.setContextMenu(contextMenu);
  startToListen(updateTrayAfterStartServer);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
