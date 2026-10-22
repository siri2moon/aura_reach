(() => {
  "use strict";
  if (window.__MAPS_AUTO_LOADED__) return;
  window.__MAPS_AUTO_LOADED__ = true;

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "EXTRACT_MAPS_PLACE",
    "CREATE_MAPS_REVIEW",
    "MAPS_SEARCH_PLACES",
    "MAPS_OPEN_PLACE",
  ]);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!HANDLED.has(message?.type)) return false;
    handle(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  });

  async function handle(message) {
    const state = pageState();
    if (message?.type === "PING") {
      return { ok: true, href: location.href, state, platform: "maps" };
    }
    if (state !== "ok") throw new Error(stateError(state));

    if (message?.type === "EXTRACT_MAPS_PLACE") {
      return extractMapsPlace();
    }
    if (message?.type === "MAPS_SEARCH_PLACES") {
      return searchMapsPlaces(Array.isArray(message.skipKeys) ? message.skipKeys : [], Number(message.limit) || 2);
    }

    if (actionLock) return { ok: false, error: "Đang có thao tác Google Maps khác đang xử lý." };
    actionLock = true;
    try {
      if (message?.type === "CREATE_MAPS_REVIEW") {
        return await createMapsReview(String(message.text || ""), Number(message.stars) || 5);
      }
      if (message?.type === "MAPS_OPEN_PLACE") {
        return await openMapsPlace(String(message.href || ""), String(message.name || ""));
      }
      return { ok: false, error: `Google Maps không xử lý lệnh ${message?.type || "?"}.` };
    } finally {
      actionLock = false;
    }
  }

  function pageState() {
    const href = location.href.toLowerCase();
    if (!/google\.[^/]+\/maps|maps\.google\./i.test(href)) return "wrong_page";
    return "ok";
  }

  function stateError(state) {
    if (state === "wrong_page") return "Hãy mở tab Google Maps rồi thử lại.";
    return "Trang Google Maps đang không khả dụng.";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function clickEl(el) {
    if (!el) return false;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    el.click();
    return true;
  }

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findByText(labels, selector = "button, [role='button'], a, span, div", maxLen = 80) {
    const want = labels.map((s) => String(s).toLowerCase());
    for (const el of document.querySelectorAll(selector)) {
      if (!visible(el)) continue;
      const t = textOf(el);
      if (!t || t.length > maxLen) continue;
      const low = t.toLowerCase();
      if (want.some((w) => low === w || low.includes(w))) return el;
    }
    return null;
  }

  function placeKeyFromUrl(urlStr = location.href) {
    try {
      const u = new URL(urlStr, location.origin);
      const place = u.pathname.match(/\/maps\/place\/([^/]+)/i);
      if (place) return decodeURIComponent(place[1]).toLowerCase();
    } catch {
      // ignore
    }
    return String(urlStr || location.href).toLowerCase();
  }

  function extractMapsPlace() {
    const nameEl =
      document.querySelector("h1.DUwDvf, h1[class*='fontHeadline'], h1") ||
      document.querySelector('[data-attrid="title"]');
    const name = textOf(nameEl);
    if (!name) throw new Error("Không đọc được tên địa điểm. Hãy mở một địa điểm trên Google Maps.");
    const addressEl = document.querySelector('[data-item-id="address"], button[data-item-id="address"]');
    const categoryEl = document.querySelector("button[jsaction*='pane.rating.category'], button[jsaction*='category']");
    const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"], span[aria-label*="sao"], span[aria-label*="stars"]');
    const snippetEl = document.querySelector('[data-overview-open], .PYvSYb, [class*="fontBodyMedium"]');
    return {
      ok: true,
      name,
      address: textOf(addressEl),
      category: textOf(categoryEl),
      rating: textOf(ratingEl),
      snippet: textOf(snippetEl).slice(0, 280),
      placeKey: placeKeyFromUrl(),
      href: location.href,
    };
  }

  function searchMapsPlaces(skipKeys, limit) {
    const skip = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]')).filter(visible);
    const places = [];
    const seen = new Set();
    for (const a of links) {
      const href = a.href;
      const key = placeKeyFromUrl(href);
      if (!key || skip.has(key) || seen.has(key)) continue;
      const name = textOf(a) || decodeURIComponent((href.match(/\/place\/([^/]+)/) || [])[1] || "").replace(/\+/g, " ");
      if (!name) continue;
      seen.add(key);
      places.push({ name: name.split("\n")[0], href, placeKey: key });
      if (places.length >= limit) break;
    }
    return { ok: true, places };
  }

  async function openMapsPlace(href, name) {
    if (href) {
      const link = Array.from(document.querySelectorAll('a[href*="/maps/place/"]')).find((a) => a.href === href);
      if (link) {
        clickEl(link);
        await sleep(1800);
        return { ok: true, href };
      }
      location.href = href;
      await sleep(1800);
      return { ok: true, href };
    }
    if (name) {
      const link = findByText([name], "a, div[role='article']", 120);
      if (link) {
        clickEl(link.closest("a") || link);
        await sleep(1800);
        return { ok: true, name };
      }
    }
    throw new Error("Không mở được địa điểm Google Maps.");
  }

  async function pickStars(stars) {
    const want = Math.min(5, Math.max(1, Number(stars) || 5));
    const starButtons = Array.from(
      document.querySelectorAll('[role="radio"], button[aria-label*="star"], button[aria-label*="sao"], span[role="button"]')
    ).filter(visible);
    const labeled = starButtons.filter((el) => {
      const label = `${el.getAttribute("aria-label") || ""} ${textOf(el)}`.toLowerCase();
      return new RegExp(`${want}\\s*(star|sao)`).test(label) || label.includes(`${want} trên 5`);
    });
    if (labeled[0]) {
      clickEl(labeled[0]);
      return true;
    }
    if (starButtons.length >= want) {
      clickEl(starButtons[want - 1]);
      return true;
    }
    return false;
  }

  async function createMapsReview(text, stars) {
    if (!text) throw new Error("Nội dung đánh giá trống.");
    await sleep(800);

    let reviewBtn =
      findByText(["Viết đánh giá", "Write a review", "Đánh giá"], "button, [role='button'], a, span", 40) ||
      document.querySelector('button[aria-label*="review" i], button[jsaction*="review"]');
    if (reviewBtn) {
      clickEl(reviewBtn.closest("button, [role='button'], a") || reviewBtn);
      await sleep(1200);
    }

    const starred = await pickStars(stars);
    if (!starred) {
      const starBar = document.querySelector('[aria-label*="stars" i], [aria-label*="sao"]');
      if (starBar) clickEl(starBar);
      await sleep(400);
      await pickStars(stars);
    }
    await sleep(500);

    const textarea =
      document.querySelector('textarea[aria-label*="review" i], textarea[aria-label*="đánh giá" i], textarea') ||
      document.querySelector('[contenteditable="true"]');
    if (!textarea) throw new Error("Không tìm thấy ô viết đánh giá. Có thể Google yêu cầu đăng nhập hoặc chưa từng ghé địa điểm.");

    textarea.focus();
    if (textarea instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(textarea, text);
      else textarea.value = text;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
      textarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
    await sleep(500);

    const postBtn =
      findByText(["Đăng", "Post", "Submit", "Gửi"], "button, [role='button']", 24) ||
      document.querySelector('button[jsaction*="submit"], button[aria-label*="Post"]');
    if (!postBtn) throw new Error("Không tìm thấy nút Đăng đánh giá.");
    clickEl(postBtn);
    await sleep(1800);
    return { ok: true, text, stars };
  }
})();
