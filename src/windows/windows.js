const { BrowserWindow, app } = require("electron");

async function createWindow(store) {
    const { width, height, x, y } = store.get("bounds");
    const mainWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    return mainWindow;
}

function openInformationWindow() {
    const infoWindow = new BrowserWindow({
        width: 400,
        height: 400,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    infoWindow.loadFile('./assets/html/information.html');

    infoWindow.webContents.on("did-finish-load", () => {
        infoWindow.webContents.executeJavaScript(`
            const spanElement = document.querySelector('span');
            spanElement.textContent += "${app.getVersion()}";
        `);
    });

}

module.exports = { createWindow, openInformationWindow };
