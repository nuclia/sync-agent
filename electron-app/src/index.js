const { app, nativeImage, Tray, Menu } = require("electron");
const path = require("path");
const express = require("express");

let contextMenu;
let tray = null;

const appExpress = express();
let server;

appExpress.get("/", (_req, res) => {
  res.status(404).send("Nuclia folder does not exist");
});

appExpress.post("/init", (_req, res) => {
  res.status(412).send("Nuclia folder already exists");
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "public/logo.png")
  );

  tray = new Tray(icon);
  contextMenu = Menu.buildFromTemplate([
    {
      label: "Start App",
      click: () => {
        startProcess();
      },
      icon: nativeImage.createFromPath(path.join(__dirname, "public/play.png")),
    },
    {
      label: "Stop App",
      click: () => {
        stopProcess();
      },
      visible: false,
      icon: nativeImage.createFromPath(
        path.join(__dirname, "public/square.png")
      ),
    },
    {
      label: "Exit",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
  startProcess();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
function startProcess() {
  // Start the binary process (e.g., "./my-binary" or "path/to/my-binary")
  // Make sure your binary is executable (chmod +x my-binary on Unix systems)
  if (server && server.listening) {
    console.log("Process is already running.");
    return; // Exit the function if process is running
  }
  console.log("Start process");
  server = appExpress.listen(8000);

  contextMenu.items[0].visible = false;
  contextMenu.items[1].visible = true;
}
function stopProcess() {
  if (server && server.listening) {
    console.log("stop process");
    server.close();
    contextMenu.items[0].visible = true;
    contextMenu.items[1].visible = false;
    return;
  }
  console.log("Process is not running.");
}
