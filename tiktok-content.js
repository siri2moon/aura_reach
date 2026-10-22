(() => {
  "use strict";
  if (window.__TIKTOK_AUTO_LOADED__) return;
  window.__TIKTOK_AUTO_LOADED__ = true;

  let actionLock = false;
  const MIN_COMMENTS = 6;
  const MAX_VIDEO_SKIPS = 20;
  const ISO = "sa-tt-iso";
  const PAGE = "sa-tt-page";

  const HANDLED = new Set([
    "PING",
    "EXTRACT_TIKTOK_CONTEXT",
    "FIND_TIKTOK_COMMENT_TARGET",
    "PREPARE_TIKTOK_COMMENT",
    "TIKTOK_COMMENT_STATUS",
    "CREATE_TIKTOK_COMMENT",
    "SCROLL_TIKTOK_FEED",
    "FOLLOW_TIKTOK_USER",
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
      return { ok: true, href: location.href, state, platform: "tiktok" };
    }
    if (state !== "ok") throw new Error(stateError(state));

    if (message?.type === "EXTRACT_TIKTOK_CONTEXT") {
      return extractTiktokContext(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }
    if (message?.type === "FIND_TIKTOK_COMMENT_TARGET") {
      return findTiktokCommentTarget({
        skipKeys: Array.isArray(message.skipKeys) ? message.skipKeys : [],
        minComments: Number(message.minComments) || MIN_COMMENTS,
        maxScrolls: Number(message.maxScrolls) || MAX_VIDEO_SKIPS,
      });
    }
    if (message?.type === "TIKTOK_COMMENT_STATUS") {
      return tiktokCommentStatus(message.beforeFp);
    }

    if (actionLock) return { ok: false, error: "Đang có thao tác TikTok khác đang xử lý." };
    actionLock = true;
    try {
      if (message?.type === "PREPARE_TIKTOK_COMMENT") {
        return await prepareTiktokComment();
      }
      if (message?.type === "CREATE_TIKTOK_COMMENT") {
        return await createTiktokComment(String(message.text || ""), message.postKey);
      }
      if (message?.type === "SCROLL_TIKTOK_FEED") {
        return await scrollTiktokFeed({
          rounds: Number(message.rounds) || 8,
          autoLike: Boolean(message.autoLike),
          likeDelay: Number(message.likeDelay) || 4,
        });
      }
      if (message?.type === "FOLLOW_TIKTOK_USER") {
        return await followTiktokUser();
      }
      return { ok: false, error: `TikTok không xử lý lệnh ${message?.type || "?"}.` };
    } finally {
      actionLock = false;
    }
  }

  function pageState() {
    const href = location.href.toLowerCase();
    if (href.includes("/login") || href.includes("/signup")) return "login_required";
    const login = document.querySelector('form input[type="password"], a[href*="/login"]');
    if (login && !document.querySelector('[data-e2e="recommend-list-item-container"], [data-e2e="user-page"], video')) {
      return "login_required";
    }
    return "ok";
  }

  function stateError(state) {
    if (state === "login_required") return "Tài khoản TikTok chưa đăng nhập trên trình duyệt.";
    return "Trang TikTok đang không khả dụng.";
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
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }

  function clickAt(el) {
    if (!el) return false;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = el.getBoundingClientRect();
    const x = rect.left + Math.min(Math.max(8, rect.width * 0.25), Math.max(rect.width - 4, 8));
    const y = rect.top + Math.min(Math.max(6, rect.height / 2), Math.max(rect.height - 2, 6));
    const mouse = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
    };
    try {
      el.dispatchEvent(new PointerEvent("pointerdown", { ...mouse, pointerId: 1, pointerType: "mouse", buttons: 1 }));
    } catch {
      // older engines
    }
    el.dispatchEvent(new MouseEvent("mousedown", { ...mouse, buttons: 1 }));
    try {
      el.dispatchEvent(new PointerEvent("pointerup", { ...mouse, pointerId: 1, pointerType: "mouse", buttons: 0 }));
    } catch {
      // older engines
    }
    el.dispatchEvent(new MouseEvent("mouseup", { ...mouse, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("click", mouse));
    return true;
  }

  async function waitFor(fn, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = fn();
      if (value) return value;
      await sleep(120);
    }
    return fn();
  }

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getVideoId(urlStr = location.href) {
    const match = String(urlStr).match(/\/video\/(\d+)/i);
    return match ? match[1] : "";
  }

  function currentAuthor() {
    const el = document.querySelector(
      '[data-e2e="video-author-uniqueid"], [data-e2e="browse-username"], [data-e2e="user-title"]'
    );
    return textOf(el).replace(/^@/, "");
  }

  function currentCaption() {
    const el = document.querySelector(
      '[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="new-desc-span"]'
    );
    return textOf(el);
  }

  function parseTiktokCount(raw) {
    const t = String(raw || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".");
    if (!t || t === "-") return 0;
    const m = t.match(/^([\d.]+)\s*(k|m|b|n|tr)?/i);
    if (!m) return 0;
    let n = Number.parseFloat(m[1]);
    if (!Number.isFinite(n)) return 0;
    const suf = (m[2] || "").toLowerCase();
    if (suf === "k" || suf === "n") n *= 1000;
    else if (suf === "m" || suf === "tr") n *= 1e6;
    else if (suf === "b") n *= 1e9;
    return Math.round(n);
  }

  function currentVideoCard() {
    const items = [
      ...document.querySelectorAll(
        '[data-e2e="recommend-list-item-container"], [data-e2e="feed-item"], [data-e2e="user-post-item"]'
      ),
    ].filter(visible);
    const mid = window.innerHeight / 2;
    return (
      items.find((el) => {
        const r = el.getBoundingClientRect();
        return r.top < mid && r.bottom > mid;
      }) || null
    );
  }

  function currentCommentCount() {
    const card = currentVideoCard();
    const scoped = card?.querySelector('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]');
    if (scoped && visible(scoped)) return parseTiktokCount(textOf(scoped));
    const global = document.querySelector('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]');
    if (global && visible(global)) return parseTiktokCount(textOf(global));
    const icon = (card || document).querySelector('[data-e2e="comment-icon"], [data-e2e="browse-comment-icon"]');
    const labeled = icon?.closest("button, [role='button'], a") || icon?.parentElement;
    if (labeled) {
      const nums = textOf(labeled).match(/[\d.,]+\s*(k|m|b|n|tr)?/i);
      if (nums) return parseTiktokCount(nums[0]);
    }
    return 0;
  }

  function contextFromPlaying(skipSet) {
    const card = currentVideoCard();
    const commentCount = currentCommentCount();
    const link = card?.querySelector('a[href*="/video/"]');
    const videoId = getVideoId(link?.href || location.href) || getVideoId();
    const author =
      textOf(card?.querySelector('[data-e2e="video-author-uniqueid"], [data-e2e="browse-username"]')) || currentAuthor();
    const caption =
      textOf(card?.querySelector('[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="new-desc-span"]')) ||
      currentCaption();
    const postKey = videoId || `${location.pathname}-${(caption || document.title).slice(0, 40)}`.toLowerCase();
    if (skipSet.has(String(postKey).toLowerCase())) {
      return { ok: true, skipped: true, alreadyCommented: true, postKey, commentCount };
    }
    const postText = [author ? `Video của @${author}` : "Video TikTok", caption].filter(Boolean).join(": ");
    if (!postText) return null;
    return { ok: true, postKey, postText, author, target: videoId ? "video" : "foryou", commentCount };
  }

  function extractTiktokContext(skipKeys = []) {
    const skipSet = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    const playing = contextFromPlaying(skipSet);
    if (playing?.postText || playing?.skipped) return playing;
    const videoId = getVideoId();
    const commentCount = currentCommentCount();
    if (videoId) {
      if (skipSet.has(videoId.toLowerCase())) {
        return { ok: true, skipped: true, alreadyCommented: true, postKey: videoId, commentCount };
      }
      const author = currentAuthor();
      const caption = currentCaption();
      const postText = [author ? `Video của @${author}` : "Video TikTok", caption].filter(Boolean).join(": ");
      if (!postText) throw new Error("Không lấy được nội dung video TikTok.");
      return { ok: true, postKey: videoId, postText, author, target: "video", commentCount };
    }

    const items = Array.from(
      document.querySelectorAll('[data-e2e="recommend-list-item-container"], [data-e2e="user-post-item"]')
    ).filter(visible);
    for (const item of items) {
      const link = item.querySelector('a[href*="/video/"]');
      const href = link?.href || "";
      const id = getVideoId(href);
      if (id && !skipSet.has(id.toLowerCase())) {
        const countEl = item.querySelector('[data-e2e="comment-count"], [data-e2e="browse-comment-count"]');
        return { ok: true, nextUrl: href, postKey: id, commentCount: parseTiktokCount(textOf(countEl)) };
      }
    }

    const author = currentAuthor();
    const caption = currentCaption() || document.title;
    const fallbackKey = `${location.pathname}-${caption.slice(0, 40)}`.toLowerCase();
    if (skipSet.has(fallbackKey)) return { ok: true, skipped: true, postKey: fallbackKey, commentCount };
    return {
      ok: true,
      postKey: fallbackKey,
      postText: [author ? `Video của @${author}` : "Video TikTok For You", caption].filter(Boolean).join(": "),
      author,
      target: "foryou",
      commentCount,
    };
  }

  function closeCommentPanel() {
    const close = document.querySelector(
      '[data-e2e="comment-close"], [data-e2e="browse-close"], [aria-label*="Close" i], [aria-label*="Đóng" i]'
    );
    if (close && visible(close)) clickEl(close);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
  }

  async function goToNextVideo() {
    const before = getVideoId() || location.href;
    closeCommentPanel();
    await sleep(250);
    const nextBtn = document.querySelector(
      '[data-e2e="arrow-right"], [data-e2e="feed-arrow-down"], button[aria-label*="next" i], button[aria-label*="xuống" i]'
    );
    const video = document.querySelector("video");
    if (video) {
      clickAt(video);
      await sleep(120);
    }
    if (nextBtn && visible(nextBtn)) clickAt(nextBtn);
    const down = { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40, bubbles: true, cancelable: true };
    (video || document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", down));
    window.dispatchEvent(new KeyboardEvent("keydown", down));
    document.dispatchEvent(new KeyboardEvent("keydown", down));
    window.scrollBy({ top: Math.round(window.innerHeight * 0.96), behavior: "smooth" });
    const changed = await waitFor(() => {
      const now = getVideoId() || location.href;
      return now && now !== before ? now : null;
    }, 3800);
    await sleep(900 + Math.round(Math.random() * 500));
    return Boolean(changed);
  }

  async function findTiktokCommentTarget({ skipKeys, minComments, maxScrolls }) {
    const skipSet = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    await sleep(700);

    const first = extractTiktokContext(skipKeys);
    if (first?.nextUrl && !getVideoId()) {
      return first;
    }

    let seenLow = 0;
    for (let i = 0; i < maxScrolls; i += 1) {
      const ctx = extractTiktokContext(skipKeys);
      if (ctx?.nextUrl && !ctx.postText) return ctx;
      const key = String(ctx.postKey || "").toLowerCase();
      let count = Number(ctx.commentCount) || currentCommentCount();
      if (count === 0) {
        await sleep(700);
        count = currentCommentCount();
      }
      ctx.commentCount = count;

      if (ctx.skipped || (key && skipSet.has(key))) {
        await goToNextVideo();
        continue;
      }
      if (count >= minComments && ctx.postText) {
        return ctx;
      }
      seenLow += 1;
      await goToNextVideo();
    }

    return {
      ok: false,
      error: `Đã lướt ${maxScrolls} video nhưng không có video nào trên ${minComments - 1} bình luận.`,
      scanned: maxScrolls,
      lowCommentVideos: seenLow,
    };
  }

  function editorText(el) {
    if (!el) return "";
    const raw = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : el.innerText || el.textContent || "";
    return String(raw)
      .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isRealEditor(el) {
    if (!(el instanceof Element) || !visible(el)) return false;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return true;
    const ce = String(el.getAttribute("contenteditable") || "").toLowerCase();
    return ce === "true" || ce === "plaintext-only" || el.getAttribute("role") === "textbox";
  }

  function findCommentEditor() {
    const root = document.querySelector('[data-e2e="comment-input"]');
    const scoped = root
      ? [...root.querySelectorAll('[contenteditable="plaintext-only"], [contenteditable="true"], [contenteditable], textarea, [role="textbox"]')]
      : [];
    const extras = [
      ...document.querySelectorAll(
        '[data-e2e="comment-input"] [contenteditable], [class*="DivInputEditorContainer"] [contenteditable], .public-DraftEditor-content[contenteditable], [data-lexical-editor="true"], [contenteditable="plaintext-only"]'
      ),
    ];
    return [...scoped, ...extras].find(isRealEditor) || null;
  }

  function findCommentPostButton() {
    const direct = document.querySelector('[data-e2e="comment-post"], [data-e2e="comment-publish"]');
    if (direct && visible(direct)) return direct;
    const root = document.querySelector('[data-e2e="comment-input"]')?.parentElement || document;
    return (
      Array.from(root.querySelectorAll("button, [role='button'], [data-e2e*='comment']")).find((el) => {
        if (!visible(el)) return false;
        const label = `${el.innerText || ""} ${el.getAttribute("aria-label") || ""}`.trim();
        return /^(đăng|post|send|đăng lên)$/i.test(label);
      }) || null
    );
  }

  function buttonFingerprint(el) {
    if (!el) return "";
    const s = getComputedStyle(el);
    return [el.getAttribute("aria-disabled"), s.color, s.backgroundColor, s.opacity, String(el.className || "")].join("|");
  }

  function isPostEnabled(el, beforeFp) {
    if (!el || !visible(el)) return false;
    if (el.disabled || el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    if (el.getAttribute("aria-disabled") === "false") return true;
    const cls = `${el.className || ""} ${el.parentElement?.className || ""}`;
    if (/\b(disabled|disable|is-disable|inactive|not-allow)\b/i.test(cls)) return false;
    const s = getComputedStyle(el);
    if (s.pointerEvents === "none") return false;
    const rgb = (c) => {
      const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? m.slice(1).map(Number) : null;
    };
    const redish = (c) => {
      const p = rgb(c);
      return p && p[0] > 180 && p[1] < 90 && p[2] < 130;
    };
    if (redish(s.color) || redish(s.backgroundColor)) return true;
    if (beforeFp && buttonFingerprint(el) !== beforeFp) return true;
    return false;
  }

  function askPage(payload, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMsg);
        reject(new Error("Không gõ được trong trang TikTok (hết thời gian)."));
      }, timeout);
      function onMsg(event) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== PAGE || data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve(data);
      }
      window.addEventListener("message", onMsg);
      window.postMessage({ source: ISO, requestId, ...payload }, "*");
    });
  }

  async function pingPageTyper() {
    try {
      const res = await askPage({ type: "PING" }, 1500);
      return Boolean(res?.pong || res?.ok);
    } catch {
      return false;
    }
  }

  function elementPoint(el, xRatio = 0.28, yRatio = 0.5) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return {
      x: r.left + Math.max(6, Math.min(r.width - 6, r.width * xRatio)),
      y: r.top + Math.max(6, Math.min(r.height - 6, r.height * yRatio)),
      width: r.width,
      height: r.height,
      left: r.left,
      top: r.top,
    };
  }

  async function activateCommentEditor(options = {}) {
    const shouldFocus = options.focus !== false;
    let editor = findCommentEditor();
    if (editor) {
      if (shouldFocus) clickAt(editor);
      await sleep(220);
      return editor;
    }

    const commentBtn = document.querySelector(
      '[data-e2e="comment-icon"], [data-e2e="browse-comment-icon"]'
    );
    if (commentBtn) {
      clickAt(commentBtn);
      await sleep(1100);
    }

    const box = document.querySelector('[data-e2e="comment-input"]');
    if (box) {
      clickAt(box);
      await sleep(350);
    }

    editor = await waitFor(() => findCommentEditor(), 5000);
    if (editor && shouldFocus) {
      clickAt(editor);
      await sleep(180);
    }
    return editor;
  }

  async function prepareTiktokComment() {
    await sleep(400 + Math.round(Math.random() * 280));
    const editor = await activateCommentEditor({ focus: false });
    if (!editor) throw new Error("Không tìm thấy ô bình luận TikTok.");
    const post = findCommentPostButton();
    return {
      ok: true,
      editor: elementPoint(editor),
      post: elementPoint(post, 0.5, 0.5),
      postFingerprint: buttonFingerprint(post),
    };
  }

  function tiktokCommentStatus(beforeFp) {
    const editor = findCommentEditor();
    const post = findCommentPostButton();
    return {
      ok: true,
      editorText: editorText(editor),
      postEnabled: isPostEnabled(post, beforeFp),
      editor: elementPoint(editor),
      post: elementPoint(post, 0.5, 0.5),
    };
  }

  async function createTiktokComment(text, postKey) {
    if (!text) throw new Error("Nội dung bình luận TikTok rỗng.");
    await sleep(700 + Math.round(Math.random() * 400));

    const editor = await activateCommentEditor();
    if (!editor) throw new Error("Không tìm thấy ô bình luận TikTok.");

    const postBefore = findCommentPostButton();
    const beforeFp = buttonFingerprint(postBefore);

    const pageReady = await pingPageTyper();
    let typed = "";
    if (pageReady) {
      const typedRes = await askPage({ type: "TYPE_COMMENT", text }, 30000);
      if (!typedRes?.ok) throw new Error(typedRes?.error || "Không gõ được bình luận TikTok.");
      typed = String(typedRes.typed || editorText(findCommentEditor() || editor));
    } else {
      throw new Error("Chưa gắn được bộ gõ TikTok. Hãy reload extension rồi mở lại tab TikTok.");
    }

    if (!typed) throw new Error("Không gõ được nội dung vào ô bình luận TikTok.");

    const postBtn = await waitFor(() => {
      const btn = findCommentPostButton();
      return isPostEnabled(btn, beforeFp) ? btn : null;
    }, 4000);

    if (!postBtn) {
      throw new Error("Nút đăng bình luận TikTok không được kích hoạt sau khi nhập nội dung.");
    }

    await sleep(180 + Math.round(Math.random() * 220));
    clickAt(postBtn);
    await sleep(1600);

    const leftover = editorText(findCommentEditor());
    if (leftover && leftover.slice(0, 24) === typed.slice(0, 24)) {
      throw new Error("TikTok chưa nhận bình luận (ô nhập vẫn còn nội dung, nút Đăng có thể chưa ăn).");
    }

    return { ok: true, postKey: postKey || getVideoId(), text };
  }

  async function likeCurrentVideo() {
    const likeBtn = document.querySelector(
      '[data-e2e="like-icon"], [data-e2e="browse-like-icon"], [data-e2e="video-like"]'
    );
    if (!likeBtn) return false;
    const pressed = likeBtn.getAttribute("aria-pressed") === "true" || likeBtn.className.includes("liked");
    if (pressed) return false;
    clickEl(likeBtn);
    return true;
  }

  async function scrollTiktokFeed({ rounds, autoLike, likeDelay }) {
    let scrolled = 0;
    let likedCount = 0;
    for (let i = 0; i < rounds; i++) {
      if (autoLike) {
        await sleep(Math.max(2, likeDelay) * 1000);
        if (await likeCurrentVideo()) likedCount += 1;
      } else {
        await sleep(1200);
      }
      await goToNextVideo();
      scrolled += 1;
    }
    return { ok: true, scrolled, likedCount };
  }

  async function followTiktokUser() {
    await sleep(1200);
    const followBtn = Array.from(
      document.querySelectorAll('[data-e2e="follow-button"], [data-e2e="browse-follow"], button')
    ).find((el) => visible(el) && /follow|theo dõi/i.test(textOf(el)) && !/following|đang follow|bạn bè/i.test(textOf(el)));
    if (!followBtn) {
      const already = Array.from(document.querySelectorAll("button")).find((el) =>
        /following|đang follow/i.test(textOf(el))
      );
      if (already) return { ok: true, skipped: true };
      throw new Error("Không tìm thấy nút Follow trên trang TikTok này.");
    }
    clickEl(followBtn);
    await sleep(1200);
    return { ok: true };
  }
})();
