const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { Client: DiscordRPCClient } = require("discord-rpc");
const { DownloadSong } = require('./assets/extension/DownloadSong');
const { download } = require('electron-dl');

const Store = require("electron-store");
const store = new Store();

let rpcLoggedIn = false;
let songUrl = "";
let mainWindow;

const rpc = new DiscordRPCClient({
  transport: "ipc"
});
const clientId = "1090770350251458592";


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
      updateRPCActivity({}, "", "", false);
      rpcLoggedIn = true;
  } else {
      if (rpcLoggedIn) await rpc.clearActivity();
  }
}

toggleRPC(store.get("discordRPC"));

Menu.setApplicationMenu(null);

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

  mainWindow.setBounds(store.get("bounds"));

  mainWindow.loadURL("https://soundcloud.com/discover");

  mainWindow.webContents.on("did-finish-load", async () => {
      if (store.get("darkMode")) {
          const darkModeCSS = require('./assets/theme/SoundDark');
          await mainWindow.webContents.insertCSS(darkModeCSS);
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
      dialog.showMessageBox({
          type: 'info',
          title: 'Download Song',
          message: 'Please play the song you want to download',
      });
      return;
  }
  dialog.showMessageBox({
      type: 'info',
      title: 'Download Song',
      message: 'Downloading song, please wait...',
  });

  const downloadSong = await DownloadSong(songUrl);

  const options = {
      saveAs: true,
      filename: downloadSong.filename
  };

  const downloadItem = await download(mainWindow, downloadSong.streamUrl, options);
  downloadItem.on('done', (event, state) => {
      if (state === 'completed') {
          console.log('Download completed!');
      } else {
          console.log('Download failed or canceled.');
      }
  });
}


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

function toggleDarkMode() {
  const isDarkMode = store.get("darkMode");
  store.set("darkMode", !isDarkMode);
  if (mainWindow) {
      mainWindow.reload();
  }
}

function shortenString(str) {
  return str.length > 128 ? str.substring(0, 128) + "..." : str;
}