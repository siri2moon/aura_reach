(() => {
  "use strict";
  if (window.__INSTAGRAM_AUTO_LOADED__) return;
  window.__INSTAGRAM_AUTO_LOADED__ = true;

  let actionLock = false;

  const HANDLED = new Set([
    "PING",
    "EXTRACT_INSTAGRAM_CONTEXT",
    "CREATE_INSTAGRAM_COMMENT",
    "SCROLL_INSTAGRAM_FEED",
    "FOLLOW_INSTAGRAM_USER",
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
      return { ok: true, href: location.href, state, platform: "instagram" };
    }
    if (state !== "ok") throw new Error(stateError(state));

    if (message?.type === "EXTRACT_INSTAGRAM_CONTEXT") {
      return await extractInstagramContext(Array.isArray(message.skipKeys) ? message.skipKeys : []);
    }

    if (message?.type === "CREATE_INSTAGRAM_COMMENT") {
      if (actionLock) return { ok: false, error: "Đang có thao tác Instagram khác đang xử lý." };
      actionLock = true;
      try {
        return await createInstagramComment(String(message.text || ""), message.postKey);
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "SCROLL_INSTAGRAM_FEED") {
      if (actionLock) return { ok: true, skipped: true, reason: "busy" };
      actionLock = true;
      try {
        return await scrollInstagramFeed({
          rounds: Number(message.rounds) || 8,
          autoLike: Boolean(message.autoLike),
          likeDelay: Number(message.likeDelay) || 4,
          autoFollow: Boolean(message.autoFollow),
        });
      } finally {
        actionLock = false;
      }
    }

    if (message?.type === "FOLLOW_INSTAGRAM_USER") {
      if (actionLock) return { ok: true, skipped: true, reason: "busy" };
      actionLock = true;
      try {
        return await followInstagramProfile();
      } finally {
        actionLock = false;
      }
    }

    return { ok: false, error: `Instagram không xử lý lệnh ${message?.type || "?"}.` };
  }

  function pageState() {
    const href = location.href.toLowerCase();
    if (href.includes("/accounts/login") || href.includes("/accounts/emailsignup")) return "login_required";
    if (document.querySelector("form#loginForm, input[name='username']")) return "login_required";
    // Checkpoint / xác minh: URL /challenge/ hoặc nội dung dialog cảnh báo.
    // (Trước đây dùng selector ":contains()" không hợp lệ nên querySelector ném lỗi,
    //  khiến việc phát hiện checkpoint KHÔNG hoạt động.)
    if (href.includes("/challenge/") || href.includes("/checkpoint/")) return "checkpoint";
    try {
      const dialog = document.querySelector("div[role='dialog']");
      if (dialog) {
        const text = (dialog.innerText || dialog.textContent || "").toLowerCase();
        if (/checkpoint|xác minh|confirm it'?s you|suspicious login|unusual activity|we detected|hành động bị chặn|tạm thời bị chặn|temporarily blocked/.test(text)) {
          return "checkpoint";
        }
      }
    } catch {
      // bỏ qua lỗi truy vấn DOM
    }
    return "ok";
  }

  function stateError(state) {
    if (state === "login_required") return "Tài khoản Instagram chưa đăng nhập trên trình duyệt.";
    if (state === "checkpoint") return "Instagram đang yêu cầu xác minh bảo mật (checkpoint).";
    return "Trang Instagram đang không khả dụng.";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getPostShortcode(urlStr = location.href) {
    try {
      const match = urlStr.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/i);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  async function extractInstagramContext(skipKeys = []) {
    const skipSet = new Set(skipKeys.map((k) => String(k).toLowerCase()));
    const shortcode = getPostShortcode(location.href);

    if (shortcode) {
      if (skipSet.has(shortcode.toLowerCase())) {
        return { ok: true, skipped: true, alreadyCommented: true, postKey: shortcode };
      }

      await sleep(1500);

      // Extract author & caption
      const authorEl = document.querySelector(
        "header a[role='link'], header span a, article header a, div[role='dialog'] header a"
      );
      const author = (authorEl?.textContent || "").trim();

      // Find caption
      const captionCandidates = Array.from(
        document.querySelectorAll("h1, article span[dir='auto'], div[role='dialog'] span[dir='auto'], article ul li span")
      );
      let postText = "";
      for (const el of captionCandidates) {
        const text = (el.textContent || "").trim();
        if (text.length > 5 && !text.includes("Xem tất cả") && !text.includes("bình luận")) {
          postText = text;
          break;
        }
      }

      if (!postText) {
        // Fallback meta description
        const meta = document.querySelector("meta[property='og:title'], meta[name='description']");
        postText = (meta?.content || "").trim();
      }

      if (!postText && !author) {
        throw new Error("Không lấy được nội dung bài viết hoặc Reels Instagram.");
      }

      return {
        ok: true,
        postKey: shortcode,
        postText: postText ? `Bài viết của ${author}: ${postText}` : `Bài viết của tác giả ${author}`,
        author,
        target: "post",
      };
    }

    // On home feed: pick a post from feed
    await sleep(1000);
    const postLinks = Array.from(
      document.querySelectorAll("article a[href*='/p/'], article a[href*='/reel/'], a[href*='/p/'], a[href*='/reel/']")
    );

    for (const link of postLinks) {
      const href = link.getAttribute("href") || "";
      const code = getPostShortcode(href);
      if (code && !skipSet.has(code.toLowerCase())) {
        const fullUrl = new URL(href, location.origin).href;
        return {
          ok: true,
          nextUrl: fullUrl,
          postKey: code,
        };
      }
    }

    throw new Error("Không tìm thấy bài viết nào mới trên Instagram để tương tác.");
  }

  async function createInstagramComment(text, postKey) {
    if (!text) throw new Error("Nội dung bình luận Instagram rỗng.");

    await sleep(1000);

    // Look for comment textarea or contenteditable
    let textarea = document.querySelector(
      "textarea[aria-label*='bình luận' i], textarea[aria-label*='comment' i], textarea[placeholder*='bình luận' i], textarea[placeholder*='comment' i], form textarea"
    );

    if (!textarea) {
      // Sometimes we need to click the comment icon first
      const commentIcon = document.querySelector("svg[aria-label*='Bình luận' i], svg[aria-label*='Comment' i]");
      if (commentIcon) {
        const btn = commentIcon.closest("button, [role='button']") || commentIcon;
        btn.click();
        await sleep(1000);
      }
      textarea = document.querySelector(
        "textarea[aria-label*='bình luận' i], textarea[aria-label*='comment' i], textarea[placeholder*='bình luận' i], textarea[placeholder*='comment' i], form textarea"
      );
    }

    if (!textarea) {
      throw new Error("Không tìm thấy ô nhập bình luận trên bài viết Instagram này (có thể đã bị khoá bình luận).");
    }

    textarea.scrollIntoView({ block: "center", behavior: "smooth" });
    await sleep(500);
    textarea.focus();
    await sleep(300);

    // Set value for React
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, text);
    } else {
      textarea.value = text;
    }
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    document.execCommand("insertText", false, "");
    await sleep(600);

    // Find submit button: "Đăng" or "Post"
    const form = textarea.closest("form") || document;
    const buttons = Array.from(form.querySelectorAll("button, div[role='button']"));
    let submitBtn = buttons.find((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      return t === "đăng" || t === "post";
    });

    if (!submitBtn) {
      submitBtn = form.querySelector("button[type='submit']");
    }

    if (!submitBtn || submitBtn.disabled) {
      throw new Error("Không tìm thấy hoặc nút Đăng bình luận Instagram bị vô hiệu.");
    }

    submitBtn.click();
    await sleep(2500);

    return {
      ok: true,
      postKey: postKey || getPostShortcode(location.href),
      text,
    };
  }

  async function scrollInstagramFeed({ rounds = 6, autoLike = true, likeDelay = 4, autoFollow = false } = {}) {
    let scrolled = 0;
    let likedCount = 0;
    let followedCount = 0;

    for (let i = 0; i < rounds; i++) {
      const delta = 450 + Math.floor(Math.random() * 300);
      window.scrollBy({ top: delta, behavior: "smooth" });
      scrolled++;
      await sleep(2000 + Math.floor(Math.random() * 1500));

      if (autoLike && i % 2 === 0) {
        // Find like buttons: svg with aria-label="Thích" or "Like"
        const likeSvgs = Array.from(
          document.querySelectorAll("svg[aria-label='Thích'], svg[aria-label='Like']")
        );
        for (const svg of likeSvgs) {
          const rect = svg.getBoundingClientRect();
          if (rect.top > 0 && rect.bottom < window.innerHeight) {
            const btn = svg.closest("button, [role='button']") || svg;
            await sleep(likeDelay * 1000);
            btn.click();
            likedCount++;
            await sleep(800);
            break;
          }
        }
      }

      if (autoFollow && i === 1) {
        const followButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
          const t = (b.textContent || "").trim();
          return t === "Theo dõi" || t === "Follow";
        });
        if (followButtons.length > 0) {
          const target = followButtons[0];
          target.click();
          followedCount++;
          await sleep(1000);
        }
      }
    }

    const postsSeen = document.querySelectorAll("article").length;
    return {
      ok: true,
      scrolled,
      postsSeen,
      likedCount,
      followedCount,
    };
  }

  async function followInstagramProfile() {
    await sleep(1200);
    const buttons = Array.from(document.querySelectorAll("header button"));
    const followBtn = buttons.find((btn) => {
      const t = (btn.textContent || "").trim();
      return t === "Theo dõi" || t === "Follow";
    });

    if (!followBtn) {
      const already = buttons.find((btn) => {
        const t = (btn.textContent || "").trim().toLowerCase();
        return t.includes("đang theo dõi") || t.includes("following") || t.includes("đã yêu cầu") || t.includes("requested");
      });
      if (already) return { ok: true, skipped: true, alreadyFollowed: true };
      throw new Error("Không tìm thấy nút Theo dõi trên trang Instagram cá nhân này.");
    }

    followBtn.click();
    await sleep(1500);
    return { ok: true, followed: true };
  }
})();
