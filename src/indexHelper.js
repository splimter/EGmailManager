/* eslint-disable no-undef */
var request = require("request");
const MAIN_URL = `file://${__dirname}/index.html`,
  HOME_URL = `file://${__dirname}/home.html`;

module.exports = {
  MAIN_URL,
  HOME_URL,
  cacheWriter: async function (msgArray, maxPage) {

    async function _x(data) {
      const file = await JSON.parse(data);

      await msgArray.map(async (e) => {
        let data = await JSON.parse(e.data);
        await file.data.push(data);
      });

      const json = await JSON.stringify(file);

      await require("fs").writeFileSync(
        `./cache/primaryCache${maxPage}.json`,
        await json,
        "utf8",
        (err) => {
          if (err) console.log("writeFileSync", err);
        }
      );
    }
    try {
      let data = require("fs").readFileSync(`./cache/primaryCache${maxPage}.json`, "utf8");
      await _x(data);
    } catch (err) {
      console.log("readFileSync", err);
    }
  },

  downloadFile: function (file_url, targetPath) {
    console.log("file_url", file_url);
    console.log("targetPath", targetPath);

    // Save variable to know progress
    // var received_bytes = 0;
    // var total_bytes = 0;

    var req = request({
      method: "GET",
      uri: file_url,
    });

    var out = require("fs").createWriteStream(targetPath);
    req.pipe(out);

    req.on("response", function (data) {
      // Change the total bytes value to get progress later.
      total_bytes = parseInt(data.headers["content-length"]);
    });

    req.on("data", function (chunk) {
      // Update the received bytes
      received_bytes += chunk.length;
      // showProgress(received_bytes, total_bytes);
    });

    req.on("end", function () {
      console.log("File succesfully downloaded");
    });
  },
};
