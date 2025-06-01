# Autodesk Fusion Downloader

## Overview

Hello! Autodesk's Fusion doesn't have a great way of allowing someone to move all their files from one hub to another. While this isn't the ultimate UI/solution, this does allow someone to quickly download a bunch of files under one Project.

A reminder that fusion files are set up like

```
HUB -> PROJECT -> FOLDER -> ITEM
```

I'd love to make a better interface for juggling this, but unfortunately I don't have the time. All this code does is takes the entire project file and spits it out, (flattens) the folder structure. There's a bit of a setup required to get things working.

This script will create a folder called downloads in the root where it'll dump everything. This project relies on [Autodesk's Data Management API](https://aps.autodesk.com/en/docs/data/v2/developers_guide/overview/). You'll need to create your own [Autodesk Platform Service Application](https://aps.autodesk.com/hubs/@personal/applications/) if you wish to use it 

## Setup

1. Clone this repo
1. Setup a [Autodesk Platform Service Application](https://aps.autodesk.com/hubs/@personal/applications/). Grab the `CLIENT_ID` and the `CLIENT_SECRET` Set the Callback URL to be: `http://localhost:3000/oauth/callback`
1. Create a `.env` file at the root which contains:

```
CLIENT_ID=[...]
CLIENT_SECRET=[...]
REDIRECT_URI=http://localhost:3000/oauth/callback
```

3. run `npm install`
4. change the `hub name` and `project name` variables in `download.js`
5. run `node index`