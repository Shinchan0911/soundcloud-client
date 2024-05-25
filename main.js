const { app, Menu, shell } = require("electron");
const store = require("./src/config/config");
const { toggleRPC, updateRPCActivity } = require("./src/features/rpc");
const { createAdBlocker, toggleAdBlocker } = require("./src/features/adBlocker");
const { checkForUpdate, removeQueryParameters, getData } = require("./src/utils/utils");
const { downloadSong } = require("./src/features/downloadSong");
const { createWindow, openInformationWindow } = require("./src/windows/windows");
const { toggleDarkMode, createDarkMode } = require('./src/features/DarkMode');

let mainWindow;
let songUrl;
let data;

app.on("ready", async () => {
    mainWindow = await createWindow(store);
    createMenu(mainWindow);
    await mainWindow.loadURL("https://soundcloud.com/discover");
    data = await getData();

    mainWindow.webContents.on("did-finish-load", async () => {
        await checkForUpdate(mainWindow);
        
        await createAdBlocker(mainWindow);
        await createDarkMode(mainWindow);

        setInterval(async () => {
            const isPlaying = await mainWindow.webContents.executeJavaScript(
                `document.querySelector('.playControls__play').classList.contains('playing')`
            );

            if (isPlaying) {
                const trackInfo = await mainWindow.webContents.executeJavaScript(`
                    new Promise(resolve => {
                        const titleEl = document.querySelector('.playbackSoundBadge__titleLink');
                        const authorEl = document.querySelector('.playbackSoundBadge__lightLink');
                        if (titleEl && authorEl) {
                            resolve({title: titleEl.innerText, author: authorEl.innerText});
                        } else {
                            resolve({title: '', author: ''});
                        }
                    });
                `);

                const artworkUrl = await mainWindow.webContents.executeJavaScript(`
                    new Promise(resolve => {
                        const artworkEl = document.querySelector('.playbackSoundBadge__avatar .image__lightOutline span');
                        if (artworkEl) {
                            const url = artworkEl.style.backgroundImage.replace('url("', '').replace('")', '');
                            resolve(url);
                        } else {
                            resolve('');
                        }
                    });
                `);

                songUrl = removeQueryParameters(await mainWindow.webContents.executeJavaScript(`
                    new Promise(resolve => {
                        const songEl = document.querySelector('.playbackSoundBadge__titleLink').getAttribute('href');
                        resolve("https://soundcloud.com" + songEl);
                    });
                `), data.Parameters);

                const time = await mainWindow.webContents.executeJavaScript(`
                    new Promise((resolve) => {
                        const currentTimeEl = document.querySelector('.playbackTimeline__timePassed');
                        const totalTimeEl = document.querySelector('.playbackTimeline__duration');
                        if (currentTimeEl && totalTimeEl) {
                            resolve({
                                current: currentTimeEl.querySelector('span[aria-hidden="true"]').textContent,
                                total: totalTimeEl.querySelector('span[aria-hidden="true"]').textContent
                            });
                        } else {
                            resolve({ current: '', total: '' });
                        }
                    });
                `);

                updateRPCActivity(trackInfo, artworkUrl, time, songUrl, data.clientId_RPC, true);
            } else {
                updateRPCActivity({}, "", {}, "", data.clientId_RPC, false);
            }
        }, 1000);
    });

    mainWindow.on("close", () => store.set("bounds", mainWindow.getBounds()));
    mainWindow.on("closed", () => mainWindow = null);
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (mainWindow === null) createWindow(store);
});

function createMenu(mainWindow) {
    const template = [{
        label: "Extension",
        submenu: [{
            label: "Dark Mode (SoundDark Theme)",
            type: "checkbox",
            checked: store.get("darkMode"),
            click: () => toggleDarkMode(mainWindow),
        },
        {
            label: "Discord RPC",
            type: "checkbox",
            checked: store.get("discordRPC"),
            click: (menuItem) => {
                const enableRPC = menuItem.checked;
                store.set("discordRPC", enableRPC);
                toggleRPC(mainWindow, data.clientId_RPC);
            },
        },
        {
            label: "Display When Idling",
            type: "checkbox",
            checked: store.get("displayWhenIdling"),
            click: (menuItem) => {
                const enableDWI = menuItem.checked;
                store.set("displayWhenIdling", enableDWI);
            },
        },
        {
            label: "AdBlocker",
            type: "checkbox",
            checked: store.get("adBlocker"),
            click: () => toggleAdBlocker(mainWindow),
        },
        {
            label: 'Download Song',
            click: () => {
                downloadSong(mainWindow, songUrl, data.clientId_SCL);
            }
        },
        {
            label: 'Github',
            click: () => {
                shell.openExternal('https://github.com/Shinchan0911/soundcloud-client');
            }
        },
        {
            label: "Information",
            click: () => {
                openInformationWindow();
            },
        },
    ],
    }];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
