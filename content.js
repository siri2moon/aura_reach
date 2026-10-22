(() => {
  if (window.__fbGroupAutoInjected) return;
  window.__fbGroupAutoInjected = true;

  const SKIP_SLUGS = new Set([
    "joins",
    "feed",
    "create",
    "discover",
    "category",
    "seemore",
    "search",
    "add",
    "notifications",
    "requests",
    "pending",
    "suggested",
    "settings",
    "set",
    "help",
    "about",
  ]);

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "EXTRACT_FEED_CONTEXT",
    "CREATE_POST",
    "CREATE_COMMENT",
    "JOIN_GROUP",
    "LEAVE_GROUP",
    "SCAN_GROUPS",
    "SCAN_FEED_POSTS",
    "SEARCH_GROUPS",
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
      return { ok: true, href: location.href, state, platform: "facebook" };
    }
    if (state !== "ok" && message?.type !== "SCAN_GROUPS") {
      throw new Error(stateError(state));
    }

    if (message?.type === "EXTRACT_FEED_CONTEXT") {
      return extractFeedContext(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }

    if (message?.type === "SEARCH_GROUPS") {
      return searchGroups(Math.min(Math.max(Number(message.limit) || 30, 1), 60));
    }

    if (message?.type === "SCAN_FEED_POSTS") {
      return scanFeedPosts(Math.min(Math.max(Number(message.limit) || 20, 1), 40));
    }

    if (message?.type === "CREATE_POST" || message?.type === "CREATE_COMMENT") {
      const text = String(message.text || "");
      if (actionLock || wasRecentAction(message.type, text)) {
        return { ok: true, skipped: true };
      }
      actionLock = true;
      try {
        if (message.type === "CREATE_POST") return await createPost(text);
        const submit = message.submit !== false;
        const result = await createComment(text, {
          postKey: message.postKey,
          humanize: message.humanize !== false,
          submit,
        });
        if (!submit && result?.ok && !result.nextUrl) {
          showHud("Đã điền sẵn bình luận. Kiểm tra, sửa nếu cần rồi tự bấm Enter để đăng.");
          setTimeout(hideHud, 15000);
        }
        return result;
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "JOIN_GROUP" || message?.type === "LEAVE_GROUP") {
      if (actionLock || wasRecentAction(message.type, location.pathname)) {
        return { ok: true, skipped: true };
      }
      actionLock = true;
      try {
        if (message.type === "JOIN_GROUP") return await joinGroup();
        return await leaveGroup();
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "SCAN_GROUPS") {
      return scanGroups(Boolean(message.scroll));
    }
    return { ok: false, error: `Facebook không xử lý lệnh ${message?.type || "?"}.` };
  }

  function actionKey(type, text) {
    return `${type}:${String(text).slice(0, 240)}`;
  }

  function wasRecentAction(type, text) {
    try {
      const raw = sessionStorage.getItem("fbGroupAutoLastAction");
      if (!raw) return false;
      const prev = JSON.parse(raw);
      return prev.key === actionKey(type, text) && Date.now() - prev.t < 90000;
    } catch {
      return false;
    }
  }

  function markAction(type, text) {
    try {
      sessionStorage.setItem(
        "fbGroupAutoLastAction",
        JSON.stringify({ key: actionKey(type, text), t: Date.now() })
      );
    } catch {
      // ignore
    }
  }

  function pageState() {
    const url = location.href;
    if (/\/checkpoint\//i.test(url)) return "checkpoint";
    if (/\/login\.php|\/login\/|facebook\.com\/login/i.test(url)) return "login";
    const text = document.body ? document.body.innerText.slice(0, 4000) : "";
    if (/you must log in|bạn cần đăng nhập|log in to facebook|đăng nhập facebook/i.test(text) &&
        document.querySelector('input[name="pass"], input[type="password"]')) {
      return "login";
    }
    if (/temporarily blocked|account has been disabled|tài khoản của bạn đã bị vô hiệu|bạn tạm thời bị chặn/i.test(text)) {
      return "blocked";
    }
    return "ok";
  }

  function stateError(state) {
    if (state === "login") return "Chưa đăng nhập Facebook.";
    if (state === "checkpoint") return "Facebook đang yêu cầu xác minh bảo mật.";
    if (state === "blocked") return "Tài khoản đang bị hạn chế.";
    return "Trang Facebook không sẵn sàng.";
  }

  async function scanGroups(shouldScroll) {
    await waitFor(() => document.body, 8000);
    await sleep(1200);
    clickSeeMoreButtons();
    if (shouldScroll) await autoScrollGroups();
    else await sleep(800);

    let groups = collectAllGroups(true);
    for (let i = 0; i < 6 && groups.length < 3; i += 1) {
      clickSeeMoreButtons();
      await sleep(900);
      groups = collectAllGroups(true);
    }

    return {
      ok: true,
      state: pageState(),
      groups,
      href: location.href,
      nextUrl: findNextUrl(),
      debug: {
        href: location.href,
        domLinks: document.querySelectorAll("[href*='/groups/']").length,
        count: groups.length,
      },
    };
  }

  // Trang kết quả facebook.com/search/groups/?q=...: chỉ đọc tên nhóm, số thành viên, công khai/riêng tư.
  async function searchGroups(limit) {
    showHud("Đang đọc kết quả tìm nhóm...");
    try {
      await waitFor(() => document.querySelector('[role="main"], [role="feed"]'), 12000);
      await sleep(1200);
      const found = new Map();
      const collect = () => {
        for (const link of document.querySelectorAll('[role="main"] a[href*="/groups/"]')) {
          const id = parseGroupId(link.getAttribute("href") || "");
          if (!id || found.has(id)) continue;
          const name = cleanName(link.innerText || link.getAttribute("aria-label") || "");
          if (!name) continue;
          found.set(id, { ...makeGroup(id, name), meta: groupCardMeta(link, name) });
        }
      };
      collect();
      for (let i = 0; i < 6 && found.size < limit; i += 1) {
        window.scrollBy(0, Math.round(window.innerHeight * 0.9));
        await sleep(900 + Math.round(Math.random() * 700));
        collect();
      }
      return { ok: true, groups: [...found.values()].slice(0, limit) };
    } finally {
      hideHud();
    }
  }

  function groupCardMeta(link, name) {
    let card = link;
    for (let i = 0; i < 8 && card.parentElement; i += 1) {
      card = card.parentElement;
      if ((card.innerText || "").length > 60) break;
    }
    const lines = String(card.innerText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line !== name);
    const meta = lines.find((line) => /member|thành viên|участник|public|private|công khai|riêng tư|открыт|закрыт/i.test(line));
    return (meta || "").slice(0, 160);
  }

  function collectAllGroups(includeHtml) {
    const found = new Map();
    const add = (group) => {
      if (!group?.id || !group.name) return;
      const existing = found.get(group.id);
      if (!existing || betterName(group.name, existing.name)) found.set(group.id, group);
    };
    for (const group of extractGroupsFromDom()) add(group);
    for (const group of groupsFromSession()) add(group);
    if (includeHtml) for (const group of extractGroupsFromHtml()) add(group);
    return [...found.values()];
  }

  function betterName(next, current) {
    const nextIsId = /^\d+$/.test(next);
    const currentIsId = !current || /^\d+$/.test(current);
    if (currentIsId && !nextIsId) return true;
    if (!currentIsId && nextIsId) return false;
    return next.length > String(current || "").length;
  }

  function extractGroupsFromDom() {
    const found = [];
    const nodes = document.querySelectorAll(
      "a[href*='/groups/'], a[href*='facebook.com/groups'], [data-href*='/groups/'], [aria-label][href*='/groups/']"
    );
    for (const node of nodes) {
      const href = node.getAttribute("href") || node.getAttribute("data-href") || "";
      const id = parseGroupId(href);
      if (!id) continue;
      const name = nameFromNode(node) || id;
      found.push(makeGroup(id, name));
    }
    return found;
  }

  function extractGroupsFromHtml() {
    const found = [];
    const html = document.documentElement ? document.documentElement.innerHTML : "";
    if (!html) return found;

    let index = 0;
    while (index < html.length) {
      const at = html.indexOf('"__typename":"Group"', index);
      if (at === -1) break;
      const slice = html.slice(Math.max(0, at - 700), at + 1000);
      const idMatch = slice.match(/"id"\s*:\s*"(\d{5,})"/);
      const nameMatch = slice.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"/);
      if (idMatch && nameMatch) {
        const name = cleanName(jsonUnescape(nameMatch[1]));
        if (name) found.push(makeGroup(idMatch[1], name));
      }
      index = at + 20;
    }

    return found;
  }

  function groupsFromSession() {
    const buckets = [];
    try {
      const raw = sessionStorage.getItem("fbGroupAutoGroups");
      if (raw) buckets.push(...Object.values(JSON.parse(raw)));
    } catch {
      // ignore
    }
    try {
      const node = document.getElementById("fb-group-auto-store");
      const raw = node && node.getAttribute("data-groups");
      if (raw) buckets.push(...Object.values(JSON.parse(raw)));
    } catch {
      // ignore
    }
    return buckets.filter((group) => group?.id && group?.name);
  }

  function parseGroupId(href) {
    if (!href) return null;
    let url;
    try {
      url = new URL(href, location.origin);
    } catch {
      return null;
    }
    if (url.hostname && !url.hostname.endsWith("facebook.com")) return null;
    const match = url.pathname.match(/^\/groups\/([^/]+)\/?/);
    if (!match) return null;
    const id = decodeURIComponent(match[1]);
    if (SKIP_SLUGS.has(id.toLowerCase())) return null;
    if (!/^[A-Za-z0-9._-]+$/.test(id)) return null;
    return id;
  }

  function nameFromNode(node) {
    const aria = cleanName(node.getAttribute("aria-label") || "");
    if (aria) return aria;
    const img = node.querySelector && node.querySelector("img[alt]");
    const alt = cleanName(img && img.getAttribute("alt"));
    if (alt) return alt;
    const own = cleanName(node.innerText || node.textContent || "");
    if (own) return own;

    let parent = node.parentElement;
    for (let i = 0; i < 5 && parent; i += 1) {
      const labeled = parent.querySelector("[aria-label]");
      const fromAria = cleanName(labeled && labeled.getAttribute("aria-label"));
      if (fromAria) return fromAria;
      const heading = parent.querySelector('span[dir="auto"], h1, h2, h3, strong');
      const fromHeading = cleanName(heading && (heading.innerText || heading.textContent));
      if (fromHeading) return fromHeading;
      parent = parent.parentElement;
    }
    return "";
  }

  function cleanName(name) {
    const value = String(name || "")
      .replace(/\s+/g, " ")
      .replace(/\s+\d[\d.,]*\s*(k|m)?\s*(members|thành viên).*$/i, "")
      .trim();
    if (value.length < 2 || value.length > 160) return "";
    if (
      /^(see more|xem thêm|see all|xem tất cả|create group|tạo nhóm|discover|khám phá|your groups|nhóm của bạn|groups|nhóm)$/i.test(
        value
      )
    ) {
      return "";
    }
    return value;
  }

  function jsonUnescape(value) {
    try {
      return JSON.parse(`"${value}"`);
    } catch {
      return String(value || "");
    }
  }

  function makeGroup(id, name) {
    return {
      id,
      name: name || id,
      url: `https://www.facebook.com/groups/${id}/`,
      mbasicUrl: `https://mbasic.facebook.com/groups/${id}/`,
    };
  }

  function findNextUrl() {
    const labels = ["see more", "xem thêm", "more groups", "thêm nhóm", "next", "tiếp", "see all", "xem tất cả"];
    for (const link of document.querySelectorAll("a[href]")) {
      const text = (link.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!labels.some((label) => text === label || text.startsWith(label))) continue;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) continue;
      try {
        const url = new URL(href, location.origin);
        if (url.hostname.endsWith("facebook.com")) return url.href;
      } catch {
        continue;
      }
    }
    return null;
  }

  function clickSeeMoreButtons() {
    const labels = ["see all", "xem tất cả", "see more", "xem thêm", "show more", "hiển thị thêm", "see more groups"];
    for (const el of document.querySelectorAll("a, div[role='button'], span[role='button'], div[role='link']")) {
      const text = (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!text || text.length > 40) continue;
      if (!labels.some((label) => text === label || text.startsWith(label))) continue;
      try {
        el.click();
      } catch {
        // ignore
      }
    }
  }

  async function autoScrollGroups() {
    showHud("Đang tải danh sách nhóm...");
    let stable = 0;
    let last = 0;
    for (let i = 0; i < 20; i += 1) {
      clickSeeMoreButtons();
      const main = document.querySelector('[role="main"]');
      if (main) main.scrollTop = main.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
      }
      await sleep(750);
      const count = collectAllGroups(false).length;
      if (count <= last) stable += 1;
      else stable = 0;
      last = count;
      if (stable >= 4 && i >= 4) break;
    }
    hideHud();
  }

  function pageGroupName() {
    const h1 = document.querySelector("h1");
    const fromH1 = cleanExtract(h1 && (h1.innerText || h1.textContent));
    if (fromH1 && fromH1.length < 120) return fromH1;
    const og = document.querySelector('meta[property="og:title"]');
    return cleanExtract(og && og.getAttribute("content")).replace(/\s*[|-]\s*Facebook.*/i, "");
  }

  function findExactControl(labels) {
    const nodes = document.querySelectorAll(
      "[role='button'], button, a, input[type='submit'], [aria-label], span[role='button']"
    );
    for (const node of nodes) {
      if (!isVisible(node)) continue;
      const text = `${node.getAttribute("aria-label") || ""} ${node.innerText || node.value || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      if (!labels.includes(text)) continue;
      return node.closest("[role='button'], button, a") || node;
    }
    return null;
  }

  function hasQuestions() {
    const blob = `${document.body ? document.body.innerText : ""}`.slice(0, 6000).toLowerCase();
    if (/membership questions|câu hỏi thành viên|answer questions|trả lời câu hỏi/.test(blob)) return true;
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const text = (dialog.innerText || "").toLowerCase();
    return /question|câu hỏi|membership/.test(text) && dialog.querySelector("textarea, input[type='text'], [contenteditable='true']");
  }

  function membershipState() {
    if (findExactControl(["joined", "đã tham gia", "joined group", "invite friends", "mời bạn bè", "invite"])) {
      return "joined";
    }
    if (findExactControl(["cancel request", "hủy yêu cầu", "pending", "requested"])) return "pending";
    const text = (document.body ? document.body.innerText : "").slice(0, 4000).toLowerCase();
    if (/you are a member|bạn là thành viên|you're a member/.test(text)) return "joined";
    if (/pending|đang chờ duyệt|request sent|đã gửi yêu cầu/.test(text) && /join|tham gia/.test(text)) return "pending";
    return "unknown";
  }

  async function joinGroup() {
    showHud("Đang tham gia nhóm...");
    try {
      await sleep(700 + Math.round(Math.random() * 600));
      const current = membershipState();
      if (current === "joined") {
        markAction("JOIN_GROUP", location.pathname);
        return { ok: true, already: true, status: "joined", name: pageGroupName() };
      }
      if (current === "pending") {
        markAction("JOIN_GROUP", location.pathname);
        return { ok: true, already: true, status: "pending", name: pageGroupName() };
      }
      if (isMbasic() || location.hostname.startsWith("m.")) return await liteJoinGroup();
      return await wwwJoinGroup();
    } finally {
      hideHud();
    }
  }

  async function liteJoinGroup() {
    const submit = [...document.querySelectorAll("input[type='submit'], button[type='submit'], a, button")].find((el) => {
      const label = `${el.value || el.innerText || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      return label === "join group" || label === "join" || label === "tham gia nhóm" || label === "tham gia";
    });
    if (!submit) {
      const href = [...document.querySelectorAll("a[href]")].find((a) => /join/i.test(a.getAttribute("href") || "") && /join|tham gia/i.test(a.innerText || ""));
      if (href) {
        markAction("JOIN_GROUP", location.pathname);
        return { ok: true, nextUrl: new URL(href.getAttribute("href"), location.origin).href, name: pageGroupName() };
      }
      throw new Error("Không tìm thấy nút Tham gia trên trang nhóm.");
    }
    markAction("JOIN_GROUP", location.pathname);
    submit.click();
    await sleep(1500);
    if (hasQuestions()) {
      throw new Error("Nhóm yêu cầu trả lời câu hỏi thành viên. Hãy tham gia tay nhóm này.");
    }
    return { ok: true, status: membershipState() === "pending" ? "pending" : "joined", name: pageGroupName() };
  }

  async function wwwJoinGroup() {
    const joinBtn =
      findExactControl(["join group", "tham gia nhóm", "join this group", "join", "tham gia"]) ||
      findRoleButton(["join group", "tham gia nhóm"]);
    if (!joinBtn) throw new Error("Không tìm thấy nút Tham gia nhóm.");
    clickHuman(joinBtn);
    await sleep(1400);
    if (hasQuestions()) {
      throw new Error("Nhóm yêu cầu trả lời câu hỏi thành viên. Hãy tham gia tay nhóm này.");
    }
    markAction("JOIN_GROUP", location.pathname);
    const after = membershipState();
    return { ok: true, status: after === "pending" ? "pending" : "joined", name: pageGroupName() };
  }

  async function leaveGroup() {
    showHud("Đang rời nhóm...");
    try {
      await sleep(700 + Math.round(Math.random() * 600));
      const current = membershipState();
      if (current === "unknown") {
        const text = (document.body ? document.body.innerText : "").slice(0, 2500).toLowerCase();
        if (/join group|tham gia nhóm/.test(text) && !/joined|đã tham gia/.test(text)) {
          markAction("LEAVE_GROUP", location.pathname);
          return { ok: true, already: true, status: "left", name: pageGroupName() };
        }
      }
      if (isMbasic() || location.hostname.startsWith("m.")) return await liteLeaveGroup();
      return await wwwLeaveGroup();
    } finally {
      hideHud();
    }
  }

  async function liteLeaveGroup() {
    const leaveLink = [...document.querySelectorAll("a, input[type='submit'], button")].find((el) => {
      const href = (el.getAttribute && el.getAttribute("href")) || "";
      const label = `${el.value || el.innerText || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      return /leave/i.test(href) || label === "leave group" || label === "leave" || label === "rời nhóm" || label === "rời khỏi nhóm";
    });
    if (!leaveLink) throw new Error("Không tìm thấy nút Rời nhóm.");
    if (leaveLink.getAttribute && leaveLink.getAttribute("href") && !/confirm/i.test(leaveLink.getAttribute("href"))) {
      markAction("LEAVE_GROUP", location.pathname);
      return { ok: true, nextUrl: new URL(leaveLink.getAttribute("href"), location.origin).href, name: pageGroupName() };
    }
    markAction("LEAVE_GROUP", location.pathname);
    leaveLink.click();
    await sleep(900);
    const confirm = [...document.querySelectorAll("input[type='submit'], button, a")].find((el) => {
      const label = `${el.value || el.innerText || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      return label === "leave group" || label === "confirm" || label === "rời nhóm" || label === "xác nhận";
    });
    if (confirm) confirm.click();
    return { ok: true, status: "left", name: pageGroupName() };
  }

  async function wwwLeaveGroup() {
    const joined =
      findExactControl(["joined", "đã tham gia", "joined group"]) ||
      findRoleButton(["joined", "đã tham gia"]);
    if (joined) {
      clickHuman(joined);
      await sleep(900);
    } else {
      const more = findExactControl(["see options", "tùy chọn", "more", "thêm"]) ||
        document.querySelector('[aria-label="See options"], [aria-label="Group options"], [aria-label="Tùy chọn"]');
      if (more) {
        clickHuman(more);
        await sleep(900);
      }
    }

    const leaveItem =
      findExactControl(["leave group", "rời nhóm", "leave this group", "rời khỏi nhóm"]) ||
      [...document.querySelectorAll('[role="menuitem"], [role="button"], span')].find((el) => {
        if (!isVisible(el)) return false;
        const text = (el.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
        return text === "leave group" || text === "rời nhóm" || text === "leave this group";
      });
    if (!leaveItem) throw new Error("Không tìm thấy mục Rời nhóm. Mở menu Đã tham gia rồi thử lại.");
    clickHuman(leaveItem.closest('[role="menuitem"], [role="button"]') || leaveItem);
    await sleep(900);

    const confirm =
      findExactControl(["leave group", "rời nhóm", "leave", "xác nhận"]) ||
      [...document.querySelectorAll('[role="dialog"] [role="button"], [role="dialog"] button')].find((el) => {
        const text = (el.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
        return text === "leave group" || text === "rời nhóm" || text === "leave";
      });
    if (confirm) clickHuman(confirm);
    markAction("LEAVE_GROUP", location.pathname);
    await sleep(1000);
    return { ok: true, status: "left", name: pageGroupName() };
  }

  async function createPost(text) {
    if (!text.trim()) throw new Error("Nội dung bài viết trống.");
    showHud("Đang soạn bài viết...");
    try {
      if (isMbasic()) return await mbasicCreatePost(text);
      return await wwwCreatePost(text);
    } finally {
      hideHud();
    }
  }

  async function createComment(text, extra = {}) {
    if (!text.trim()) throw new Error("Nội dung bình luận trống.");
    showHud("Đang bình luận...");
    try {
      const submit = extra.submit !== false;
      if (isMbasic()) return await mbasicCreateComment(text, submit);
      if (location.hostname.startsWith("m.")) {
        try {
          return await mbasicCreateComment(text, submit);
        } catch {
          return await wwwCreateComment(text, extra.postKey, extra.humanize, submit);
        }
      }
      return await wwwCreateComment(text, extra.postKey, extra.humanize, submit);
    } finally {
      hideHud();
    }
  }

  async function extractFeedContext(skipKeys) {
    showHud("Đang đọc bài viết...");
    try {
      await waitFor(() => document.body, 8000);
      await sleep(600 + Math.round(Math.random() * 700));
      if (isLiteHost()) return await extractMbasicContext(skipKeys);
      return await extractWwwContext(skipKeys);
    } finally {
      hideHud();
    }
  }

  // Đọc nhiều bài trên bảng tin group cùng lúc (cho tab Nadezhno). Chỉ đọc, không bấm gì ngoài "Xem thêm".
  async function scanFeedPosts(limit) {
    if (isLiteHost()) {
      throw new Error("Hãy dùng link www.facebook.com/groups/... để quét bài.");
    }
    showHud("Đang đọc các bài trong group...");
    try {
      await waitFor(() => document.body, 8000);
      await prepareWwwFeed();
      const byKey = new Map();
      const collect = () => {
        for (const card of collectWwwPostCards()) {
          if (!card.key || byKey.has(card.key)) continue;
          byKey.set(card.key, { key: card.key, permalink: card.permalink, text: card.text, comments: card.comments });
        }
      };
      collect();
      for (let i = 0; i < 10 && byKey.size < limit; i += 1) {
        window.scrollBy(0, Math.round(window.innerHeight * 0.9));
        await sleep(700 + Math.round(Math.random() * 600));
        dismissWwwPopups();
        collect();
      }
      const posts = [...byKey.values()].filter((p) => p.text).slice(0, limit);
      return { ok: true, posts };
    } finally {
      hideHud();
    }
  }

  function isLiteHost() {
    const host = location.hostname;
    return host.startsWith("mbasic.") || host.startsWith("m.");
  }

  function isPostHref(href) {
    return /\/posts\/(pfbid[\w-]+|\d+)|\/permalink\/(pfbid[\w-]+|\d+)|story_fbid=|view=permalink|multi_permalinks=|\/photo\.php|\/videos\/(pfbid[\w-]+|\d+)/i.test(
      String(href || "")
    );
  }

  function isPostPage() {
    return isPostHref(location.href);
  }

  function postKeyFromUrl(href) {
    if (!href) return "";
    try {
      const url = new URL(href, location.origin);
      const posts = url.pathname.match(/\/posts\/(pfbid[\w-]+|\d+)/i);
      if (posts) return posts[1];
      const permalink = url.pathname.match(/\/permalink\/(pfbid[\w-]+|\d+)/i);
      if (permalink) return permalink[1];
      const videos = url.pathname.match(/\/videos\/(pfbid[\w-]+|\d+)/i);
      if (videos) return videos[1];
      const story = url.searchParams.get("story_fbid") || url.searchParams.get("multi_permalinks");
      if (story && /^(pfbid[\w-]+|\d{5,})$/i.test(story.split(",")[0])) return story.split(",")[0];
      const viewId = url.searchParams.get("view") === "permalink" ? url.searchParams.get("id") : "";
      if (viewId && /^(pfbid[\w-]+|\d{5,})$/i.test(viewId)) return viewId;
    } catch {
      // ignore
    }
    return "";
  }

  function pickFromPool(items) {
    const pool = items.slice(0, Math.min(8, items.length));
    if (pool.length > 2 && Math.random() < 0.55) pool.shift();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function cleanExtract(value) {
    return String(value || "")
      .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const EXTRACT_NOISE =
    /^(like|thích|love|haha|wow|sad|angry|comment|bình luận|share|chia sẻ|follow|theo dõi|join|tham gia|see more|xem thêm|see original|write a comment|viết bình luận|reply|phản hồi|most relevant|all comments|home|menu|facebook|public|công khai|sponsored|được tài trợ)$/i;

  function usefulText(value) {
    const text = cleanExtract(value);
    if (text.length < 8 || text.length > 1800) return "";
    if (EXTRACT_NOISE.test(text)) return "";
    if (/^\d+\s*(min|mins|hr|hrs|h|m|d|giờ|phút|ngày|tuần)/i.test(text)) return "";
    return text;
  }

  async function extractMbasicContext(skipKeys) {
    if (!isPostPage()) {
      await autoScroll(3 + Math.floor(Math.random() * 2));
      await sleep(400);
      const targets = findMbasicPostLinks(skipKeys);
      if (!targets.length) {
        throw new Error(`Không tìm thấy bài viết để bình luận trên trang nhóm (${location.hostname}${location.pathname}).`);
      }
      const pick = pickFromPool(targets);
      return { ok: true, nextUrl: pick.url, postKey: pick.key };
    }

    await sleep(400 + Math.round(Math.random() * 600));
    clickSeeMoreIn(document.body);
    await sleep(250);
    const postText = extractMbasicPostText();
    const comments = extractMbasicComments();
    const postKey = postKeyFromUrl(location.href) || cleanExtract(postText).slice(0, 64);
    if (postKey && skipKeys.includes(postKey)) {
      throw new Error("Bài này đã bình luận rồi, sẽ thử bài khác lần sau.");
    }
    if (!postText && !comments.length) {
      throw new Error("Không đọc được nội dung bài viết trên trang này.");
    }
    return packContext(postKey, postText, comments);
  }

  function findMbasicPostLinks(skipKeys) {
    const found = [];
    const seen = new Set();
    for (const link of document.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href") || "";
      let url;
      try {
        url = new URL(href, location.origin);
      } catch {
        continue;
      }
      if (!url.hostname.endsWith("facebook.com")) continue;
      if (!isPostHref(url.href)) continue;
      const key = postKeyFromUrl(url.href);
      if (!key || seen.has(key) || skipKeys.includes(key)) continue;
      const label = (link.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/like|thích|share|chia sẻ|react/.test(label) && !/comment|bình luận/.test(label)) continue;
      seen.add(key);
      const score = /comment|bình luận|full story|xem thêm|permalink/.test(label) ? 2 : 1;
      found.push({ key, url: url.href, score });
    }
    found.sort((a, b) => b.score - a.score);
    return found;
  }

  function extractMbasicPostText() {
    const story =
      document.querySelector("#m_story_permalink_view .story_body_container, .story_body_container, #m_story_permalink_view") ||
      document.querySelector("#objects_container") ||
      document.body;
    const form = findMbasicCommentForm();
    const stopAt = form?.form || document.querySelector("[id^='ufi_']");
    const parts = [];
    const walker = document.createTreeWalker(story, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (stopAt && (node === stopAt || stopAt.contains(node))) break;
      if (node === story) continue;
      if (!/^(P|DIV|SPAN)$/.test(node.tagName)) continue;
      if (node.querySelector("p, div")) continue;
      const text = usefulText(node.innerText);
      if (text && !parts.includes(text)) parts.push(text);
      if (parts.join(" ").length > 900) break;
    }
    if (parts.length) return parts.slice(0, 8).join("\n");
    return usefulText(story.innerText).slice(0, 900);
  }

  function extractMbasicComments() {
    const comments = [];
    const ufi = document.querySelector("[id^='ufi_']") || document.querySelector("#ufi_comment");
    const root = ufi || document.body;
    for (const node of root.querySelectorAll("div, p")) {
      if (node.querySelector("div, p, form, textarea")) continue;
      const text = usefulText(node.innerText);
      if (!text) continue;
      if (/^(like ·|thích ·|reply|phản hồi)/i.test(text)) continue;
      if (text.length < 12) continue;
      if (!comments.includes(text)) comments.push(text);
      if (comments.length >= 8) break;
    }
    return comments;
  }

  async function extractWwwContext(skipKeys) {
    if (!isPostPage()) {
      await prepareWwwFeed();
    } else {
      await sleep(600);
      clickSeeMoreIn(document.body);
      await sleep(300);
    }

    const cards = collectWwwPostCards();
    const fresh = cards.filter((card) => card.key && !skipKeys.includes(card.key));
    const pool = fresh.length ? fresh : cards;
    if (pool.length) {
      const pick = isPostPage() ? pool[0] : pickFromPool(pool);
      if (pick && !isPostPage() && pick.permalink) {
        return { ok: true, nextUrl: pick.permalink, postKey: pick.key };
      }
      if (pick) {
        clickSeeMoreIn(pick.card || document.body);
        await sleep(250);
        const postText = pick.text || extractStoryMessage(pick.card || document.body);
        const comments = pick.comments?.length ? pick.comments : extractWwwComments(pick.card || document.body);
        if (postText || comments.length) return packContext(pick.key, postText, comments);
        if (pick.permalink) return { ok: true, nextUrl: pick.permalink, postKey: pick.key };
        if (pick.key) return packContext(pick.key, postText || "(bài ảnh/video, ko có caption)", comments);
      }
    }

    const links = collectWwwPostLinks(skipKeys);
    if (links.length) {
      const pick = pickFromPool(links);
      return { ok: true, nextUrl: pick.url, postKey: pick.key };
    }

    throw new Error(
      `Không tìm thấy bài viết trên bảng tin nhóm (${location.hostname}${location.pathname}).`
    );
  }

  async function prepareWwwFeed() {
    dismissWwwPopups();
    await clickGroupDiscussionTab();
    await waitFor(
      () =>
        document.querySelector(
          '[role="article"], [aria-posinset], [role="feed"], a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"], a[href*="pfbid"]'
        ),
      14000
    );
    const main = document.querySelector('[role="main"]');
    for (let i = 0; i < 8; i += 1) {
      if (main) main.scrollTop += Math.round((main.clientHeight || 700) * 0.9);
      window.scrollBy(0, Math.round(window.innerHeight * 0.95));
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop += Math.round(window.innerHeight * 0.95);
      }
      await sleep(450 + Math.round(Math.random() * 350));
      dismissWwwPopups();
      if (collectWwwPostCards().length >= 2 || collectWwwPostLinks([]).length >= 2) break;
    }
    await sleep(400);
  }

  async function clickGroupDiscussionTab() {
    const labels = ["discussion", "thảo luận", "discussions"];
    const nodes = document.querySelectorAll('[role="tab"], a[role="tab"], a[href*="/discussion"]');
    for (const el of nodes) {
      if (!isVisible(el)) continue;
      const text = `${el.getAttribute("aria-label") || ""} ${el.innerText || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      if (!labels.some((label) => text === label || text.includes(label))) continue;
      if (el.getAttribute("aria-selected") === "true") return;
      clickHuman(el);
      await sleep(1400);
      return;
    }
  }

  function dismissWwwPopups() {
    const labels = [
      "not now",
      "để sau",
      "close",
      "đóng",
      "done",
      "xong",
      "allow all cookies",
      "chấp nhận tất cả",
      "accept all",
    ];
    for (const el of document.querySelectorAll('[role="button"], button, [aria-label]')) {
      if (!isVisible(el)) continue;
      const text = `${el.getAttribute("aria-label") || ""} ${el.innerText || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      if (!text || text.length > 40) continue;
      if (!labels.some((label) => text === label || text.startsWith(label))) continue;
      try {
        el.click();
      } catch {
        // ignore
      }
    }
  }

  function collectWwwPostCards() {
    const roots = new Set();
    for (const el of document.querySelectorAll(
      '[role="article"], [aria-posinset], [data-pagelet^="FeedUnit"], [data-pagelet*="GroupFeed"]'
    )) {
      if (isVisible(el)) roots.add(el);
    }
    const feed = document.querySelector('[role="feed"]');
    if (feed) {
      for (const child of feed.children) {
        if (!isVisible(child)) continue;
        if ((child.innerText || "").length < 50) continue;
        roots.add(child);
      }
    }
    for (const link of document.querySelectorAll("a[href]")) {
      if (!isPostHref(link.getAttribute("href") || "")) continue;
      const card = nearestPostCard(link);
      if (card && isVisible(card)) roots.add(card);
    }

    const out = [];
    const seen = new Set();
    for (const card of roots) {
      const blob = (card.innerText || "").slice(0, 240).toLowerCase();
      if (/được tài trợ|^sponsored\b/.test(blob)) continue;
      const permalink = findPermalinkIn(card);
      const text = extractStoryMessage(card);
      const key = postKeyFromUrl(permalink) || (text ? text.slice(0, 80) : "");
      if (!key || seen.has(key)) continue;
      if (!permalink && !text) continue;
      seen.add(key);
      out.push({
        key,
        permalink,
        text,
        comments: extractWwwComments(card),
        card,
      });
    }
    return out;
  }

  function collectWwwPostLinks(skipKeys) {
    const found = [];
    const seen = new Set();
    const add = (href) => {
      let url;
      try {
        url = new URL(href, location.origin);
      } catch {
        return;
      }
      if (!url.hostname.endsWith("facebook.com")) return;
      const key = postKeyFromUrl(url.href);
      if (!key || seen.has(key) || skipKeys.includes(key)) return;
      seen.add(key);
      found.push({ key, url: url.href.split("#")[0] });
    };

    for (const link of document.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href") || "";
      if (isPostHref(href)) add(href);
    }
    for (const href of harvestPostUrlsFromHtml()) add(href);
    return found;
  }

  function currentGroupId() {
    const match = location.pathname.match(/\/groups\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function harvestPostUrlsFromHtml() {
    const html = document.documentElement ? document.documentElement.innerHTML : "";
    if (!html) return [];
    const urls = [];
    const groupId = currentGroupId();
    const push = (id) => {
      if (!id) return;
      if (groupId) urls.push(`https://www.facebook.com/groups/${groupId}/posts/${id}/`);
      else urls.push(`https://www.facebook.com/permalink.php?story_fbid=${id}`);
    };
    const patterns = [
      /"legacy_story_id"\s*:\s*"(\d{8,})"/g,
      /"post_id"\s*:\s*"(\d{8,})"/g,
      /\/groups\/[^/"'#?]+\/posts\/(pfbid[\w-]+|\d{8,})/gi,
      /"story_fbid"\s*:\s*"(pfbid[\w-]+|\d{8,})"/gi,
    ];
    for (const re of patterns) {
      let match;
      while ((match = re.exec(html))) {
        if (/\/posts\//i.test(re.source) && match[0].startsWith("/")) {
          urls.push(new URL(match[0], location.origin).href);
        } else {
          push(match[1]);
        }
      }
    }
    return urls;
  }

  function nearestPostCard(el) {
    if (!el) return null;
    return (
      el.closest('[role="article"]') ||
      el.closest("[aria-posinset]") ||
      el.closest('[data-pagelet^="FeedUnit"]') ||
      el.closest('div[role="article"]') ||
      el.closest('[data-pagelet*="Feed"]')
    );
  }

  function findPermalinkIn(root) {
    if (!root) return "";
    for (const link of root.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href") || "";
      if (!isPostHref(href)) continue;
      try {
        const url = new URL(href, location.origin);
        if (url.hostname.endsWith("facebook.com")) return url.href.split("#")[0];
      } catch {
        continue;
      }
    }
    return "";
  }

  function extractStoryMessage(card) {
    if (!card) return "";
    clickSeeMoreIn(card);
    const message = card.querySelector(
      '[data-ad-preview="message"], [data-ad-rendering-role="story_message"], [data-ad-comet-preview="message"]'
    );
    const fromMessage = usefulText(message && message.innerText);
    if (fromMessage) return fromMessage;

    const blocks = [...card.querySelectorAll('div[dir="auto"], span[dir="auto"]')]
      .map((el) => usefulText(el.innerText))
      .filter(Boolean)
      .filter((text, index, list) => list.indexOf(text) === index)
      .sort((a, b) => b.length - a.length);
    return blocks[0] || "";
  }

  function extractWwwComments(card) {
    if (!card) return [];
    const comments = [];
    const labeled = card.querySelectorAll(
      '[aria-label*="Comment by" i], [aria-label*="Bình luận của" i], [aria-label*="Comment by"]'
    );
    for (const node of labeled) {
      const raw = usefulText(node.innerText);
      if (!raw) continue;
      const stripped = raw.replace(/^.{1,80}?\n/, "").trim() || raw;
      if (stripped.length >= 8 && !comments.includes(stripped)) comments.push(stripped);
      if (comments.length >= 8) break;
    }
    return comments;
  }

  function clickSeeMoreIn(root) {
    if (!root) return;
    for (const el of root.querySelectorAll('[role="button"], div[role="button"], span')) {
      const text = (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (text === "see more" || text === "xem thêm" || text === "see original" || text === "xem bản gốc") {
        try {
          el.click();
        } catch {
          // ignore
        }
      }
    }
  }

  function packContext(postKey, postText, comments) {
    const list = Array.isArray(comments) ? comments.filter(Boolean) : [];
    let target = "post";
    let commentText = "";
    if (list.length && Math.random() < 0.42) {
      target = "comment";
      commentText = list[Math.floor(Math.random() * list.length)];
    }
    return {
      ok: true,
      postKey: postKey || "",
      postText: postText || "",
      commentText,
      target,
    };
  }

  async function mbasicCreatePost(text) {
    let composer = findMbasicComposer();
    if (!composer) {
      const open = findClickable(["write post", "write something", "đăng bài", "viết bài", "bạn viết gì"]);
      if (open) {
        const href = open.getAttribute && open.getAttribute("href");
        if (href) return { ok: true, nextUrl: new URL(href, location.origin).href };
        open.click();
        await sleep(1200);
        composer = findMbasicComposer();
      }
    }
    if (!composer) {
      throw new Error("Không tìm thấy ô đăng bài. Nhóm có thể chỉ cho admin đăng, hoặc giao diện đã đổi.");
    }

    fillField(composer.field, text);
    await sleep(400);
    markAction("CREATE_POST", text);
    composer.submit.click();
    return { ok: true };
  }

  async function mbasicCreateComment(text, submit = true) {
    const form = findMbasicCommentForm();
    if (form) {
      form.field.scrollIntoView({ block: "center" });
      await sleep(400 + Math.round(Math.random() * 700));
      fillField(form.field, text);
      if (!submit) return { ok: true, filled: true };
      await sleep(450 + Math.round(Math.random() * 500));
      markAction("CREATE_COMMENT", text);
      form.submit.click();
      return { ok: true };
    }

    const nextUrl = findMbasicCommentTarget();
    if (nextUrl) return { ok: true, nextUrl };
    throw new Error("Không tìm thấy bài viết để bình luận trên trang nhóm này.");
  }

  function findMbasicCommentForm() {
    for (const form of document.querySelectorAll("form")) {
      const field = form.querySelector("textarea, input[name='comment_text'], input[type='text']");
      const submit = form.querySelector("input[type='submit'], button[type='submit']");
      if (!field || !submit) continue;
      const name = (field.getAttribute("name") || "").toLowerCase();
      const placeholder = (field.getAttribute("placeholder") || "").toLowerCase();
      if (name === "xc_message" || name === "q" || name === "query") continue;
      const isComment =
        name.includes("comment") ||
        placeholder.includes("comment") ||
        placeholder.includes("bình luận") ||
        placeholder.includes("viết bình luận");
      if (isComment || (field.tagName === "TEXTAREA" && name !== "message" && !findMbasicComposer())) {
        return { field, submit, form };
      }
    }
    return null;
  }

  function findMbasicCommentTarget() {
    const links = [...document.querySelectorAll("a")].filter((link) => {
      const href = link.getAttribute("href") || "";
      const label = (link.innerText || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/view=permalink|story_fbid=|\/permalink\//i.test(href)) return true;
      return label === "comment" || label === "bình luận" || label === "full story" || label === "xem thêm";
    });
    if (!links.length) return null;
    const pick = links[Math.floor(Math.random() * Math.min(links.length, 8))];
    try {
      return new URL(pick.getAttribute("href"), location.origin).href;
    } catch {
      return null;
    }
  }

  function findMbasicComposer() {
    const fields = [...document.querySelectorAll("textarea, input[type='text']")];
    const field = fields.find((el) => {
      const name = (el.getAttribute("name") || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      return (
        name === "xc_message" ||
        name === "message" ||
        placeholder.includes("write") ||
        placeholder.includes("viết") ||
        placeholder.includes("bạn đang nghĩ")
      );
    });
    if (!field) return null;
    const form = field.form || field.closest("form");
    if (!form) return null;
    const submit = [...form.querySelectorAll("input[type='submit'], button[type='submit'], button")].find((btn) => {
      const label = ((btn.value || btn.innerText || "") + " " + (btn.getAttribute("name") || "")).toLowerCase();
      return /post|đăng|share|chia sẻ|view_post|publish/.test(label);
    }) || form.querySelector("input[type='submit'], button[type='submit']");
    if (!submit) return null;
    return { field, submit, form };
  }

  async function wwwCreatePost(text) {
    await openComposer();
    const dialog = await waitFor(() => findComposerDialog(), 10000);
    if (!dialog) throw new Error("Không mở được cửa sổ tạo bài viết trên Facebook.");

    const box = await waitFor(() => findComposerTextbox(dialog), 5000);
    if (!box) throw new Error("Không tìm thấy ô nhập nội dung bài viết.");

    await typeIntoEditable(box, text, false);
    await sleep(900);

    let postBtn = await waitFor(() => findPostButton(dialog), 6000);
    if (!postBtn) postBtn = findPostButton(document.body);
    if (!postBtn) throw new Error("Không tìm thấy nút Đăng.");

    for (let i = 0; i < 4 && isDisabled(postBtn); i += 1) {
      await sleep(600);
      postBtn = findPostButton(dialog) || findPostButton(document.body) || postBtn;
    }

    markAction("CREATE_POST", text);
    postBtn.click();
    await sleep(2000);
    return { ok: true };
  }

  async function openComposer() {
    if (findComposerDialog()) return;

    const labels = [
      "create a post",
      "tạo bài viết",
      "write something",
      "write a post",
      "what's on your mind",
      "bạn đang nghĩ gì",
      "bạn viết gì đi",
      "viết gì đó",
      "đăng bài",
      "create a public post",
    ];

    let opener =
      findRoleButton(labels) ||
      findClickable(labels) ||
      [...document.querySelectorAll('[role="button"], span, div')].find((el) => {
        if (!isVisible(el)) return false;
        const text = (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().toLowerCase();
        return text.length < 80 && labels.some((label) => text === label || text.startsWith(label));
      });

    if (!opener) return;
    clickHuman(opener.closest('[role="button"]') || opener);
    await sleep(1600);
  }

  function findComposerDialog() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(isVisible);
    const scored = dialogs
      .map((dialog) => {
        const box = dialog.querySelector('[contenteditable="true"]');
        if (!box) return null;
        const blob = `${dialog.getAttribute("aria-label") || ""} ${box.getAttribute("aria-label") || ""} ${
          dialog.innerText || ""
        }`
          .slice(0, 500)
          .toLowerCase();
        const score =
          (/tạo bài|create (a )?(public )?post|write something|bạn đang nghĩ|bạn viết gì|what's on your mind|viết bài/.test(
            blob
          )
            ? 2
            : 0) + (findPostButton(dialog) ? 2 : 0) + 1;
        return { dialog, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.dialog || null;
  }

  function findComposerTextbox(dialog) {
    const nodes = [...(dialog || document).querySelectorAll('[contenteditable="true"]')];
    return (
      nodes.find((el) => {
        if (!isVisible(el)) return false;
        const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""}`.toLowerCase();
        if (/comment|bình luận/.test(label)) return false;
        return /post|bài viết|what's on your mind|bạn đang nghĩ|write something|textbox|soạn/.test(label) || !label;
      }) || nodes.find(isVisible)
    );
  }

  function findPostButton(root) {
    if (!root) return null;
    const exact = ["đăng", "post", "publish", "chia sẻ", "đăng bài", "post now"];
    const skip =
      /đóng|close|photo|ảnh|video|tag|cảm xúc|feeling|background|màu nền|emoji|gif|live|reels|story|tin|audience|quyền riêng tư|privacy|album|check in/i;

    const nodes = [...root.querySelectorAll('[role="button"], button')];
    const matches = [];
    for (const node of nodes) {
      if (!isVisible(node)) continue;
      const aria = (node.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
      const ariaLc = aria.toLowerCase();
      const textLc = text.toLowerCase();
      const blob = `${ariaLc} ${textLc}`;
      if (skip.test(blob) && !exact.includes(ariaLc) && !exact.includes(textLc)) continue;
      if (exact.includes(ariaLc) || exact.includes(textLc) || /^post to /i.test(aria) || /^đăng lên /i.test(aria)) {
        matches.push(node.closest('[role="button"]') || node);
      }
    }
    if (matches.length) return matches[matches.length - 1];

    for (const attr of ["Post", "Đăng", "Publish", "Chia sẻ", "Đăng bài"]) {
      const el = root.querySelector(`[aria-label="${attr}"]`);
      if (el && isVisible(el)) return el.closest('[role="button"], button') || el;
    }
    return null;
  }

  function isDisabled(el) {
    if (!el) return true;
    return el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled");
  }

  function clickHuman(el) {
    if (!el) return;
    el.scrollIntoView({ block: "center", inline: "center" });
    el.click();
  }

  async function wwwCreateComment(text, postKey, humanize, submit = true) {
    await autoScroll(isPostPage() ? 1 : 4);
    await sleep(500 + Math.round(Math.random() * 500));

    if (postKey) {
      const cards = collectWwwPostCards();
      const match = cards.find((card) => card.key === postKey);
      if (match?.card) {
        return commentOnWwwCard(match.card, text, humanize, submit);
      }
    }

    if (isPostPage()) {
      const article = document.querySelector('[role="article"]');
      if (article) return commentOnWwwCard(article, text, humanize, submit);
    }

    const boxes = [...document.querySelectorAll('div[role="textbox"][contenteditable="true"]')].filter((el) => {
      if (!isVisible(el)) return false;
      if (el.closest('div[role="dialog"]')) return false;
      const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""}`.toLowerCase();
      return /comment|bình luận|viết bình luận|write a comment/.test(label) || label.length === 0;
    });

    const labeled = [...document.querySelectorAll(
      '[aria-label*="comment" i], [aria-label*="Comment"], [aria-label*="bình luận" i], [aria-label*="Viết bình luận"]'
    )].filter(isVisible);

    let box = boxes[Math.floor(Math.random() * boxes.length)];
    if (!box && labeled.length) {
      const candidate = labeled[Math.floor(Math.random() * labeled.length)];
      candidate.click();
      await sleep(500);
      box =
        candidate.matches('div[contenteditable="true"]')
          ? candidate
          : candidate.querySelector('div[contenteditable="true"]') ||
            document.querySelector('div[role="textbox"][contenteditable="true"]');
    }

    if (!box) {
      const commentBtn = findRoleButton(["comment", "bình luận", "write a comment", "viết bình luận"]);
      if (commentBtn) {
        commentBtn.click();
        await sleep(800);
        box = document.querySelector('div[role="textbox"][contenteditable="true"]');
      }
    }

    if (!box) throw new Error("Không tìm thấy ô bình luận trên bảng tin nhóm.");
    return submitWwwCommentBox(box, text, humanize, submit);
  }

  async function commentOnWwwCard(card, text, humanize, submit = true) {
    card.scrollIntoView({ block: "center" });
    await sleep(350 + Math.round(Math.random() * 400));
    let box = [...card.querySelectorAll('div[role="textbox"][contenteditable="true"]')].find(isVisible);
    if (!box) {
      const btn = findWithin(card, '[role="button"], button', ["comment", "bình luận", "write a comment", "viết bình luận"]);
      if (btn) {
        clickHuman(btn);
        await sleep(700);
      }
      box = [...card.querySelectorAll('div[role="textbox"][contenteditable="true"]')].find(isVisible);
    }
    if (!box) {
      box = [...document.querySelectorAll('div[role="textbox"][contenteditable="true"]')].find((el) => {
        if (!isVisible(el) || el.closest('div[role="dialog"]')) return false;
        const label = `${el.getAttribute("aria-label") || ""}`.toLowerCase();
        return /comment|bình luận/.test(label);
      });
    }
    if (!box) throw new Error("Không tìm thấy ô bình luận của bài viết này.");
    return submitWwwCommentBox(box, text, humanize, submit);
  }

  async function submitWwwCommentBox(box, text, humanize, submit = true) {
    box.scrollIntoView({ block: "center" });
    await sleep(250 + Math.round(Math.random() * 350));
    await typeIntoEditable(box, text, Boolean(humanize));
    if (!submit) {
      box.focus();
      return { ok: true, filled: true };
    }
    await sleep(400 + Math.round(Math.random() * 500));
    markAction("CREATE_COMMENT", text);
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    await sleep(1200);
    return { ok: true };
  }

  function fillField(el, value) {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function editorText(el) {
    return (el.innerText || el.textContent || "")
      .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function typeIntoEditable(el, text, paced) {
    const want = String(text);
    const wantNorm = want.replace(/\s+/g, " ").trim();
    const current = editorText(el);
    if (wantNorm && current === wantNorm) return;
    if (wantNorm && current.includes(wantNorm) && current.length > wantNorm.length) {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, want);
      await sleep(150);
      return;
    }

    el.focus();
    await sleep(80);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    await sleep(40);

    const lines = want.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      if (i > 0) document.execCommand("insertLineBreak", false, null);
      if (!lines[i]) continue;
      if (paced) {
        // Gõ từng ký tự (giống người) + phát sự kiện input mỗi ký tự,
        // thay cho việc dán từng cụm từ (vẫn để lại "dấu vết" dán khối).
        const chars = [...lines[i]];
        for (let c = 0; c < chars.length; c += 1) {
          const ch = chars[c];
          document.execCommand("insertText", false, ch);
          el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
          let d = 55 + Math.round(Math.random() * 95);
          if (ch === " ") d += 20 + Math.round(Math.random() * 55);
          if (/[.,!?;:]/.test(ch)) d += 90 + Math.round(Math.random() * 160);
          if (c > 6 && Math.random() < 0.06) d += 200 + Math.round(Math.random() * 300);
          await sleep(d);
        }
      } else {
        document.execCommand("insertText", false, lines[i]);
      }
    }
    await sleep(150);
  }

  function findClickable(labels) {
    const nodes = document.querySelectorAll("a, button, div[role='button'], span[role='button']");
    for (const node of nodes) {
      const text = (node.innerText || node.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!text) continue;
      if (labels.some((label) => text.includes(label))) return node;
    }
    return null;
  }

  function findRoleButton(labels) {
    for (const node of document.querySelectorAll("[role='button'], button")) {
      if (!isVisible(node)) continue;
      const text = `${node.getAttribute("aria-label") || ""} ${node.innerText || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      if (labels.some((label) => text === label || text.includes(label))) return node;
    }
    return null;
  }

  function findWithin(root, selector, labels) {
    if (!root) return null;
    for (const node of root.querySelectorAll(selector)) {
      const text = `${node.getAttribute("aria-label") || ""} ${node.innerText || node.value || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      if (labels.some((label) => text === label || text.startsWith(label))) return node;
    }
    return null;
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 8 && rect.height > 8 && style.visibility !== "hidden" && style.display !== "none";
  }

  function isMbasic() {
    return location.hostname.startsWith("mbasic.");
  }

  async function autoScroll(steps) {
    for (let i = 0; i < steps; i += 1) {
      window.scrollBy(0, Math.round(window.innerHeight * 0.9));
      await sleep(450);
    }
  }

  async function waitFor(fn, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = fn();
      if (value) return value;
      await sleep(200);
    }
    return null;
  }

  function showHud(text) {
    let hud = document.getElementById("fb-group-auto-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "fb-group-auto-hud";
      hud.style.cssText = [
        "position:fixed",
        "z-index:2147483647",
        "right:16px",
        "bottom:16px",
        "background:#111827",
        "color:#e5e7eb",
        "padding:10px 12px",
        "border-radius:10px",
        "font:13px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        "box-shadow:0 8px 30px rgba(0,0,0,.28)",
        "max-width:260px",
      ].join(";");
      document.documentElement.appendChild(hud);
    }
    hud.textContent = text;
  }

  function hideHud() {
    const hud = document.getElementById("fb-group-auto-hud");
    if (hud) hud.remove();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
