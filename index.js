import { RoonExtension } from "roon-kit";
import { Client } from "@xhayper/discord-rpc";
import fs from 'fs'
import axios from 'axios';
import FormData from "form-data";
import colors from 'colors'
import moment from "moment";

//declarations 

colors.setTheme({
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red',
    plain: 'white'
});

const logTypes = {
    error: 'err',
    warning: 'warn',
    info: 'info',
    ok: 'ok',
    debug: 'debug'
}

var cachedArt;
var previousSecond = Math.round(Date.now() / 1000);
var trackSeconds = previousSecond + parseInt(1);
var trackInfo = {}

//load art cache file from disk

if (fs.existsSync('cached_art.json')) {
    outputLog(logTypes.info, "Pulled cached album art URLs from local disk.")
    cachedArt = JSON.parse(fs.readFileSync('cached_art.json', 'utf8'));
} else {
    cachedArt = []
    fs.writeFileSync("cached_art.json", JSON.stringify(cachedArt), (err) => {
        if (err)
            outputLog(logTypes.error, "Error creating album art cache on local disk:\n" + err)
        else {
            outputLog(logTypes.ok, "Album art cache file successfully created!")
        }
    });
}

//load options file to initialize app per preference

var configParams;

if (fs.existsSync('options.json')) {
    outputLog(logTypes.info, "Pulled locally stored options file.")
    configParams = JSON.parse(fs.readFileSync('options.json', 'utf8'));
    configValidate()
} else {
    const response = await axios.get("https://raw.githubusercontent.com/prolix-oc/RoonRPCJS/raw/refs/heads/main/options-default.json", { responseType: 'arraybuffer' });
    if (response.status == 200){
        const fileData = Buffer.from(response.data, 'binary');
        outputLog(logTypes.ok, 'Downloaded standard options file from GitHub...');
        fs.writeFileSync("options.json", JSON.parse(fileData), (err) => {
            if (err)
                outputLog(logTypes.error, "Error creating options file on local disk: " + err)
            else {
                outputLog(logTypes.ok, "Standard options file successfully created! Be sure to check the README before making any modifications.")
                configParams = JSON.parse(fileData.toString())
            }
        });
    } else {
        outputLog(logTypes.error, "Could not download standard options file automatically. Please download the latest config from GitHub and place it locally.")
        outputLog(logTypes.error, "You may want to investigate any potential internet connection problems or check if GitHub is blocked.")
    }
}

//validate config, and make changes if necessary.

function configValidate() {
    const validImageParams = {
        imgProcessor: ["imgur", "self", "musicbrainz", "none"]
    }
    switch (configParams.artUploadMethod){
        case "imgur":
            if (configParams.imgurImage.imgurClientId === "") {
                outputLog(logTypes.error, "You have not entered an Imgur API key. Please enter an Imgur API key, or switch art upload methods.")
                outputLog(logTypes.info, "Defaulting to MusicBrainz for album searching.")
                configParams.artUploadMethod = "musicbrainz"
            } else {
                outputLog(logTypes.info, "Using Imgur to host album art.")
            }
            break;
        case "self":
            if (configParams.selfServiceImage.endpointUrl === "") {
                outputLog(logTypes.error, "You have not entered an endpoint URL. Please enter your complete API endpoint URL, or switch art upload methods.")
                outputLog(logTypes.info, "Defaulting to MusicBrainz for album searching.")
                configParams.artUploadMethod = "musicbrainz"
            } else {
                if (!configParams.selfServiceImage.endpointUrl.substring(0,6) === "http://" || !configParams.selfServiceImage.endpointUrl.substring(0,7) === "https://") {
                    outputLog(logTypes.error, "You must prefix your endpoint URL with either 'http://' or 'https://'. Please modify your configuration.")
                    outputLog(logTypes.info, "Defaulting to MusicBrainz for album searching.")
                    configParams.artUploadMethod = "musicbrainz"
                } else {
                    outputLog(logTypes.info, "Using self-hosted server to host album art.")
                }
            }
            if (configParams.selfServiceImage.endpointAuthTokenType !== "" && configParams.selfServiceImage.endpointAuthTokenType === "") {
                outputLog(logTypes.error, "You specified a token type, but never provided a token. Please adjust this in the config properly.")
                outputLog(logTypes.info, "Defaulting to MusicBrainz for album searching.")
                configParams.artUploadMethod = "musicbrainz"
            }
            break;
        case "musicbrainz":
            outputLog(logTypes.info, "Using MusicBrainz for RPC image data.")
            break;
        case "none":
            outputLog(logTypes.warning, "You are opting not to share album art. Your activity will only show the default Roon image.")
            break;
        default:
            outputLog(logTypes.error, "You did not select a valid image upload method. The valid options are: 'imgur', 'self', 'musicbrainz', or 'none'.")
            outputLog(logTypes.info, "Defaulting to MusicBrainz for album searching.")
            configParams.artUploadMethod = "musicbrainz"
            break;
    }
}

//helper functions for logging

function outputLog(logLevel, message) {
    var combinedString = '';
    var dateString = moment().format("MM/DD/YYYY HH:mm:ss")
    switch (logLevel) {
        case 'warn':
            combinedString += colors.warn(`${dateString} [WARN] `)
            combinedString += colors.plain(message)
            console.log(combinedString)
            break;
        case 'info':
            combinedString += colors.data(`${dateString} [INFO] `)
            combinedString += colors.plain(message)
            console.log(combinedString)
            break;
        case 'ok':
            combinedString += colors.info(`${dateString} [DONE] `)
            combinedString += colors.plain(message)
            console.log(combinedString)
            break;
        case 'error':
            combinedString += colors.error(`${dateString} [ERR] `)
            combinedString += colors.plain(message)
            console.log(combinedString)
            break;
        case 'debug':
            combinedString += colors.debug(`${dateString} [DEBUG]`)
            combinedString += colors.plain(message)
            console.log(combinedString)
            break;
        default:
            combinedString += colors.verbose(`${dateString} [UNKNOWN] `)
            combinedString += colors.plain(message)
            console.log(combinedString);
            break;
    }
}

//init Roon, MusicBrainz, and Discord RPC

const client = new Client({
    clientId: "1286058131784208394"
});

const extension = new RoonExtension({
        description: {
        extension_id:        'live.prolix.RoonCordJS',
        display_name:        "Pass Roon's now playing info to Discord RPC via Node.js",
        display_version:     "0.0.1",
        publisher:           'RoonCord JS',
        email:               'me@prolix.live',
        website:             'https://github.com/prolix-oc/RoonCordJS'
    },
    RoonApiBrowse: 'not_required',
    RoonApiImage: 'required',
    RoonApiTransport: 'required',
    subscribe_outputs: false,
    subscribe_zones: true,
    log_level: 'none'
});


extension.start_discovery();
extension.set_status(`Connecting to all services...`);

const core = await extension.get_core();
await client.login();
extension.set_status(`Sending RPC data to ${client.user.username} currently!`);

outputLog(logTypes.ok, "Roon connection fully established!")

//start getting info from Roon core and do something with it.

extension.on("subscribe_zones", (core, response, body) => {
    const addedZones = body.zones ?? body.zones_added ?? [];
    addedZones.forEach(zone => {
        trackInfo["song"] = zone.now_playing?.three_line.line1;
        trackInfo["artist"] = zone.now_playing?.three_line.line2;
        trackInfo["album"] = zone.now_playing?.three_line.line3;
        trackInfo["playback_status"] = zone.state;
        trackInfo["image_key"] = zone.now_playing?.image_key;
        trackInfo["zone_name"] = zone.display_name;
        outputLog(logTypes.info, `Zone ${zone.display_name} has updated.`)
        startAlbumArtOperation(zone.now_playing?.image_key, zone.now_playing?.three_line.line3, zone.now_playing?.three_line.line2, "init")
        switch(determinePlaybackStatus().status) {
            case "playing":
                previousSecond = Math.round(Date.now() / 1000)
                trackSeconds = previousSecond + parseInt(zone.now_playing?.length)
                break;
            case "paused":
                previousSecond = Math.round(Date.now() / 1000)
                trackSeconds = Math.round(Date.now() / 1000)
            default:
                break;
        }
    });

    const removedZones = body.zones_removed ?? [];
    removedZones.forEach(zone => {
        outputLog(logTypes.info, `Zone ${zone.display_name} has stopped it's playback.`)
    }); 

    const changedZones = body.zones_changed ?? [];
    changedZones.forEach(zone => {
        trackInfo["song"] = zone.now_playing?.three_line.line1;
        trackInfo["artist"] = zone.now_playing?.three_line.line2;
        trackInfo["album"] = zone.now_playing?.three_line.line3;
        trackInfo["playback_status"] = zone.state;
        trackInfo["image_key"] = zone.now_playing?.image_key;
        trackInfo["zone_name"] = zone.display_name;
        outputLog(logTypes.info, `Zone ${zone.display_name} has updated.`)
        startAlbumArtOperation(zone.now_playing?.image_key, zone.now_playing?.three_line.line3, zone.now_playing?.three_line.line2, "init")
        switch(determinePlaybackStatus().status) {
            case "playing":
                previousSecond = Math.round(Date.now() / 1000)
                trackSeconds = previousSecond + parseInt(zone.now_playing?.length)
                break;
            case "paused":
                previousSecond = Math.round(Date.now() / 1000)
                trackSeconds = Math.round(Date.now() / 1000)
            default:
                break;
        }
    });
});

function determinePlaybackStatus() {
    var playStatus = trackInfo["playback_status"];
    switch (trackInfo["playback_status"]) {
        case "playing":
            return { "playback_img": "pause_dark", "status": "playing", "subtext": "Currently listening." }
            break;
        case "paused":
            return { "playback_img": "play_dark", "status": "paused", "subtext": "Not listening right now." }
            break;
        default:
            return { "playback_img": "play_dark", "status": "unknown"}
            break;
    }
}

client.on("error", async (err) => {
    outputLog(logTypes.err, "Error from Discord RPC interface:\n" + err);
});

client.on("ready", async () => {
    await client.user?.setActivity({
        state: trackInfo["artist"] + " — " + trackInfo["album"],
        details: trackInfo["song"],
        startTimestamp: previousSecond,
        endTimestamp: trackSeconds,
        largeImageKey: "main",
        largeImageText: "Listening on " + trackInfo["zone_name"],
        smallImageKey: determinePlaybackStatus().playback_img,
        smallImageText: determinePlaybackStatus.subtext,
        type: 2
    });
});

async function updateRPC(artlink) {
    await client.user?.setActivity({
        state: trackInfo["artist"] + " — " + trackInfo["album"],
        details: trackInfo["song"],
        startTimestamp: previousSecond,
        endTimestamp: trackSeconds,
        largeImageKey: artlink,
        largeImageText: "Listening on " + trackInfo["zone_name"],
        smallImageKey: determinePlaybackStatus().playback_img,
        smallImageText: determinePlaybackStatus.subtext,
        type: 2
    });
}

async function startAlbumArtOperation(albumartString, albumInput, artistString, reason) {
    const found = await findInCache(cachedArt, albumInput);
    if (configParams.artUploadMethod !== "musicbrainz" && configParams.artUploadMethod !== "none") {
        if (found.album !== albumInput) {
            outputLog(logTypes.info, "[" + reason + "] " + "Album art not found in cache.")
            let ImgBuf = (await core.services.RoonApiImage.get_image(albumartString, {scale: 'fit', width: parseInt(configParams.preferredRoonImgSize.width), height: parseInt(configParams.preferredRoonImgSize.width), format: 'image/jpeg'})).image
            switch (configParams.artUploadMethod) {
                case "imgur":
                    await imgurUploadArt(ImgBuf, albumInput, function(data) {
                        updateRPC(data.link)
                        outputLog(logTypes.ok, "Pushed RPC image from Imgur successfully!")
                    });
                    break;
                case "self":
                    await selfUploadArt(ImgBuf, albumInput, function(data) {
                        updateRPC(data.link)
                        outputLog(logTypes.ok, "Pushed RPC image from self-hosted service successfully!")
                    })
                    break;
                default:
                    outputLog(logTypes.error, "No specified upload service, please specify one in the config.")
                    updateRPC("main")
                    break;
            }
        } else {
            outputLog(logTypes.info, "Re-using existing link in cache.")
            updateRPC(found.link)
        }
    } else if (configParams.artUploadMethod === "musicbrainz" && configParams.artUploadMethod !== "none") {
        await fetchFromMusicBrainz(artistString, albumInput, function(data) {
            updateRPC(data.link)
        })
    } else {
        outputLog(logTypes.info, "Not using any sources, no art for you.")
    }
};

async function fetchFromMusicBrainz(artistString, albumInput, callback) {
    outputLog(logTypes.info, "Returning match from MusicBrainz to RPC.")
    const encodedArtist = encodeURIComponent(artistString);
    const encodedAlbum = encodeURIComponent(albumInput);
    const searchUrl = "https://musicbrainz.org/ws/2/release/?query=artist:" + encodedArtist + "+release:" + encodedAlbum + "&fmt=json"; 
    axios.get(searchUrl).then(({data}) => {  
        outputLog(logTypes.ok, "Found MusicBrainz match, searching release on Cover Art Archive.")
        const imageUrl = `http://coverartarchive.org/release/${data.releases[0].id}/`;
        axios.get(imageUrl).then(({data}) => {
            outputLog(logTypes.ok, "Found CAA match, returning image.")
            callback({"link": data.images[0].thumbnails.large, "success": true});
        }).catch(function (err) {
            outputLog(logTypes.error, "Could not get album art from CAA. Bit odd, you must have niche music taste. ;)")
            outputLog(logTypes.error, `Specific error: ${err}`)
            callback({"link": "main", "success": false});
        })
    }).catch(function (err) {
        outputLog(logTypes.error, "Could not get result from MusicBrainz. Bit odd, you must have niche music taste. ;)")
        outputLog(logTypes.error, `Specific error: ${err}`)
        callback({"link": "main", "success": false});
    })
}

async function imgurUploadArt(imgBuf, albumInput, callback) {
    outputLog(logTypes.info, "Uploading album art to Imgur.")
    var config = {
        headers: { 'Authorization': `Client-ID ${configParams.imgurImage.imgurClientId}` }
    }
    const form = new FormData();
    const fileName = await makeFileID()
    form.append(configParams.imgurImage.imgurUploadKey, imgBuf, {filename: `${fileName}.jpg`});
    form.append('type', configParams.imgurImage.imgurFileType)
    axios.post(configParams.imgurImage.imgurUrl, form, config).then(({data}) => {
        outputLog(logTypes.ok, "Succesfully uploaded image to Imgur!")
        cacheArtUrl(data.data.link, albumInput, "Imgur")
        callback({"link": data.data.link, "success": true});
    }).catch(function(err) {
        outputLog(logTypes.error, "Imgur failed to upload with the following reason: " + JSON.stringify(data))
        callback({"link": "main", "success": false});
    })
}

async function selfUploadArt(imgBuf, albumInput, callback) {
    outputLog(logTypes.info, "Uploading album art to self-hosted service.")
    const form = new FormData();
    const fileName = await makeFileID()
    form.append('file', Buffer.from(imgBuf), {filename: `${fileName}.jpg`});
    form.append('type', configParams.selfServiceImage.formImageType)
    if (configParams.selfServiceImage.endpointAuthTokenType !== "") {
        var config = {
            headers: { 'Authorization': `${configParams.selfServiceImage.endpointAuthTokenType} ${configParams.selfServiceImage.endpointAuthToken}` }
        }
        axios.post(configParams.selfServiceImage.endpointUrl, form, config).then(({data}) => {
            if (data.success) {
                cacheArtUrl(data.link, albumInput, "self-hosted API")
                callback({"link": data.link, "success": true});
            } else {
                outputLog(logTypes.error, "Could not reach image upload API for the following reason: " + JSON.stringify(data))
            }
        })
    } else {
        axios.post(configParams.selfServiceImage.endpointUrl, form).then(({data}) => {
            if (data.success) {
                cacheArtUrl(data.link, albumInput, "self-hosted API")
                callback({"link": data.link, "success": true});
            } else {
                outputLog(logTypes.error, "Could not reach image upload API for the following reason: " + JSON.stringify(data))
                callback({"link": "main", "success": false});
            }
        })
    }
}

function cacheArtUrl(artLink, albumInput, source) {
    cachedArt.push({"album": albumInput, "link": artLink})
    fs.writeFile("cached_art.json", JSON.stringify(cachedArt), (err) => {
        if (err)
            outputLog(logTypes.info, "Error writing to album art cache on local disk:\n" + err)
        else 
            outputLog(logTypes.ok, "Succesfully added entry to album art cache from " + source)
    });
}


async function findInCache(cache, albumInput) {
    const cacheSearch = cache.find(({ album }) => album === albumInput);
    if (cacheSearch) {
        return cacheSearch;
    } else {
        return false;
    }
}

async function makeFileID(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}