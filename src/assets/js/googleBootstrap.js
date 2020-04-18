const { ipcRenderer, remote } = require("electron");

// const { google } = require("googleapis");

// https://manager-273809.firebaseapp.com/__/auth/handler
// If modifying these scopes, delete token.json.
const SCOPES = ["https://mail.google.com/"];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

module.exports = {
  SCOPES,
  TOKEN_PATH,
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
// function authorize(credentials) {}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
// function getNewToken() {}

// eslint-disable-next-line no-unused-vars
// -->> used in index.html
function setNewToken(code) {
  document.getElementById("chk-code-status").innerText = "";
  ipcRenderer.send("send-code", code);
}
function reSend() {
  ipcRenderer.send("resend-code");
}

try {
  ipcRenderer.on("send-code-reply", function (event, arg) {
    if (arg === "err") {
      document.getElementById("chk-code-status").innerText = "Wrong Code!";
    } else {
      remote.getCurrentWindow().loadURL(`file://${__dirname}/home.html`);
    }
  });
} catch (err) {
  //console.log(err);
}
