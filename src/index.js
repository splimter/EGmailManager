const electron = require("electron"),
  contextMenu = require("electron-context-menu");

const fs = require("fs");
const { google } = require("googleapis");
const { SCOPES, TOKEN_PATH } = require("./assets/js/googleBootstrap");
const {
  MAIN_URL,
  HOME_URL,
  downloadFile,
  // cacheWriter,
} = require("./indexHelper");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  electron.app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let oAuth2Client, authUrl;
let callbacklistLabels = listLabels;
let nextPageToken;

function makeOAuth2Client() {
  try {
    let content = fs.readFileSync("./src/credentials.json", "utf-8");
    // Authorize a client with credentials, then call the Gmail API.
    let credentials = JSON.parse(content);

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    return oAuth2Client;
  } catch (err) {
    console.log("Error loading client secret file:", err);
    return;
  }
}

function init() {
  fs.readFile(TOKEN_PATH, "utf8", (err, token) => {
    if (err) {
      mainWindow.loadURL(MAIN_URL);
      authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
      });
      console.log("Authorize this app by visiting this url:", authUrl);
      electron.shell.openExternal(authUrl);
    } else {
      oAuth2Client.setCredentials(JSON.parse(token));
      // callbacklistLabels(oAuth2Client);
      mainWindow.loadURL(HOME_URL);
    }
  });
}

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new electron.BrowserWindow({
    width: 1124,
    minWidth: 1124,
    height: 600,
    minHeight: 600,
    center: true,
    webPreferences: { nodeIntegration: true },
  });

  // Load client secrets from a local file.
  oAuth2Client = await makeOAuth2Client();

  // Check if we have previously stored a token.
  // and load the index.html of the app.
  init();

  contextMenu({
    menu: (defaultActions, params, browserWindow) => [
      {
        label: "Save Image As",
        visible: params.mediaType === "image",
        click: async () => {
          var savePath = await electron.dialog.showSaveDialog({
            defaultPath: params.srcURL.split("/").pop(),
            title: "save image",
          });
          downloadFile(params.srcURL, savePath.filePath);
        },
      },
      {
        label: "Copy Link",
        visible: params.linkURL !== "",
      },
      {
        label: "Open Link",
        visible: params.linkURL !== "",
        click: () => {
          electron.shell.openExternal(params.linkURL);
        },
      },
    ],
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// Emitted when the application has finished basic startup.
// Setyp google configuration
electron.app.on("will-finish-launching", () => {
/*
  for (let index = 0; index <= 10; index++) {
    if (!fs.existsSync(`./cache/primaryCache${index}.json`)) {
      fs.writeFileSync(`./cache/primaryCache${index}.json`, '{"data":[]}', {
        encoding: "utf8",
      });
    }
  }
  */
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron.app.on("ready", createWindow);

// Quit when all windows are closed.
electron.app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});

electron.app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
electron.ipcMain.on("send-code", async function (event, code) {
  oAuth2Client = await makeOAuth2Client();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      event.sender.send("send-code-reply", "err");
      return console.error("Error retrieving access token", err);
    }
    oAuth2Client.setCredentials(token);
    // Store the token to disk for later program executions
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
      if (err) return console.error(err);
      console.log("Token stored to", TOKEN_PATH);
      //callback(oAuth2Client);
      // mainWindow.loadURL(`file://${__dirname}/home.html`);
      event.sender.send("send-code-reply", "ok");
    });
  });
});
electron.ipcMain.on("resend-code", () => {
  electron.shell.openExternal(authUrl);
});

electron.ipcMain.on("send-home-init", async function (event, _) {
  // id: name: messageListVisibility: labelListVisibility: type:
  listLabels(oAuth2Client, (l) => {
    event.sender.send("send-home-init-reply", { labels: l });
  });

  // id labelIds: threadId: snippet: historyId: internalDate: payload:
  listMessages(
    oAuth2Client, 1,
    async (r) => {
      event.sender.send("send-factory-init-reply", r);
      for (let index = 0; index < 10; index++) {
        await listMessages(
          oAuth2Client,  10,
          async (r) => {
            event.sender.send("send-factory-refresh-reply", r);
            //await cacheWriter(r,index);
          });
      }
    });
});

electron.ipcMain.on("send-selected-mailID", async function (event, id) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  var request = await gmail.users.messages
    .modify({
      userId: "me",
      id: id,
      resource: {
        addLabelIds: [],
        removeLabelIds: ["UNREAD"],
      },
    })
    .then(() => {
      event.sender.send("send-selected-mailID-reply", id);
    });
});

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {function} callback A callback function
 */
async function listLabels(auth, callback) {
  const gmail = google.gmail({ version: "v1", auth });
  // gapi.client.gmail.users.labels.list
  await gmail.users.labels.list(
    {
      userId: "me",
    },
    (err, res) => {
      if (err) {
        if (err.message.indexOf("FetchError: request to")) {
          mainWindow.webContents.send("set-loader-error", "Time Out");
        } else if (err.message.indexOf("No refresh token is set")) {
          mainWindow.loadURL(MAIN_URL);
          fs.unlinkSync(TOKEN_PATH);
        }
        return console.log("The API returned an error: " + err);
      }
      const labels = res.data.labels;
      if (labels.length) {
        // console.log("Labels:");
        // labels.forEach((label) => {
        //     console.log(`- ${label.name}`);
        // });
        callback(labels);
      } else {
        //console.log("No labels found.");
      }
    }
  );
}

async function listMessages(auth, max, callback) {
  const gmail = google.gmail({ version: "v1", auth: auth });

  var initialRequest = await gmail.users.messages
    .list({
      userId: "me",
      maxResults: 20,
    })
    .catch((err) => {
      mainWindow.webContents.send("set-loader-error", err);
      fs.unlinkSync(TOKEN_PATH);
      mainWindow.reload(true);
      init();
    });
  if (nextPageToken == undefined) {
    nextPageToken = await initialRequest.data.nextPageToken;
  }
  callback(await loopGetter(gmail, initialRequest, max));
}

async function loopGetter(gmail, initialRequest, max) {
  let result = [],
    _result = [];
  for (let index = 0; index < max; index++) {
    _result = [];

    await initialRequest.data.messages.map(async (e) => {
      let msg = await gmail.users.messages.get({
        userId: "me",
        id: e.id,
      });

      _result.push(await msg.data);
    });
    result.push(_result);

    if (nextPageToken) {
      initialRequest = await gmail.users.messages.list({
        userId: "me",
        maxResults: 20,
        pageToken: nextPageToken,
      });
      nextPageToken = initialRequest.data.nextPageToken;
    } else {
      nextPageToken = initialRequest.data.nextPageToken;
      break;
    }
    // event.sender.send("send-home-init-reply", index);
    // mainWindow.webContents.send("update-loader", ((index + 1) / max) * 100);
  }
  return await result;
}

module.exports = {
  mainWindow,
  callbacklistLabels,
  makeOAuth2Client,
  google,
};
