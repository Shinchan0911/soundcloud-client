const store = require('../config/config');

function toggleDarkMode(mainWindow) {
    const isDarkMode = store.get("darkMode");
    store.set("darkMode", !isDarkMode);
    mainWindow.reload();
}

async function createDarkMode(mainWindow) {
    if (store.get("darkMode")) {
        const darkModeCSS = require('../../assets/theme/SoundDark');
        await mainWindow.webContents.insertCSS(darkModeCSS);
    }
}

module.exports = { toggleDarkMode, createDarkMode };