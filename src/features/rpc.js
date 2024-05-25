const { Client: DiscordRPCClient } = require("discord-rpc");
const store = require('../config/config');
const { convertTimeToSeconds, shortenString } = require('../utils/utils');

let rpcLoggedIn = false;
const rpc = new DiscordRPCClient({ transport: "ipc" });

async function updateRPCActivity(trackInfo, artworkUrl, time, songUrl, clientId, isPlaying) {
    if (store.get("discordRPC")) {
        if (!rpcLoggedIn) await LoginRPC(clientId);

        if (isPlaying) {
            const currentTrack = trackInfo.title.replace(/\n.*/s, "").replace("Current track:", "");
            const currentTime = time.current.replace('.', ':');
            const totalTime = time.total.replace('.', ':');
            const currentTimeInSeconds = convertTimeToSeconds(currentTime);
            const totalTimeInSeconds = convertTimeToSeconds(totalTime);
            const endTimestamp = Math.floor(Date.now() / 1000) + (totalTimeInSeconds - currentTimeInSeconds);

            rpc.setActivity({
                details: shortenString(currentTrack),
                state: `by ${shortenString(trackInfo.author)}`,
                endTimestamp,
                largeImageKey: artworkUrl.replace("50x50.", "500x500."),
                largeImageText: currentTrack,
                smallImageKey: "soundcloud-logo",
                smallImageText: "SoundCloud",
                instance: false,
                buttons: [{ label: "Play on SoundCloud", url: songUrl }],
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

async function toggleRPC(clientId) {
    const enableRPC = store.get("discordRPC");
    if (enableRPC) await LoginRPC(clientId);
    else await LogoutRPC();
}

async function LoginRPC(clientId) {
    if (!rpcLoggedIn) {
        await rpc.login({ clientId });
        rpcLoggedIn = true;
    }
}

async function LogoutRPC() {
    if (rpcLoggedIn) {
        await rpc.clearActivity();
        rpcLoggedIn = false;
    }
}

module.exports = { toggleRPC, updateRPCActivity };
