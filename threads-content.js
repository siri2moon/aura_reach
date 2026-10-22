(() => {
  if (window.__threadsAutoInjected) return;
  window.__threadsAutoInjected = true;

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "SET_THREADS_HUD",
    "EXTRACT_THREADS_CONTEXT",
    "EXTRACT_THREADS_FEED_BATCH",
    "CREATE_THREADS_COMMENT",
    "SCROLL_THREADS_FEED",
    "FOLLOW_THREADS_USER",
    "CREATE_THREADS_POST",
    "EXTRACT_THREADS_REPLY_TARGET",
    "REPLY_THREADS_COMMENT",
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
      return { ok: true, href: location.href, state, platform: "threads" };
    }
    if (message?.type === "SET_THREADS_HUD") {
      showHud(String(message.text || ""));
      return { ok: true };
    }
    if (state !== "ok") throw new Error(stateError(state));

    if (message?.type === "EXTRACT_THREADS_CONTEXT") {
      return extractFeedContext(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }

    if (message?.type === "EXTRACT_THREADS_FEED_BATCH") {
      const skipKeys = Array.isArray(message.skipKeys) ? message.skipKeys : [];
      const items = await collectThreadsFeedBatch(skipKeys, message.limit);
      return { ok: true, items };
    }

    if (message?.type === "CREATE_THREADS_COMMENT") {
      const text = String(message.text || "");
      const skipKeys = Array.isArray(message.skipKeys) ? message.skipKeys : [];
      const pageKey = postKeyFromUrl(location.href);
      if (pageKey && skipSetFrom(skipKeys).has(pageKey)) {
        rememberPageKeys([pageKey]);
        return { ok: true, skipped: true, alreadyCommented: true, postKey: pageKey };
      }
      if (actionLock) {
        return { ok: false, busy: true, error: "Đang có thao tác Threads khác đang xử lý." };
      }
      if (wasRecentAction("CREATE_THREADS_COMMENT", text, pageKey || message.postKey)) {
        return { ok: true, skipped: true, alreadyCommented: true, postKey: pageKey || message.postKey || "" };
      }
      actionLock = true;
      try {
        return await createComment(text, message.postKey, skipKeys);
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "SCROLL_THREADS_FEED") {
      if (actionLock) return { ok: false, busy: true, error: "Đang có thao tác Threads khác đang xử lý." };
      actionLock = true;
      try {
        return await scrollFeed({
          rounds: Number(message.rounds) || 0,
          autoLike: Boolean(message.autoLike),
          likeDelay: Number(message.likeDelay) || 5,
          likeIntervalMin: Number(message.likeIntervalMin) || 100,
          likeIntervalMax: Number(message.likeIntervalMax) || 200,
          autoFollow: Boolean(message.autoFollow),
          followLimit: Number(message.followLimit) || 2,
          followIntervalMin: Number(message.followIntervalMin) || 100,
          followIntervalMax: Number(message.followIntervalMax) || 200,
        });
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "FOLLOW_THREADS_USER") {
      if (actionLock) return { ok: false, busy: true, error: "Đang có thao tác Threads khác đang xử lý." };
      actionLock = true;
      try {
        return await followCurrentProfile();
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "CREATE_THREADS_POST") {
      const text = String(message.text || "");
      if (actionLock) {
        return { ok: false, busy: true, error: "Đang có thao tác Threads khác đang xử lý." };
      }
      if (wasRecentAction("CREATE_THREADS_POST", text, "")) {
        return { ok: true, skipped: true, reason: "duplicate" };
      }
      actionLock = true;
      try {
        return await createPost(text);
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "EXTRACT_THREADS_REPLY_TARGET") {
      return await extractReplyTarget(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }

    if (message?.type === "REPLY_THREADS_COMMENT") {
      const text = String(message.text || "");
      const replyKey = String(message.replyKey || "");
      if (actionLock) {
        return { ok: false, busy: true, error: "Đang có thao tác Threads khác đang xử lý." };
      }
      if (wasRecentAction("REPLY_THREADS_COMMENT", text, replyKey)) {
        return { ok: true, skipped: true, alreadyReplied: true, replyKey };
      }
      actionLock = true;
      try {
        return await replyToComment(text, replyKey);
      } finally {
        actionLock = false;
      }
    }

    return { ok: false, error: `Threads không xử lý lệnh ${message?.type || "?"}.` };
  }

  function actionKey(type, text) {
    return `${type}:${String(text).slice(0, 240)}`;
  }

  function wasRecentAction(type, text, postKey) {
    try {
      const raw = sessionStorage.getItem("threadsAutoLastAction");
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
        "threadsAutoLastAction",
        JSON.stringify({ key: actionKey(type, text), postKey: postKey || "", t: Date.now() })
      );
      if (postKey) rememberPageKeys([postKey]);
    } catch {
      // ignore
    }
  }

  function rememberedPageKeys() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem("threadsAutoCommentedKeys") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function rememberPageKeys(keys) {
    try {
      const next = uniqueKeys([...(rememberedPageKeys() || []), ...(keys || [])]).slice(0, 250);
      sessionStorage.setItem("threadsAutoCommentedKeys", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function skipSetFrom(skipKeys) {
    return new Set([...(skipKeys || []), ...rememberedPageKeys()].filter(Boolean));
  }

  function uniqueKeys(keys) {
    const out = [];
    const seen = new Set();
    for (const key of keys || []) {
      const k = String(key || "").trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }

  function textFingerprint(text) {
    const n = normExtract(text);
    if (n.length < 12) return "";
    return `t:${n.slice(0, 120)}`;
  }

  function aliasesFor(key, text) {
    const n = normExtract(text);
    return uniqueKeys([key, textFingerprint(text), n.length >= 12 ? n.slice(0, 80) : ""]);
  }

  function isSkipped(aliases, skipSet) {
    return (aliases || []).some((key) => skipSet.has(key));
  }

  function pageState() {
    const url = location.href;
    if (/\/checkpoint\//i.test(url)) return "checkpoint";
    if (/\/login(?:\/|\?|$)/i.test(location.pathname) || /instagram\.com\/accounts\/login/i.test(url)) {
      return "login";
    }
    const text = document.body ? document.body.innerText.slice(0, 4000) : "";
    const hasPassword = Boolean(document.querySelector('input[name="pass"], input[type="password"]'));
    if (
      hasPassword &&
      /log in to threads|đăng nhập threads|log in with instagram|đăng nhập bằng instagram|log in/i.test(text)
    ) {
      return "login";
    }
    const loginLink = document.querySelector('a[href="/login"], a[href*="/login"]');
    const posts = document.querySelectorAll('[data-pressable-container="true"], a[href*="/post/"]').length;
    if (loginLink && posts < 1 && /log in|đăng nhập/i.test(text.slice(0, 1500))) return "login";
    if (/temporarily blocked|account has been disabled|tài khoản của bạn đã bị vô hiệu|bạn tạm thời bị chặn/i.test(text)) {
      return "blocked";
    }
    return "ok";
  }

  function stateError(state) {
    if (state === "login") return "Chưa đăng nhập Threads. Mở threads.com, đăng nhập bằng Instagram, rồi thử lại.";
    if (state === "checkpoint") return "Threads/Instagram đang yêu cầu xác minh bảo mật.";
    if (state === "blocked") return "Tài khoản đang bị hạn chế.";
    return "Trang Threads không sẵn sàng.";
  }

  async function ensureThreadsPageReady() {
    await waitFor(() => document.body, 8000);
    await sleep(700 + Math.round(Math.random() * 800));
    dismissPopups();
    await waitFor(
      () =>
        document.querySelector(
          '[data-pressable-container="true"], a[href*="/post/"], a[href*="/t/"], [role="article"]'
        ),
      14000
    );
  }

  // Chỉ còn dùng khi tab đã ở đúng trang chi tiết 1 bài cụ thể (feed batch/tab
  // tương tác điều hướng thẳng vào post.url trước khi gọi message này).
  async function extractFeedContext(skipKeys) {
    showHud("Đang đọc bài Threads...");
    try {
      await ensureThreadsPageReady();
      const skipSet = skipSetFrom(skipKeys);

      if (!isPostPage()) {
        throw new Error("Không ở trang chi tiết bài Threads.");
      }

      clickSeeMoreIn(document.body);
      await sleep(300);
      const pageKey = postKeyFromUrl(location.href);
      const posts = collectPosts(new Set());
      const main =
        (pageKey && posts.find((item) => item.key === pageKey)) || posts[0] || collectMainPost();
      const postKey = pageKey || main?.key || "";
      const postText = main?.text || extractPostText(main?.card || document.body);
      const aliases = uniqueKeys([...(main?.aliases || []), ...aliasesFor(postKey, postText)]);
      if (postKey && isSkipped(aliases, skipSet)) {
        rememberPageKeys(aliases);
        return {
          ok: false,
          alreadyCommented: true,
          postKey,
          postKeys: aliases,
          error: "Bài này đã bình luận rồi, sẽ thử bài khác lần sau.",
        };
      }
      const comments = extractReplyTexts(
        posts.filter((item) => item.key && item.key !== postKey)
      ).filter((item) => item && normExtract(item) !== normExtract(postText));
      if (!postText && !comments.length) {
        throw new Error("Bài Threads không có chữ để bình luận.");
      }
      return packContext(postKey, postText, comments, aliases, extractMediaFrom(main?.card || document.body));
    } finally {
      hideHud();
    }
  }

  function collectMainPost() {
    const key = postKeyFromUrl(location.href);
    const card =
      document.querySelector('[data-pressable-container="true"]') ||
      document.querySelector('[role="article"]') ||
      document.querySelector('[role="main"]');
    const text = extractPostText(card || document.body);
    return {
      key,
      aliases: aliasesFor(key, text),
      url: location.href.split("?")[0],
      text,
      comments: [],
      card,
    };
  }

  // Cuộn mượt bằng nhiều bước nhỏ + behavior:"smooth" (giống lăn chuột/vuốt
  // trackpad thật), thay vì nhảy toạ độ ngay lập tức gây giật giao diện. Cuộn
  // cả window/document.scrollingElement lẫn [role="main"] vì tuỳ layout mà
  // container thực sự cuộn có thể khác nhau.
  async function humanScrollBy(totalStep) {
    const main = document.querySelector('[role="main"]');
    const scroller = document.scrollingElement;
    const subSteps = 3 + Math.floor(Math.random() * 3);
    let remaining = totalStep;
    const sign = totalStep < 0 ? -1 : 1;
    for (let i = 0; i < subSteps && Math.abs(remaining) > 4; i += 1) {
      const left = subSteps - i;
      const portion = i === subSteps - 1 ? remaining : Math.round((remaining / left) * (0.7 + Math.random() * 0.6));
      const amount = sign > 0 ? Math.min(remaining, Math.max(20, portion)) : Math.max(remaining, Math.min(-20, portion));
      if (main) main.scrollBy({ top: amount, left: 0, behavior: "smooth" });
      window.scrollBy({ top: amount, left: 0, behavior: "smooth" });
      if (scroller && scroller !== main) scroller.scrollBy({ top: amount, left: 0, behavior: "smooth" });
      remaining -= amount;
      await sleep(90 + Math.round(Math.random() * 140));
    }
    await sleep(250 + Math.round(Math.random() * 200));
    return main;
  }

  // Cuộn tới khi đủ `limit` bài mới hoặc thật sự chạm đáy trang (vị trí cuộn
  // không nhích thêm sau vài lần thử liên tiếp — feed hết bài để tải thêm),
  // thay vì dừng ở một số vòng cố định trong khi trang vẫn còn load được.
  async function scrollFeedUntil(skipSet, limit) {
    dismissPopups();
    let stuckRounds = 0;
    const maxRounds = 20;
    for (let i = 0; i < maxRounds; i += 1) {
      const main = document.querySelector('[role="main"]');
      const prevScrollY = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
      const prevMainY = main ? main.scrollTop : 0;

      const step = Math.round((window.innerHeight || 700) * (0.65 + Math.random() * 0.45));
      await humanScrollBy(step);
      dismissPopups();

      if (collectPosts(skipSet).length >= limit) break;

      const newScrollY = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
      const newMainY = main ? main.scrollTop : 0;
      if (Math.abs(newScrollY - prevScrollY) < 5 && Math.abs(newMainY - prevMainY) < 5) {
        stuckRounds += 1;
        if (stuckRounds >= 3) break;
      } else {
        stuckRounds = 0;
      }
    }
  }

  // Đọc trực tiếp text + media của các bài đang hiển thị trên feed (đã lọc
  // trùng qua skipKeys), tối đa `limit` bài. Chỉ cuộn thêm khi chưa đủ số
  // lượng cần — không cuộn trước khi thực sự cần.
  async function collectThreadsFeedBatch(skipKeys, limit) {
    showHud("Đang đọc bảng tin Threads...");
    try {
      await ensureThreadsPageReady();
      const skipSet = skipSetFrom(skipKeys);
      const max = Math.max(1, Number(limit) || 5);

      if (isPostPage()) {
        const main = collectMainPost();
        if (!main.key || isSkipped(main.aliases, skipSet)) return [];
        return [
          {
            key: main.key,
            aliases: main.aliases,
            url: main.url,
            text: main.text,
            media: extractMediaFrom(main.card),
          },
        ];
      }

      let posts = collectPosts(skipSet);
      if (posts.length < max) {
        await scrollFeedUntil(skipSet, max);
        posts = collectPosts(skipSet);
      }
      return posts.slice(0, max).map((item) => ({
        key: item.key,
        aliases: item.aliases,
        url: item.url,
        text: item.text,
        media: extractMediaFrom(item.card),
      }));
    } finally {
      hideHud();
    }
  }

  function collectPosts(skipKeys) {
    const skipSet = skipKeys instanceof Set ? skipKeys : skipSetFrom(skipKeys);
    const found = [];
    const seen = new Set();
    const roots = new Set();

    for (const el of document.querySelectorAll(
      '[data-pressable-container="true"], [role="article"], a[href*="/post/"], a[href*="/t/"]'
    )) {
      const card =
        el.closest("[data-pressable-container='true']") ||
        el.closest("[role='article']") ||
        (el.matches("[data-pressable-container='true'], [role='article']") ? el : null);
      if (card && isVisible(card)) roots.add(card);
    }

    const rootList = [...roots];
    for (const card of rootList) {
      if (rootList.some((other) => other !== card && other.contains(card))) continue;
      const blob = (card.innerText || "").slice(0, 240).toLowerCase();
      if (/^sponsored\b|được tài trợ|\bad\b|quảng cáo/.test(blob)) continue;
      if (!isPostPage() && /\breplied to\b|\breplying to\b|đã trả lời/.test(blob)) continue;
      const permalink = findPermalinkIn(card) || (isPostPage() ? location.href.split("?")[0] : "");
      const key = postKeyFromUrl(permalink);
      if (!key) continue;
      const text = extractPostText(card);
      const aliases = aliasesFor(key, text);
      if (seen.has(key) || isSkipped(aliases, skipSet)) continue;
      seen.add(key);
      found.push({
        key,
        aliases,
        url: permalink,
        text,
        comments: extractReplyTextsFromCard(card),
        card,
      });
    }

    if (!found.length) {
      for (const link of document.querySelectorAll('a[href*="/post/"], a[href*="/t/"]')) {
        const href = link.getAttribute("href") || "";
        let url;
        try {
          url = new URL(href, location.origin);
        } catch {
          continue;
        }
        if (!isThreadsHost(url.hostname)) continue;
        const key = postKeyFromUrl(url.href);
        if (!key || seen.has(key) || skipSet.has(key)) continue;
        seen.add(key);
        found.push({
          key,
          aliases: [key],
          url: url.href.split("#")[0].split("?")[0],
          text: "",
          comments: [],
          card: null,
        });
      }
    }
    return found;
  }

  function findPermalinkIn(root) {
    if (!root) return "";
    for (const link of root.querySelectorAll('a[href*="/post/"], a[href*="/t/"]')) {
      const href = link.getAttribute("href") || "";
      try {
        const url = new URL(href, location.origin);
        if (isThreadsHost(url.hostname) && postKeyFromUrl(url.href)) {
          return url.href.split("#")[0].split("?")[0];
        }
      } catch {
        continue;
      }
    }
    return "";
  }

  function extractPostText(root) {
    if (!root) return "";
    clickSeeMoreIn(root);
    const testid = root.querySelector('[data-testid="post-text"]');
    const fromTest = usefulText(testid && testid.innerText);
    if (fromTest) return fromTest;
    const nodes = [...root.querySelectorAll('div[dir="auto"], span[dir="auto"]')];
    const leaves = nodes.filter((el) => !el.querySelector("div[dir='auto'], span[dir='auto']"));
    const parts = [];
    for (const el of leaves.length ? leaves : nodes) {
      const text = usefulText(el.innerText);
      if (!text) continue;
      if (parts.some((item) => item.includes(text) || text.includes(item))) continue;
      parts.push(text);
      if (parts.join(" ").length > 900) break;
    }
    return parts.join("\n");
  }

  const MAX_MEDIA_ITEMS = 6;
  const MAX_MEDIA_ALT_LENGTH = 300;

  // Ảnh/video thật của bài luôn nằm trong <picture><img> hoặc <video>; avatar và
  // poster của video là <img> trần (ko bọc <picture>) nên tự động bị loại, ko cần
  // dò theo nội dung chữ của alt (alt có thể khác ngôn ngữ tuỳ tài khoản).
  function extractMediaFrom(root) {
    if (!root) return [];
    const media = [];
    const seen = new Set();

    for (const video of root.querySelectorAll("video")) {
      const src = video.currentSrc || video.getAttribute("src") || "";
      const key = src || `video:${media.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      media.push({ type: "video", alt: "" });
      if (media.length >= MAX_MEDIA_ITEMS) return media;
    }

    for (const img of root.querySelectorAll("picture img")) {
      const src = img.currentSrc || img.getAttribute("src") || "";
      const key = src || `img:${media.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const alt = (img.getAttribute("alt") || "").trim().slice(0, MAX_MEDIA_ALT_LENGTH);
      media.push({ type: "image", alt });
      if (media.length >= MAX_MEDIA_ITEMS) return media;
    }

    return media;
  }

  function normExtract(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function extractReplyTexts(posts) {
    return posts.map((item) => item.text).filter((text) => text && text.length >= 8).slice(0, 8);
  }

  function extractReplyTextsFromCard(card) {
    if (!card) return [];
    const texts = [];
    for (const el of card.querySelectorAll('div[dir="auto"], span[dir="auto"]')) {
      const text = usefulText(el.innerText);
      if (text && text.length >= 12 && !texts.includes(text)) texts.push(text);
      if (texts.length >= 6) break;
    }
    return texts.slice(1);
  }

  function findLikeButton(card) {
    if (!card) return null;
    const candidates = card.querySelectorAll("button, [role='button'], [tabindex='0']");
    for (const btn of candidates) {
      if (!isVisible(btn) || isDisabled(btn)) continue;
      const label = controlLabel(btn);
      if (!label) continue;
      if (/unlike|bỏ thích|đã thích|loved/.test(label)) continue;
      if (/repost|share|chia sẻ|reply|trả lời|comment|bình luận|more|thêm|send|gửi/.test(label)) continue;
      if (/^(like|thích|love)$/i.test(label) || /\b(thích|like)\b/i.test(label)) {
        return btn;
      }
    }
    for (const svg of card.querySelectorAll("svg[aria-label]")) {
      const aria = (svg.getAttribute("aria-label") || "").toLowerCase();
      if ((aria === "like" || aria === "thích") && !/unlike|bỏ thích/.test(aria)) {
        const btn = svg.closest("button, [role='button'], [tabindex='0']");
        if (btn && isVisible(btn)) return btn;
      }
    }
    return null;
  }

  function isCardInReadingView(card) {
    if (!card) return false;
    const rect = card.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 700;
    return rect.top < vh * 0.75 && rect.bottom > vh * 0.25;
  }

  async function scrollFeed(opts = {}) {
    const rounds = typeof opts === "number" ? opts : opts.rounds;
    const autoLike = typeof opts === "object" ? Boolean(opts.autoLike) : false;
    const likeDelay = typeof opts === "object" ? Math.min(30, Math.max(2, Number(opts.likeDelay) || 5)) : 5;
    const likeIntervalMin = typeof opts === "object" ? Math.max(5, Number(opts.likeIntervalMin) || 100) : 100;
    const likeIntervalMax = typeof opts === "object" ? Math.max(likeIntervalMin, Number(opts.likeIntervalMax) || 200) : 200;
    const autoFollow = typeof opts === "object" ? Boolean(opts.autoFollow) : false;
    const followLimit = typeof opts === "object" ? Math.min(10, Math.max(1, Number(opts.followLimit) || 2)) : 2;
    const followIntervalMin = typeof opts === "object" ? Math.max(10, Number(opts.followIntervalMin) || 100) : 100;
    const followIntervalMax = typeof opts === "object" ? Math.max(followIntervalMin, Number(opts.followIntervalMax) || 200) : 200;
    const total = Math.min(30, Math.max(3, rounds || 10));

    function randomRange(min, max) {
      return Math.round(min + Math.random() * (max - min));
    }

    showHud("Đang lướt bảng tin Threads...");
    let likedCount = 0;
    let followedCount = 0;
    let lastLikeTime = 0;
    let nextLikeWaitSec = 0;
    let lastFollowTime = 0;
    let nextFollowWaitSec = 0;
    let autoLikeState = autoLike;
    let autoFollowState = autoFollow;
    let stuckScrollRounds = 0;
    const actedPostKeys = new Set();
    const followedAuthorEls = new Set();

    try {
      dismissPopups();
      let seen = 0;
      for (let i = 0; i < total; i += 1) {
        const posts = collectPosts([]);
        seen = Math.max(seen, posts.length);

        // Tìm bài viết đang ở vị trí trung tâm màn hình đọc
        const candidates = posts.filter(
          (p) => p.card && !actedPostKeys.has(p.key) && isCardInReadingView(p.card)
        );

        if (candidates.length > 0) {
          // Chỉ chọn đúng 1 bài viết ở vị trí đọc tốt nhất trong lượt này
          const target = candidates[0];
          actedPostKeys.add(target.key);

          // 1. Tự động thả tim bài viết (mô phỏng người thật dừng lại đọc trước khi thả tim)
          const now = Date.now();
          const canLikeByInterval = lastLikeTime === 0 || now - lastLikeTime >= nextLikeWaitSec * 1000;
          if (autoLikeState && canLikeByInterval) {
            const likeBtn = findLikeButton(target.card);
            if (likeBtn) {
              // Tỉ lệ thả tim tự nhiên (~70%), không like máy móc 100%
              if (Math.random() < 0.7) {
                try {
                  const readSec = likeDelay * 0.8 + Math.random() * likeDelay * 0.4;
                  showHud(`Đang dừng xem bài viết (${readSec.toFixed(1)}s) · lướt ${i + 1}/${total}`);
                  await sleep(Math.round(readSec * 1000));

                  const currentLikeBtn = findLikeButton(target.card) || likeBtn;
                  if (currentLikeBtn && isVisible(currentLikeBtn)) {
                    currentLikeBtn.scrollIntoView({ behavior: "smooth", block: "center" });
                    await sleep(350 + Math.round(Math.random() * 350));
                    currentLikeBtn.click();
                    likedCount += 1;
                    lastLikeTime = Date.now();
                    nextLikeWaitSec = randomRange(likeIntervalMin, likeIntervalMax);
                    showHud(`Đã thả tim (${likedCount}) · hẹn tim tiếp sau ~${nextLikeWaitSec}s · lướt ${i + 1}/${total}`);
                    await sleep(1500 + Math.round(Math.random() * 1500));
                    const actErr = findThreadsActionError();
                    if (actErr) {
                      showHud(`Threads giới hạn hành động: ${actErr.slice(0, 30)}... Dừng like/follow.`);
                      autoLikeState = false;
                      autoFollowState = false;
                    }
                  }
                } catch (e) {
                  // ignore
                }
              } else {
                // Nếu không like thì dừng mắt đọc lướt một nhịp
                await sleep(800 + Math.round(Math.random() * 1000));
              }
            }
          }

          // 2. Tự động Follow tác giả bài viết
          const canFollowByInterval = lastFollowTime === 0 || Date.now() - lastFollowTime >= nextFollowWaitSec * 1000;
          if (autoFollowState && followedCount < followLimit && canFollowByInterval) {
            const followRes = findFollowButton(target.card);
            if (followRes?.el && !followRes.done && !followedAuthorEls.has(followRes.el)) {
              followedAuthorEls.add(followRes.el);
              try {
                showHud(`Đang dừng xem tác giả trước khi theo dõi... · lướt ${i + 1}/${total}`);
                await sleep(1500 + Math.round(Math.random() * 1200));

                followRes.el.scrollIntoView({ behavior: "smooth", block: "center" });
                await sleep(400 + Math.round(Math.random() * 400));

                // Ghi nhớ các dialog đã có từ trước
                const prevDialogs = new Set();
                for (const d of document.querySelectorAll('[role="dialog"], [aria-modal="true"]')) {
                  if (isVisible(d)) prevDialogs.add(d);
                }

                // Click nút trên bài viết để kích hoạt hành động follow / mở popup
                showHud("Đang mở thông tin tác giả...");
                clickReact(followRes.el);
                await sleep(800 + Math.round(Math.random() * 600));

                // Chờ popup / dialog xuất hiện
                let dialog = null;
                const startWait = Date.now();
                while (Date.now() - startWait < 3500) {
                  const d = findOpenPopupDialog();
                  if (d && (!prevDialogs.has(d) || isVisible(d))) {
                    dialog = d;
                    break;
                  }
                  await sleep(200);
                }

                if (dialog && isVisible(dialog)) {
                  showHud("Đã mở popup tác giả, đang tìm nút Theo dõi trong popup...");
                  await sleep(700 + Math.round(Math.random() * 500));

                  // Tìm nút Follow bên trong popup
                  const popupFollow = findFollowButtonInDialog(dialog) || findFollowButton(dialog);
                  if (popupFollow?.el) {
                    if (popupFollow.done) {
                      showHud("Tác giả này đã được theo dõi trước đó.");
                      await sleep(600);
                    } else {
                      showHud("Đang bấm nút Theo dõi trong popup...");
                      popupFollow.el.scrollIntoView({ behavior: "smooth", block: "center" });
                      await sleep(400 + Math.round(Math.random() * 300));
                      clickReact(popupFollow.el);
                      followedCount += 1;
                      lastFollowTime = Date.now();
                      nextFollowWaitSec = randomRange(followIntervalMin, followIntervalMax);
                      showHud(`Đã follow tác giả (${followedCount}/${followLimit}) · hẹn follow tiếp sau ~${nextFollowWaitSec}s · lướt ${i + 1}/${total}`);
                      // Đợi hệ thống cập nhật trạng thái follow
                      await sleep(1200 + Math.round(Math.random() * 800));
                      const actErr = findThreadsActionError();
                      if (actErr) {
                        showHud(`Threads giới hạn hành động: ${actErr.slice(0, 30)}... Dừng like/follow.`);
                        autoLikeState = false;
                        autoFollowState = false;
                      }
                    }
                  } else {
                    showHud("Không tìm thấy nút Follow trong popup.");
                    await sleep(600);
                  }

                  // Thoát popup trước khi tiếp tục lướt feed
                  showHud("Đang đóng popup để tiếp tục lướt...");
                  await closePopupDialog(dialog);
                  await sleep(400);

                  // Kiểm tra và dọn dẹp nếu popup chưa đóng hẳn
                  const leftover = findOpenPopupDialog();
                  if (leftover && isVisible(leftover)) {
                    await closePopupDialog(leftover);
                    await sleep(300);
                  }

                  showHud(`Đã theo dõi tác giả · tiếp tục lướt feed ${i + 1}/${total}`);
                  await sleep(600 + Math.round(Math.random() * 500));
                } else {
                  // Follow trực tiếp không qua popup
                  followedCount += 1;
                  lastFollowTime = Date.now();
                  nextFollowWaitSec = randomRange(followIntervalMin, followIntervalMax);
                  showHud(`Đã follow tác giả (${followedCount}/${followLimit}) · hẹn follow tiếp sau ~${nextFollowWaitSec}s · lướt ${i + 1}/${total}`);
                  await sleep(1000 + Math.round(Math.random() * 800));
                  const actErr = findThreadsActionError();
                  if (actErr) {
                    showHud(`Threads giới hạn hành động: ${actErr.slice(0, 30)}... Dừng like/follow.`);
                    autoLikeState = false;
                    autoFollowState = false;
                  }
                }
              } catch (e) {
                try {
                  const d = findOpenPopupDialog();
                  if (d) await closePopupDialog(d);
                } catch {}
                dismissPopups();
              }
            }
          }
        }

        // Đánh dấu các bài đã trôi qua khỏi tầm nhìn lên phía trên
        for (const p of posts) {
          if (!p.card) continue;
          const rect = p.card.getBoundingClientRect();
          if (rect.bottom < 0) {
            actedPostKeys.add(p.key);
          }
        }

        // Cuộn tiếp xuống phần dưới
        const prevScrollY = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
        const mainBefore = document.querySelector('[role="main"]');
        const prevMainY = mainBefore ? mainBefore.scrollTop : 0;
        const step = Math.round((window.innerHeight || 700) * (0.65 + Math.random() * 0.45));
        await humanScrollBy(step);
        await sleep(1200 + Math.round(Math.random() * 1800));

        const newScrollY = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
        const newMainY = mainBefore ? mainBefore.scrollTop : 0;
        if (Math.abs(newScrollY - prevScrollY) < 5 && Math.abs(newMainY - prevMainY) < 5) {
          stuckScrollRounds += 1;
          if (stuckScrollRounds >= 3) {
            showHud("Bảng tin không tải thêm bài viết mới, kết thúc phiên lướt.");
            break;
          }
        } else {
          stuckScrollRounds = 0;
        }

        // Xác suất nhỏ cuộn nhẹ ngược lên lại như người thật
        if (Math.random() < 0.2) {
          await humanScrollBy(-Math.round(step * 0.25));
          await sleep(600 + Math.round(Math.random() * 800));
        }

        dismissPopups();
        showHud(`Đang lướt Threads ${i + 1}/${total} · thấy ${seen} bài (tim: ${likedCount}, follow: ${followedCount})`);
      }
      return { ok: true, scrolled: total, postsSeen: seen, likedCount, followedCount };
    } finally {
      hideHud();
    }
  }

  function isNavigationElement(el) {
    if (!el) return false;
    if (el.closest("nav, [role='navigation'], header, [role='banner']")) return true;
    const rect = el.getBoundingClientRect();
    if (rect.top <= 5 && rect.width >= window.innerWidth * 0.8 && rect.height <= 80) return true;
    if (rect.left <= 5 && rect.height >= window.innerHeight * 0.8 && rect.width <= 120) return true;
    return false;
  }

  function findOpenPopupDialog() {
    for (const d of document.querySelectorAll('[role="dialog"], [aria-modal="true"]')) {
      if (isVisible(d) && !isNavigationElement(d)) return d;
    }
    for (const d of document.querySelectorAll('[role="alertdialog"]')) {
      if (isVisible(d) && !isNavigationElement(d)) return d;
    }
    for (const el of document.querySelectorAll('div[style*="position: fixed"], div[style*="z-index"]')) {
      if (!isVisible(el) || isNavigationElement(el)) continue;
      if (el.id === "threads-auto-hud" || el.closest("#threads-auto-hud")) continue;
      try {
        const style = window.getComputedStyle(el);
        const z = parseInt(style.zIndex || "0", 10);
        if (z >= 10 && (style.position === "fixed" || style.position === "absolute")) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 120 && rect.height > 80 && (rect.width < window.innerWidth * 0.95 || rect.height < window.innerHeight * 0.95)) {
            if (el.querySelector("button, [role='button'], [data-pressable-container='true']")) {
              return el;
            }
          }
        }
      } catch {}
    }
    return null;
  }

  function findFollowButtonInDialog(dialog) {
    if (!dialog) return null;
    const scored = [];
    for (const el of dialog.querySelectorAll("button, [role='button'], [tabindex='0'], [data-pressable-container='true']")) {
      if (!isVisible(el) || isDisabled(el)) continue;
      const label = controlLabel(el);
      if (!label) continue;
      if (/close|đóng|cancel|hủy|dismiss|not now|để sau|more|thêm|report|báo cáo|share|chia sẻ|copy|sao chép/.test(label)) continue;
      if (/following|đang theo dõi|unfollow|bỏ theo dõi|requested|đã yêu cầu/.test(label)) {
        return { done: true, el };
      }
      let score = 0;
      if (/^(follow|theo dõi)$/.test(label)) score += 20;
      else if (/^(follow back|theo dõi lại)$/.test(label)) score += 18;
      else if (/^(follow|theo dõi)\s+@?[a-z0-9_.-]+/i.test(label)) score += 16;
      else if (/\b(follow|theo dõi)\b/.test(label)) score += 10;
      if (score > 0) scored.push({ el, score });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  function dispatchFullClickAt(x, y) {
    if (typeof x !== "number" || typeof y !== "number" || x < 0 || y < 0) return false;
    const el = document.elementFromPoint(x, y);
    if (!el || el.id === "threads-auto-hud" || el.closest("#threads-auto-hud")) return false;
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons: 1,
    };
    try {
      el.dispatchEvent(new PointerEvent("pointerover", { ...mouseOpts, buttons: 0 }));
      el.dispatchEvent(new PointerEvent("pointerenter", { ...mouseOpts, buttons: 0 }));
      el.dispatchEvent(new PointerEvent("pointerdown", { ...mouseOpts, pointerId: 1, pointerType: "mouse" }));
    } catch {}
    el.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    try {
      el.dispatchEvent(new PointerEvent("pointerup", { ...mouseOpts, buttons: 0, pointerId: 1, pointerType: "mouse" }));
    } catch {}
    el.dispatchEvent(new MouseEvent("mouseup", { ...mouseOpts, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("click", { ...mouseOpts, buttons: 0 }));
    return true;
  }

  function dispatchFullClickOn(target) {
    if (!target || !target.isConnected) return false;
    const rect = target.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons: 1,
    };
    try {
      target.dispatchEvent(new PointerEvent("pointerover", { ...mouseOpts, buttons: 0 }));
      target.dispatchEvent(new PointerEvent("pointerenter", { ...mouseOpts, buttons: 0 }));
      target.dispatchEvent(new PointerEvent("pointerdown", { ...mouseOpts, pointerId: 1, pointerType: "mouse" }));
    } catch {}
    target.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    try {
      target.dispatchEvent(new PointerEvent("pointerup", { ...mouseOpts, buttons: 0, pointerId: 1, pointerType: "mouse" }));
    } catch {}
    target.dispatchEvent(new MouseEvent("mouseup", { ...mouseOpts, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", { ...mouseOpts, buttons: 0 }));
    return true;
  }

  function findCloseButton(dialog) {
    if (!dialog) return null;
    const searchRoots = [dialog, dialog.parentElement, dialog.parentElement?.parentElement].filter(Boolean);

    for (const root of searchRoots) {
      for (const svg of root.querySelectorAll("svg[aria-label]")) {
        const aria = (svg.getAttribute("aria-label") || "").toLowerCase();
        if (/close|đóng|cancel|hủy|dismiss|thoát|back|quay lại/.test(aria)) {
          const btn = svg.closest("button, [role='button'], [tabindex='0'], [data-pressable-container='true']");
          if (btn && isVisible(btn)) return btn;
        }
      }
    }

    for (const root of searchRoots) {
      for (const btn of root.querySelectorAll("button, [role='button'], [tabindex='0'], [data-pressable-container='true']")) {
        if (!isVisible(btn)) continue;
        const label = controlLabel(btn);
        if (/^(close|đóng|cancel|hủy|dismiss|done|xong|thoát|back|quay lại|✕|×|x)$/i.test(label) || /\b(close|đóng|dismiss)\b/i.test(label)) {
          return btn;
        }
      }
    }

    const dRect = dialog.getBoundingClientRect();
    for (const btn of dialog.querySelectorAll("button, [role='button'], [tabindex='0']")) {
      if (!isVisible(btn)) continue;
      const label = controlLabel(btn);
      if (/follow|theo dõi/i.test(label)) continue;
      const bRect = btn.getBoundingClientRect();
      if (bRect.top >= dRect.top - 15 && bRect.top <= dRect.top + 70) {
        if (bRect.right >= dRect.right - 80 || bRect.left <= dRect.left + 80) {
          if (bRect.width > 0 && bRect.width <= 65 && bRect.height > 0 && bRect.height <= 65) {
            return btn;
          }
        }
      }
    }
    return null;
  }

  function sendEscapeKey(dialog) {
    const opts = {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
      view: window,
    };
    try {
      if (dialog && typeof dialog.focus === "function") {
        dialog.focus();
      }
    } catch {}
    const targets = [
      document.activeElement,
      dialog,
      document.getElementById("react-root"),
      document.body,
      document.documentElement,
      document,
      window,
    ].filter(Boolean);
    for (const t of targets) {
      try {
        t.dispatchEvent(new KeyboardEvent("keydown", opts));
        t.dispatchEvent(new KeyboardEvent("keyup", opts));
      } catch {}
    }
  }

  function clickBackdropOutside(dialog) {
    if (!dialog) return;
    try {
      const rect = dialog.getBoundingClientRect();
      const midX = Math.round(rect.left + rect.width / 2);
      const midY = Math.round(rect.top + rect.height / 2);

      const points = [
        { x: midX, y: Math.max(20, Math.round(rect.top / 2)) },
        { x: midX, y: Math.min(window.innerHeight - 20, Math.round(rect.bottom + (window.innerHeight - rect.bottom) / 2)) },
        { x: Math.min(window.innerWidth - 30, Math.round(rect.right + 50)), y: midY },
        { x: Math.max(90, Math.round(rect.left - 50)), y: midY },
      ];

      for (const pt of points) {
        const el = document.elementFromPoint(pt.x, pt.y);
        if (el && !dialog.contains(el) && !isNavigationElement(el) && el.id !== "threads-auto-hud") {
          dispatchFullClickAt(pt.x, pt.y);
          break;
        }
      }

      const parent = dialog.parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement && !isNavigationElement(parent)) {
        const pRect = parent.getBoundingClientRect();
        if (pRect.width >= window.innerWidth * 0.7 && pRect.height >= window.innerHeight * 0.7) {
          dispatchFullClickOn(parent);
        }
      }
    } catch {}
  }

  function unlockScrollIfNeeded() {
    if (document.body) {
      if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
      if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
    }
    if (document.documentElement) {
      if (document.documentElement.style.overflow === "hidden") document.documentElement.style.overflow = "";
      if (document.documentElement.style.pointerEvents === "none") document.documentElement.style.pointerEvents = "";
    }
  }

  async function closePopupDialog(dialog) {
    if (!dialog) return;
    if (!dialog.isConnected || !isVisible(dialog)) {
      unlockScrollIfNeeded();
      return;
    }

    // 1. Thử click nút đóng / X / back / cancel nếu có
    const closeBtn = findCloseButton(dialog);
    if (closeBtn) {
      try {
        dispatchFullClickOn(closeBtn);
        await sleep(350);
        if (!dialog.isConnected || !isVisible(dialog)) {
          unlockScrollIfNeeded();
          return;
        }
      } catch {}
    }

    // 2. Thử click backdrop overlay bên ngoài dialog với đầy đủ pointerdown / pointerup
    clickBackdropOutside(dialog);
    await sleep(350);
    if (!dialog.isConnected || !isVisible(dialog)) {
      unlockScrollIfNeeded();
      return;
    }

    // 3. Thử nhấn phím Escape
    sendEscapeKey(dialog);
    await sleep(300);
    if (!dialog.isConnected || !isVisible(dialog)) {
      unlockScrollIfNeeded();
      return;
    }

    // 4. Thử native close / dismissPopups
    try {
      if (typeof dialog.close === "function") dialog.close();
      if (typeof dialog.hidePopover === "function") dialog.hidePopover();
    } catch {}
    dismissPopups();
    await sleep(300);
    if (!dialog.isConnected || !isVisible(dialog)) {
      unlockScrollIfNeeded();
      return;
    }

    // 5. Thử click backdrop lần 2 ở vị trí trên đỉnh
    try {
      const rect = dialog.getBoundingClientRect();
      const topY = Math.max(15, Math.round(rect.top / 2));
      dispatchFullClickAt(Math.round(window.innerWidth / 2), topY);
      sendEscapeKey(dialog);
    } catch {}
    await sleep(300);
    if (!dialog.isConnected || !isVisible(dialog)) {
      unlockScrollIfNeeded();
      return;
    }

    // 6. FAILSAFE: Cưỡng chế ẩn và gỡ bỏ modal container khỏi DOM nếu vẫn cứng đầu không chịu đóng
    try {
      let container = dialog;
      while (
        container.parentElement &&
        container.parentElement !== document.body &&
        container.parentElement !== document.documentElement &&
        !isNavigationElement(container.parentElement)
      ) {
        const style = window.getComputedStyle(container.parentElement);
        if (style.position === "fixed" || style.position === "absolute") {
          container = container.parentElement;
        } else {
          break;
        }
      }
      container.style.display = "none";
      try {
        container.remove();
      } catch {}
      if (dialog.isConnected) {
        dialog.style.display = "none";
        try {
          dialog.remove();
        } catch {}
      }
    } catch {}

    unlockScrollIfNeeded();
  }

  function findFollowButton(root = document) {
    const container = root || document;
    const isInsideDialog = Boolean(
      container.closest?.("[role='dialog']") ||
      container.getAttribute?.("role") === "dialog" ||
      container.getAttribute?.("aria-modal") === "true"
    );
    const scored = [];
    for (const el of container.querySelectorAll("button, [role='button'], [tabindex='0']")) {
      if (!isVisible(el) || isDisabled(el)) continue;
      const label = controlLabel(el);
      if (!label) continue;
      if (/following|đang theo dõi|unfollow|bỏ theo dõi|requested|đã yêu cầu/.test(label)) {
        return { done: true, el };
      }
      if (/more|thêm|share|chia sẻ|mention|nhắc|block|chặn|report|báo cáo|copy|sao chép|close|đóng|cancel|hủy|like|thích|reply|trả lời|repost/.test(label)) continue;
      let score = 0;
      if (/^(follow|theo dõi)$/.test(label)) score += 15;
      else if (/^(follow back|theo dõi lại)$/.test(label)) score += 12;
      else if (/^(follow|theo dõi)\s+@?[a-z0-9_.-]+/i.test(label)) score += 14;
      else if (/\b(follow|theo dõi)\b/.test(label)) score += 8;
      else if (label === "+" || label === "＋") score += 6;
      if (!score) continue;
      if (!isInsideDialog && el.closest("[role='dialog']")) score -= 3;
      scored.push({ el, score });
    }
    for (const svg of container.querySelectorAll("svg[aria-label]")) {
      const aria = (svg.getAttribute("aria-label") || "").toLowerCase();
      if (/^(follow|theo dõi)$/i.test(aria) || /\b(follow|theo dõi)\b/i.test(aria)) {
        const btn = svg.closest("button, [role='button'], [tabindex='0']");
        if (btn && isVisible(btn) && !isDisabled(btn)) {
          scored.push({ el: btn, score: 14 });
        }
      }
    }
    if (!scored.length) return { done: false, el: null };
    scored.sort((a, b) => b.score - a.score);
    return { done: false, el: scored[0].el };
  }

  async function followCurrentProfile() {
    showHud("Đang mở trang cá nhân...");
    try {
      await sleep(600 + Math.round(Math.random() * 900));
      dismissPopups();
      clickSeeMoreIn(document.body);

      const handle = profileHandleFromUrl(location.href);
      if (!handle) throw new Error("Link không phải trang cá nhân Threads (thiếu @username).");

      const found = await waitFor(() => {
        const hit = findFollowButton();
        return hit.el ? hit : null;
      }, 8000);
      if (!found?.el) throw new Error("Không tìm thấy nút Theo dõi trên trang này.");

      if (found.done) {
        markAction("FOLLOW_THREADS_USER", handle, handle);
        return { ok: true, followed: false, alreadyFollowing: true, handle };
      }

      showHud("Đang bấm Theo dõi...");
      clickReact(found.el);
      await sleep(1000 + Math.round(Math.random() * 800));

      const d = findOpenPopupDialog();
      if (d && isVisible(d)) {
        const dialogFollow = findFollowButtonInDialog(d);
        if (dialogFollow?.el && !dialogFollow.done) {
          clickReact(dialogFollow.el);
          await sleep(1000);
        }
        await closePopupDialog(d);
      } else {
        dismissPopups();
      }

      const confirmed = await waitFor(() => {
        const hit = findFollowButton();
        return hit.done ? true : null;
      }, 6000);

      if (!confirmed) throw new Error("Đã bấm Theo dõi nhưng chưa xác nhận được trạng thái.");
      markAction("FOLLOW_THREADS_USER", handle, handle);
      return { ok: true, followed: true, handle };
    } finally {
      hideHud();
    }
  }

  function profileHandleFromUrl(href) {
    try {
      const url = new URL(href, location.origin);
      if (!isThreadsHost(url.hostname)) return "";
      const match = url.pathname.match(/^\/@([A-Za-z0-9._]{1,30})\/?$/);
      return match ? match[1].toLowerCase() : "";
    } catch {
      return "";
    }
  }

  function findCreateEntryButton() {
    const scored = [];
    const nodes = [
      ...document.querySelectorAll("button, [role='button'], [tabindex='0'], a[href*='/intent/post']"),
      ...[
        ...document.querySelectorAll(
          'svg[aria-label="Create" i], svg[aria-label="Tạo" i], svg[aria-label="New thread" i], svg[aria-label="Thread mới" i]'
        ),
      ].map(clickableOf),
    ].filter(Boolean);
    const seen = new Set();
    for (const el of nodes) {
      if (seen.has(el) || !isVisible(el) || isDisabled(el)) continue;
      seen.add(el);
      if (isMetricBarControl(el)) continue;
      const label = controlLabel(el);
      if (/repost|quote|reply|trả lời|comment|bình luận|search|tìm kiếm|photo|ảnh|video|gif/.test(label)) continue;
      let score = 0;
      if (/^(create|tạo|new thread|thread mới|post|đăng)$/.test(label)) score += 12;
      if (/what.?s new|bạn đang nghĩ|start a thread|bắt đầu thread/.test(label)) score += 10;
      if (/\b(create|tạo|new thread|thread mới)\b/.test(label)) score += 6;
      if (!score) continue;
      scored.push({ el, score });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0].el;
  }

  function findPostComposerBox() {
    const scored = [];
    for (const el of document.querySelectorAll('[contenteditable="true"], [role="textbox"], textarea')) {
      if (!isVisible(el) || isSearchBox(el)) continue;
      const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""} ${
        el.getAttribute("aria-placeholder") || ""
      }`.toLowerCase();
      let score = 1;
      if (/what.?s new|bạn đang nghĩ|start a thread|bắt đầu thread|new thread|thread mới/.test(label)) score += 6;
      if (el.closest("[role='dialog']")) score += 4;
      if (/reply|trả lời|phản hồi/.test(label)) score -= 5;
      if (score > 0) scored.push({ el, score });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0].el;
  }

  async function createPost(text) {
    const want = String(text || "").trim();
    if (!want) throw new Error("Nội dung bài đăng trống.");
    showHud("Đang mở ô soạn bài Threads...");
    try {
      await sleep(500 + Math.round(Math.random() * 700));
      dismissPopups();

      let box = findPostComposerBox();
      let opener = null;
      if (!box) {
        opener = findCreateEntryButton();
        if (!opener) throw new Error("Không tìm thấy nút Tạo bài viết trên Threads.");
        clickReact(opener);
        await sleep(1100 + Math.round(Math.random() * 900));
        dismissPopups();
        box = await waitFor(() => findPostComposerBox(), 8000);
      }
      if (!box) throw new Error("Không mở được ô soạn bài viết Threads.");

      box.scrollIntoView({ block: "center" });
      await sleep(300 + Math.round(Math.random() * 400));
      showHud("Đang gõ nội dung bài viết...");
      await typeIntoEditable(box, want);
      if (looksDuplicated(editorText(box), want.replace(/\s+/g, " ").trim())) {
        await clearEditor(box);
        document.execCommand("insertText", false, want);
        await sleep(150);
      }
      await sleep(600 + Math.round(Math.random() * 700));

      const notOpener = (btn) => !btn || !opener || (btn !== opener && !btn.contains(opener));
      const submit = await waitFor(() => {
        const btn = findPostButton(box.closest("[role='dialog']") || document.body, box);
        return btn && !isDisabled(btn) && notOpener(btn) ? btn : null;
      }, 8000);
      if (!submit) throw new Error("Không tìm thấy nút Đăng đang bật cho bài viết mới.");

      const snippet = want.replace(/\s+/g, " ").trim().slice(0, 48);
      showHud("Đang bấm Đăng bài...");
      clickReact(submit);

      // Chờ lâu hơn sau lần click đầu để tránh retry khi bài đã đăng nhưng UI chưa cập nhật
      if (await waitUntilPosted(snippet, box, submit)) {
        markAction("CREATE_THREADS_POST", want, "");
        return { ok: true, posted: true, text: want };
      }

      // Kiểm tra bài đã xuất hiện trên trang trước khi retry (tránh đăng trùng)
      if (snippetOutsideComposer(snippet, box)) {
        markAction("CREATE_THREADS_POST", want, "");
        return { ok: true, posted: true, text: want };
      }

      // Chỉ retry nếu chắc chắn bài chưa được đăng:
      // - box còn có text (chưa bị xóa sau submit)
      // - snippet KHÔNG xuất hiện ngoài composer
      // - submit vẫn còn và chưa bị disabled
      const stillHasText = box.isConnected && editorText(box).includes(snippet.slice(0, 20));
      const notPostedYet = !snippetOutsideComposer(snippet, box);
      if (submit.isConnected && !isDisabled(submit) && stillHasText && notPostedYet) {
        showHud("Thử gửi lại lần 2 (lần đầu chưa phản hồi)...");
        await sleep(800 + Math.round(Math.random() * 400));
        // Kiểm tra lần cuối trước khi thực sự click lần 2
        if (snippetOutsideComposer(snippet, box)) {
          markAction("CREATE_THREADS_POST", want, "");
          return { ok: true, posted: true, text: want };
        }
        clickReact(submit);
        if (await waitUntilPosted(snippet, box, submit)) {
          markAction("CREATE_THREADS_POST", want, "");
          return { ok: true, posted: true, text: want };
        }
      }

      if (snippetOutsideComposer(snippet, box) || (box.isConnected && !editorText(box))) {
        markAction("CREATE_THREADS_POST", want, "");
        return { ok: true, posted: true, text: want };
      }
      const actErr = findThreadsActionError();
      dismissComposer();
      if (actErr) {
        throw new Error(`Threads chặn hành động đăng bài: ${actErr}`);
      }
      throw new Error("Đã gõ bài viết nhưng không gửi được. Threads có thể đang chặn hoặc đổi giao diện.");
    } catch (err) {
      dismissComposer();
      throw err;
    } finally {
      hideHud();
    }
  }


  function commentCardsOnPage() {
    const pageKey = postKeyFromUrl(location.href);
    const cards = [...document.querySelectorAll("[data-pressable-container='true'], [role='article']")].filter(
      (card) => isVisible(card)
    );
    const out = [];
    const seen = new Set();
    for (const card of cards) {
      if (cards.some((other) => other !== card && other.contains(card))) continue;
      const key = postKeyFromUrl(findPermalinkIn(card));
      if (key && pageKey && key === pageKey) continue;
      const text = extractPostText(card);
      if (!usefulText(text)) continue;
      const replyKey = key || textFingerprint(text);
      if (!replyKey || seen.has(replyKey)) continue;
      seen.add(replyKey);
      out.push({ replyKey, aliases: aliasesFor(key, text), text, card });
    }
    return out;
  }

  async function extractReplyTarget(skipKeys) {
    const skipSet = skipSetFrom(skipKeys);
    if (!isPostPage()) {
      let posts = collectPosts(skipSet);
      if (posts.length < 5) {
        window.scrollBy(0, 600);
        await sleep(1000);
        posts = collectPosts(skipSet);
      }
      if (!posts.length) throw new Error("Không tìm thấy bài viết nào để mở phần bình luận.");
      const candidateUrls = posts
        .map((p) => p.url)
        .filter((url) => Boolean(url) && !isSkipped([url, postKeyFromUrl(url)], skipSet));
      if (!candidateUrls.length) {
        throw new Error("Không còn bài viết mới nào chưa tương tác trên bảng tin.");
      }
      const pick = pickFromPool(posts);
      return {
        ok: true,
        isFeed: true,
        nextUrl: pick?.url || candidateUrls[0],
        candidates: candidateUrls.slice(0, 8),
        postKey: pick?.key || "",
        postKeys: pick?.aliases || [],
      };
    }

    clickSeeMoreIn(document.body);
    const pageKey = postKeyFromUrl(location.href);
    const postText = extractPostText(
      document.querySelector("[data-pressable-container='true'], [role='article'], [role='main']") || document.body
    );
    let candidates = commentCardsOnPage().filter((item) => !isSkipped(item.aliases, skipSet));
    if (!candidates.length) {
      window.scrollBy(0, 450);
      await sleep(1000);
      clickSeeMoreIn(document.body);
      candidates = commentCardsOnPage().filter((item) => !isSkipped(item.aliases, skipSet));
    }
    if (!candidates.length) {
      return {
        ok: false,
        noComments: true,
        postKey: pageKey || "",
        error: "Bài này chưa có bình luận nào để trả lời.",
      };
    }

    const pool = candidates.slice(0, 6);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      ok: true,
      postKey: pageKey || "",
      replyKey: pick.replyKey,
      replyKeys: uniqueKeys([...pick.aliases, pick.replyKey]),
      commentText: pick.text,
      postText: postText || "",
      media: extractMediaFrom(pick.card),
    };
  }

  function findReplyButtonInCard(card) {
    if (!card) return null;
    const svg = card.querySelector(
      'svg[aria-label="Reply" i], svg[aria-label="Replies" i], svg[aria-label="Trả lời" i]'
    );
    if (svg) return clickableOf(svg);
    for (const el of card.querySelectorAll("button, [role='button'], [tabindex='0']")) {
      if (!isVisible(el)) continue;
      if (/^(reply|trả lời)$/.test(controlLabel(el))) return el;
    }
    return null;
  }

  async function replyToComment(text, replyKey) {
    const want = String(text || "").trim();
    if (!want) throw new Error("Nội dung trả lời trống.");
    const fitted = want.length > 500 ? want.slice(0, 500).trim() : want;
    if (!isPostPage()) throw new Error("Không ở trang bài Threads để trả lời bình luận.");
    showHud("Đang tìm bình luận để trả lời...");
    try {
      await sleep(500 + Math.round(Math.random() * 700));
      dismissPopups();
      clickSeeMoreIn(document.body);

      const target = commentCardsOnPage().find(
        (item) => item.replyKey === replyKey || item.aliases.includes(replyKey)
      );
      if (!target) throw new Error("Không tìm lại được bình luận cần trả lời trên trang này.");

      const replyBtn = findReplyButtonInCard(target.card);
      if (!replyBtn) throw new Error("Không tìm thấy nút Trả lời của bình luận đó.");

      target.card.scrollIntoView({ block: "center" });
      await sleep(400 + Math.round(Math.random() * 500));
      clickReact(replyBtn);
      await sleep(1000 + Math.round(Math.random() * 900));
      dismissPopups();

      let box = await waitFor(() => findComposerBox(), 8000);
      if (!box) box = findComposerBox(true);
      if (!box) throw new Error("Không mở được ô soạn trả lời bình luận.");

      box.scrollIntoView({ block: "center" });
      await sleep(250 + Math.round(Math.random() * 350));
      showHud("Đang gõ nội dung trả lời...");
      await typeIntoEditable(box, fitted);
      const wantNorm = fitted.replace(/\s+/g, " ").trim();
      if (looksDuplicated(editorText(box), wantNorm)) {
        await clearEditor(box);
        document.execCommand("insertText", false, fitted);
        await sleep(150);
      }
      await sleep(500 + Math.round(Math.random() * 500));

      const notOpener = (btn) => !btn || (btn !== replyBtn && !btn.contains(replyBtn));
      const submit = await waitFor(() => {
        const btn = findReplySubmitNear(box);
        return btn && !isDisabled(btn) && notOpener(btn) ? btn : null;
      }, 8000);
      if (!submit) throw new Error("Không tìm thấy nút Đăng đang bật cho phần trả lời.");

      const snippet = wantNorm.slice(0, 48);
      showHud("Đang gửi trả lời...");
      clickReact(submit);

      if (await waitUntilPosted(snippet, box, submit)) {
        markAction("REPLY_THREADS_COMMENT", fitted, replyKey);
        return { ok: true, posted: true, replyKey, text: fitted };
      }

      const stillHasText = box.isConnected && editorText(box).includes(wantNorm.slice(0, 20));
      if (submit.isConnected && !isDisabled(submit) && stillHasText) {
        clickReact(submit);
        await sleep(500);
        pressSubmitKeys(box);
        if (await waitUntilPosted(snippet, box, submit)) {
          markAction("REPLY_THREADS_COMMENT", fitted, replyKey);
          return { ok: true, posted: true, replyKey, text: fitted };
        }
      }

      if (snippetOutsideComposer(snippet, box) || (box.isConnected && !editorText(box))) {
        markAction("REPLY_THREADS_COMMENT", fitted, replyKey);
        return { ok: true, posted: true, replyKey, text: fitted };
      }
      const actErr = findThreadsActionError();
      dismissComposer();
      if (actErr) {
        throw new Error(`Threads chặn hành động trả lời bình luận: ${actErr}`);
      }
      throw new Error("Đã gõ trả lời nhưng không gửi được. Threads có thể đang chặn hoặc đổi giao diện.");
    } catch (err) {
      dismissComposer();
      throw err;
    } finally {
      hideHud();
    }
  }

  function packContext(postKey, postText, comments, extraKeys, media) {
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
      postKeys: uniqueKeys([...(extraKeys || []), ...aliasesFor(postKey, postText)]),
      postText: postText || "",
      commentText,
      target,
      media: Array.isArray(media) ? media : [],
    };
  }

  async function createComment(text, postKey, skipKeys) {
    if (!text.trim()) throw new Error("Nội dung bình luận trống.");
    if (text.length > 500) text = text.slice(0, 500).trim();
    showHud("Đang bình luận Threads...");
    try {
      await sleep(400 + Math.round(Math.random() * 500));
      dismissPopups();

      const skipSet = skipSetFrom(skipKeys);
      const pageKey = postKeyFromUrl(location.href);
      if (pageKey && skipSet.has(pageKey)) {
        rememberPageKeys([pageKey, postKey]);
        return { ok: true, skipped: true, alreadyCommented: true, postKey: pageKey };
      }

      if (isPostPage() && postKey) {
        if (pageKey && pageKey !== postKey) {
          const match = collectPosts(new Set()).find((item) => item.key === postKey);
          if (match?.url) return { ok: true, nextUrl: match.url, postKey };
          throw new Error("Đang ở bài Threads khác với bài đã chọn.");
        }
        return await commentOnPostPage(text, pageKey || postKey);
      }

      if (postKey) {
        const match = collectPosts(new Set()).find((item) => item.key === postKey);
        if (match?.url) return { ok: true, nextUrl: match.url, postKey };
        throw new Error("Không tìm thấy đúng bài Threads đã chọn để bình luận.");
      }

      throw new Error("Không ở trang bài Threads để bình luận.");
    } finally {
      hideHud();
    }
  }

  async function commentOnPostPage(text, postKey) {
    const replyBtn = findMainReplyButton();
    if (replyBtn) {
      clickReact(replyBtn);
      await sleep(900 + Math.round(Math.random() * 500));
    }
    let box = await waitFor(() => findComposerBox(), 8000);
    if (!box) box = findComposerBox(true);
    if (!box && !replyBtn) throw new Error("Không tìm thấy nút Trả lời (svg Reply) trên bài Threads.");
    if (!box) throw new Error("Không mở được ô soạn bình luận Threads.");

    box.scrollIntoView({ block: "center" });
    await sleep(250 + Math.round(Math.random() * 300));
    await typeIntoEditable(box, text);
    const wantNorm = String(text).replace(/\s+/g, " ").trim();
    if (looksDuplicated(editorText(box), wantNorm)) {
      await clearEditor(box);
      document.execCommand("insertText", false, text);
      await sleep(120);
    }
    await sleep(500 + Math.round(Math.random() * 400));

    const notOpener = (btn) =>
      btn && btn !== replyBtn && !(replyBtn && (replyBtn.contains(btn) || btn.contains(replyBtn)));
    let submit = await waitFor(() => {
      const btn = findReplySubmitNear(box);
      return btn && !isDisabled(btn) && notOpener(btn) ? btn : null;
    }, 8000);
    if (!submit) {
      const btn = findReplySubmitNear(box);
      if (notOpener(btn)) submit = btn;
    }
    if (!submit) throw new Error("Không tìm thấy nút gửi (Post/Đăng) cạnh ô trả lời Threads.");
    if (isDisabled(submit)) {
      throw new Error("Nút Đăng vẫn bị khóa — Threads chưa nhận nội dung vừa gõ.");
    }

    const snippet = String(text).replace(/\s+/g, " ").trim().slice(0, 48);
    showHud("Đang bấm Đăng...");
    clickReact(submit);

    if (await waitUntilPosted(snippet, box, submit)) {
      markAction("CREATE_THREADS_COMMENT", text, postKey);
      return { ok: true, posted: true, postKey: postKey || "" };
    }

    const stillHasText = box && box.isConnected && wantNorm && editorText(box).includes(wantNorm.slice(0, 20));
    const canRetry = submit && submit.isConnected && !isDisabled(submit) && stillHasText;
    if (canRetry) {
      clickReact(submit);
      await sleep(400);
      pressSubmitKeys(box);
      if (await waitUntilPosted(snippet, box, submit)) {
        markAction("CREATE_THREADS_COMMENT", text, postKey);
        return { ok: true, posted: true, postKey: postKey || "" };
      }
    }

    if (snippetOutsideComposer(snippet, box) || (box && box.isConnected && !editorText(box))) {
      markAction("CREATE_THREADS_COMMENT", text, postKey);
      return { ok: true, posted: true, postKey: postKey || "" };
    }

    const actErr = findThreadsActionError();
    dismissComposer();
    if (actErr) {
      throw new Error(`Threads chặn hành động bình luận: ${actErr}`);
    }
    throw new Error("Đã gõ comment nhưng không gửi được. Threads không nhận nút Đăng.");
  }

  function clickableOf(el) {
    if (!el) return null;
    return (
      el.closest("button, [role='button'], a") ||
      el.closest("[tabindex='0']") ||
      el.parentElement
    );
  }

  function controlLabel(el) {
    if (!el) return "";
    const own = el.getAttribute("aria-label") || "";
    const svg = el.querySelector && el.querySelector("svg[aria-label]");
    const svgAria = svg ? svg.getAttribute("aria-label") || "" : "";
    const tagged = el.matches && el.matches("svg") ? el.getAttribute("aria-label") || "" : "";
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return `${own} ${svgAria} ${tagged} ${text}`.replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isMetricBarControl(el) {
    if (!el) return false;
    const group = el.closest("[role='group']") || el.parentElement;
    if (!group) return false;
    const labels = [...group.querySelectorAll("svg[aria-label], [aria-label]")]
      .map((node) => (node.getAttribute("aria-label") || "").toLowerCase())
      .join(" ");
    return /like|thích|repost|share|chia sẻ/.test(labels);
  }

  function findReplySubmitNear(box) {
    const roots = [];
    let node = box;
    for (let i = 0; i < 14 && node && node !== document.body; i += 1) {
      roots.push(node);
      node = node.parentElement;
    }
    const dialog = box.closest("[role='dialog']") || document.querySelector("[role='dialog']");
    if (dialog) roots.push(dialog);
    roots.push(document.body);
    for (const root of roots) {
      const btn = findPostButton(root, box);
      if (btn) return btn;
    }
    return null;
  }

  function findPostButton(root, nearEl) {
    if (!root) return null;
    const scored = [];
    const nodes = [
      ...root.querySelectorAll("button, [role='button'], [tabindex='0']"),
      ...[...root.querySelectorAll('svg[aria-label="Post" i], svg[aria-label="Đăng" i], svg[aria-label="Reply" i], svg[aria-label="Trả lời" i]')].map(
        clickableOf
      ),
    ].filter(Boolean);
    const seen = new Set();
    for (const node of nodes) {
      if (seen.has(node) || !isVisible(node) || (nearEl && node.contains(nearEl))) continue;
      seen.add(node);
      if (isMetricBarControl(node)) continue;
      const label = controlLabel(node);
      if (/photo|ảnh|video|gif|emoji|image|attach|đính|close|đóng|cancel|hủy|repost|quote|new post|bài viết mới/.test(label)) {
        continue;
      }
      let score = 0;
      if (/^(post|đăng)$/.test(label)) score += 12;
      if (node.querySelector && node.querySelector('svg[aria-label="Post" i], svg[aria-label="Đăng" i]')) score += 12;
      if (/^(reply|trả lời|send|gửi)$/.test(label)) score += 8;
      if (/\b(post|đăng)\b/.test(label) && !/repost/.test(label)) score += 6;
      if (!score) continue;
      if (isDisabled(node)) score -= 4;
      if (nearEl) score -= Math.min(4, distRect(nearRect(nearEl), nearRect(node)) / 80000);
      scored.push({ node, score });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    return scored[0].node;
  }

  function nearRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function distRect(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function snippetOutsideComposer(snippet, box) {
    if (!snippet) return false;
    for (const card of document.querySelectorAll("[data-pressable-container='true'], [role='article']")) {
      if (box && (card.contains(box) || box.contains(card))) continue;
      if ((card.innerText || "").replace(/\s+/g, " ").includes(snippet)) return true;
    }
    return false;
  }

  async function waitUntilPosted(snippet, box, submit) {
    for (let i = 0; i < 16; i += 1) {
      await sleep(350);
      if (snippetOutsideComposer(snippet, box)) return true;
      const editorEmpty = !box || !box.isConnected || !editorText(box);
      const dialog = document.querySelector("[role='dialog']");
      const stillInDialog = box && box.isConnected && dialog && dialog.contains(box);
      const submitGone = !submit || !submit.isConnected;
      const submitLocked = submit && submit.isConnected && isDisabled(submit);
      if (editorEmpty && !stillInDialog && i >= 2) return true;
      if (editorEmpty && submitGone && i >= 2) return true;
      if (submitGone && i >= 5) return true;
      if (submitLocked && editorEmpty && i >= 3) return true;
    }
    return false;
  }

  function pressSubmitKeys(el) {
    if (!el) return;
    el.focus();
    const base = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };
    el.dispatchEvent(new KeyboardEvent("keydown", { ...base, metaKey: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { ...base, ctrlKey: true }));
  }

  function findMainReplyButton() {
    const svgs = [...document.querySelectorAll('svg[aria-label="Reply" i], svg[aria-label="Replies" i], svg[aria-label="Trả lời" i]')];
    const cards = [...document.querySelectorAll("[data-pressable-container='true'], [role='article']")].filter(
      isVisible
    );
    const pageKey = postKeyFromUrl(location.href);
    const matched = pageKey
      ? cards.find((card) => postKeyFromUrl(findPermalinkIn(card)) === pageKey)
      : null;
    const root = matched || cards[0] || document.querySelector("[role='main']") || document.body;
    const svg = svgs.find((node) => root.contains(node)) || svgs[0];
    if (svg) return clickableOf(svg);

    const labeled = document.querySelector(
      '[aria-label="Reply" i], [aria-label="Trả lời" i], button[aria-label*="Reply" i], button[aria-label*="Trả lời" i]'
    );
    if (labeled) return clickableOf(labeled);
    return null;
  }

  function findComposerBox(loose) {
    const nodes = [
      ...document.querySelectorAll('[contenteditable="true"], [role="textbox"], textarea'),
    ];
    const scored = [];
    for (const el of nodes) {
      if (!isVisible(el) || isSearchBox(el)) continue;
      const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""} ${
        el.getAttribute("aria-placeholder") || ""
      }`.toLowerCase();
      let score = 1;
      if (/reply|trả lời|comment|bình luận|phản hồi/.test(label)) score += 4;
      if (el.closest("[role='dialog']")) score += 3;
      if (/what.?s new|bạn đang nghĩ|start a thread|bắt đầu thread|new thread/.test(label)) score -= 6;
      if (score >= 4 || (loose && score > 0)) scored.push({ el, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.el || null;
  }

  function isSearchBox(el) {
    const blob = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("placeholder") || ""} ${
      el.getAttribute("aria-placeholder") || ""
    }`.toLowerCase();
    return /search|tìm kiếm/.test(blob);
  }

  function dismissPopups() {
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
      "accept cookies",
      "turn on",
    ];
    for (const el of document.querySelectorAll('[role="button"], button, [aria-label]')) {
      if (!isVisible(el)) continue;
      const text = `${el.getAttribute("aria-label") || ""} ${el.innerText || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      if (!text || text.length > 40) continue;
      if (!labels.some((label) => text === label || text.startsWith(label))) continue;
      try {
        el.click();
      } catch {
        // ignore
      }
    }
  }

  function findThreadsActionError() {
    try {
      for (const el of document.querySelectorAll('[role="alert"], [data-toaster-toast="true"], [role="dialog"], div[class*="toast"], div[class*="banner"]')) {
        if (!isVisible(el)) continue;
        const txt = (el.innerText || el.textContent || "").slice(0, 300).toLowerCase();
        if (/thử lại sau|hành động bị chặn|couldn't post|could not post|try again later|we restrict certain activity|bạn không thể thực hiện|tạm thời bị chặn/i.test(txt)) {
          return txt.trim();
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  function dismissComposer() {
    try {
      dismissPopups();
      for (const btn of document.querySelectorAll('[role="dialog"] button, [role="dialog"] [role="button"]')) {
        if (!isVisible(btn)) continue;
        const lbl = controlLabel(btn);
        if (/^(hủy|bỏ|discard|cancel|close|đóng|xong)$/i.test(lbl)) {
          clickReact(btn);
          break;
        }
      }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
    } catch {
      // ignore
    }
  }

  function clickSeeMoreIn(root) {
    if (!root) return;
    for (const el of root.querySelectorAll("button, [role='button'], span, div")) {
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

  function pickFromPool(items) {
    const pool = items.slice(0, Math.min(8, items.length));
    if (pool.length > 2 && Math.random() < 0.55) pool.shift();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function isPostPage() {
    return /\/(post|t)\/[^/]+/i.test(location.pathname);
  }

  function postKeyFromUrl(href) {
    if (!href) return "";
    try {
      const url = new URL(href, location.origin);
      const match = url.pathname.match(/\/(?:post|t)\/([^/?#]+)/i);
      if (match) return decodeURIComponent(match[1]);
    } catch {
      // ignore
    }
    return "";
  }

  function isThreadsHost(hostname) {
    return /(^|\.)threads\.(net|com)$/i.test(String(hostname || ""));
  }

  const EXTRACT_NOISE =
    /^(like|thích|love|reply|replies|trả lời|repost|share|chia sẻ|follow|theo dõi|see more|xem thêm|translate|dịch|post|đăng|home|menu|threads|suggested|đề xuất)$/i;

  function usefulText(value) {
    const text = String(value || "")
      .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 8 || text.length > 1800) return "";
    if (EXTRACT_NOISE.test(text)) return "";
    if (/^\d+\s*(min|mins|hr|hrs|h|m|d|giờ|phút|ngày|tuần)/i.test(text)) return "";
    return text;
  }

  function editorText(el) {
    return (el.innerText || el.textContent || "")
      .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
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
    if (current.startsWith(wantNorm) && normExtract(current.slice(wantNorm.length)) === wantNorm) return true;
    return current.includes(wantNorm) && current.length >= wantNorm.length * 1.8;
  }

  // Gõ từng ký tự có nhịp (giống người) thay vì dán nguyên chuỗi 1 phát.
  async function pacedInsert(el, str) {
    const chars = [...String(str)];
    for (let i = 0; i < chars.length; i += 1) {
      const ch = chars[i];
      document.execCommand("insertText", false, ch);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: ch }));
      let d = 55 + Math.round(Math.random() * 95);
      if (ch === " ") d += 20 + Math.round(Math.random() * 55);
      if (/[.,!?;:]/.test(ch)) d += 90 + Math.round(Math.random() * 160);
      if (i > 6 && Math.random() < 0.06) d += 200 + Math.round(Math.random() * 300);
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
      await sleep(120);
      current = editorText(el);
    }

    if (looksDuplicated(current, wantNorm) || (wantNorm && current !== wantNorm && current.includes(wantNorm))) {
      await clearEditor(el);
      document.execCommand("insertText", false, want);
      await sleep(80);
    }
  }

  function clickReact(el) {
    if (!el) return;
    const target = el.closest("button, [role='button']") || el;
    target.scrollIntoView({ block: "center", inline: "center" });
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const mouse = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
    };
    try {
      target.dispatchEvent(
        new PointerEvent("pointerdown", { ...mouse, pointerId: 1, pointerType: "mouse", buttons: 1 })
      );
    } catch {
      // older engines
    }
    target.dispatchEvent(new MouseEvent("mousedown", { ...mouse, buttons: 1 }));
    try {
      target.dispatchEvent(
        new PointerEvent("pointerup", { ...mouse, pointerId: 1, pointerType: "mouse", buttons: 0 })
      );
    } catch {
      // older engines
    }
    target.dispatchEvent(new MouseEvent("mouseup", { ...mouse, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", { ...mouse, buttons: 0 }));
  }

  function isDisabled(el) {
    if (!el) return true;
    return el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled");
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 8 && rect.height > 8 && style.visibility !== "hidden" && style.display !== "none";
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
    let hud = document.getElementById("threads-auto-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "threads-auto-hud";
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
    const hud = document.getElementById("threads-auto-hud");
    if (hud) hud.remove();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
