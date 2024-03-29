const axios = require('axios');

async function DownloadSong(url) {
    try {
        const response = await axios.get('https://getvideo.p.rapidapi.com/?url=' + url, {
            headers: {
                'x-rapidapi-host': 'getvideo.p.rapidapi.com',
                'x-rapidapi-key': '5be05bd400msh1fe8c757005c169p10ea3bjsnf6b6811bc600'
            }
        });

        return {
            filename: response.data.title + ".mp3",
            streamUrl: response.data.streams[0].url
        };
    } catch (error) {
        dialog.showMessageBox({
            type: 'error',
            title: 'Error',
            message: 'Error when downloading song: ' + error.message,
        });
    }

}

module.exports = {
    DownloadSong,
};