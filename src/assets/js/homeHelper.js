const MAIN_BODY_CONTAINER_STYLE = "width: 100%; height: inherit;";
const INIT_LOADER_CONTAINER_STYLE =
  "height: 100vh;display: flex;justify-content: center;align-items: center;";
const LOADER_CONTAINER_STYLE =
  "height: 88vh;display: flex;justify-content: center;";
const SELECTED_PAGE = "active";
const UN_SELECTED_PAGE = "waves-effect";
const IFRAME_STYLE = "width: 100%;border: none;";

const BASIC_PAGINATOR_SKELETON = `
<li class="waves-effect" >
    <a href="#!"><i id="PNchevron_right" class="material-icons">chevron_right</i></a>
</li>
<li class="disabled"  >
    <a href="#!"><i id="PNchevron_left" class="material-icons">chevron_left</i></a>
</li>
<li id="page" class="active"><a id="PNpage-1" href="#!">1</a></li>
`;
const STAR =
  '<a href="#!" class="secondary-content"><i class="material-icons">grade</i></a>';

let LABELS = [];
const FILTER = [
  "CHAT",
  "CATEGORY_FORUMS",
  "CATEGORY_UPDATES",
  "CATEGORY_PERSONAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_SOCIAL",
];

/**
 * set fade effect
 */
var FX = {
  easing: {
    linear: function (progress) {
      return progress;
    },
    quadratic: function (progress) {
      return Math.pow(progress, 2);
    },
    swing: function (progress) {
      return 0.5 - Math.cos(progress * Math.PI) / 2;
    },
    circ: function (progress) {
      return 1 - Math.sin(Math.acos(progress));
    },
    back: function (progress, x) {
      return Math.pow(progress, 2) * ((x + 1) * progress - x);
    },
    bounce: function (progress) {
      for (var a = 0, b = 1; a == 100; a += b, b /= 2) {
        if (progress >= (7 - 4 * a) / 11) {
          return (
            -Math.pow((11 - 6 * a - 11 * progress) / 4, 2) + Math.pow(b, 2)
          );
        }
      }
    },
    elastic: function (progress, x) {
      return (
        Math.pow(2, 10 * (progress - 1)) *
        Math.cos(((20 * Math.PI * x) / 3) * progress)
      );
    },
  },
  animate: function (options) {
    var start = new Date();
    var id = setInterval(function () {
      var timePassed = new Date() - start;
      var progress = timePassed / options.duration;
      if (progress > 1) {
        progress = 1;
      }
      options.progress = progress;
      var delta = options.delta(progress);
      options.step(delta);
      if (progress == 1) {
        clearInterval(id);
        options.complete();
      }
    }, options.delay || 10);
  },
  fadeOut: function (element, options) {
    var to = 1;
    this.animate({
      duration: options.duration,
      delta: function (progress) {
        progress = this.progress;
        return FX.easing.swing(progress);
      },
      complete: options.complete,
      step: function (delta) {
        element.style.opacity = to - delta;
      },
    });
  },
  fadeIn: function (element, options) {
    var to = 0;
    this.animate({
      duration: options.duration,
      delta: function (progress) {
        progress = this.progress;
        return FX.easing.swing(progress);
      },
      complete: options.complete,
      step: function (delta) {
        element.style.opacity = to + delta;
      },
    });
  },
};

// FACTORY \\
let Factory = {
  /**
   * make icons for side bar #item-list
   * @param {string} name i title
   */
  setSpan: function (name) {
    var item = document.createElement("i");
    item.setAttribute("id", name);
    item.setAttribute("class", "small material-icons");
    switch (name) {
      case "SENT":
        item.innerHTML = "send";
        break;
      case "INBOX":
        item.innerHTML = "inbox";
        break;
      case "IMPORTANT":
        item.innerHTML = "gradient";
        break;
      case "TRASH":
        item.innerHTML = "delete";
        break;
      case "DRAFT":
        item.innerHTML = "drafts";
        break;
      case "SPAM":
        item.innerHTML = "warning";
        break;
      case "STARRED":
        item.innerHTML = "stars";
        break;
      case "UNREAD":
        item.innerHTML = "markunread";
        break;
      default:
        item.innerHTML = "label";
        break;
    }

    return item;
  },
  /**
   * make li element for for side bar #item-list
   * @param {string} e li title
   */
  setSideList: function (e) {
    if (!FILTER.includes(e.name)) {
      LABELS.push(e.name);
      var item = document.createElement("li");
      item.setAttribute("class", "collection-item sidebar-menu-items");
      item.setAttribute("id", e.name);
      item.innerHTML = e.name;

      document.getElementById("item-list").appendChild(item);
      item.appendChild(Factory.setSpan(e.name));
      FX.fadeIn(item, {
        duration: 1000,
        complete: () => {},
      });
    }
  },
  /**
   * make li elements for #mail-body #mail-body-ul
   * @param {int} id mail id
   * @param {string[]} title mail author, title
   * @param {string} snippet mail snippet
   * @param {boolean} isStar true if is star
   * @param {boolean} isUnRead true if is unread
   */
  mailFactory: function (id, title, snippet, isStar, isUnRead) {
    var i = document.createElement("i");
    i.setAttribute("class", "material-icons circle");
    if (isUnRead) i.innerHTML = "mail";
    else i.innerHTML = "mail_outline";

    var span = document.createElement("span");
    span.setAttribute("class", "title");
    span.innerHTML = title[0] + " - " + title[1];

    var p = document.createElement("p");
    p.innerHTML = snippet;

    var item = document.createElement("li");
    item.setAttribute("class", "collection-item avatar");
    item.setAttribute("id", "MM" + id);
    item.appendChild(i);
    item.appendChild(span);
    item.appendChild(p);
    if (isStar) {
      let x = document.createElement("area");
      x.innerHTML = STAR;
      const y = x.firstElementChild;
      item.appendChild(y);
    }
    return item;
  },
  /**
   * set page by {mailScoopedPool} size
   * @param {Object[]} pool {mailScoopedPool}
   */
  setPages: function (pool) {
    let placeholder = document.getElementById("main-page");
    if (placeholder)
      while (placeholder.firstChild) {
        placeholder.removeChild(placeholder.lastChild);
      }

    placeholder.innerHTML = BASIC_PAGINATOR_SKELETON;
    const node = placeholder.firstElementChild;
    document.getElementById("main-page").appendChild(node);

    let p1 = document.getElementById("page");
    let item;
    let size = pool.length / 20;
    for (let index = parseInt(size); index >= 1; index--) {
      item = document.createElement("li");
      item.setAttribute("class", UN_SELECTED_PAGE);
      let a = document.createElement("a");
      a.setAttribute("href", "#!");
      a.setAttribute("id", "PNpage-" + (index + 1));
      a.innerHTML = index + 1;
      item.appendChild(a);
      p1.parentNode.insertBefore(item, p1.nextSibling);
    }
  },
  /**
   * set iframe content based on {content}
   * @param {Buffer} content
   */
  setIframeMailBody: function name(content) {
    document
      .getElementById("loader-container")
      .setAttribute("style", INIT_LOADER_CONTAINER_STYLE);

    document
      .getElementById("body-loader")
      .setAttribute("style", "display:contents");

    let iframe = document.createElement("iframe");
    iframe.setAttribute("class", "mail-body-ul");
    iframe.setAttribute("id", "framemail");
    iframe.setAttribute("srcdoc", content);
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("onload", "setIFrameSize()");
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-popups");
    iframe.setAttribute("style", IFRAME_STYLE + "visibility:hidden");
    return iframe;
  },
};
// END FACTORY \\

function chkIfContains(list, obj) {
  for (let index = 0; index < list.length; index++) {
    if (obj == undefined) {
      return false;
    } else if (list[index].id != obj.id) return true;
  }
  return false;
}

// OPERATORS \\
let Operator = {
  joinArray: function (pool) {
    let joinedPool = [];
    pool.forEach((element) => {
      element.forEach((e) => {
        if (joinedPool.length == 0) joinedPool.push(e);
        else if (chkIfContains(joinedPool, e)) joinedPool.push(e);
      });
    });
    console.log("joinedPool", joinedPool);

    return joinedPool;
  },
  /**
   * remove all #mail-body-ul content if #framemail existe then remove
   * pass all wanted data to mailFactory()
   * @param {Object[]} pool {mailScoopedPool}
   * @param {int} page {currentPage}
   * @param {boolean} canFade if true call fade effect
   */
  setMailByPoolAndPage: function (pool, page, canFade) {
    console.log("pool ", pool);

    page *= 20;
    let myNode = document.getElementById("mail-body-ul");
    while (myNode.firstChild) {
      myNode.removeChild(myNode.lastChild);
    }
    myNode = document.getElementById("framemail");
    if (myNode) myNode.parentNode.removeChild(myNode);

    for (let index = page - 20; index < page; index++) {
      let id, f, s, ss;
      let chk1 = false,
        chk2 = false;
      if (pool[index]) {
        id = pool[index].id;
        pool[index].payload.headers.forEach((eh) => {
          if (eh.name === "From")
            f = eh.value.substr(0, eh.value.indexOf("<")).replace(/["]/g, "");
          if (eh.name === "Subject") {
            s = eh.value;
          }
        });
        chk1 = true;
      } else {
        f = "Failed to import";
        s = "😥";
        chk1 = false;
      }
      if (pool[index]) {
        ss = pool[index].snippet;
        if (ss.length >= 100) {
          ss = s.substring(0, 100);
          ss += "...";
        }
        chk2 = true;
      } else {
        ss = "Could not retrive snippet 😥";
        chk2 = false;
      }
      if (chk1 || chk2) {
        let isStart = false,
          isUnRead = false;
        if (pool[index].labelIds.includes("STARRED")) {
          isStart = true;
        }
        if (pool[index].labelIds.includes("UNREAD")) {
          isUnRead = true;
        }
        let item = Factory.mailFactory(id, [f, s], ss, isStart, isUnRead);

        let _ = document.getElementById("mail-body-ul").appendChild(item);
        if (canFade) {
          FX.fadeIn(_, {
            duration: 500,
            complete: () => {},
          });
        }
      }
    }
  },
};

// END OPERATORS \\

module.exports = {
  MAIN_BODY_CONTAINER_STYLE,
  LOADER_CONTAINER_STYLE,
  IFRAME_STYLE,
  FILTER,
  LABELS,
  FX,
  STAR,
  BASIC_PAGINATOR_SKELETON,
  SELECTED_PAGE,
  UN_SELECTED_PAGE,
  Factory,
  Operator,
};
