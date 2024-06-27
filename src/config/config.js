const Store = require("electron-store");

const store = new Store({
    defaults: {
        bounds: { width: 800, height: 600 },
        darkMode: false,
        discordRPC: true,
        displayWhenIdling: true,
        adBlocker: true,
        clientId_SCL: null
    },
});

module.exports = store;
