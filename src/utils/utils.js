const axios = require('axios');
const { app, dialog } = require('electron');

function convertTimeToSeconds(time) {
    const parts = time.split(":").map(parseFloat);
    return parts.length === 2 ? (parts[0] * 60) + parts[1] : (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}

function removeQueryParameters(url, parametersToRemove) {
    const urlObj = new URL(url);
    parametersToRemove.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
}

function shortenString(str, maxLength = 128) {
    return str.length > maxLength ? str.substring(0, maxLength - 3) + "..." : str;
}

async function checkForUpdate(mainWindow) {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/Shinchan0911/soundcloud-client/main/package.json');
        const data = response.data;
        const latestVersion = data.version;
        const currentVersion = app.getVersion();

        if (latestVersion !== currentVersion) {
            injectToastNotification(`Current Version: ${currentVersion}, Latest Version: ${latestVersion} - A new version is available.`, mainWindow);
        }
    } catch (error) {
        showErrorDialog(error.message);
    }
}

async function getData() {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/Shinchan0911/soundcloud-client-data/main/data.json');
        const data = response.data;

        return data;
    } catch (error) {
        showErrorDialog(error.message);
    }
}

function showErrorDialog(message) {
    dialog.showMessageBox({
        type: 'error',
        title: 'Error',
        message: 'Error: ' + message,
    });
}

function injectToastNotification(message, mainWindow) {
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

module.exports = { convertTimeToSeconds, removeQueryParameters, checkForUpdate, injectToastNotification, shortenString, showErrorDialog, getData };
