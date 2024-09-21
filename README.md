# 🎧 RoonCordJS - Show off your tunes!
#### Want to be able to show your friends what you're listening to through the most sophisticated library management software in the world? Here's the answer to that call.

## ✅ What it does:

- Connects to Roon Core neatly as an extension. One click in Settings->Extensions and you've enabled RoonCord!

- Pulls artist, track, album and cover art from Roon's API for the active zone.

- Provides album art for RPC via one of <b>three</b> methods:

    - <b>Imgur:</b> If you signed up [for an OAuth 2 application,](https://api.imgur.com/oauth2/addclient) you can easily add your client ID and start uploading album art

    - <b>Self-hosting:</b> If you want to run your own ingest using the cloud or local infrastructure, I've got a sample project with optional Bearer token auth ready to go! It also runs off of NodeJS, with fully self-contained Express.js REST/file serving endpoints.

    - <b>MusicBrainz:</b> If you don't want to do any of that nonsense, just let MusicBrainz match your cover art! Not always guaranteed to be accurate though, especially with more niche tracks or self-tagged libraries.

    - <b>None of those:</b> That's right, if you don't care and don't mind that others just stare at the Roon logo, we've got you covered there too. 

- Caches album art upload URLs to prevent multiple uploads for tracks in the same album.

- Self-validates configurations should you choose to modify them for your own taste.

- Shows a progress bar indicating how far you've made it through a track (sort of reliable, more on that later)

## ❌ What it does NOT do:

- Get track information (including sample rates, devices, and MUSE chains)

    - Potentially I may have a workaround for this but will require me using MemoryJS to tap Roon (and RAATServer) for the relevant values. This is going to take a LOT of experimenting.

- Modify your library in any way

    - Maybe a Lyrics searcher/embedder as a separate utility? Who knows.

- Let others listen to your music alongside you

    - Keep dreaming.

- Break any Terms of Service provided by Discord or Roon Labs.

## 📜 Requirements:

- NodeJS 20 LTS (latest release preferred)
- npm (should come with NodeJS)
- A Roon Core to communicate with
- A Discord account and desktop app

## ▶️ How to run:

1. Clone the repo: 

    `git clone https://github.com/prolix-oc/RoonCordJS`

2. Install all dependencies:
    
    `npm install`

3. Run it!
    - On Windows, double click or run in Command Prompt/Terminal: 
    
        `launch.bat`

    - On Linux, first 
        
        `chmod +x ./launch.sh`, then run 
        
        `./launch.sh`

    - Or if you prefer the manual, platform-agnostic way: 
    
        `node index`

On first run, it'll download an original copy of the `options.json` file that's configured for MusicBrainz art only. You can explore this file and add your own info!

## 📸 Screenshots

![First Screenshot of RPC](/screenshots/screen2.png)
![Second Screenshot of RPC](/screenshots/screen3.png)

![Third Screenshot of RPC](/screenshots/screen1.png)

## ❗ Got an issue? 

Feel free to report it in the [repository issues](https://github.com/prolix-oc/RoonCordJS/issues), and I'll see what went wrong for you! 

## ⚠️ Known Issues:

- Progress bar seems to get confused when you pause. I've attempted to mitigate this by changing the timestamp when it's paused, but this will need more iteration.

- Sometimes, the RPC won't show data immediately and will require a zone change to update. This could be a simple fix!

- The track, album, artist and zone info layout is not editable at the moment. I'm looking to change this soon, and make it very templateable. 