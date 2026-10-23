/**
 * follow-discover.js — tìm tài khoản để follow theo từ khoá của dự án đang chọn, khi danh sách follow
 * chỉ định đang trống hoặc đã follow hết. Được background.js nạp bằng importScripts, dùng chung
 * openWorkTab, sleep, log, parseUrlList, evaluateThreadsContentGateBatch, getActiveProject, ProjectsCore.
 *
 * "handle" của ứng viên là @username, riêng YouTube là link kênh đầy đủ (khớp youtubeSubscribedKeys).
 *
 * Mỗi lượt: mở một trang tìm kiếm theo từ khoá dự án → đọc tác giả các bài đang hiện → AI chấm cả lô
 * một lần theo tiêu chí lọc của dự án → follow người đầu tiên đạt. Người bị chấm trượt được nhớ lại
 * (followDiscoverRejected) để lượt sau không tốn AI chấm lại.
 */

const FOLLOW_DISCOVER_REJECTED_KEY = "followDiscoverRejected";
const FOLLOW_DISCOVER_BATCH = 8;
// Instagram: trang hashtag chỉ có lưới ảnh, phải mở từng bài mới biết tác giả nên mỗi lượt mở ít bài.
const FOLLOW_DISCOVER_INSTAGRAM_POSTS = 3;

const FOLLOW_DISCOVER_PLATFORMS = {
  threads: { label: "Threads", sourceKey: "threadsSourcesText", tabIdKey: "threadsWorkTabId" },
  instagram: { label: "Instagram", sourceKey: "instagramSourcesText", tabIdKey: "instagramWorkTabId" },
  x: { label: "X", sourceKey: "xSourcesText", tabIdKey: "xWorkTabId" },
  tiktok: { label: "TikTok", sourceKey: "tiktokSourcesText", tabIdKey: "tiktokWorkTabId" },
  // YouTube: ô từ khoá là chữ, không phải link, nên tự dựng trang kết quả tìm kiếm.
  youtube: {
    label: "YouTube",
    sourceKey: "youtubeKeywordsText",
    tabIdKey: "youtubeWorkTabId",
    toUrl: (keyword) => `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
  },
};

function followDisplayName(handle) {
  return /^https?:\/\//i.test(handle) ? handle : `@${handle}`;
}

function followDiscoverFilterPrompt(project) {
  return [
    ProjectsCore.topicFilter(project),
    project.audience && `Người viết nên thuộc đối tượng: ${project.audience}.`,
    "Kết quả dùng để quyết định có follow tác giả hay không: loại bot, tài khoản spam, shop chỉ đăng quảng cáo, bài lạc chủ đề.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Trả về { target: { handle, text, url }, project } khi tìm được người phù hợp, { none: true } khi lượt
 * này không có ai, hoặc { error } khi không tìm được vì thiếu dự án / từ khoá.
 */
async function discoverFollowTarget(platform, followedKeys) {
  const meta = FOLLOW_DISCOVER_PLATFORMS[platform];
  const project = await getActiveProject();
  if (!project) return { error: `Danh sách follow ${meta.label} đang trống và chưa chọn dự án để tìm theo từ khoá.` };
  const raw = parseUrlList(ProjectsCore.scopedDefaults(project)[meta.sourceKey]);
  const sources = meta.toUrl ? raw.map(meta.toUrl) : raw;
  if (!sources.length) return { error: `Hồ sơ dự án ${project.name} chưa có từ khoá tìm kiếm cho ${meta.label}.` };

  const source = sources[Math.floor(Math.random() * sources.length)];
  await log("info", `Đang tìm tài khoản ${meta.label} liên quan ${project.name}: ${source}`);
  const tab = await openWorkTab(source, { active: true, tabIdKey: meta.tabIdKey });
  await sleep(3000);

  const stored = (await chrome.storage.local.get(FOLLOW_DISCOVER_REJECTED_KEY))[FOLLOW_DISCOVER_REJECTED_KEY] || {};
  const skip = new Set([...(followedKeys || []), ...(stored[platform] || [])].map((k) => String(k).toLowerCase()));

  const found =
    platform === "instagram"
      ? await instagramFollowCandidates(tab, meta.tabIdKey, skip)
      : await pageFollowCandidates(tab, platform);
  const candidates = found.filter((c) => c.handle && !skip.has(c.handle.toLowerCase())).slice(0, FOLLOW_DISCOVER_BATCH);
  if (!candidates.length) return { none: true };

  await log("info", `AI đang xem ${candidates.length} tài khoản ${meta.label} có hợp với ${project.name} không...`);
  const allowed = await evaluateThreadsContentGateBatch({
    filterPrompt: followDiscoverFilterPrompt(project),
    ignoreOnError: false,
    posts: candidates,
  });
  const rejected = candidates.filter((_, i) => !allowed[i]).map((c) => c.handle.toLowerCase());
  if (rejected.length) {
    const next = { ...stored, [platform]: [...rejected, ...(stored[platform] || [])].slice(0, MAX_HISTORY) };
    await chrome.storage.local.set({ [FOLLOW_DISCOVER_REJECTED_KEY]: next });
  }
  const target = candidates.find((_, i) => allowed[i]);
  return target ? { target, project } : { none: true, rejected: rejected.length };
}

async function pageFollowCandidates(tab, platform) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractFollowCandidatesInPage,
    args: [platform],
  });
  return Array.isArray(res?.result) ? res.result : [];
}

async function instagramFollowCandidates(tab, tabIdKey, skip) {
  const posts = await pageFollowCandidates(tab, "instagram");
  const picked = posts.sort(() => Math.random() - 0.5).slice(0, FOLLOW_DISCOVER_INSTAGRAM_POSTS);
  const out = [];
  // Mỗi bài là một lần điều hướng tab thật, phải tuần tự; không có cách đọc tác giả từ lưới hashtag.
  for (const post of picked) {
    const postTab = await openWorkTab(post.url, { active: true, tabIdKey });
    await sleep(3500);
    const [res] = await chrome.scripting.executeScript({ target: { tabId: postTab.id }, func: extractInstagramAuthorInPage });
    const item = res?.result;
    if (item?.handle && !skip.has(item.handle.toLowerCase()) && !out.some((o) => o.handle === item.handle)) out.push(item);
  }
  return out;
}

// Chạy trong trang tìm kiếm (chrome.scripting): phải tự chứa, không dùng biến ngoài.
async function extractFollowCandidatesInPage(platform) {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const textOf = (el) => String(el?.innerText || "").replace(/\n{2,}/g, "\n").trim().slice(0, 600);
  const boxOf = (a) => {
    let box = a;
    for (let i = 0; i < 8 && box.parentElement; i += 1) {
      box = box.parentElement;
      if (String(box.innerText || "").length > 160) break;
    }
    return box;
  };
  const abs = (href) => {
    try {
      return new URL(href, location.origin);
    } catch {
      return null;
    }
  };
  const collect = () => {
    const out = new Map();
    if (platform === "youtube") {
      for (const card of document.querySelectorAll("ytd-video-renderer")) {
        const link = card.querySelector('ytd-channel-name a[href], #channel-info a[href], a.yt-simple-endpoint[href^="/@"]');
        const url = abs(link?.getAttribute("href") || "");
        const m = url?.pathname.match(/^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/);
        if (!m) continue;
        const channel = `https://www.youtube.com/${decodeURIComponent(m[1])}`;
        if (out.has(channel.toLowerCase())) continue;
        const name = textOf(card.querySelector("ytd-channel-name")).split("\n")[0];
        const title = textOf(card.querySelector("#video-title"));
        const snippet = textOf(card.querySelector(".metadata-snippet-text, #description-text"));
        out.set(channel.toLowerCase(), { handle: channel, text: `Kênh ${name || m[1]} — video: ${title}${snippet ? `\n${snippet}` : ""}`, url: channel });
      }
    } else if (platform === "x") {
      for (const art of document.querySelectorAll('article[data-testid="tweet"]')) {
        const href = art.querySelector('[data-testid="User-Name"] a[href^="/"]')?.getAttribute("href") || "";
        const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
        if (!m || out.has(m[1].toLowerCase())) continue;
        const status = abs(art.querySelector('a[href*="/status/"]')?.getAttribute("href") || "");
        const text = textOf(art.querySelector('[data-testid="tweetText"]')) || textOf(art);
        out.set(m[1].toLowerCase(), { handle: m[1], text: `@${m[1]}: ${text}`, url: status ? status.href.split("?")[0] : "" });
      }
    } else if (platform === "instagram") {
      for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const url = abs(a.getAttribute("href"));
        if (url) out.set(url.pathname, { url: url.href.split("?")[0] });
      }
    } else {
      const re = platform === "threads" ? /^\/@([A-Za-z0-9._]{1,30})\/post\// : /^\/@([A-Za-z0-9._]{2,24})\/video\//;
      for (const a of document.querySelectorAll('a[href*="/@"]')) {
        const url = abs(a.getAttribute("href"));
        const m = url?.pathname.match(re);
        if (!m || out.has(m[1].toLowerCase())) continue;
        out.set(m[1].toLowerCase(), { handle: m[1], text: `@${m[1]}: ${textOf(boxOf(a))}`, url: url.href.split("?")[0] });
      }
    }
    return [...out.values()];
  };
  let items = collect();
  for (let i = 0; i < 3 && items.length < 12; i += 1) {
    window.scrollBy(0, window.innerHeight * 1.5);
    await wait(1800);
    items = collect();
  }
  return items;
}

// Chạy trong trang một bài Instagram: lấy @handle tác giả và chú thích bài.
// Giao diện bài mới (2026) không còn thẻ <header>: đọc từ meta description
// ("37K likes, 230 comments - handle on July 13, 2026: \"caption\""), dự phòng link hồ sơ đầu tiên trong <main>.
function extractInstagramAuthorInPage() {
  const reserved = new Set(["explore", "reels", "reel", "p", "stories", "accounts", "direct"]);
  const desc =
    document.querySelector('meta[name="description"]')?.content ||
    document.querySelector('meta[property="og:description"]')?.content ||
    "";
  let handle = (desc.match(/ - ([A-Za-z0-9._]{1,30})(?=\s)/) || [])[1] || "";
  if (!handle) {
    for (const a of document.querySelectorAll('main a[href^="/"], header a[href^="/"], div[role="dialog"] a[href^="/"]')) {
      const m = (a.getAttribute("href") || "").match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      if (m && !reserved.has(m[1].toLowerCase())) {
        handle = m[1];
        break;
      }
    }
  }
  const quoted = (text) => (String(text || "").match(/:\s*"([\s\S]*)"?\s*\.?\s*$/) || [])[1] || "";
  const caption = (
    quoted(desc) ||
    quoted(document.querySelector('meta[property="og:title"]')?.content) ||
    String(document.querySelector("h1")?.innerText || "")
  )
    .replace(/"\s*\.?\s*$/, "")
    .trim();
  return { handle, text: `@${handle}: ${caption.slice(0, 600)}`, url: location.href.split("?")[0] };
}

/**
 * Dùng trong các job follow khi danh sách chỉ định đã hết: trả về @handle cần follow, hoặc null khi lượt
 * này không tìm được ai (đã ghi log). Lỗi thiếu dự án / từ khoá thì ném ra để job báo lỗi như cũ.
 */
async function pickDiscoveredFollowHandle(platform, followedKeys) {
  const label = FOLLOW_DISCOVER_PLATFORMS[platform].label;
  const found = await discoverFollowTarget(platform, followedKeys);
  if (found.error) throw new Error(found.error);
  if (!found.target) {
    await log(
      "info",
      found.rejected
        ? `${found.rejected} tài khoản ${label} vừa tìm thấy không hợp dự án. Lượt sau tìm tiếp từ khoá khác.`
        : `Chưa thấy tài khoản ${label} mới nào theo từ khoá dự án. Lượt sau tìm tiếp.`
    );
    return null;
  }
  await log("info", `Tìm thấy ${followDisplayName(found.target.handle)} hợp với ${found.project.name}: ${clip(found.target.text, 100)}`);
  return found.target.handle;
}
