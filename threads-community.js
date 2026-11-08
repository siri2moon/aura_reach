/**
 * threads-community.js — tìm và tham gia Communities trên Threads (Threads › Cộng đồng). Được background.js
 * nạp bằng importScripts, dùng chung log, getState, openWorkTab, sleep, humanGate, humanRecordAction,
 * getActiveProject, parseKeywords (group-search.js) và ProjectsCore.
 *
 * Threads không có nhóm như Facebook. Community do Meta tạo sẵn theo chủ đề ("Gaming Threads",
 * "Meme Threads"…) và trang của nó chính là trang chủ đề: threads.com/search?q=<tên>&serp_type=tags.
 * Trang chủ đề thường cũng có dạng đó nhưng không có nút Join, nên:
 *   - Tìm: đọc các chủ đề hiện trên trang tìm kiếm theo từ khoá, chấm điểm theo dự án, người dùng chọn.
 *   - Tham gia: mở trang chủ đề, có nút Join thì bấm; không có thì ghi nhớ "không phải community".
 *
 * Danh sách tên trong ô và từ khoá đổi theo dự án (SCOPED_KEYS); những gì đã tham gia thuộc về tài khoản
 * nên nhớ chung (threadsCommunityDone).
 */

const THREADS_COMMUNITY_ALARM = "threads-community-tick";
const THREADS_COMMUNITY_TAB_KEY = "threadsCommunityTabId";
const THREADS_COMMUNITY_MAX_RESULTS = 120;
const MIN_THREADS_COMMUNITY_MINUTES = 5;
const DEFAULT_THREADS_COMMUNITY_MIN = 10;
const DEFAULT_THREADS_COMMUNITY_MAX = 25;

function threadsCommunityUrl(nameOrUrl) {
  const value = String(nameOrUrl || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://www.threads.com/search?q=${encodeURIComponent(value)}&serp_type=tags`;
}

function threadsCommunityKey(name) {
  return String(name || "").trim().toLowerCase();
}

function parseCommunityList(text) {
  const seen = new Set();
  const out = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const name = line.trim();
    const key = threadsCommunityKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

async function threadsCommunitySearchState() {
  const { threadsCommunitySearch } = await chrome.storage.local.get("threadsCommunitySearch");
  return threadsCommunitySearch || { running: false, at: 0, summary: "", results: [] };
}

async function threadsCommunityDone() {
  const { threadsCommunityDone: done } = await chrome.storage.local.get("threadsCommunityDone");
  return done || {};
}

async function threadsCommunityPublicState() {
  const state = await getState();
  const project = await getActiveProject();
  const done = await threadsCommunityDone();
  // Chrome khởi động lại có thể mất alarm: lượt kế đã quá hạn vài phút mà không còn alarm thì hẹn lại,
  // để hàng đợi không treo. Chờ quá hạn hẳn để không chen vào lúc một lượt đang chạy (alarm vừa nổ).
  const overdue = Number(state.threadsCommunityNextAt) < Date.now() - 3 * 60 * 1000;
  if (state.threadsCommunityEnabled && overdue && !(await chrome.alarms.get(THREADS_COMMUNITY_ALARM))) {
    await scheduleThreadsCommunityNext();
  }
  return {
    ok: true,
    search: await threadsCommunitySearchState(),
    suggested: project ? project.groupKeywords : [],
    project: project ? { id: project.id, name: project.name } : null,
    queue: {
      enabled: Boolean(state.threadsCommunityEnabled),
      items: state.threadsCommunityQueue || [],
      index: Number(state.threadsCommunityIndex) || 0,
      nextAt: state.threadsCommunityNextAt || null,
      minMinutes: Number(state.threadsCommunityMinMinutes) || DEFAULT_THREADS_COMMUNITY_MIN,
      maxMinutes: Number(state.threadsCommunityMaxMinutes) || DEFAULT_THREADS_COMMUNITY_MAX,
    },
    joined: Object.entries(done)
      .filter(([, v]) => v.status === "joined")
      .map(([, v]) => v.name),
  };
}

async function handleThreadsCommunityMessage(message) {
  switch (message.type) {
    case "THREADS_COMMUNITY_GET":
      return threadsCommunityPublicState();
    case "THREADS_COMMUNITY_SEARCH":
      return runThreadsCommunitySearch(message.keywords);
    case "THREADS_COMMUNITY_CLEAR":
      await chrome.storage.local.set({ threadsCommunitySearch: { running: false, at: 0, summary: "", results: [] } });
      return threadsCommunityPublicState();
    case "THREADS_COMMUNITY_START":
      return startThreadsCommunity(message.settings);
    case "THREADS_COMMUNITY_STOP":
      await stopThreadsCommunity("Đã dừng hàng đợi tham gia cộng đồng Threads.");
      return threadsCommunityPublicState();
    default:
      return { ok: false, error: `Unknown message ${message.type}` };
  }
}

async function runThreadsCommunitySearch(keywordsText) {
  const current = await threadsCommunitySearchState();
  if (current.running && Date.now() - (current.at || 0) < 10 * 60 * 1000) {
    return { ok: false, error: "Đang tìm rồi, đợi lượt này xong nhé." };
  }
  const keywords = parseKeywords(keywordsText);
  if (!keywords.length) return { ok: false, error: "Nhập ít nhất 1 từ khoá." };
  const project = await getActiveProject();
  if (!project) return { ok: false, error: "Chọn dự án trước khi tìm cộng đồng." };

  const done = await threadsCommunityDone();
  const byKey = new Map();
  const save = (running, summary) =>
    chrome.storage.local.set({
      threadsCommunitySearch: {
        running,
        at: Date.now(),
        summary,
        results: [...byKey.values()]
          .sort((a, b) => b.relevance - a.relevance || b.hits - a.hits)
          .slice(0, THREADS_COMMUNITY_MAX_RESULTS),
      },
    });

  await save(true, "Đang tìm...");
  let errors = 0;
  try {
    // Mỗi từ khoá là một lần điều hướng tab thật, phải tuần tự.
    for (const keyword of keywords) {
      const url = ProjectsCore.searchUrl("threads", keyword);
      await log("info", `Đang tìm cộng đồng Threads: «${keyword}»`);
      try {
        const tab = await openWorkTab(url, { active: true, tabIdKey: THREADS_COMMUNITY_TAB_KEY });
        const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectThreadsTagsInPage });
        const tags = Array.isArray(res?.result) ? res.result : [];
        for (const tag of tags) {
          const key = threadsCommunityKey(tag.name);
          if (done[key]) continue;
          const seen = byKey.get(key);
          if (seen) seen.hits += tag.hits;
          else byKey.set(key, { ...tag, keyword, relevance: ProjectsCore.communityRelevance(project, tag.name) });
        }
      } catch (error) {
        errors += 1;
        await log("error", `Tìm cộng đồng «${keyword}» lỗi: ${error.message || error}`);
      }
      await save(true, `Đang tìm... đã thấy ${byKey.size} chủ đề chưa tham gia.`);
      await sleep(2500 + Math.round(Math.random() * 3000));
    }
  } finally {
    const relevant = [...byKey.values()].filter((t) => t.relevance === 2).length;
    const summary = `Tìm ${keywords.length} từ khoá: ${byKey.size} chủ đề chưa tham gia, ${relevant} rất hợp với ${project.name}${errors ? `, ${errors} từ khoá lỗi` : ""}. Chủ đề không có nút Join sẽ được bỏ qua lúc tham gia.`;
    await save(false, summary);
    await log("success", summary);
  }
  return threadsCommunityPublicState();
}

async function startThreadsCommunity(settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.threadsCommunityEnabled) {
    return { ok: false, error: "Đang có hàng đợi tham gia cộng đồng. Dừng hàng đợi hiện tại trước." };
  }
  const min = Number(state.threadsCommunityMinMinutes) || DEFAULT_THREADS_COMMUNITY_MIN;
  const max = Number(state.threadsCommunityMaxMinutes) || DEFAULT_THREADS_COMMUNITY_MAX;
  if (min < MIN_THREADS_COMMUNITY_MINUTES || max < min) {
    return { ok: false, error: `Giãn cách không hợp lệ. Min ≥ ${MIN_THREADS_COMMUNITY_MINUTES} phút và Max ≥ Min.` };
  }
  const done = await threadsCommunityDone();
  const queue = parseCommunityList(state.threadsCommunityListText).filter((name) => !done[threadsCommunityKey(name)]);
  if (!queue.length) {
    return { ok: false, error: "Danh sách trống hoặc mọi cộng đồng trong danh sách đã xử lý rồi." };
  }

  await chrome.storage.local.set({
    threadsCommunityEnabled: true,
    threadsCommunityQueue: queue,
    threadsCommunityIndex: 0,
    threadsCommunityNextAt: Date.now(),
  });
  await log("info", `Bắt đầu tham gia ${queue.length} cộng đồng Threads, mỗi lần một cộng đồng.`);
  await runThreadsCommunityStep("manual");
  return threadsCommunityPublicState();
}

async function stopThreadsCommunity(reason) {
  await chrome.alarms.clear(THREADS_COMMUNITY_ALARM);
  await chrome.storage.local.set({
    threadsCommunityEnabled: false,
    threadsCommunityQueue: [],
    threadsCommunityIndex: 0,
    threadsCommunityNextAt: null,
  });
  if (reason) await log("info", reason);
}

async function runThreadsCommunityStep(source) {
  const state = await getState();
  if (!state.threadsCommunityEnabled) return;
  const queue = state.threadsCommunityQueue || [];
  const index = Number(state.threadsCommunityIndex) || 0;
  if (index >= queue.length) {
    await stopThreadsCommunity("Đã xong hàng đợi cộng đồng Threads.");
    return;
  }

  if (source === "scheduled") {
    const gate = await humanGate("threads");
    if (gate.mode === "defer") {
      const mins = Math.max(1, gate.retryMinutes);
      await chrome.alarms.create(THREADS_COMMUNITY_ALARM, { delayInMinutes: mins });
      await chrome.storage.local.set({ threadsCommunityNextAt: Date.now() + mins * 60 * 1000 });
      await log("info", `[Cộng đồng Threads] ${gate.reason}`);
      return;
    }
    await humanRecordAction("threads");
  }

  const name = queue[index];
  await log("info", `Tham gia cộng đồng Threads ${index + 1}/${queue.length}: «${name}».`);
  let stop = "";
  try {
    const tab = await openWorkTab(threadsCommunityUrl(name), { active: true, tabIdKey: THREADS_COMMUNITY_TAB_KEY });
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: joinThreadsCommunityInPage });
    const result = res?.result || { ok: false, error: "Không đọc được trang cộng đồng." };
    if (result.loggedOut) {
      stop = "Đã dừng vì Threads chưa đăng nhập. Đăng nhập Threads trong Chrome rồi chạy lại.";
      throw new Error("Threads chưa đăng nhập.");
    }
    if (!result.ok) throw new Error(result.error || "Tham gia thất bại.");

    const done = await threadsCommunityDone();
    done[threadsCommunityKey(name)] = { name, status: result.status === "not_community" ? "not_community" : "joined", at: Date.now() };
    await chrome.storage.local.set({ threadsCommunityDone: done });
    const label = {
      joined: "thành công",
      already: "đã là thành viên từ trước",
      not_community: "không phải community (chỉ là chủ đề, không có nút Join), bỏ qua",
    };
    await log(result.status === "not_community" ? "info" : "success", `Cộng đồng «${name}»: ${label[result.status] || label.joined}.`);
  } catch (error) {
    await log("error", `Tham gia cộng đồng «${name}» thất bại: ${error.message || error}`);
  }

  await chrome.storage.local.set({ threadsCommunityIndex: index + 1 });
  if (stop) {
    await stopThreadsCommunity(stop);
    return;
  }
  if (index + 1 >= queue.length) {
    await stopThreadsCommunity("Đã xong hàng đợi cộng đồng Threads.");
    return;
  }
  await scheduleThreadsCommunityNext();
}

async function scheduleThreadsCommunityNext() {
  const state = await getState();
  const min = Math.max(MIN_THREADS_COMMUNITY_MINUTES, Number(state.threadsCommunityMinMinutes) || DEFAULT_THREADS_COMMUNITY_MIN);
  const max = Math.max(min, Number(state.threadsCommunityMaxMinutes) || DEFAULT_THREADS_COMMUNITY_MAX);
  const delay = min + Math.random() * (max - min);
  await chrome.alarms.create(THREADS_COMMUNITY_ALARM, { delayInMinutes: delay });
  await chrome.storage.local.set({ threadsCommunityNextAt: Date.now() + delay * 60 * 1000 });
  await log("info", `Cộng đồng Threads tiếp theo sau khoảng ${Math.round(delay)} phút.`);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== THREADS_COMMUNITY_ALARM) return;
  const state = await getState();
  if (state.threadsCommunityEnabled) await runThreadsCommunityStep("scheduled");
});

// Chạy trong trang tìm kiếm Threads (chrome.scripting): phải tự chứa, không dùng biến ngoài.
async function collectThreadsTagsInPage() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  for (let i = 0; i < 20 && !document.querySelector('a[href*="serp_type=tags"]'); i += 1) await wait(400);
  const found = new Map();
  const counted = new WeakSet();
  const collect = () => {
    for (const a of document.querySelectorAll('a[href*="serp_type=tags"]')) {
      // Mỗi lần cuộn đọc lại cả trang: link đã đếm thì bỏ qua để số lần xuất hiện không bị nhân lên.
      if (counted.has(a)) continue;
      counted.add(a);
      let url;
      try {
        url = new URL(a.getAttribute("href"), location.origin);
      } catch {
        continue;
      }
      const name = String(url.searchParams.get("q") || a.innerText || "").trim();
      if (!name || name.length > 60) continue;
      const key = name.toLowerCase();
      const seen = found.get(key);
      if (seen) seen.hits += 1;
      else found.set(key, { name, url: `${location.origin}/search?q=${encodeURIComponent(name)}&serp_type=tags`, hits: 1 });
    }
  };
  collect();
  for (let i = 0; i < 4; i += 1) {
    window.scrollBy(0, Math.round(window.innerHeight * 0.9));
    await wait(900 + Math.round(Math.random() * 700));
    collect();
  }
  return [...found.values()];
}

// Chạy trong trang chủ đề Threads (chrome.scripting): phải tự chứa, không dùng biến ngoài.
// Trả về { ok, status: "joined" | "already" | "not_community" } hoặc { ok: false, loggedOut | error }.
async function joinThreadsCommunityInPage() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const JOIN = ["join", "tham gia"];
  const JOINED = ["joined", "đã tham gia", "leave", "rời khỏi", "member", "thành viên"];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== "hidden";
  };
  const labelOf = (el) =>
    String(el.innerText || el.getAttribute("aria-label") || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  // Nút của community nằm ở phần đầu trang, trước mọi bài viết: lấy nút khớp đầu tiên theo thứ tự DOM.
  const findButton = (labels) =>
    [...document.querySelectorAll('[role="button"], button')].find((el) => visible(el) && labels.includes(labelOf(el))) || null;

  for (let i = 0; i < 25 && !document.querySelector('h1, [role="heading"]'); i += 1) await wait(400);
  await wait(1200 + Math.round(Math.random() * 800));

  const loginLink = [...document.querySelectorAll('a[href*="/login"]')].find((a) => visible(a) && /log in|đăng nhập/i.test(a.innerText || ""));
  if (loginLink) return { ok: false, loggedOut: true };

  if (findButton(JOINED)) return { ok: true, status: "already" };
  const join = findButton(JOIN);
  if (!join) return { ok: true, status: "not_community" };

  join.scrollIntoView({ block: "center" });
  await wait(400 + Math.round(Math.random() * 500));
  join.click();
  for (let i = 0; i < 20; i += 1) {
    await wait(400);
    if (findButton(JOINED) || !join.isConnected || !JOIN.includes(labelOf(join))) return { ok: true, status: "joined" };
  }
  return { ok: false, error: "Đã bấm Join nhưng nút không chuyển sang Joined." };
}
