const { ElectronBlocker, fullLists } = require('@cliqz/adblocker-electron');
const { readFileSync, writeFileSync } = require('fs');
const store = require('../config/config');

let blocker

function toggleAdBlocker(mainWindow) {
    const adBlockEnabled = store.get("adBlocker");
    store.set("adBlocker", !adBlockEnabled);

    if (adBlockEnabled) {
        blocker.disableBlockingInSession(mainWindow.webContents.session);
    }

    if (mainWindow) {
        mainWindow.reload();
    }
}

async function createAdBlocker(mainWindow) {
    if (store.get("adBlocker")) {
        blocker = await ElectronBlocker.fromLists(
            fetch,
            fullLists, {
            enableCompression: true,
        }, {
            path: 'engine.bin',
            read: async (...args) => readFileSync(...args),
            write: async (...args) => writeFileSync(...args),
        },
        );
        blocker.enableBlockingInSession(mainWindow.webContents.session);
    }
}

module.exports = { toggleAdBlocker, createAdBlocker };