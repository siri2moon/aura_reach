(() => {
  "use strict";
  if (window.__ZALO_AUTO_LOADED__) return;
  window.__ZALO_AUTO_LOADED__ = true;

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "ZALO_ADD_FRIEND",
    "ZALO_SEND_MESSAGE",
    "ZALO_GET_UNREAD_CONVERSATIONS",
    "ZALO_GET_LAST_MESSAGE",
    "ZALO_SEND_REPLY",
    "ZALO_GET_CONVERSATIONS",
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
      return { ok: true, href: location.href, state, platform: "zalo" };
    }
    if (state !== "ok") throw new Error(stateError(state));

    if (actionLock) {
      return { ok: false, error: "Đang có thao tác Zalo khác đang xử lý." };
    }

    actionLock = true;
    try {
      if (message?.type === "ZALO_ADD_FRIEND") {
        return await addFriend(String(message.phone || "").trim());
      }
      if (message?.type === "ZALO_SEND_MESSAGE") {
        const target = String(message.target || message.phone || "").trim();
        return await sendMessageToTarget(target, String(message.text || ""));
      }
      if (message?.type === "ZALO_GET_UNREAD_CONVERSATIONS" || message?.type === "ZALO_GET_CONVERSATIONS") {
        return { ok: true, conversations: listConversations({ unreadOnly: message.type === "ZALO_GET_UNREAD_CONVERSATIONS" }) };
      }
      if (message?.type === "ZALO_GET_LAST_MESSAGE") {
        return await getLastIncomingMessage(String(message.conversationId || ""));
      }
      if (message?.type === "ZALO_SEND_REPLY") {
        return await sendReply(String(message.conversationId || ""), String(message.text || ""));
      }
      return { ok: false, error: `Zalo không xử lý lệnh ${message?.type || "?"}.` };
    } finally {
      actionLock = false;
    }
  }

  function pageState() {
    const href = location.href.toLowerCase();
    if (!href.includes("chat.zalo.me")) return "wrong_page";
    const bodyText = (document.body?.innerText || "").slice(0, 4000);
    if (/quét mã qr|đăng nhập zalo|login with qr|nhập số điện thoại/i.test(bodyText) && !findConversationItems().length) {
      return "login_required";
    }
    const loginBtn = findByText(["Đăng nhập", "Login"], "button, a, [role='button']", 40);
    if (loginBtn && !findConversationItems().length) return "login_required";
    return "ok";
  }

  function stateError(state) {
    if (state === "login_required") return "Tài khoản Zalo chưa đăng nhập trên chat.zalo.me.";
    if (state === "wrong_page") return "Hãy mở tab chat.zalo.me rồi thử lại.";
    return "Trang Zalo Web đang không khả dụng.";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function clickEl(el) {
    if (!el) return false;
    // Validate element still exists in DOM
    if (!document.body.contains(el)) return false;
    try {
      el.click();
    } catch {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
    return true;
  }

  function clickableAncestor(el) {
    let cur = el;
    for (let i = 0; i < 8 && cur && cur !== document.body; i++) {
      const tag = cur.tagName;
      if (tag === "BUTTON" || tag === "A" || cur.getAttribute("role") === "button") return cur;
      const st = getComputedStyle(cur);
      if (st.cursor === "pointer") return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  function normalizeLabel(value) {
    return String(value || "")
      .replace(/[\u200b\u00a0]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findByText(labels, selector = "button, a, span, div, [role='button']", maxLen = 80) {
    const want = labels.map((s) => String(s).toLowerCase());
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const el of nodes) {
      if (!visible(el)) continue;
      const t = textOf(el);
      if (!t || t.length > maxLen) continue;
      const low = t.toLowerCase();
      if (want.some((w) => low === w || low.includes(w))) return el;
    }
    return null;
  }

  function findExactText(labels, selector = "button, [role='button'], a, span, div") {
    const want = new Set(labels.map((s) => String(s).toLowerCase()));
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const el of nodes) {
      if (!visible(el)) continue;
      const t = textOf(el);
      if (t && want.has(t.toLowerCase())) return el;
    }
    return null;
  }

  async function waitUntil(fn, timeout = 6000, interval = 200) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = fn();
      if (value) return value;
      await sleep(interval);
    }
    return null;
  }

  function isDisabled(el) {
    if (!el) return true;
    return Boolean(
      el.disabled ||
        el.getAttribute("aria-disabled") === "true" ||
        /disabled|is-disable/i.test(el.className || "")
    );
  }

  function findInput(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && visible(el)) return el;
    }
    return null;
  }

  async function typeInto(el, value) {
    if (!el) throw new Error("Không tìm thấy ô nhập.");
    clickEl(el);
    el.focus();
    await sleep(120);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(el, "");
      else el.value = "";
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "deleteContentBackward" }));
      if (setter) setter.call(el, value);
      else el.value = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, data: value, inputType: "insertText" }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "0", code: "Digit0" }));
    } else {
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
      const inserted = document.execCommand("insertText", false, value);
      if (!inserted) el.textContent = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    }
    await sleep(250);
  }

  async function pressEnter(el) {
    const target = el || document.activeElement;
    const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    target?.dispatchEvent(new KeyboardEvent("keydown", opts));
    target?.dispatchEvent(new KeyboardEvent("keypress", opts));
    target?.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  function findSearchInput() {
    return (
      findInput([
        "#contact-search-input",
        "input#contact-search-input",
        'input[placeholder*="Tìm kiếm"]',
        'input[placeholder*="Tìm"]',
        'input[placeholder*="Search"]',
        ".nav-search input",
        'input[type="text"]',
        'input[type="search"]',
      ]) || document.querySelector('[contenteditable="true"][placeholder], [contenteditable="true"]')
    );
  }

  function findChatInput() {
    return (
      findInput(["#richInput", "#chatInput", "#rich-input", ".rich-input", '[id="richInput"]']) ||
      document.querySelector('#chatInputContainer [contenteditable="true"], .chat-input [contenteditable="true"], [contenteditable="true"]')
    );
  }

  function findConversationItems() {
    const selectors = [
      "#conversationList .conv-item",
      ".conv-item",
      "[class*='conv-item']",
      "#conversationList > div",
      ".conversation-list > div",
      "[id='conversationList'] [id^='conv']",
    ];
    const seen = new Set();
    const out = [];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el) || !visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.left > 520 || r.height < 36 || r.height > 160) continue;
        if (!textOf(el)) continue;
        seen.add(el);
        out.push(el);
      }
      if (out.length >= 3) break;
    }
    return out;
  }

  function conversationMeta(el) {
    const nameEl =
      el.querySelector(".conv-item-title__name, .conv-item-title, [class*='title__name'], [class*='conv-name']") || el;
    const name = textOf(nameEl).split("\n")[0].trim();
    const id = el.getAttribute("data-id") || el.id || name;
    const raw = textOf(el);
    const isGroup =
      /\d+\s*thành viên/i.test(raw) ||
      /group|nhóm/i.test(el.className) ||
      Boolean(el.querySelector('[class*="group"], [class*="Group"], .conv-item-title__member'));
    const unreadEl = el.querySelector(
      '[class*="unread"], .badge, .red-dot, .conv-unread, [class*="Unread"]'
    );
    const unreadText = unreadEl && visible(unreadEl) ? textOf(unreadEl) : "";
    const unread = Boolean(unreadEl && visible(unreadEl) && (!unreadText || /\d+/.test(unreadText)));
    return { el, id: String(id || name), name: name || id, isPrivate: !isGroup, isGroup, unread };
  }

  function listConversations({ unreadOnly = false } = {}) {
    return findConversationItems()
      .map(conversationMeta)
      .filter((c) => c.name)
      .filter((c) => (unreadOnly ? c.unread && c.isPrivate : true));
  }

  async function openConversation(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) throw new Error("Thiếu tên hội thoại Zalo.");

    const items = findConversationItems().map(conversationMeta);
    let match = items.find((c) => c.id.toLowerCase() === q || c.name.toLowerCase() === q);
    if (!match) match = items.find((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));
    if (match) {
      // Re-validate the conversation item still exists before clicking
      if (match.el && document.body.contains(match.el)) {
        if (clickEl(match.el)) {
          await sleep(900);
          return match;
        }
      }
      throw new Error(`Không thể mở hội thoại "${query}". Vui lòng thử lại.`);
    }

    const search = findSearchInput();
    if (!search) throw new Error("Không tìm thấy ô tìm kiếm Zalo.");
    clickEl(search);
    await sleep(250);
    await typeInto(search, query);
    await sleep(1600);

    const result =
      findByText([query], "div, span, a, [role='button']", 80) ||
      findConversationItems()
        .map(conversationMeta)
        .find((c) => c.name.toLowerCase().includes(q));
    if (result?.el) {
      clickEl(result.el);
      await sleep(900);
      return result;
    }
    if (result instanceof Element) {
      clickEl(result.closest("[role='button'], .conv-item, div") || result);
      await sleep(900);
      return conversationMeta(result);
    }
    throw new Error(`Không tìm thấy hội thoại "${query}" trên Zalo.`);
  }

  async function sendChatText(text) {
    if (!text) throw new Error("Nội dung tin nhắn trống.");
    const input = findChatInput();
    if (!input) throw new Error("Không tìm thấy ô soạn tin nhắn Zalo. Hãy mở một hội thoại trước.");
    clickEl(input);
    await sleep(200);
    await typeInto(input, text);
    await sleep(250);
    await pressEnter(input);
    await sleep(400);
    const sendBtn = findByText(["Gửi", "Send"], "button, [role='button'], div", 20) ||
      document.querySelector("#send-button, .send-btn, [class*='send-btn'], [class*='Send']");
    if (sendBtn && visible(sendBtn)) clickEl(sendBtn);
    await sleep(700);
    return { ok: true, text };
  }

  function addFriendRoot() {
    const opener = findAddFriendButton();
    const labeled = Array.from(document.querySelectorAll("div, section, form")).find((el) => {
      if (!visible(el)) return false;
      const t = textOf(el);
      return t.length < 800 && /số điện thoại/i.test(t) && /tìm kiếm/i.test(t);
    });
    return (
      labeled ||
      document.querySelector('[class*="add-friend"]') ||
      document.querySelector('[class*="friend-search"]') ||
      opener?.closest('[class*="popover"], [class*="dropdown"], [class*="popup"]') ||
      document.body
    );
  }

  function findAddFriendButton() {
    return (
      document.querySelector('[data-id="btn_Main_AddFrd"]') ||
      document.querySelector("#btn_Main_AddFrd") ||
      document.querySelector('[data-id*="AddFrd" i]') ||
      document.querySelector('[data-id*="addFrd" i]')
    );
  }

  function isMainConvSearch(el) {
    if (!el) return false;
    if (el.id === "contact-search-input") return true;
    const ph = normalizeLabel(el.getAttribute("placeholder") || "");
    return ph.includes("tìm kiếm") && !ph.includes("điện thoại") && !ph.includes("phone");
  }

  function maybeKnowRoot() {
    const heading = Array.from(document.querySelectorAll("div, span, h2, h3, p, strong, label")).find(
      (el) => visible(el) && /^(có thể bạn quen|people you may know)$/i.test(textOf(el))
    );
    if (!heading) return null;
    let cur = heading.parentElement;
    for (let i = 0; i < 10 && cur && cur !== document.body; i++) {
      const count = Array.from(cur.querySelectorAll("button, [role='button'], span, div, a")).filter(
        (el) => /^(kết bạn|add friend)$/i.test(textOf(el))
      ).length;
      if (count >= 2) return cur;
      cur = cur.parentElement;
    }
    return heading.parentElement;
  }

  function isInsideMaybeKnow(el) {
    const root = maybeKnowRoot();
    return Boolean(root && el && root.contains(el));
  }

  function findPhoneInput() {
    const scoped = [
      'input[placeholder*="số điện thoại" i]',
      'input[placeholder*="Số điện thoại"]',
      'input[placeholder*="nhập số" i]',
      'input[placeholder*="phone" i]',
      'input[type="tel"]',
      'input[inputmode="numeric"]',
      'input[inputmode="tel"]',
    ];
    for (const sel of scoped) {
      const el = document.querySelector(sel);
      if (el && visible(el) && !isMainConvSearch(el)) return el;
    }

    const label = Array.from(document.querySelectorAll("label, span, div, p")).find(
      (el) => visible(el) && /^(số điện thoại|nhập số điện thoại|phone number)$/i.test(normalizeLabel(textOf(el)))
    );
    if (label) {
      const forId = label.getAttribute("for");
      if (forId) {
        const byId = document.getElementById(forId);
        if (byId && visible(byId) && !isMainConvSearch(byId)) return byId;
      }
      const nearby = label.parentElement?.querySelector("input, [contenteditable='true']");
      if (nearby && visible(nearby) && !isMainConvSearch(nearby)) return nearby;
    }

    const country = Array.from(document.querySelectorAll("span, div, button")).find(
      (el) => visible(el) && /^\+?84$/.test(textOf(el).replace(/\s/g, ""))
    );
    if (country) {
      const nearby = country.parentElement?.querySelector("input, [contenteditable='true']");
      if (nearby && visible(nearby) && !isMainConvSearch(nearby)) return nearby;
    }

    return null;
  }

  function findSearchButton(phoneInput) {
    if (!phoneInput) return null;
    const inputRect = phoneInput.getBoundingClientRect();
    const labeled = [];

    for (const el of document.querySelectorAll("button, [role='button'], a, div, span")) {
      if (!visible(el) || isInsideMaybeKnow(el)) continue;
      if (el === phoneInput || phoneInput.contains(el)) continue;
      const t = textOf(el);
      if (t.length > 24) continue;
      const label = normalizeLabel(`${t} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`);
      if (label !== "tìm kiếm" && label !== "search") continue;
      const r = el.getBoundingClientRect();
      const sameRow = Math.abs(r.top - inputRect.top) < 48;
      const toTheRight = r.left >= inputRect.right - 12;
      const dist = Math.hypot(r.left - inputRect.right, r.top - inputRect.top);
      labeled.push({ el, sameRow, toTheRight, dist });
    }

    labeled.sort((a, b) => {
      const as = a.sameRow && a.toTheRight ? 0 : a.sameRow ? 1 : a.toTheRight ? 2 : 3;
      const bs = b.sameRow && b.toTheRight ? 0 : b.sameRow ? 1 : b.toTheRight ? 2 : 3;
      if (as !== bs) return as - bs;
      return a.dist - b.dist;
    });
    if (labeled[0]) return clickableAncestor(labeled[0].el);

    let sib = phoneInput.nextElementSibling;
    while (sib) {
      if (visible(sib) && !isInsideMaybeKnow(sib)) {
        const blob = normalizeLabel(`${textOf(sib)} ${sib.getAttribute("aria-label") || ""} ${sib.getAttribute("title") || ""}`);
        if (blob.includes("tìm kiếm") || blob === "search") return clickableAncestor(sib);
        const inner = Array.from(sib.querySelectorAll("button, [role='button'], div, span")).find(
          (el) => visible(el) && /^(tìm kiếm|search)$/i.test(normalizeLabel(textOf(el)))
        );
        if (inner) return clickableAncestor(inner);
      }
      sib = sib.nextElementSibling;
    }

    const titled = document.querySelector(
      '[title="Tìm kiếm"], [aria-label="Tìm kiếm"], [title="Search"], [aria-label="Search"]'
    );
    if (titled && visible(titled) && !isInsideMaybeKnow(titled)) return clickableAncestor(titled);
    return null;
  }

  function collectActionNodes() {
    return Array.from(document.querySelectorAll("button, [role='button'], a, span, div")).filter((el) => {
      if (!visible(el)) return false;
      if (isInsideMaybeKnow(el)) return false;
      return /^(kết bạn|gửi lời mời|add friend|nhắn tin|thu hồi|đã gửi lời mời)$/i.test(textOf(el));
    });
  }

  function climbToAccountPopup(el) {
    let cur = el;
    for (let i = 0; i < 12 && cur && cur !== document.body; i++) {
      if (isInsideMaybeKnow(cur)) return null;
      const st = getComputedStyle(cur);
      const r = cur.getBoundingClientRect();
      const overlay =
        st.position === "fixed" ||
        st.position === "absolute" ||
        Number(st.zIndex) >= 50 ||
        cur.getAttribute("role") === "dialog" ||
        /modal|popup|overlay|profile|dialog/i.test(cur.className || "");
      const cardSize = r.width >= 220 && r.width <= 560 && r.height >= 160 && r.height <= 720;
      if ((overlay || cardSize) && r.top >= 0 && r.left >= 0) return cur;
      cur = cur.parentElement;
    }
    return el.closest('[role="dialog"], [class*="modal"], [class*="popup"], [class*="overlay"]');
  }

  function findAccountPopup(previousNodes) {
    const prev = previousNodes instanceof Set ? previousNodes : new Set(previousNodes || []);
    const nodes = collectActionNodes();
    const fresh = nodes.filter((el) => !prev.has(el));
    const pool = fresh.length ? fresh : nodes;
    for (const el of pool) {
      const card = climbToAccountPopup(el);
      if (card && !isInsideMaybeKnow(card)) {
        return { root: card, actionEl: el };
      }
    }
    return null;
  }

  function popupHasNotFound() {
    const roots = [
      ...document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"], [class*="overlay"], [class*="toast"]'),
      addFriendRoot(),
    ];
    for (const root of roots) {
      if (!root || !visible(root) || isInsideMaybeKnow(root)) continue;
      const blob = textOf(root);
      if (/chưa đăng ký tài khoản|không cho phép tìm kiếm/i.test(blob)) return true;
    }
    return /chưa đăng ký tài khoản|không cho phép tìm kiếm/i.test(textOf(document.body));
  }

  function detectAddFriendOutcome(previousNodes) {
    if (popupHasNotFound()) return { status: "not_found" };

    const popup = findAccountPopup(previousNodes);
    if (!popup) return { status: "unknown" };

    const blob = textOf(popup.root).toLowerCase();
    const action = textOf(popup.actionEl).toLowerCase();

    if (action === "kết bạn" || action === "gửi lời mời" || action === "add friend") {
      const btn = popup.actionEl.closest("button, [role='button'], a") || popup.actionEl;
      if (!isDisabled(btn) && !isInsideMaybeKnow(btn)) {
        return { status: "can_add", button: btn, popup: popup.root };
      }
    }
    if (action === "nhắn tin" || /đã là bạn/i.test(blob)) {
      return { status: "already_friend", popup: popup.root };
    }
    if (action === "thu hồi" || action === "đã gửi lời mời" || /đã gửi lời mời|thu hồi lời mời/i.test(blob)) {
      return { status: "pending", popup: popup.root };
    }
    return { status: "unknown" };
  }

  async function openAddFriendDialog() {
    if (findPhoneInput() && findSearchButton(findPhoneInput())) return true;

    const opener = findAddFriendButton();
    if (!opener) return false;

    if (!clickEl(opener)) return false;
    if (await waitUntil(() => findPhoneInput(), 2500)) return true;

    // Re-validate opener before second click
    if (!opener || !document.body.contains(opener)) return false;
    if (!clickEl(opener)) return false;
    return Boolean(await waitUntil(() => findPhoneInput(), 5000));
  }

  async function addFriend(phone) {
    if (!phone) throw new Error("Thiếu số điện thoại để kết bạn Zalo.");

    const opened = await openAddFriendDialog();
    if (!opened) throw new Error("Không mở được cửa sổ Thêm bạn trên Zalo Web.");

    const phoneInput = findPhoneInput();
    if (!phoneInput) throw new Error("Không tìm thấy ô nhập số điện thoại trong mục Thêm bạn.");

    clickEl(phoneInput);
    await sleep(150);
    await typeInto(phoneInput, phone);
    await sleep(500);

    const searchBtn =
      (await waitUntil(() => findSearchButton(phoneInput), 4000)) || findSearchButton(phoneInput);
    if (!searchBtn) {
      throw new Error("Không tìm thấy nút Tìm kiếm ngay cạnh ô số điện thoại. Hãy mở mục Thêm bạn trên Zalo Web.");
    }

    const previousNodes = new Set(collectActionNodes());
    clickEl(searchBtn);
    await sleep(400);
    if (!popupHasNotFound() && !findAccountPopup(previousNodes)) {
      clickEl(searchBtn);
    }

    const outcome = await waitUntil(() => {
      const next = detectAddFriendOutcome(previousNodes);
      return next.status !== "unknown" ? next : null;
    }, 8000);

    if (!outcome || outcome.status === "unknown") {
      dismissAddFriendNotice();
      return { ok: true, skipped: true, reason: "not_found", phone };
    }
    if (outcome.status === "not_found") {
      dismissAddFriendNotice();
      return { ok: true, skipped: true, reason: "not_found", phone };
    }
    if (outcome.status === "already_friend") {
      return { ok: true, skipped: true, reason: "already_friend", phone };
    }
    if (outcome.status === "pending") {
      return { ok: true, skipped: true, reason: "pending", phone };
    }

    if (outcome.status === "can_add" && outcome.button) {
      const firstBtn = smallestKetBan(outcome.button) || outcome.button;
      if (!firstBtn || !document.body.contains(firstBtn) || isDisabled(firstBtn)) {
        throw new Error("Không tìm thấy nút Kết bạn hợp lệ. Vui lòng thử lại.");
      }
      try {
        firstBtn.click();
        const confirmed = await confirmFriendInvite(firstBtn);
        if (!confirmed) {
          // Could be timeout, button disabled, or user dismissed
          throw new Error("Không thể hoàn tất lời mời kết bạn. Vui lòng thử lại.");
        }
        await sleep(800);
        return { ok: true, sent: true, phone };
      } catch (error) {
        // Log error for debugging
        console.error("Zalo add friend error:", error.message);
        throw error;
      }
    }

    return { ok: true, skipped: true, reason: "not_found", phone };
  }

  function isKetBanLabel(el) {
    const t = normalizeLabel(textOf(el));
    return t === "kết bạn" || t === "gửi lời mời" || t === "add friend";
  }

  function smallestKetBan(fromEl) {
    if (!fromEl) return null;
    // Validate fromEl still exists
    if (!document.body.contains(fromEl)) return null;
    const self = isKetBanLabel(fromEl) ? fromEl : null;
    const inner = Array.from(fromEl.querySelectorAll("button, [role='button'], a, div, span, p")).filter(
      (el) => visible(el) && isKetBanLabel(el)
    );
    const pool = self ? [self, ...inner] : inner;
    if (!pool.length) return fromEl;
    // Pre-calculate sizes before sorting
    const sorted = pool.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.width * ar.height - br.width * br.height;
    });
    // Re-validate the winner still exists
    const smallest = sorted[0];
    return smallest && document.body.contains(smallest) ? smallest : pool[0];
  }

  function findInviteMessageBox() {
    const phone = findPhoneInput();
    const nodes = Array.from(
      document.querySelectorAll("textarea, [contenteditable='true'], input:not([type]), input[type='text']")
    );
    for (const el of nodes) {
      if (!visible(el) || isMainConvSearch(el) || el === phone) continue;
      if (el.closest && phone && phone.contains(el)) continue;
      const ph = normalizeLabel(
        `${el.getAttribute("placeholder") || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`
      );
      const r = el.getBoundingClientRect();
      const looksMessage =
        /lời chào|lời mời|giới thiệu|nhắn|message|greeting/.test(ph) ||
        el.tagName === "TEXTAREA" ||
        el.getAttribute("contenteditable") === "true" ||
        r.height >= 36;
      if (looksMessage) return el;
    }
    return null;
  }

  function findKetBanInRoot(root, excludeEl) {
    if (!root) return null;
    const matches = Array.from(root.querySelectorAll("button, [role='button'], a, div, span, p")).filter((el) => {
      if (!visible(el) || !isKetBanLabel(el)) return false;
      if (excludeEl && (el === excludeEl || excludeEl.contains(el) || el.contains(excludeEl))) return false;
      return !isInsideMaybeKnow(el);
    });
    if (!matches.length) return null;
    // Pre-calculate sizes before sorting to avoid race conditions with DOM changes
    const sorted = matches.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.width * ar.height - br.width * br.height;
    });
    // Re-validate the winner still exists before returning
    const winner = sorted[0];
    return winner && document.body.contains(winner) ? winner : null;
  }

  function findFinalAddFriendButton() {
    return document.querySelector('[data-id="btn_AddFrd_Add"]') || document.querySelector("#btn_AddFrd_Add");
  }

  function findInviteConfirmButton(firstButton) {
    const finalBtn = findFinalAddFriendButton();
    if (finalBtn) return finalBtn;

    const byDataId = Array.from(
      document.querySelectorAll('[data-id*="AddFrd"], [data-id*="addFrd"], [data-id*="AddFriend"], [data-id*="SendFrd"]')
    ).find((el) => {
      const id = el.getAttribute("data-id") || "";
      if (id === "btn_Main_AddFrd" || id === "btn_AddFrd_Add") return false;
      if (!visible(el) || isInsideMaybeKnow(el)) return false;
      if (firstButton && (el === firstButton || firstButton.contains(el))) return false;
      return isKetBanLabel(el) || /send|confirm|add/i.test(id);
    });
    if (byDataId) return smallestKetBan(byDataId) || byDataId;

    const box = findInviteMessageBox();
    if (box) {
      const root =
        box.closest('[role="dialog"], [class*="modal"], [class*="popup"], [class*="overlay"], form') ||
        box.parentElement?.parentElement?.parentElement;
      const inRoot = findKetBanInRoot(root, firstButton);
      if (inRoot) return inRoot;
    }

    for (const d of document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="popup"], [class*="overlay"]')) {
      if (!visible(d) || isInsideMaybeKnow(d)) continue;
      if (!d.querySelector("textarea, [contenteditable='true']")) continue;
      const btn = findKetBanInRoot(d, firstButton);
      if (btn) return btn;
    }
    return null;
  }

  function dismissAddFriendNotice() {
    const closeBtn = Array.from(document.querySelectorAll("button, [role='button'], span, div, i")).find((el) => {
      if (!visible(el)) return false;
      const t = normalizeLabel(`${textOf(el)} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`);
      return t === "đóng" || t === "close" || t === "ok" || t === "được" || t === "×" || t === "x";
    });
    if (closeBtn && document.body.contains(closeBtn)) {
      try {
        closeBtn.click();
      } catch {
        closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
    }
  }

  async function confirmFriendInvite(firstButton) {
    const btn = await waitUntil(
      () => findFinalAddFriendButton() || findInviteConfirmButton(firstButton),
      8000
    );
    if (!btn) return false;
    const finalBtn = findFinalAddFriendButton() || btn;
    // Validate button exists and is clickable before clicking
    if (!finalBtn || !document.body.contains(finalBtn) || isDisabled(finalBtn)) return false;
    try {
      finalBtn.click();
      await sleep(800);
      // Double-click only if button still exists and is enabled
      if (findFinalAddFriendButton() && !isDisabled(findFinalAddFriendButton())) {
        const doubleBtn = findFinalAddFriendButton();
        if (document.body.contains(doubleBtn)) {
          try {
            doubleBtn.click();
          } catch {
            doubleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  async function sendMessageToTarget(target, text) {
    if (!target) throw new Error("Thiếu tên bạn bè / nhóm Zalo.");
    await openConversation(target);
    return sendChatText(text);
  }

  function collectMessageBubbles() {
    const selectors = [
      ".chat-message",
      ".message-item",
      "[class*='chat-item']",
      "[class*='message-item']",
      ".msg-item",
      "[class*='Message']",
    ];
    let nodes = [];
    for (const sel of selectors) {
      nodes = Array.from(document.querySelectorAll(sel)).filter(visible);
      if (nodes.length >= 2) break;
    }
    if (nodes.length < 2) {
      const root =
        document.querySelector("#messageView, #chatView, .chat-container, [class*='messageList']") || document.body;
      nodes = Array.from(root.querySelectorAll("div")).filter((el) => {
        if (!visible(el)) return false;
        const t = textOf(el);
        if (!t || t.length > 400) return false;
        const r = el.getBoundingClientRect();
        return r.left > 240 && r.height >= 20 && r.height < 220 && el.children.length <= 6;
      });
    }
    return nodes;
  }

  function isOwnBubble(el) {
    const cls = `${el.className || ""} ${el.parentElement?.className || ""}`;
    if (/\bme\b|myself|from-me|message-out|is-me/i.test(cls)) return true;
    const r = el.getBoundingClientRect();
    return r.left > window.innerWidth * 0.45;
  }

  async function getLastIncomingMessage(conversationId) {
    if (conversationId) {
      try {
        await openConversation(conversationId);
      } catch {
        // hội thoại có thể đang mở sẵn
      }
    }
    await sleep(700);
    const bubbles = collectMessageBubbles();
    // Re-validate bubbles still exist before processing
    const validBubbles = bubbles.filter((el) => el && document.body.contains(el));
    if (validBubbles.length === 0) {
      throw new Error("Không tìm thấy tin nhắn nào trong hội thoại.");
    }
    const incoming = validBubbles.filter((el) => !isOwnBubble(el));
    const last = (incoming.length ? incoming : validBubbles).at(-1);
    if (!last) throw new Error("Không tìm thấy tin nhắn cuối để đọc.");
    const message = textOf(last);
    if (!message) throw new Error("Không đọc được nội dung tin nhắn.");
    return { ok: true, message, conversationId };
  }

  async function sendReply(conversationId, text) {
    if (conversationId) {
      try {
        await openConversation(conversationId);
      } catch {
        // giữ hội thoại hiện tại
      }
    }
    return sendChatText(text);
  }
})();
