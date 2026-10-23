(() => {
  "use strict";
  if (window.__YOUTUBE_AUTO_LOADED__) return;
  window.__YOUTUBE_AUTO_LOADED__ = true;

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "EXTRACT_YOUTUBE_CONTEXT",
    "EXTRACT_YOUTUBE_SEARCH_CONTEXT",
    "EXTRACT_YOUTUBE_RELATED",
    "CREATE_YOUTUBE_COMMENT",
    "SCROLL_YOUTUBE_FEED",
    "SUBSCRIBE_YOUTUBE_CHANNEL",
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
      return { ok: true, href: location.href, state, platform: "youtube" };
    }
    if (state !== "ok") throw new Error(stateError(state));

    dismissYoutubeConsent();

    if (message?.type === "EXTRACT_YOUTUBE_CONTEXT") {
      return await extractYoutubeContext(
        Array.isArray(message.skipKeys) ? message.skipKeys : [],
        Number(message.watchSeconds) || 0
      );
    }

    if (message?.type === "EXTRACT_YOUTUBE_SEARCH_CONTEXT") {
      return await extractYoutubeSearchContext(
        Array.isArray(message.skipKeys) ? message.skipKeys : [],
        Boolean(message.allowLoadMore)
      );
    }

    if (message?.type === "EXTRACT_YOUTUBE_RELATED") {
      return await extractYoutubeRelated(
        Array.isArray(message.skipKeys) ? message.skipKeys : [],
        Number(message.limit) || 2
      );
    }

    if (message?.type === "CREATE_YOUTUBE_COMMENT") {
      const text = String(message.text || "");
      const postKey = String(message.postKey || "") || getVideoId(location.href);
      if (postKey && wasRecentAction("CREATE_YOUTUBE_COMMENT", text, postKey)) {
        return { ok: true, skipped: true, alreadyCommented: true, postKey };
      }
      if (actionLock) return { ok: false, error: "Đang có thao tác YouTube khác đang xử lý." };
      actionLock = true;
      try {
        return await createYoutubeComment(text, message.postKey);
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "SCROLL_YOUTUBE_FEED") {
      if (actionLock) return { ok: true, skipped: true, reason: "busy" };
      actionLock = true;
      try {
        return await scrollYoutubeFeed({
          rounds: Number(message.rounds) || 8,
          autoLike: Boolean(message.autoLike),
          likeDelay: Number(message.likeDelay) || 5,
        });
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "SUBSCRIBE_YOUTUBE_CHANNEL") {
      if (actionLock) return { ok: true, skipped: true, reason: "busy" };
      actionLock = true;
      try {
        return await subscribeYoutubeChannel();
      } finally {
        actionLock = false;
      }
    }

    return { ok: false, error: `YouTube không xử lý lệnh ${message?.type || "?"}.` };
  }

  // ---------------- session dedup / cooldown ----------------

  function actionKey(type, text) {
    return `${type}:${String(text).slice(0, 240)}`;
  }

  function wasRecentAction(type, text, postKey) {
    try {
      const raw = sessionStorage.getItem("youtubeAutoLastAction");
      if (!raw) return false;
      const prev = JSON.parse(raw);
      const age = Date.now() - Number(prev.t || 0);
      if (postKey && prev.postKey && prev.postKey === postKey && age < 12 * 60 * 60 * 1000) return true;
      return prev.key === actionKey(type, text) && age < 90000;
    } catch {
      return false;
    }
  }

  function markAction(type, text, postKey) {
    try {
      sessionStorage.setItem(
        "youtubeAutoLastAction",
        JSON.stringify({ key: actionKey(type, text), postKey: postKey || "", t: Date.now() })
      );
    } catch {
      // ignore
    }
  }

  // ---------------- page state ----------------

  function pageState() {
    const href = location.href.toLowerCase();
    if (href.includes("accounts.google.com") || href.includes("/signin")) return "login_required";
    if (
      document.querySelector(
        "ytd-restricted-video-notice-renderer, ytd-enforcement-message-view-model, tp-yt-paper-dialog #confirm-age-button"
      )
    ) {
      return "age_gate";
    }
    if (document.querySelector("ytd-sponsorships-notice-renderer, #sponsorships-notice")) {
      return "members_only";
    }
    const avatar = document.querySelector("#avatar-btn, button#avatar-btn, ytd-topbar-menu-button-renderer img");
    const signInBtn = document.querySelector("a[href*='accounts.google.com/ServiceLogin']");
    if (!avatar && signInBtn && !href.includes("/watch")) {
      return "login_required";
    }
    // Chặn tài khoản / lưu lượng bất thường: Google chèn trang xác minh hoặc reCAPTCHA.
    if (href.includes("/sorry/") || href.includes("consent.youtube.com")) return "blocked";
    try {
      const bodyText = (document.body?.innerText || "").toLowerCase();
      if (/unusual traffic|sign in to confirm you'?re not a bot|xác nhận bạn không phải là rô-?bốt|lưu lượng truy cập bất thường|we'?re sorry|our systems have detected/.test(bodyText)) {
        return "blocked";
      }
      if (document.querySelector("iframe[src*='recaptcha'], form#captcha-form")) return "blocked";
    } catch {
      // bỏ qua lỗi truy vấn DOM
    }
    return "ok";
  }

  function stateError(state) {
    if (state === "login_required") return "Tài khoản YouTube chưa đăng nhập trên trình duyệt.";
    if (state === "age_gate") return "Video bị giới hạn độ tuổi, cần xác nhận đã đăng nhập tài khoản đủ tuổi.";
    if (state === "members_only") return "Video này chỉ dành cho thành viên kênh (members-only).";
    if (state === "blocked") return "YouTube/Google tạm chặn do lưu lượng bất thường. Tạm nghỉ rồi thử lại sau.";
    return "Trang YouTube đang không khả dụng.";
  }

  // ---------------- generic DOM helpers ----------------

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 8 && rect.height > 8 && style.visibility !== "hidden" && style.display !== "none";
  }

  function showHud(text) {
    let hud = document.getElementById("youtube-auto-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "youtube-auto-hud";
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
        "max-width:280px",
      ].join(";");
      document.documentElement.appendChild(hud);
    }
    hud.textContent = text;
  }

  function hideHud() {
    const hud = document.getElementById("youtube-auto-hud");
    if (hud) hud.remove();
  }

  function isDisabled(el) {
    if (!el) return true;
    return el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled");
  }

  function controlLabel(el) {
    if (!el) return "";
    const own = el.getAttribute("aria-label") || "";
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return `${own} ${text}`.replace(/\s+/g, " ").trim().toLowerCase();
  }

  function clickReact(el) {
    if (!el) return;
    const target = el.closest("button, [role='button'], yt-button-shape") || el;
    target.scrollIntoView({ block: "center", inline: "center" });
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const mouse = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    try {
      target.dispatchEvent(new PointerEvent("pointerdown", { ...mouse, pointerId: 1, pointerType: "mouse", buttons: 1 }));
    } catch {
      // older engines
    }
    target.dispatchEvent(new MouseEvent("mousedown", { ...mouse, buttons: 1 }));
    try {
      target.dispatchEvent(new PointerEvent("pointerup", { ...mouse, pointerId: 1, pointerType: "mouse", buttons: 0 }));
    } catch {
      // older engines
    }
    target.dispatchEvent(new MouseEvent("mouseup", { ...mouse, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", { ...mouse, buttons: 0 }));
  }

  function dismissYoutubeConsent() {
    const labels = [
      "chấp nhận tất cả",
      "accept all",
      "tôi đồng ý",
      "i agree",
      "không, cảm ơn",
      "no thanks",
      "để sau",
      "not now",
      "đóng",
      "close",
      "dismiss",
      "xong",
      "done",
      "ok",
    ];
    try {
      const nodes = document.querySelectorAll(
        'tp-yt-paper-dialog button, ytd-consent-bump-v2-lightbox button, ytd-popup-container button, [role="dialog"] button, ytd-button-renderer button'
      );
      for (const el of nodes) {
        if (!isVisible(el)) continue;
        const text = controlLabel(el);
        if (!text || text.length > 40) continue;
        if (!labels.some((label) => text === label || text.startsWith(label))) continue;
        try {
          el.click();
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  function getVideoId(urlStr = location.href) {
    try {
      const raw = String(urlStr || "").trim();
      const url = new URL(raw, location.origin);
      const path = url.pathname || "";
      if (path.startsWith("/shorts/") || path.startsWith("/embed/") || path.startsWith("/live/")) {
        return (path.split("/")[2] || "").split("?")[0];
      }
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery;
      if (url.hostname.includes("youtu.be")) return path.replace(/^\//, "").split("/")[0];
    } catch {
      // ignore
    }
    const text = String(urlStr || "");
    const matched =
      text.match(/[?&]v=([^&]+)/i) ||
      text.match(/\/(?:shorts|embed|live)\/([^/?&]+)/i) ||
      text.match(/youtu\.be\/([^/?&]+)/i);
    return matched ? matched[1] : "";
  }

  // ---------------- /watch page extraction ----------------

  async function clickExpandDescription() {
    const expandBtn = document.querySelector(
      "#description-inline-expander #expand, #description-inline-expander tp-yt-paper-button#expand"
    );
    if (expandBtn && isVisible(expandBtn)) {
      try {
        expandBtn.click();
      } catch {
        // ignore
      }
      await sleep(300);
    }
  }

  // Nhận diện avatar tài khoản đang đăng nhập trên trình duyệt (topbar), dùng để
  // so khớp với avatar tác giả từng comment trong danh sách bình luận của video —
  // qua đó biết được VIDEO NÀY đã có comment của chính mình hay chưa, độc lập với
  // lịch sử lưu trong storage của extension (storage có thể bị xoá, đổi máy, cài lại...).
  function ownAvatarKey() {
    const img = document.querySelector(
      "#avatar-btn img, ytd-topbar-menu-button-renderer img, #masthead #avatar-btn img"
    );
    const src = img?.getAttribute("src") || img?.src || "";
    return src.split("=")[0] || "";
  }

  function findOwnCommentThread() {
    const myAvatar = ownAvatarKey();
    if (!myAvatar) return null;
    const threads = document.querySelectorAll(
      "#comments #contents ytd-comment-thread-renderer, #comments #contents ytd-comment-view-model"
    );
    for (const thread of threads) {
      const img = thread.querySelector("#author-thumbnail img, #author-thumbnail-button img");
      const src = img?.getAttribute("src") || img?.src || "";
      if (src && src.split("=")[0] === myAvatar) return thread;
    }
    return null;
  }

  async function checkOwnExistingComment() {
    window.scrollBy({ top: 700, behavior: "smooth" });
    const commentsSection = await waitFor(() => document.querySelector("ytd-comments#comments"), 4000);
    if (!commentsSection) return null;
    commentsSection.scrollIntoView({ block: "center" });
    await waitFor(
      () =>
        document.querySelector(
          "#comments #contents ytd-comment-thread-renderer, #comments #contents ytd-comment-view-model"
        ),
      4000
    );
    await sleep(500);
    return findOwnCommentThread();
  }

  async function watchVideoBriefly(watchSeconds) {
    const seconds = Math.max(0, Math.round(watchSeconds));
    if (!seconds) return;

    // Random 3-5 lần cuộn nhẹ lên/xuống trong lúc "xem", rải đều theo thời gian.
    const scrollCount = Math.min(seconds - 1, 3 + Math.floor(Math.random() * 3));
    const scrollAtElapsed = new Set();
    while (scrollAtElapsed.size < Math.max(0, scrollCount)) {
      scrollAtElapsed.add(1 + Math.floor(Math.random() * (seconds - 1)));
    }

    for (let remain = seconds; remain > 0; remain -= 1) {
      const elapsed = seconds - remain;
      if (scrollAtElapsed.has(elapsed)) {
        const delta = (Math.random() < 0.5 ? -1 : 1) * (100 + Math.floor(Math.random() * 200));
        window.scrollBy({ top: delta, behavior: "smooth" });
        showHud(`Đang xem video... còn ${remain}s (cuộn nhẹ xem thêm)`);
      } else {
        showHud(`Đang xem video... còn ${remain}s`);
      }
      await sleep(1000);
    }
  }

  async function watchBeforeLeaving() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const seconds = 5 + Math.floor(Math.random() * 6); // 5-10 giây
    for (let remain = seconds; remain > 0; remain -= 1) {
      showHud(`Đã bình luận xong, xem thêm ${remain}s trước khi rời video...`);
      await sleep(1000);
    }
  }

  async function extractYoutubeContext(skipKeys = [], watchSeconds = 0) {
    const skipSet = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    const currentVideoId = String(getVideoId(location.href) || "").toLowerCase();

    if (currentVideoId) {
      if (skipSet.has(currentVideoId)) {
        return { ok: true, skipped: true, alreadyCommented: true, postKey: currentVideoId };
      }

      showHud("Đang mở video...");
      await sleep(1200);
      await waitFor(
        () => document.querySelector("h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string"),
        8000
      );

      await watchVideoBriefly(watchSeconds);

      showHud("Đang kiểm tra bình luận trước đó...");
      const ownThread = await checkOwnExistingComment();
      if (ownThread) {
        hideHud();
        return { ok: true, skipped: true, alreadyCommented: true, postKey: currentVideoId };
      }

      showHud("Đang đọc tiêu đề & mô tả video...");
      await clickExpandDescription();

      const titleEl =
        document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
        document.querySelector("#title h1 yt-formatted-string") ||
        document.querySelector("h1.title") ||
        document.querySelector("meta[name='title']");
      const title = (titleEl?.textContent || titleEl?.content || "").trim();

      const channelEl =
        document.querySelector("#owner #channel-name a") ||
        document.querySelector("ytd-channel-name a") ||
        document.querySelector("#upload-info #channel-name a");
      const channelName = (channelEl?.textContent || "").trim();

      const descEl =
        document.querySelector("#description-inline-expander yt-attributed-string") ||
        document.querySelector("#description yt-formatted-string") ||
        document.querySelector("#description-inline-expander") ||
        document.querySelector("meta[name='description']");
      const desc = (descEl?.textContent || descEl?.content || "").trim().slice(0, 800);

      if (!title && !desc) {
        throw new Error("Không trích xuất được tiêu đề hoặc mô tả video YouTube.");
      }

      const postText = `Tiêu đề video: ${title}\nKênh: ${channelName}\nMô tả: ${desc}`;
      return {
        ok: true,
        postKey: currentVideoId,
        postText,
        channelName,
        title,
        target: "video",
      };
    }

    throw new Error("Trang hiện tại không phải video YouTube (không có tham số ?v=... hoặc /shorts/...).");
  }

  // ---------------- search results extraction ----------------

  const NON_VIDEO_RESULT_SELECTOR =
    "ytd-channel-renderer, ytd-playlist-renderer, ytd-radio-renderer, ytd-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer, ytd-reel-shelf-renderer, ytd-display-ad-renderer, ytd-search-pyv-renderer";

  const MIN_VIDEO_DURATION_SECONDS = 30; // chỉ tương tác với video dài hơn 30 giây

  function parseDurationToSeconds(text) {
    const clean = String(text || "").trim();
    if (!clean || !/^\d{1,2}(:\d{2}){1,2}$/.test(clean)) return null; // "LIVE", ngày phát hành premiere... không khớp định dạng này
    const parts = clean.split(":").map((p) => parseInt(p, 10));
    if (parts.some((p) => Number.isNaN(p))) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  function findDurationSeconds(renderer) {
    const el = renderer?.querySelector(".ytBadgeShapeText, #text.ytd-thumbnail-overlay-time-status-renderer");
    return parseDurationToSeconds(el?.textContent);
  }

  function collectSearchVideoLinks(skipSet) {
    const links = Array.from(document.querySelectorAll("ytd-video-renderer a#video-title, a#video-title"));
    for (const link of links) {
      const renderer = link.closest("ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer");
      if (link.closest(NON_VIDEO_RESULT_SELECTOR)) continue;
      const href = link.getAttribute("href") || "";
      if (!href || href.includes("list=")) continue; // bỏ qua Mix/playlist
      const vid = String(getVideoId(href) || "").toLowerCase();
      if (!vid || skipSet.has(vid)) continue;
      const durationSeconds = findDurationSeconds(renderer);
      if (!durationSeconds || durationSeconds < MIN_VIDEO_DURATION_SECONDS) continue; // bỏ qua video ngắn/live/premiere
      return { vid, href, title: (link.textContent || "").trim(), durationSeconds };
    }
    return null;
  }

  // Bộ lọc (Duration/Upload date/Feature/Sort) đã được background.js gắn thẳng vào
  // tham số sp= của searchUrl trước khi mở tab này, nên ở đây không cần bấm gì thêm.
  async function extractYoutubeSearchContext(skipKeys = [], allowLoadMore = false) {
    const skipSet = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    showHud("Đang tìm video phù hợp trong kết quả tìm kiếm...");
    await sleep(1200);
    await waitFor(() => document.querySelector("ytd-video-renderer a#video-title"), 8000);

    let found = collectSearchVideoLinks(skipSet);
    let loadMoreRounds = 0;
    while (!found && allowLoadMore && loadMoreRounds < 4) {
      showHud(`Chưa thấy video phù hợp, đang cuộn tải thêm kết quả (${loadMoreRounds + 1}/4)...`);
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      const before = document.querySelectorAll("ytd-video-renderer").length;
      await waitFor(() => document.querySelectorAll("ytd-video-renderer").length > before, 4000);
      await sleep(600);
      found = collectSearchVideoLinks(skipSet);
      loadMoreRounds += 1;
    }

    if (!found) {
      hideHud();
      return { ok: false, error: "Không tìm thấy video phù hợp (thời lượng/bộ lọc) cho từ khoá này." };
    }

    hideHud();
    const fullUrl = new URL(found.href, location.origin).href;
    return {
      ok: true,
      nextUrl: fullUrl,
      postKey: String(found.vid || "").toLowerCase(),
      title: found.title,
      durationSeconds: found.durationSeconds,
    };
  }

  async function extractYoutubeRelated(skipKeys = [], limit = 2) {
    const skipSet = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    const current = String(getVideoId(location.href) || "").toLowerCase();
    if (current) skipSet.add(current);

    const relatedRoot =
      document.querySelector("#related") ||
      document.querySelector("ytd-watch-next-secondary-results-renderer") ||
      document.querySelector("#secondary");
    if (relatedRoot) {
      relatedRoot.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    showHud("Đang lấy video gợi ý...");
    await sleep(1000);
    await waitFor(
      () =>
        document.querySelector(
          "#related ytd-compact-video-renderer, #related yt-lockup-view-model, ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer"
        ),
      5000
    );
    await sleep(400);

    const links = Array.from(
      document.querySelectorAll(
        [
          "#related ytd-compact-video-renderer a#video-title",
          "#related ytd-compact-video-renderer a.yt-simple-endpoint",
          "#related yt-lockup-view-model a[href*='/watch?v=']",
          "ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer a#video-title",
          "ytd-watch-next-secondary-results-renderer a#video-title-link",
          "#secondary a[href*='/watch?v=']",
        ].join(", ")
      )
    );

    const videos = [];
    const seen = new Set();
    for (const link of links) {
      const href = link.getAttribute("href") || link.href || "";
      if (!href || /[?&]list=/i.test(href) || /start_radio=/i.test(href)) continue;
      const vid = String(getVideoId(href) || "").toLowerCase();
      if (!vid || skipSet.has(vid) || seen.has(vid)) continue;
      const renderer = link.closest(
        "ytd-compact-video-renderer, ytd-video-renderer, yt-lockup-view-model, ytd-rich-item-renderer"
      );
      if (renderer?.closest(NON_VIDEO_RESULT_SELECTOR)) continue;
      const durationSeconds = findDurationSeconds(renderer);
      if (durationSeconds !== null && durationSeconds < MIN_VIDEO_DURATION_SECONDS) continue;
      seen.add(vid);
      videos.push({
        vid,
        href: new URL(href, location.origin).href,
        title: (link.textContent || link.getAttribute("title") || "").trim(),
        durationSeconds,
      });
      if (videos.length >= Math.max(0, limit)) break;
    }

    hideHud();
    return { ok: true, videos };
  }

  // ---------------- comment posting (with verification) ----------------

  function editorText(el) {
    return (el.innerText || el.textContent || "")
      .replace(/[​‌‍﻿]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function clearEditor(el) {
    el.focus();
    await sleep(60);
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // ignore
    }
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    await sleep(40);
  }

  function looksDuplicated(current, wantNorm) {
    if (!wantNorm || !current) return false;
    if (current === wantNorm) return false;
    if (current === wantNorm + wantNorm || current === `${wantNorm} ${wantNorm}`) return true;
    return current.includes(wantNorm) && current.length >= wantNorm.length * 1.8;
  }

  // Gõ từng ký tự có nhịp (giống người) thay vì dán nguyên chuỗi 1 phát —
  // giảm tín hiệu bot (không còn "comment xuất hiện tức thì").
  async function pacedInsert(el, want) {
    const chars = [...String(want)];
    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i];
      document.execCommand("insertText", false, ch);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
      let d = 55 + Math.round(Math.random() * 95);
      if (ch === " ") d += 20 + Math.round(Math.random() * 55);
      if (/[.,!?;:]/.test(ch)) d += 90 + Math.round(Math.random() * 160);
      if (i > 6 && Math.random() < 0.06) d += 200 + Math.round(Math.random() * 300); // thỉnh thoảng "khựng lại"
      await sleep(d);
    }
  }

  async function typeIntoEditable(el, text) {
    const want = String(text);
    const wantNorm = want.replace(/\s+/g, " ").trim();
    if (wantNorm && editorText(el) === wantNorm) return;

    await clearEditor(el);
    await pacedInsert(el, want);
    await sleep(120);

    let current = editorText(el);
    const hasWant = wantNorm && current.includes(wantNorm.slice(0, Math.min(20, wantNorm.length)));
    if (!hasWant) {
      await clearEditor(el);
      try {
        const dt = new DataTransfer();
        dt.setData("text/plain", want);
        el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      } catch {
        document.execCommand("insertText", false, want);
      }
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
      await sleep(120);
      current = editorText(el);
    }

    if (looksDuplicated(current, wantNorm)) {
      await clearEditor(el);
      document.execCommand("insertText", false, want);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
      await sleep(80);
    }
  }

  // Gõ bằng bộ gõ THẬT: nhờ background dùng CDP (Input.dispatchKeyEvent/insertText) để
  // event.isTrusted === true — thứ mà bộ gõ tổng hợp (execCommand/dispatchEvent) không làm được,
  // và cũng là dấu hiệu bot dễ bị soi nhất. Nếu CDP không dùng được (DevTools mở, từ chối quyền
  // debugger...) thì tự động rơi về bộ gõ tổng hợp cũ để không kẹt luồng.
  async function trustedTypeYoutube(el, text) {
    const want = String(text);
    const wantNorm = want.replace(/\s+/g, " ").trim();
    if (wantNorm && editorText(el) === wantNorm) return true;

    // Focus sẵn ô bình luận trước khi bàn giao — insertText của CDP chèn vào phần tử đang focus.
    try {
      el.focus();
    } catch {
      // ignore
    }
    await sleep(80);

    try {
      const res = await chrome.runtime.sendMessage({ type: "CDP_TYPE_YOUTUBE", text: want });
      if (res && res.ok) {
        const landed = String(res.editorText || "").replace(/\s+/g, " ").trim();
        const head = wantNorm.slice(0, Math.min(20, wantNorm.length));
        if (!head || landed.includes(head)) return true; // bộ gõ thật đã ăn chữ
      }
    } catch {
      // rơi xuống fallback bên dưới
    }

    // Fallback: bộ gõ tổng hợp cũ (isTrusted=false) — vẫn gõ được chữ, chỉ kém "thật" hơn.
    await typeIntoEditable(el, want);
    return false;
  }

  function pressSubmitKeys(el) {
    if (!el) return;
    el.focus();
    // Chỉ dùng đúng 1 phím tắt theo hệ điều hành (Cmd trên macOS, Ctrl còn lại) —
    // gửi cả metaKey lẫn ctrlKey cùng lúc là hành vi phi thực tế, dễ bị soi.
    const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
    const mod = isMac ? { metaKey: true } : { ctrlKey: true };
    const base = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13, ...mod };
    el.dispatchEvent(new KeyboardEvent("keydown", base));
    el.dispatchEvent(new KeyboardEvent("keyup", base));
  }

  function commentsDisabledReason() {
    const msg = document.querySelector("#comments ytd-message-renderer");
    if (!msg || !isVisible(msg)) return null;
    const text = (msg.innerText || msg.textContent || "").trim();
    if (/tắt|disabled|turned off|off for this video|không cho phép bình luận/i.test(text)) {
      return text.slice(0, 160) || "Video này đã tắt tính năng bình luận.";
    }
    return null;
  }

  function findYoutubeSubmitButton() {
    const root = document.querySelector("ytd-comments#comments") || document;
    const nodes = [...root.querySelectorAll("#submit-button button, #submit-button, button, [role='button']")].filter(isVisible);
    const scored = [];
    const seen = new Set();
    for (const node of nodes) {
      if (seen.has(node)) continue;
      seen.add(node);
      const label = controlLabel(node);
      if (/hủy|cancel|emoji|gif|đính kèm|@/.test(label)) continue;
      let score = 0;
      if (/^(bình luận|comment|nhận xét|reply|trả lời)$/.test(label)) score += 10;
      if (node.closest("#submit-button")) score += 6;
      if (!score) continue;
      if (isDisabled(node)) score -= 5;
      scored.push({ node, score });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0].node;
  }

  function snippetVisibleAsNewComment(snippet) {
    if (!snippet) return false;
    // Không chỉ xét comment đầu tiên: YouTube mặc định sắp theo "Top comments" (nhiều
    // like nhất) chứ không phải "Newest first", nên comment vừa đăng chưa chắc là node
    // ytd-comment-thread-renderer đầu tiên trong #contents. Quét toàn bộ khu vực bình luận.
    const container = document.querySelector("#comments #contents") || document.querySelector("#comments");
    if (!container) return false;
    const text = (container.innerText || "").replace(/\s+/g, " ").trim();
    return text.includes(snippet);
  }

  /**
   * Link thẳng tới bình luận vừa đăng (watch?v=…&lc=<id>), lấy từ link thời gian của thread chứa đoạn
   * chữ vừa gõ. Mở link này bằng tài khoản khác là biết ngay bình luận có hiện công khai không.
   * Rỗng nếu không thấy (giao diện đổi, hoặc thread chưa render).
   */
  function findOwnCommentUrl(snippet) {
    if (!snippet) return "";
    const needle = snippet.slice(0, 32);
    const threads = document.querySelectorAll("#comments ytd-comment-thread-renderer, #comments ytd-comment-view-model, #comments ytd-comment-renderer");
    for (const thread of threads) {
      const body = (thread.querySelector("#content-text")?.innerText || "").replace(/\s+/g, " ");
      if (!body.includes(needle)) continue;
      const link = thread.querySelector("#published-time-text a[href*='lc='], a[href*='&lc='], a[href*='?lc=']");
      if (!link) continue;
      try {
        return new URL(link.getAttribute("href"), location.origin).href;
      } catch {
        return "";
      }
    }
    return "";
  }

  async function postedCommentUrl(snippet) {
    for (let i = 0; i < 8; i += 1) {
      const url = findOwnCommentUrl(snippet);
      if (url) return url;
      await sleep(500);
    }
    return "";
  }

  async function waitUntilYoutubeCommentPosted(snippet, editor) {
    for (let i = 0; i < 20; i += 1) {
      await sleep(400);
      if (snippetVisibleAsNewComment(snippet)) return true;
      // Tín hiệu đáng tin cậy thứ hai: sau khi đăng thành công, YouTube luôn xoá sạch ô
      // nhập bình luận (nếu gửi thất bại, nội dung vừa gõ vẫn còn nguyên để người dùng thử lại).
      const editorEmpty = !editor || !editor.isConnected || !editorText(editor);
      if (editorEmpty && i >= 2) return true;
    }
    return false;
  }

  async function createYoutubeComment(text, postKey) {
    if (!text) throw new Error("Nội dung bình luận YouTube rỗng.");
    const resolvedKey = String(postKey || getVideoId(location.href) || "").toLowerCase();

    showHud("Đang cuộn tới khu vực bình luận...");
    window.scrollBy({ top: 500, behavior: "smooth" });
    await sleep(1200);
    dismissYoutubeConsent();

    let commentsSection = await waitFor(() => document.querySelector("ytd-comments#comments"), 6000);
    if (!commentsSection) {
      window.scrollBy({ top: 500, behavior: "smooth" });
      commentsSection = await waitFor(() => document.querySelector("ytd-comments#comments"), 6000);
    }

    const disabledReason = commentsDisabledReason();
    if (disabledReason) {
      throw new Error(`Video này đã tắt bình luận: ${disabledReason}`);
    }
    if (!commentsSection) {
      throw new Error("Không tìm thấy khu vực bình luận YouTube (trang có thể tải chưa xong).");
    }

    let placeholder = document.querySelector(
      "#placeholder-area, #simplebox-placeholder, ytd-comment-simplebox-renderer #placeholder-area"
    );
    if (!placeholder) {
      commentsSection.scrollIntoView({ block: "center", behavior: "smooth" });
      placeholder = await waitFor(
        () =>
          document.querySelector("#placeholder-area, #simplebox-placeholder, ytd-comment-simplebox-renderer #placeholder-area"),
        5000
      );
    }
    if (placeholder && isVisible(placeholder)) {
      placeholder.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(500);
      clickReact(placeholder);
      await sleep(700);
    }

    const editor = await waitFor(
      () =>
        document.querySelector(
          "#contenteditable-root[contenteditable='true'], ytd-comment-simplebox-renderer #contenteditable-root"
        ),
      5000
    );
    if (!editor) {
      const reason = commentsDisabledReason();
      if (reason) throw new Error(`Video này đã tắt bình luận: ${reason}`);
      throw new Error("Không tìm thấy ô nhập bình luận YouTube.");
    }

    showHud("Đang gõ bình luận...");
    await trustedTypeYoutube(editor, text);
    await sleep(500);

    const snippet = String(text).replace(/\s+/g, " ").trim().slice(0, 48);
    let submitBtn = findYoutubeSubmitButton();
    if (!submitBtn || isDisabled(submitBtn)) {
      submitBtn = await waitFor(() => {
        const btn = findYoutubeSubmitButton();
        return btn && !isDisabled(btn) ? btn : null;
      }, 4000);
    }
    if (!submitBtn) {
      throw new Error("Không tìm thấy nút đăng bình luận YouTube (có thể video đã tắt tính năng bình luận).");
    }
    if (isDisabled(submitBtn)) {
      throw new Error("Nút đăng bình luận YouTube bị vô hiệu hoá — YouTube chưa nhận nội dung vừa gõ.");
    }

    showHud("Đang gửi bình luận...");
    clickReact(submitBtn);

    if (await waitUntilYoutubeCommentPosted(snippet, editor)) {
      markAction("CREATE_YOUTUBE_COMMENT", text, resolvedKey);
      showHud("Đã đăng bình luận thành công!");
      const commentUrl = await postedCommentUrl(snippet);
      await watchBeforeLeaving();
      return { ok: true, postKey: resolvedKey, text, commentUrl };
    }

    const stillHasText = editor && editor.isConnected && editorText(editor).includes(snippet.slice(0, 20));
    const alreadyPosted = snippetVisibleAsNewComment(snippet);
    const canRetry = submitBtn && submitBtn.isConnected && !isDisabled(submitBtn) && stillHasText && !alreadyPosted;
    if (canRetry) {
      showHud("Chưa xác nhận được, đang thử gửi lại...");
      clickReact(submitBtn);
      await sleep(400);
      pressSubmitKeys(editor);
      if (await waitUntilYoutubeCommentPosted(snippet, editor)) {
        markAction("CREATE_YOUTUBE_COMMENT", text, resolvedKey);
        showHud("Đã đăng bình luận thành công!");
        const commentUrl = await postedCommentUrl(snippet);
        await watchBeforeLeaving();
        return { ok: true, postKey: String(resolvedKey || "").toLowerCase(), text, commentUrl };
      }
    }

    throw new Error("Đã gõ bình luận nhưng không xác nhận được là đã đăng thành công lên YouTube.");
  }

  // ---------------- scroll feed ----------------

  async function scrollYoutubeFeed({ rounds = 6, autoLike = true, likeDelay = 5 } = {}) {
    let scrolled = 0;
    let likedCount = 0;
    const isShorts = location.pathname.startsWith("/shorts");
    let stuckRounds = 0;
    let lastMarker = location.pathname;

    for (let i = 0; i < rounds; i++) {
      showHud(`Đang lướt video... (${i + 1}/${rounds})`);
      if (isShorts) {
        window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true }));
      } else {
        const delta = 400 + Math.floor(Math.random() * 300);
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
      scrolled++;
      await sleep(2000 + Math.floor(Math.random() * 1500));

      if (isShorts) {
        if (location.pathname === lastMarker) {
          stuckRounds += 1;
          if (stuckRounds >= 3) break;
        } else {
          stuckRounds = 0;
          lastMarker = location.pathname;
        }
      }

      if (autoLike && Math.random() < 0.7) {
        const likeBtn = document.querySelector(
          "#segmented-like-button button[aria-pressed='false'], like-button-view-model button[aria-pressed='false'], ytd-like-button-renderer button[aria-pressed='false']"
        );
        if (likeBtn && isVisible(likeBtn)) {
          showHud("Đang thả like video...");
          await sleep(likeDelay * 1000);
          clickReact(likeBtn);
          await sleep(600);
          if (likeBtn.getAttribute("aria-pressed") === "true") {
            likedCount++;
          } else {
            const refreshed = document.querySelector(
              "#segmented-like-button button[aria-pressed='true'], like-button-view-model button[aria-pressed='true'], ytd-like-button-renderer button[aria-pressed='true']"
            );
            if (refreshed) likedCount++;
          }
        }
      }
    }

    hideHud();
    const videosSeen = document.querySelectorAll("ytd-rich-item-renderer, ytd-video-renderer, ytd-reel-video-renderer").length;
    return { ok: true, scrolled, videosSeen, likedCount };
  }

  // ---------------- subscribe ----------------

  function findYoutubeSubscribeButton() {
    const nodes = [
      ...document.querySelectorAll(
        "#subscribe-button button, ytd-subscribe-button-renderer button, yt-subscribe-button-view-model button, #subscribe-button, ytd-subscribe-button-renderer"
      ),
    ].filter(isVisible);
    const scored = [];
    const seen = new Set();
    for (const node of nodes) {
      if (seen.has(node)) continue;
      seen.add(node);
      const label = controlLabel(node);
      if (!/đăng ký|subscribe/.test(label)) continue;
      let score = 4;
      if (node.closest("#subscribe-button")) score += 2;
      scored.push({ node, score });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0].node;
  }

  function isSubscribedLabel(label) {
    return (
      /hủy đăng ký|unsubscribe/.test(label) ||
      /đã đăng ký/.test(label) ||
      /^subscribed$/.test(label)
    );
  }

  async function subscribeYoutubeChannel() {
    showHud("Đang tìm nút Subscribe...");
    await sleep(1000);
    const subBtn = await waitFor(findYoutubeSubscribeButton, 6000);
    if (!subBtn) {
      throw new Error("Không tìm thấy nút Đăng ký (Subscribe) trên kênh YouTube này.");
    }

    const label = controlLabel(subBtn);
    if (isSubscribedLabel(label)) {
      hideHud();
      return { ok: true, skipped: true, alreadySubscribed: true };
    }

    showHud("Đang bấm Subscribe...");
    subBtn.scrollIntoView({ block: "center", behavior: "smooth" });
    await sleep(500);
    clickReact(subBtn);
    await sleep(1200);
    dismissYoutubeConsent(); // đóng popup xin quyền thông báo xuất hiện ngay sau khi subscribe

    const confirmed = await waitFor(() => {
      const btn = findYoutubeSubscribeButton();
      return btn && isSubscribedLabel(controlLabel(btn)) ? btn : null;
    }, 4000);
    if (!confirmed) {
      throw new Error("Đã bấm Subscribe nhưng không xác nhận được trạng thái đã đăng ký.");
    }

    showHud("Đã Subscribe thành công!");
    return { ok: true, subscribed: true };
  }
})();
