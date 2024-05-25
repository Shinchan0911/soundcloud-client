const axios = require('axios');
const { injectToastNotification, showErrorDialog } = require("../utils/utils");
const { download } = require('electron-dl');

async function downloadSong(mainWindow, songUrl, clientId) {
    if (!songUrl) {
        injectToastNotification('Please play the song you want to download', mainWindow);
        return;
    }
    injectToastNotification('Downloading song, please wait...', mainWindow);

    const downloadSong = await HandleDownload(songUrl, clientId);

    const options = {
        saveAs: true,
        filename: downloadSong.filename
    };

    await download(mainWindow, downloadSong.streamUrl, options);
}

async function HandleDownload(songUrl, clientId) {
    try {
        const response = await axios.get(`https://api-v2.soundcloud.com/resolve?url=${songUrl}&client_id=${clientId}`);

        const filename = response.data.permalink + ".mp3";
        const streamUrl = (await axios.get(response.data.media.transcodings[1].url + `?client_id=${clientId}`)).data.url;

        return {
            filename: filename,
            streamUrl: streamUrl
        };
    } catch (error) {
        showErrorDialog(error.message);
    }
    
}

module.exports = { downloadSong };
