"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path_1 = __importDefault(require("path"));
var server_1 = require("./server");
var contextMenu;
var tray = null;
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
    electron_1.app.quit();
}
var updateTrayAfterStartServer = function () {
    contextMenu.items[0].visible = false;
    contextMenu.items[1].visible = true;
};
var updateTrayAfterStopServer = function () {
    contextMenu.items[0].visible = true;
    contextMenu.items[1].visible = false;
};
var createWindow = function () {
    var icon = electron_1.nativeImage.createFromPath(path_1.default.join(__dirname, "../public/logo.png"));
    tray = new electron_1.Tray(icon);
    contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: "Start App",
            click: function () {
                (0, server_1.startToListen)(updateTrayAfterStartServer);
            },
            icon: electron_1.nativeImage.createFromPath(path_1.default.join(__dirname, "../public/play.png")),
        },
        {
            label: "Stop App",
            click: function () {
                (0, server_1.stopToListen)(updateTrayAfterStopServer);
            },
            visible: false,
            icon: electron_1.nativeImage.createFromPath(path_1.default.join(__dirname, "../public/square.png")),
        },
        {
            label: "Exit",
            click: function () {
                electron_1.app.quit();
            },
        },
    ]);
    tray.setToolTip("Nuclia sync");
    tray.setContextMenu(contextMenu);
    (0, server_1.startToListen)(updateTrayAfterStartServer);
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron_1.app.on("ready", createWindow);
