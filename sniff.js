(() => {
  if (window.__fbGroupAutoSniff) return;
  window.__fbGroupAutoSniff = true;

  function jsonUnescape(value) {
    try {
      return JSON.parse(`"${value}"`);
    } catch {
      return String(value || "").replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
    }
  }

  function save(id, name) {
    const cleaned = String(name || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!id || cleaned.length < 2 || cleaned.length > 180) return;
    if (/^(group|groups|nhóm|see all|xem tất cả)$/i.test(cleaned)) return;
    try {
      const prev = JSON.parse(sessionStorage.getItem("fbGroupAutoGroups") || "{}");
      const existing = prev[id];
      if (!existing || cleaned.length > String(existing.name || "").length) {
        prev[id] = {
          id,
          name: cleaned,
          url: `https://www.facebook.com/groups/${id}/`,
          mbasicUrl: `https://mbasic.facebook.com/groups/${id}/`,
        };
        sessionStorage.setItem("fbGroupAutoGroups", JSON.stringify(prev));
        writeDomStore(prev);
      }
    } catch {
      // ignore quota / disabled storage
    }
  }

  function writeDomStore(map) {
    try {
      let node = document.getElementById("fb-group-auto-store");
      if (!node) {
        node = document.createElement("div");
        node.id = "fb-group-auto-store";
        node.style.display = "none";
        (document.documentElement || document.body).appendChild(node);
      }
      node.setAttribute("data-groups", JSON.stringify(map));
    } catch {
      // DOM not ready
    }
  }

  function harvest(text) {
    if (!text || typeof text !== "string" || text.length < 40) return;
    if (!text.includes("Group") && !text.includes("/groups/")) return;

    let index = 0;
    while (index < text.length) {
      const at = text.indexOf('"__typename":"Group"', index);
      if (at === -1) break;
      const slice = text.slice(Math.max(0, at - 700), at + 1000);
      const idMatch = slice.match(/"id"\s*:\s*"(\d{5,})"/);
      const nameMatch = slice.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"/);
      if (idMatch && nameMatch) save(idMatch[1], jsonUnescape(nameMatch[1]));
      index = at + 20;
    }

    const pairRe =
      /"group_id"\s*:\s*"(\d{5,})"[\s\S]{0,240}?"name"\s*:\s*"((?:\\.|[^"\\])*)"/g;
    let match;
    while ((match = pairRe.exec(text))) save(match[1], jsonUnescape(match[2]));
  }

  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const request = origFetch.apply(this, args);
    try {
      const target = args[0];
      const url = typeof target === "string" ? target : target && target.url;
      if (url && /graphql|\/api\//i.test(String(url))) {
        request
          .then((res) => res.clone().text())
          .then(harvest)
          .catch(() => {});
      }
    } catch {
      // keep Facebook fetch intact
    }
    return request;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__fbGroupAutoUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        if (/graphql|\/api\//i.test(String(this.__fbGroupAutoUrl || "")) && this.responseText) {
          harvest(this.responseText);
        }
      } catch {
        // ignore
      }
    });
    return origSend.apply(this, args);
  };
})();
