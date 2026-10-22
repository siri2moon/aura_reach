/**
 * nadezhno-bg.js — chế độ dự án "Nadezhno" cho job Bình luận Facebook. Được background.js nạp bằng
 * importScripts, dùng chung các hàm của background.js (log, getState, enabledGroups, openWorkTab,
 * sendToTab, generateAiComment, sleep, clip).
 *
 * Khi bật, mỗi lượt bình luận Facebook không còn bình luận một bài ngẫu nhiên nữa: nó tìm trong group
 * một bài đang hỏi xin địa chỉ tin cậy, lấy địa điểm thật từ API Nadezhno và viết câu trả lời có link.
 * Mặc định câu trả lời vào hàng chờ duyệt; tắt "Duyệt trước khi đăng" thì job tự đăng, trong giới hạn
 * mỗi ngày và giãn cách theo group.
 */

const NADEZHNO_MAX_GROUPS_PER_SCAN = 8;
const NADEZHNO_MAX_NEW_DRAFTS = 10;
const NADEZHNO_MAX_DRAFTS = 60;
const NADEZHNO_MAX_SEEN = 1500;

const NADEZHNO_DEFAULT_SETTINGS = {
  enabled: false,
  reviewFirst: true,
  defaultCity: "",
  dailyLimit: 5,
  groupGapHours: 4,
  useAi: true,
  aiPrompt: "",
  linkMode: "web",
};

async function nadezhnoLoad() {
  const data = await chrome.storage.local.get([
    "nadezhnoSettings",
    "nadezhnoDrafts",
    "nadezhnoSeen",
    "nadezhnoFills",
    "nadezhnoMisses",
    "nadezhnoScan",
  ]);
  return {
    settings: { ...NADEZHNO_DEFAULT_SETTINGS, ...(data.nadezhnoSettings || {}) },
    drafts: data.nadezhnoDrafts || [],
    seen: data.nadezhnoSeen || [],
    fills: data.nadezhnoFills || null,
    misses: data.nadezhnoMisses || {},
    scan: data.nadezhnoScan || { running: false, at: 0, summary: "" },
  };
}

function nadezhnoSanitizeSettings(input) {
  const s = { ...NADEZHNO_DEFAULT_SETTINGS, ...(input || {}) };
  const num = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), min), max) : fallback;
  };
  return {
    enabled: Boolean(s.enabled),
    reviewFirst: s.reviewFirst !== false,
    defaultCity: NadezhnoCore.cityById(s.defaultCity) ? s.defaultCity : "",
    // Trần cứng 15/ngày và tối thiểu 2 giờ/group: đủ để giúp người hỏi mà không thành spam.
    dailyLimit: num(s.dailyLimit, 1, 15, NADEZHNO_DEFAULT_SETTINGS.dailyLimit),
    groupGapHours: num(s.groupGapHours, 2, 48, NADEZHNO_DEFAULT_SETTINGS.groupGapHours),
    useAi: Boolean(s.useAi),
    aiPrompt: String(s.aiPrompt || "").slice(0, 6000),
    linkMode: s.linkMode === "telegram" ? "telegram" : "web",
  };
}

async function nadezhnoEnabled() {
  const { settings } = await nadezhnoLoad();
  return settings.enabled;
}

async function nadezhnoState() {
  const data = await nadezhnoLoad();
  const today = NadezhnoCore.todayKey();
  return {
    ...data,
    fillsToday: data.fills?.date === today ? data.fills.count || 0 : 0,
    defaultPrompt: NadezhnoCore.DEFAULT_AI_PROMPT,
  };
}

async function handleNadezhnoMessage(message) {
  switch (message.type) {
    case "NADEZHNO_GET_STATE":
      return { ok: true, nadezhno: await nadezhnoState() };
    case "NADEZHNO_SAVE_SETTINGS":
      await chrome.storage.local.set({ nadezhnoSettings: nadezhnoSanitizeSettings(message.settings) });
      return { ok: true, nadezhno: await nadezhnoState() };
    case "NADEZHNO_SCAN":
      if (message.settings) {
        await chrome.storage.local.set({ nadezhnoSettings: nadezhnoSanitizeSettings(message.settings) });
      }
      return nadezhnoScan();
    case "NADEZHNO_UPDATE_DRAFT":
      return nadezhnoPatchDraft(message.id, { text: String(message.text || "").slice(0, 2000) });
    case "NADEZHNO_SKIP":
      return nadezhnoPatchDraft(message.id, { status: "skipped" });
    case "NADEZHNO_FILL":
      return nadezhnoFill(message.id, message.text);
    case "NADEZHNO_CLEAR_DONE": {
      const { drafts } = await nadezhnoLoad();
      await chrome.storage.local.set({ nadezhnoDrafts: drafts.filter((d) => d.status === "new") });
      return { ok: true, nadezhno: await nadezhnoState() };
    }
    case "NADEZHNO_CLEAR_MISSES":
      await chrome.storage.local.set({ nadezhnoMisses: {} });
      return { ok: true, nadezhno: await nadezhnoState() };
    default:
      return { ok: false, error: `Unknown message ${message.type}` };
  }
}

async function nadezhnoPatchDraft(id, patch) {
  const { drafts } = await nadezhnoLoad();
  const next = drafts.map((d) => (d.id === id ? { ...d, ...patch } : d));
  await chrome.storage.local.set({ nadezhnoDrafts: next });
  return { ok: true, nadezhno: await nadezhnoState() };
}

async function nadezhnoFetchListings(cityId, categoryId) {
  const res = await fetch(NadezhnoCore.listingsApiUrl(cityId, categoryId), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`API Nadezhno lỗi ${res.status}`);
  const body = await res.json();
  return Array.isArray(body.listings) ? body.listings : [];
}

function nadezhnoGroupUrl(group) {
  return `https://www.facebook.com/groups/${encodeURIComponent(group.id)}/`;
}

/**
 * Từ danh sách bài vừa đọc trong một group, tạo câu trả lời cho các bài hỏi đúng chủ đề.
 * `run` giữ trạng thái chung của một lượt: seen, misses, cache API, bộ đếm.
 */
async function nadezhnoDraftsFromPosts(posts, groupUrl, groupName, run, max) {
  const out = [];
  for (const post of posts || []) {
    if (out.length >= max) break;
    const key = post.key || post.permalink;
    if (!key || run.seen.has(key)) continue;
    run.seen.add(key);
    run.scanned += 1;
    if (!post.permalink) continue;
    if (NadezhnoCore.alreadyMentioned(post.comments)) continue;

    const verdict = NadezhnoCore.classifyPost(post.text, { defaultCity: run.settings.defaultCity });
    if (verdict.skip) continue;
    run.matched += 1;

    const pairKey = `${verdict.cityId}|${verdict.categoryId}`;
    if (!run.listingCache.has(pairKey)) {
      try {
        run.listingCache.set(pairKey, await nadezhnoFetchListings(verdict.cityId, verdict.categoryId));
      } catch (error) {
        await log("error", `[Nadezhno] ${error.message || error}`);
        run.listingCache.set(pairKey, null);
      }
    }
    const listings = run.listingCache.get(pairKey);
    if (!listings) continue;
    if (!listings.length) {
      // Có người hỏi mà Nadezhno chưa có chỗ nào: ghi lại để biết nên bổ sung dữ liệu gì.
      run.misses[pairKey] = (run.misses[pairKey] || 0) + 1;
      continue;
    }

    const ctx = { ...verdict, listings, linkMode: run.settings.linkMode, postText: post.text };
    let text = "";
    let source = "template";
    if (run.settings.useAi) {
      try {
        const raw = await generateAiComment(
          run.settings.aiPrompt || NadezhnoCore.DEFAULT_AI_PROMPT,
          NadezhnoCore.buildAiUserMessage(ctx)
        );
        text = NadezhnoCore.finalizeAiDraft(raw, ctx);
        if (text) source = "ai";
      } catch (error) {
        await log("error", `[Nadezhno] AI lỗi, dùng mẫu: ${error.message || error}`);
      }
    }
    if (!text) text = NadezhnoCore.buildTemplateDraft(ctx);

    out.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupUrl,
      groupName: groupName || "",
      postKey: post.key || "",
      permalink: post.permalink,
      postText: clip(post.text, 600),
      cityId: verdict.cityId,
      categoryId: verdict.categoryId,
      cityFromText: verdict.cityFromText,
      listings: NadezhnoCore.pickListings(listings).map((l) => ({ id: l.id, name: l.name })),
      text,
      source,
      status: "new",
      createdAt: Date.now(),
    });
  }
  return out;
}

function nadezhnoNewRun(data) {
  return {
    settings: data.settings,
    seen: new Set(data.seen),
    misses: { ...data.misses },
    listingCache: new Map(),
    scanned: 0,
    matched: 0,
  };
}

async function nadezhnoSaveRun(run, newDrafts, scanPatch) {
  const latest = await nadezhnoLoad();
  const patch = {
    nadezhnoSeen: [...run.seen].slice(-NADEZHNO_MAX_SEEN),
    nadezhnoMisses: run.misses,
  };
  if (newDrafts.length) patch.nadezhnoDrafts = [...newDrafts, ...latest.drafts].slice(0, NADEZHNO_MAX_DRAFTS);
  if (scanPatch) patch.nadezhnoScan = scanPatch;
  await chrome.storage.local.set(patch);
}

async function nadezhnoReadGroup(groupUrl) {
  const tab = await openWorkTab(groupUrl, { active: true });
  const res = await sendToTab(tab.id, { type: "SCAN_FEED_POSTS", limit: 25 });
  if (!res?.ok) throw new Error(res?.error || "Không đọc được bảng tin group.");
  return { tab, posts: res.posts || [] };
}

/** Nút "Quét ngay": đọc các group đang chọn trong tab Facebook và đưa câu trả lời vào hàng chờ duyệt. */
async function nadezhnoScan() {
  const data = await nadezhnoLoad();
  if (data.scan.running && Date.now() - (data.scan.at || 0) < 15 * 60 * 1000) {
    return { ok: false, error: "Đang quét rồi, đợi lượt này xong nhé.", nadezhno: await nadezhnoState() };
  }
  const groups = enabledGroups(await getState()).slice(0, NADEZHNO_MAX_GROUPS_PER_SCAN);
  if (!groups.length) {
    return { ok: false, error: "Chưa chọn nhóm nào ở mục «Nhóm mục tiêu bình luận».", nadezhno: await nadezhnoState() };
  }

  await chrome.storage.local.set({ nadezhnoScan: { running: true, at: Date.now(), summary: "Đang quét..." } });
  const run = nadezhnoNewRun(data);
  let created = 0;
  const summary = () =>
    `Đã đọc ${run.scanned} bài mới, ${run.matched} bài là câu hỏi đúng chủ đề, tạo ${created} câu trả lời chờ duyệt.`;
  try {
    for (const group of groups) {
      if (created >= NADEZHNO_MAX_NEW_DRAFTS) break;
      const groupUrl = nadezhnoGroupUrl(group);
      await log("info", `[Nadezhno] Đang đọc «${group.name}»`);
      let posts;
      try {
        ({ posts } = await nadezhnoReadGroup(groupUrl));
      } catch (error) {
        await log("error", `[Nadezhno] Không đọc được «${group.name}»: ${error.message || error}`);
        continue;
      }
      const drafts = await nadezhnoDraftsFromPosts(posts, groupUrl, group.name, run, NADEZHNO_MAX_NEW_DRAFTS - created);
      created += drafts.length;
      // Lưu sau mỗi group: lượt quét dài có thể bị Chrome dừng service worker giữa chừng.
      await nadezhnoSaveRun(run, drafts, { running: true, at: Date.now(), summary: `Đang quét... ${summary()}` });
      await sleep(2500 + Math.round(Math.random() * 3500));
    }
  } finally {
    await nadezhnoSaveRun(run, [], { running: false, at: Date.now(), summary: summary() });
    await log("success", `[Nadezhno] ${summary()}`);
  }
  return { ok: true, nadezhno: await nadezhnoState() };
}

async function nadezhnoPostComment(permalink, postKey, text, submit) {
  const tab = await openWorkTab(permalink, { active: true });
  if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
  const res = await sendToTab(tab.id, { type: "CREATE_COMMENT", text, postKey, humanize: submit, submit });
  if (res && res.ok === false) throw new Error(res.error || "Không điền được ô bình luận.");
  return res || { ok: true };
}

/**
 * Một lượt của job Bình luận Facebook khi bật chế độ Nadezhno.
 * Trả về { kind: "none" } khi group không có bài phù hợp, { kind: "draft" } khi đã đưa vào hàng chờ,
 * hoặc { kind: "posted", text, postKey } khi đã tự đăng.
 */
async function nadezhnoCycleComment(group) {
  const data = await nadezhnoLoad();
  const groupUrl = nadezhnoGroupUrl(group);
  const { settings } = data;

  if (!settings.reviewFirst) {
    const gate = NadezhnoCore.fillAllowed(data.fills, {
      groupUrl,
      dailyLimit: settings.dailyLimit,
      groupGapHours: settings.groupGapHours,
    });
    if (!gate.ok) return { kind: "none", reason: gate.error };
  }

  const run = nadezhnoNewRun(data);
  const { posts } = await nadezhnoReadGroup(groupUrl);
  const [draft] = await nadezhnoDraftsFromPosts(posts, groupUrl, group.name, run, 1);
  if (!draft) {
    await nadezhnoSaveRun(run, []);
    return { kind: "none", reason: `Không có bài nào đang hỏi đúng chủ đề Nadezhno (đã đọc ${run.scanned} bài mới).` };
  }

  if (settings.reviewFirst) {
    await nadezhnoSaveRun(run, [draft]);
    return { kind: "draft", text: draft.text };
  }

  await sleep(900 + Math.round(Math.random() * 1800));
  await nadezhnoPostComment(draft.permalink, draft.postKey, draft.text, true);
  const latest = await nadezhnoLoad();
  await nadezhnoSaveRun(run, [{ ...draft, status: "posted", filledAt: Date.now() }]);
  await chrome.storage.local.set({ nadezhnoFills: NadezhnoCore.recordFill(latest.fills, { groupUrl }) });
  return { kind: "posted", text: draft.text, postKey: draft.postKey };
}

/** Nút "Mở bài & điền sẵn" trên một câu trả lời chờ duyệt: chỉ gõ sẵn, người dùng tự bấm Enter. */
async function nadezhnoFill(id, editedText) {
  const data = await nadezhnoLoad();
  const draft = data.drafts.find((d) => d.id === id);
  if (!draft) return { ok: false, error: "Không tìm thấy câu trả lời này.", nadezhno: await nadezhnoState() };
  if (draft.status !== "new") {
    return { ok: false, error: "Câu trả lời này đã xử lý rồi.", nadezhno: await nadezhnoState() };
  }
  const text = String(editedText ?? draft.text).trim();
  if (!text) return { ok: false, error: "Bình luận trống.", nadezhno: await nadezhnoState() };

  const gate = NadezhnoCore.fillAllowed(data.fills, {
    groupUrl: draft.groupUrl,
    dailyLimit: data.settings.dailyLimit,
    groupGapHours: data.settings.groupGapHours,
  });
  if (!gate.ok) return { ok: false, error: gate.error, nadezhno: await nadezhnoState() };

  try {
    await nadezhnoPostComment(draft.permalink, draft.postKey, text, false);
  } catch (error) {
    return { ok: false, error: error.message || String(error), nadezhno: await nadezhnoState() };
  }

  const latest = await nadezhnoLoad();
  await chrome.storage.local.set({
    nadezhnoFills: NadezhnoCore.recordFill(latest.fills, { groupUrl: draft.groupUrl }),
    nadezhnoDrafts: latest.drafts.map((d) => (d.id === id ? { ...d, text, status: "filled", filledAt: Date.now() } : d)),
  });
  await log("success", `[Nadezhno] Đã điền sẵn bình luận, chờ bạn bấm Enter: ${clip(text, 80)}`);
  return { ok: true, nadezhno: await nadezhnoState() };
}
