(() => {
  "use strict";
  if (window.__X_AUTO_LOADED__) return;
  window.__X_AUTO_LOADED__ = true;

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "SET_X_HUD",
    "EXTRACT_X_CONTEXT",
    "EXTRACT_X_FEED_BATCH",
    "CREATE_X_COMMENT",
    "SCROLL_X_FEED",
    "CREATE_X_POST",
    "FOLLOW_X_USER",
    "EXTRACT_X_REPLY_TARGET",
    "REPLY_X_COMMENT",
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
      return { ok: true, href: location.href, state, platform: "x" };
    }
    if (message?.type === "SET_X_HUD") {
      showHud(String(message.text || ""));
      return { ok: true };
    }
    if (state !== "ok") throw new Error(stateError(state));

    if (message?.type === "EXTRACT_X_CONTEXT") {
      return await extractXContext(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }

    if (message?.type === "EXTRACT_X_FEED_BATCH") {
      const skipKeys = Array.isArray(message.skipKeys) ? message.skipKeys : [];
      const items = await collectXFeedBatch(skipKeys, message.limit);
      return { ok: true, items };
    }

    if (message?.type === "CREATE_X_COMMENT") {
      if (actionLock) return { ok: false, error: "Đang có thao tác X khác đang xử lý." };
      actionLock = true;
      try {
        return await createXComment(String(message.text || ""), message.postKey);
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "SCROLL_X_FEED") {
      if (actionLock) return { ok: true, skipped: true, reason: "busy" };
      actionLock = true;
      try {
        return await scrollXFeed({
          rounds: Number(message.rounds) || 8,
          autoLike: Boolean(message.autoLike),
          likeDelay: Number(message.likeDelay) || 4,
        });
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "CREATE_X_POST") {
      if (actionLock) return { ok: false, error: "Đang có thao tác X khác đang xử lý." };
      actionLock = true;
      try {
        return await createXPost(String(message.text || ""));
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "FOLLOW_X_USER") {
      if (actionLock) return { ok: true, skipped: true, reason: "busy" };
      actionLock = true;
      try {
        return await followXProfile();
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "EXTRACT_X_REPLY_TARGET") {
      return await extractXReplyTarget(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }

    if (message?.type === "REPLY_X_COMMENT") {
      if (actionLock) return { ok: false, error: "Đang có thao tác X khác đang xử lý." };
      actionLock = true;
      try {
        return await replyToXComment(String(message.text || ""), String(message.replyKey || ""));
      } finally {
        actionLock = false;
      }
    }

    return { ok: false, error: `X không xử lý lệnh ${message?.type || "?"}.` };
  }

  function pageState() {
    const href = location.href.toLowerCase();
    if (href.includes("/i/flow/login") || href.includes("/login")) return "login_required";
    if (document.querySelector("a[data-testid='loginButton']")) return "login_required";
    if (href.includes("/account/access") || href.includes("/i/flow/challenge")) return "checkpoint";
    // Tài khoản bị hạn chế / giới hạn hành động (interstitial hoặc toast của X).
    try {
      const bodyText = (document.body?.innerText || "").toLowerCase();
      if (/your account is (temporarily )?(locked|suspended)|account has been locked|xác minh danh tính|verify your identity/.test(bodyText)) {
        return "checkpoint";
      }
      if (/you are over the daily limit|over the daily limit for sending|caution: this account is temporarily|temporarily restricted|you'?re temporarily limited|hành động này đã bị chặn|thử lại sau|try again later|rate limit exceeded/.test(bodyText)) {
        return "blocked";
      }
    } catch {
      // bỏ qua lỗi truy vấn DOM
    }
    return "ok";
  }

  function stateError(state) {
    if (state === "login_required") return "Tài khoản X chưa đăng nhập trên trình duyệt.";
    if (state === "checkpoint") return "X yêu cầu xác minh / đăng nhập lại (checkpoint).";
    if (state === "blocked") return "Tài khoản X đang bị hạn chế hành động (rate limit). Thử lại sau.";
    return "Trang X (Twitter) đang không khả dụng.";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  function getTweetId(urlStr = location.href) {
    try {
      const match = urlStr.match(/\/status\/(\d+)/i);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  function skipSetFrom(skipKeys) {
    return new Set((skipKeys || []).map((k) => String(k || "").toLowerCase()));
  }

  function showHud(text) {
    let hud = document.getElementById("x-auto-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "x-auto-hud";
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
    const hud = document.getElementById("x-auto-hud");
    if (hud) hud.remove();
  }

  // Cuộn mượt bằng nhiều bước nhỏ + behavior:"smooth" thay vì nhảy toạ độ
  // ngay lập tức, mô phỏng lăn chuột/vuốt trackpad thật (giống threads-content.js).
  async function humanScrollBy(totalStep) {
    const scroller = document.scrollingElement;
    const subSteps = 3 + Math.floor(Math.random() * 3);
    let remaining = totalStep;
    const sign = totalStep < 0 ? -1 : 1;
    for (let i = 0; i < subSteps && Math.abs(remaining) > 4; i += 1) {
      const left = subSteps - i;
      const portion = i === subSteps - 1 ? remaining : Math.round((remaining / left) * (0.7 + Math.random() * 0.6));
      const amount = sign > 0 ? Math.min(remaining, Math.max(20, portion)) : Math.max(remaining, Math.min(-20, portion));
      window.scrollBy({ top: amount, left: 0, behavior: "smooth" });
      if (scroller) scroller.scrollBy({ top: amount, left: 0, behavior: "smooth" });
      remaining -= amount;
      await sleep(90 + Math.round(Math.random() * 140));
    }
    await sleep(250 + Math.round(Math.random() * 200));
  }

  // Cuộn tới khi đủ `limit` tweet mới hoặc thật sự chạm đáy trang (vị trí
  // cuộn không nhích thêm sau vài lần thử liên tiếp).
  async function scrollFeedUntil(skipSet, limit) {
    let stuckRounds = 0;
    const maxRounds = 20;
    for (let i = 0; i < maxRounds; i += 1) {
      const prevY = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
      const step = Math.round((window.innerHeight || 700) * (0.65 + Math.random() * 0.45));
      await humanScrollBy(step);
      if (collectTweetsOnPage(skipSet).length >= limit) break;
      const newY = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
      if (Math.abs(newY - prevY) < 5) {
        stuckRounds += 1;
        if (stuckRounds >= 3) break;
      } else {
        stuckRounds = 0;
      }
    }
  }

  const MAX_MEDIA_ITEMS = 6;
  const MAX_MEDIA_ALT_LENGTH = 300;

  // Ảnh thật của tweet nằm trong [data-testid="tweetPhoto"] img — X gắn
  // test-id riêng cho media nội dung nên không lẫn với avatar
  // ([data-testid="Tweet-User-Avatar"], test-id khác hẳn). Alt ảnh X luôn là
  // chuỗi chung chung "Image" (không mô tả nội dung), vẫn gửi kèm cho AI
  // nhưng không kỳ vọng hữu ích. Video: chưa có mẫu thật để xác nhận cấu
  // trúc, dùng selector <video> best-effort.
  function extractXMediaFrom(root) {
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

    for (const img of root.querySelectorAll('[data-testid="tweetPhoto"] img')) {
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

  function clickShowMoreIn(root) {
    if (!root) return;
    const btn = root.querySelector('[data-testid="tweet-text-show-more-link"]');
    if (btn) {
      try {
        btn.click();
      } catch {
        // ignore
      }
    }
  }

  function extractTweetText(article) {
    if (!article) return "";
    clickShowMoreIn(article);
    const el = article.querySelector('[data-testid="tweetText"]');
    return (el?.innerText || el?.textContent || "").trim();
  }

  function extractAuthorFrom(article) {
    const el = article?.querySelector('[data-testid="User-Name"]');
    return (el?.textContent || "").trim().split("\n")[0] || "";
  }

  // Bỏ qua tweet quảng cáo hoặc repost khi quét feed, giống cách
  // threads-content.js bỏ qua bài "Sponsored"/"replied to".
  function isSkippableTweetCard(article) {
    const blob = (article.innerText || "").slice(0, 260).toLowerCase();
    if (/^promoted\b|được tài trợ|^quảng cáo/.test(blob)) return true;
    const social = article.querySelector('[data-testid="socialContext"]');
    if (social && /reposted|đăng lại/i.test(social.textContent || "")) return true;
    return false;
  }

  function collectTweetsOnPage(skipSet) {
    const found = [];
    const seen = new Set();
    for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
      if (isSkippableTweetCard(article)) continue;
      const link = article.querySelector('a[href*="/status/"]');
      const href = link?.getAttribute("href") || "";
      let url;
      try {
        url = new URL(href, location.origin).href.split("?")[0];
      } catch {
        continue;
      }
      const key = getTweetId(url);
      if (!key || seen.has(key) || skipSet.has(key.toLowerCase())) continue;
      seen.add(key);
      found.push({
        key,
        aliases: [key],
        url,
        text: extractTweetText(article),
        author: extractAuthorFrom(article),
        card: article,
      });
    }
    return found;
  }

  // Đọc trực tiếp text + media của các tweet đang hiển thị trên dòng thời
  // gian (đã lọc trùng qua skipKeys), tối đa `limit` tweet. Chỉ cuộn thêm
  // khi chưa đủ số lượng cần.
  async function collectXFeedBatch(skipKeys, limit) {
    showHud("Đang đọc bảng tin X...");
    try {
      await sleep(1200 + Math.round(Math.random() * 800));
      const skipSet = skipSetFrom(skipKeys);
      const max = Math.max(1, Number(limit) || 5);

      let tweets = collectTweetsOnPage(skipSet);
      if (tweets.length < max) {
        await scrollFeedUntil(skipSet, max);
        tweets = collectTweetsOnPage(skipSet);
      }
      return tweets.slice(0, max).map((item) => ({
        key: item.key,
        aliases: item.aliases,
        url: item.url,
        text: item.text,
        media: extractXMediaFrom(item.card),
      }));
    } finally {
      hideHud();
    }
  }

  // Chỉ dùng khi tab đã ở đúng trang chi tiết 1 tweet cụ thể (feed batch/tab
  // tương tác điều hướng thẳng vào url tweet trước khi gọi message này).
  async function extractXContext(skipKeys = []) {
    showHud("Đang đọc Tweet...");
    try {
      const skipSet = skipSetFrom(skipKeys);
      const tweetId = getTweetId(location.href);
      if (!tweetId) throw new Error("Không ở trang chi tiết Tweet.");
      if (skipSet.has(tweetId.toLowerCase())) {
        return { ok: true, skipped: true, alreadyCommented: true, postKey: tweetId };
      }

      await sleep(1200 + Math.round(Math.random() * 800));

      const tweetArticle = document.querySelector("article[data-testid='tweet']");
      const postText = extractTweetText(tweetArticle) || (document.querySelector("[data-testid='tweetText']")?.textContent || "").trim();
      const author = extractAuthorFrom(tweetArticle);

      if (!postText) throw new Error("Không lấy được nội dung Tweet.");

      return {
        ok: true,
        postKey: tweetId,
        postText: author ? `Tweet của ${author}: ${postText}` : postText,
        author,
        media: extractXMediaFrom(tweetArticle || document.body),
        target: "tweet",
      };
    } finally {
      hideHud();
    }
  }

  async function createXComment(text, postKey) {
    if (!text) throw new Error("Nội dung bình luận X rỗng.");
    showHud("Đang mở ô trả lời Tweet...");
    try {
      await sleep(1000);

      let editor = document.querySelector("[data-testid='tweetTextarea_0']");
      if (!editor) {
        const replyBtn = document.querySelector("[data-testid='reply']");
        if (replyBtn) {
          replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
          await sleep(400);
          replyBtn.click();
          await sleep(1000);
        }
        editor = document.querySelector("[data-testid='tweetTextarea_0']");
      }

      if (!editor) {
        throw new Error("Không tìm thấy ô nhập phản hồi trên Tweet này (có thể tác giả đã khoá tính năng phản hồi).");
      }

      editor.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(400);
      editor.focus();
      await sleep(300);

      showHud("Đang gõ nội dung...");
      await pacedInsert(editor, text);
      await sleep(800);

      const submitBtn = document.querySelector(
        "[data-testid='tweetButtonInline'], [data-testid='tweetButton']"
      );

      if (!submitBtn || submitBtn.disabled || submitBtn.getAttribute("aria-disabled") === "true") {
        throw new Error("Nút Đăng phản hồi X bị vô hiệu hoá hoặc không tìm thấy.");
      }

      showHud("Đang gửi phản hồi...");
      submitBtn.click();
      await sleep(2500);

      return {
        ok: true,
        postKey: postKey || getTweetId(location.href),
        text,
      };
    } finally {
      hideHud();
    }
  }

  async function scrollXFeed({ rounds = 6, autoLike = true, likeDelay = 4 } = {}) {
    let scrolled = 0;
    let likedCount = 0;
    showHud("Đang lướt bảng tin X...");
    try {
      for (let i = 0; i < rounds; i++) {
        const delta = 450 + Math.floor(Math.random() * 300);
        await humanScrollBy(delta);
        scrolled++;
        showHud(`Đang lướt X ${i + 1}/${rounds}...`);
        await sleep(1200 + Math.floor(Math.random() * 1200));

        if (autoLike && i % 2 === 0) {
          const likeBtns = Array.from(document.querySelectorAll("[data-testid='like']"));
          for (const btn of likeBtns) {
            const rect = btn.getBoundingClientRect();
            if (rect.top > 0 && rect.bottom < window.innerHeight) {
              await sleep(likeDelay * 1000);
              btn.click();
              likedCount++;
              showHud(`Đã thích ${likedCount} tweet · lướt ${i + 1}/${rounds}`);
              await sleep(800);
              break;
            }
          }
        }
      }

      const tweetsSeen = document.querySelectorAll("article[data-testid='tweet']").length;
      return {
        ok: true,
        scrolled,
        tweetsSeen,
        likedCount,
      };
    } finally {
      hideHud();
    }
  }

  async function createXPost(text) {
    if (!text) throw new Error("Nội dung Tweet rỗng.");
    showHud("Đang mở khung soạn Tweet...");
    try {
      let editor = document.querySelector("[data-testid='tweetTextarea_0']");
      if (!editor) {
        const newTweetBtn = document.querySelector(
          "a[href='/compose/post'], [data-testid='SideNav_NewTweet_Button']"
        );
        if (newTweetBtn) {
          newTweetBtn.click();
          await sleep(1200);
        }
        editor = document.querySelector("[data-testid='tweetTextarea_0']");
      }

      if (!editor) {
        throw new Error("Không tìm thấy khung soạn thảo Tweet trên X.");
      }

      editor.focus();
      await sleep(300);

      showHud("Đang gõ nội dung Tweet...");
      await pacedInsert(editor, text);
      await sleep(800);

      const submitBtn = document.querySelector(
        "[data-testid='tweetButtonInline'], [data-testid='tweetButton']"
      );

      if (!submitBtn || submitBtn.disabled || submitBtn.getAttribute("aria-disabled") === "true") {
        throw new Error("Nút Đăng bài X bị vô hiệu hoá hoặc không tìm thấy.");
      }

      showHud("Đang đăng Tweet...");
      submitBtn.click();
      await sleep(2500);

      return {
        ok: true,
        text,
      };
    } finally {
      hideHud();
    }
  }

  async function followXProfile() {
    showHud("Đang mở trang cá nhân...");
    try {
      await sleep(1200);
      const buttons = Array.from(document.querySelectorAll("[data-testid$='-follow']"));
      let followBtn = buttons[0];

      if (!followBtn) {
        const allBtns = Array.from(document.querySelectorAll("button, div[role='button']"));
        followBtn = allBtns.find((b) => {
          const t = (b.textContent || "").trim();
          return t === "Follow" || t === "Theo dõi";
        });
      }

      if (!followBtn) {
        const unfollow = document.querySelector("[data-testid$='-unfollow']");
        if (unfollow) return { ok: true, skipped: true, alreadyFollowed: true };
        throw new Error("Không tìm thấy nút Follow trên trang X cá nhân này.");
      }

      showHud("Đang bấm Theo dõi...");
      followBtn.click();
      await sleep(1500);
      return { ok: true, followed: true };
    } finally {
      hideHud();
    }
  }

  // Các tweet trả lời/bình luận bên dưới bài chính trên trang chi tiết —
  // dùng làm nguồn cho tính năng Trả lời bình luận (tương tự
  // commentCardsOnPage bên threads-content.js).
  function repliesOnPage(pageKey, skipSet) {
    const out = [];
    const seen = new Set();
    for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
      if (isSkippableTweetCard(article)) continue;
      const link = article.querySelector('a[href*="/status/"]');
      const href = link?.getAttribute("href") || "";
      let url;
      try {
        url = new URL(href, location.origin).href.split("?")[0];
      } catch {
        continue;
      }
      const key = getTweetId(url);
      if (!key || key === pageKey || seen.has(key)) continue;
      if (skipSet.has(key.toLowerCase())) continue;
      const text = extractTweetText(article);
      if (!text) continue;
      seen.add(key);
      out.push({ replyKey: key, aliases: [key], text, card: article });
    }
    return out;
  }

  async function extractXReplyTarget(skipKeys = []) {
    const skipSet = skipSetFrom(skipKeys);
    const pageKey = getTweetId(location.href);

    if (!pageKey) {
      await sleep(1000);
      let tweets = collectTweetsOnPage(skipSet);
      if (tweets.length < 5) {
        await scrollFeedUntil(skipSet, 5);
        tweets = collectTweetsOnPage(skipSet);
      }
      if (!tweets.length) throw new Error("Không tìm thấy Tweet nào để tìm bình luận.");
      const candidateUrls = tweets.map((t) => t.url).slice(0, 8);
      return { ok: true, isFeed: true, nextUrl: candidateUrls[0], candidates: candidateUrls };
    }

    await sleep(1200 + Math.round(Math.random() * 800));
    const tweetArticle = document.querySelector("article[data-testid='tweet']");
    const postText = extractTweetText(tweetArticle);

    const candidates = repliesOnPage(pageKey, skipSet);
    if (!candidates.length) {
      return { ok: false, noComments: true, postKey: pageKey, error: "Tweet này chưa có bình luận nào để trả lời." };
    }

    const pool = candidates.slice(0, 6);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      ok: true,
      postKey: pageKey,
      replyKey: pick.replyKey,
      replyKeys: pick.aliases,
      commentText: pick.text,
      postText: postText || "",
      media: extractXMediaFrom(pick.card),
    };
  }

  async function replyToXComment(text, replyKey) {
    const want = String(text || "").trim();
    if (!want) throw new Error("Nội dung trả lời trống.");
    showHud("Đang tìm bình luận để trả lời...");
    try {
      await sleep(600 + Math.round(Math.random() * 600));
      const pageKey = getTweetId(location.href);
      if (!pageKey) throw new Error("Không ở trang chi tiết Tweet để trả lời bình luận.");

      const candidates = repliesOnPage(pageKey, new Set());
      const target = candidates.find((c) => c.replyKey === replyKey || c.aliases.includes(replyKey));
      if (!target) throw new Error("Không tìm lại được bình luận cần trả lời trên trang này.");

      target.card.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(500 + Math.round(Math.random() * 500));

      const replyBtn = target.card.querySelector("[data-testid='reply']");
      if (!replyBtn) throw new Error("Không tìm thấy nút Trả lời của bình luận đó.");
      replyBtn.click();
      await sleep(900 + Math.round(Math.random() * 700));

      const editor = document.querySelector("[data-testid='tweetTextarea_0']");
      if (!editor) throw new Error("Không mở được ô soạn trả lời bình luận X.");

      editor.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(300);
      editor.focus();
      await sleep(250);

      showHud("Đang gõ nội dung trả lời...");
      await pacedInsert(editor, want);
      await sleep(700);

      const submitBtn = document.querySelector(
        "[data-testid='tweetButtonInline'], [data-testid='tweetButton']"
      );
      if (!submitBtn || submitBtn.disabled || submitBtn.getAttribute("aria-disabled") === "true") {
        throw new Error("Nút Đăng trả lời X bị vô hiệu hoá hoặc không tìm thấy.");
      }

      showHud("Đang gửi trả lời...");
      submitBtn.click();
      await sleep(2200);

      return { ok: true, posted: true, replyKey, text: want };
    } finally {
      hideHud();
    }
  }
})();
