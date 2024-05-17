const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require("electron");
const { Client: DiscordRPCClient } = require("discord-rpc");
const { DownloadSong } = require('./assets/extension/DownloadSong');
const { download } = require('electron-dl');
const { ElectronBlocker, fullLists } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
const { readFileSync, writeFileSync } = require('fs');

const Store = require("electron-store");
const axios = require('axios');


const store = new Store();

let rpcLoggedIn = false;
let songUrl = "";
let mainWindow;
let blocker;

const rpc = new DiscordRPCClient({
	transport: "ipc"
});
const clientId = "1090770350251458592";

app.on("ready", createWindow);

app.on("window-all-closed", function() {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", function() {
	if (mainWindow === null) {
		createWindow();
	}
});

async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			enableRemoteModule: false,
		},
	});

	function openInformation() {
		informationWindow = new BrowserWindow({
			width: 400,
			height: 400,
			resizable: false,
			webPreferences: {
				nodeIntegration: true,
			},
		});

		informationWindow.loadFile("./assets/html/information.html");

		informationWindow.on("closed", () => {
			informationWindow = null;
		});
	}

	mainWindow.setBounds(store.get("bounds"));

	mainWindow.loadURL("https://soundcloud.com/discover");

	mainWindow.webContents.on("did-finish-load", async () => {
		checkForUpdate();

		if (store.get("darkMode")) {
			const darkModeCSS = require('./assets/theme/SoundDark');
			await mainWindow.webContents.insertCSS(darkModeCSS);
		}

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

				songUrl = await mainWindow.webContents.executeJavaScript(`
          new Promise(resolve => {
            const songEl = document.querySelector('.playbackSoundBadge__titleLink ').getAttribute('href');
            resolve("https://soundcloud.com" + songEl);
          });
        `);
				updateRPCActivity(trackInfo, artworkUrl, true);
			} else {
				songUrl = "";
				updateRPCActivity({}, "", false);
			}
		}, 1000);
	});

	mainWindow.on("close", function() {
		store.set("bounds", mainWindow.getBounds());
	});

	mainWindow.on("closed", function() {
		mainWindow = null;
	});

	const template = [{
		label: "Extension",
		submenu: [{
				label: "Dark Mode (SoundDark Theme)",
				type: "checkbox",
				checked: store.get("darkMode"),
				click: () => toggleDarkMode(),
			},
			{
				label: "Discord RPC",
				type: "checkbox",
				checked: store.get("discordRPC"),
				click: (menuItem) => {
					const enableRPC = menuItem.checked;
					store.set("discordRPC", enableRPC);
					toggleRPC(enableRPC);
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
				click: () => toggleAdBlocker(),
			},
			{
				label: 'Download Song',
				click: () => {
					downloadSong();
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
					openInformation();
				},
			},
		],
	}, ];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

async function downloadSong() {
	if (!songUrl) {
		injectToastNotification('Please play the song you want to download');
		return;
	}
	injectToastNotification('Downloading song, please wait...');

	const downloadSong = await DownloadSong(songUrl);

	const options = {
		saveAs: true,
		filename: downloadSong.filename
	};

	await download(mainWindow, downloadSong.streamUrl, options);
}

function updateRPCActivity(trackInfo, artworkUrl, isPlaying) {
	if (store.get("discordRPC")) {
		if (isPlaying) {
			const currentTrack = trackInfo.title
				.replace(/\n.*/s, "")
				.replace("Current track:", "");
			rpc.setActivity({
				details: shortenString(currentTrack),
				state: `by ${shortenString(trackInfo.author)}`,
				largeImageKey: artworkUrl.replace("50x50.", "500x500."),
				largeImageText: currentTrack,
				smallImageKey: "soundcloud-logo",
				smallImageText: "SoundCloud",
				instance: false,
				buttons: [{
					label: "Listen",
					url: songUrl
				}]
			});
		} else {
			if (store.get("displayWhenIdling")) {
				rpc.setActivity({
					details: "Listening to SoundCloud",
					state: "Paused",
					largeImageKey: "idling",
					largeImageText: "Paused",
					smallImageKey: "soundcloud-logo",
					smallImageText: "SoundCloud",
					instance: false,
				});
			} else {
				rpc.clearActivity();
			}
		}
	}
}

async function toggleRPC(enable) {
	if (enable) {
		await rpc.login({
			clientId
		});
		updateRPCActivity({}, "", false);
		rpcLoggedIn = true;
	} else {
		if (rpcLoggedIn) await rpc.clearActivity();
	}
}

function toggleDarkMode() {
	const isDarkMode = store.get("darkMode");
	store.set("darkMode", !isDarkMode);
	if (mainWindow) {
		mainWindow.reload();
	}
}

function toggleAdBlocker() {
	const adBlockEnabled = store.get("adBlocker");
	store.set("adBlocker", !adBlockEnabled);

	if (adBlockEnabled) {
		blocker.disableBlockingInSession(mainWindow.webContents.session);
	}

	if (mainWindow) {
		mainWindow.reload();
	}
}

function shortenString(str) {
	return str.length > 128 ? str.substring(0, 128) + "..." : str;
}

function injectToastNotification(message) {
	if (mainWindow) {
		mainWindow.webContents.executeJavaScript(`
    function showToast(message) {
      const toast = document.createElement('div');
      toast.style.position = 'fixed';
      toast.style.bottom = '30px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.backgroundColor = '#333';
      toast.style.color = '#fff';
      toast.style.padding = '15px 30px';
      toast.style.borderRadius = '8px';
      toast.style.zIndex = '9999';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      toast.innerText = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '1';
      }, 100);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          toast.remove();
        }, 500);
      }, 4500);
    }

    showToast('${message}');

    
    `);
	}
}

async function checkForUpdate() {
	const response = await axios.get('https://raw.githubusercontent.com/Shinchan0911/soundcloud-client/main/package.json');
	const data = response.data;

	const latestVersion = data.version;
	const currentVersion = app.getVersion();

	if (latestVersion !== currentVersion) {
		injectToastNotification(`Current Version: ${currentVersion}, Latest Version: ${latestVersion} - A new version is available.`)
	}
}