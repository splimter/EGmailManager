const { ipcRenderer } = require("electron");
// const fs = require("fs");
const {
  MAIN_BODY_CONTAINER_STYLE,
  LOADER_CONTAINER_STYLE,
  IFRAME_STYLE,
  LABELS,
  SELECTED_PAGE,
  UN_SELECTED_PAGE,
  Factory,
  Operator,
} = require("./assets/js/homeHelper.js");

let mailMainPool,
  mailScoopedPool = [];
let currentPage = 1;
let maxPage = 0;
let selectedMailId;

let LeftFilter = "INBOX";

function docReady(fn) {
  // see if DOM is already available
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // call on next available tick
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

// FACTORY \\
/**
 * set IFrame size based on mail data content
 * used in Factory > setIframeMailBody
 */
function setIFrameSize() {
  document.getElementById("framemail").setAttribute("style", IFRAME_STYLE);
  document.getElementById("body-loader").setAttribute("style", "display:none");
  if (document.getElementById("framemail")) {
    var iFrameID = document.getElementById("framemail");
    iFrameID.height = iFrameID.contentWindow.document.body.offsetHeight + "px";
  }
  ipcRenderer.send("send-selected-mailID", selectedMailId);
}

/**
 * parse the mail data
 * remove the mail list body and replace it with iframe
 * @param {int} id selected mail id
 */
async function setModelData(id) {
  var b, d;
  mailScoopedPool.forEach((element) => {
    if (element.id === id) {
      if (element.payload.parts) d = element.payload.parts[1].body.data;
      else d = element.payload.body.data;

      b = new Buffer.alloc(parseInt(d.length));
      b.write(d, "base64");
    }
  });
  if (b) {
    let myNode = document.getElementById("mail-body-ul");
    while (myNode.firstChild) {
      myNode.removeChild(myNode.lastChild);
    }
    let _ = await Factory.setIframeMailBody(b);

    document.getElementById("mail-body-container").appendChild(_);
  }
  selectedMailId = id;
}
// END FACTORY \\

// OPERATORS \\

/**
 * set body #mail-body-ul based on {currentPage}
 * @param {string} p selected page from top bar id
 */
function PageNumeration(p) {
  document
    .getElementById("PNpage-" + currentPage)
    .parentNode.setAttribute("class", UN_SELECTED_PAGE);

  const page = p.substr(5, p.length);
  if (p.indexOf("page-") !== -1) currentPage = page;
  else if (p.indexOf("chevron_left") !== -1) {
    currentPage--;
  } else if (p.indexOf("chevron_right") !== -1) {
    currentPage++;
  }

  console.log(currentPage);

  const PNchevron_left = document.getElementById("PNchevron_left").parentNode
      .parentNode,
    PNchevron_right = document.getElementById("PNchevron_right").parentNode
      .parentNode;

  if (currentPage == 1) {
    PNchevron_left.setAttribute("class", "disabled");
    PNchevron_right.setAttribute("class", "waves-effect");
  } else if (currentPage == maxPage) {
    PNchevron_left.setAttribute("class", "waves-effect");
    PNchevron_right.setAttribute("class", "disabled");
  } else {
    PNchevron_left.setAttribute("class", "waves-effect");
    PNchevron_right.setAttribute("class", "waves-effect");
  }

  document
    .getElementById("PNpage-" + currentPage)
    .parentNode.setAttribute("class", SELECTED_PAGE);
  Operator.setMailByPoolAndPage(mailMainPool, currentPage);
}

/**
 * set mailScoopedPool based on {scoop} from {mailMainPool}
 * @param {string} scoop label scoop
 * @returns void
 */
function setPool(scoop, callback) {
  console.log(scoop);
  mailScoopedPool = [];
  mailMainPool.forEach((e) => {
    if (e != undefined && e.labelIds.includes(scoop)) {
      mailScoopedPool.push(e);
    }
  });
  callback();
}

/**
 * re-paint the mail body by invoking:
 * setPages() and setMailByPoolAndPage()
 * @param {bool} canFade set were if element should fade or not
 */
function refreshPool(canFade) {
  maxPage = parseInt(mailScoopedPool.length / 20) + 1;
  Factory.setPages(mailScoopedPool);
  Operator.setMailByPoolAndPage(mailScoopedPool, 1, canFade);
}
// END OPERATORS \\

// MAIN
docReady(function () {
  ipcRenderer.send("send-home-init");
});

addEventListener("click", function (evnt) {
  console.log("*", event.target.id);

  if (currentPage == 1 && event.target.id.indexOf("PNchevron_left") !== -1) {
    return;
  } else if (
    currentPage == maxPage &&
    event.target.id.indexOf("PNchevron_right") !== -1
  ) {
    return;
  }

  if (event.target.id.indexOf("PN") !== -1) {
    PageNumeration(evnt.target.id.substr(2, evnt.target.id.length));
  } else if (LABELS.includes(event.target.id)) {
    LeftFilter = event.target.id;
    setPool(LeftFilter,()=>{
      refreshPool(true);
    });
  } else if (event.target.id.indexOf("MM") !== -1) {
    setModelData(event.target.id.substr(2, evnt.target.id.length));
  }
});

function deleteDuplication(mainlist, targetlist, callback) {
  targetlist.map((t) => {
    let b = true;
    for (let index = 0; index < mainlist.length; index++) {
      if (mainlist[index].id == t.id) b = false;
    }
    if (b) mainlist.push(t);
  });
  callback(mainlist);
}

// LOADER FUNCs \\
// ipcRenderer.on("update-loader", function (event, arg) {
// });

// END LOADER FUNCs \\

ipcRenderer.on("send-home-init-reply", function (event, arg) {
  arg.labels.map((e) => {
    Factory.setSideList(e);
  });
});

ipcRenderer.on("set-loader-error", function (event, arg) {
  document.getElementById("status-text").innerHTML = arg;
  var elem = document.querySelector("#loader");
  elem.parentNode.removeChild(elem);
});

ipcRenderer.on("send-factory-init-reply", async function (event, arg) {
  let elem = document.getElementById("body-loader");
  elem.setAttribute("style", "display:none");
  document
    .getElementById("loader-container")
    .setAttribute("style", LOADER_CONTAINER_STYLE);
  document
    .querySelector("#mail-body-container")
    .setAttribute("style", MAIN_BODY_CONTAINER_STYLE);

  mailMainPool = Operator.joinArray(arg);
  mailMainPool = await mailMainPool.sort((a, b) =>
    a.internalDate < b.internalDate ? 1 : -1
  );
  setPool(LeftFilter,()=>{
    refreshPool(true);
  });
});

ipcRenderer.on("send-factory-refresh-reply", async function (event, arg) {
  console.log("send-factory-refresh-reply");

  let _ = await Operator.joinArray(arg);
  deleteDuplication(mailMainPool, _, async (e) => {
    mailMainPool = e;
    mailMainPool = await mailMainPool.sort((a, b) =>
      a.internalDate < b.internalDate ? 1 : -1
    );
    setPool(LeftFilter,()=>{
      refreshPool(false);
    });
  });
});

ipcRenderer.on("send-selected-mailID-reply", async function (event, arg) {
  console.log("send-selected-mailID-reply");
  mailMainPool = await mailMainPool.map((e) => {
    if (e.id == arg) {
      e.labelIds = e.labelIds.filter((item) => {
        return item != "UNREAD" ? item : "";
      });
    }
    return e;
  });
});
