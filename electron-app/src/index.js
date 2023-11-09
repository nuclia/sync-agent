const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
let nodeProcess;
let isProcessRunning = false;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  // Kill the node process if it's running
  if (nodeProcess) {
    isProcessRunning = false;
    nodeProcess.kill();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on("start-process", () => {
  // Start the binary process (e.g., "./my-binary" or "path/to/my-binary")
  // Make sure your binary is executable (chmod +x my-binary on Unix systems)
  if (nodeProcess && !nodeProcess.killed) {
    console.log("Process is already running.");
    return; // Exit the function if process is running
  }

  nodeProcess = spawn("./http_server");
  isProcessRunning = true;

  nodeProcess.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  nodeProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  nodeProcess.on("close", (code) => {
    isProcessRunning = false;
    console.log(`child process exited with code ${code}`);
  });
});

ipcMain.on("stop-process", () => {
  if (nodeProcess && isProcessRunning) {
    console.log("stop process");
    isProcessRunning = false;
    nodeProcess.kill();
  }
});

ipcMain.handle("get-process-status", () => {
  return isProcessRunning;
});
