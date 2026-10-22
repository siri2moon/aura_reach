/**
 * group-search.js — tìm nhóm Facebook theo từ khoá (Facebook › Nhóm). Được background.js nạp bằng
 * importScripts, dùng chung log, getState, openWorkTab, sendToTab, sleep.
 *
 * Từ khoá gợi ý và điểm hợp của nhóm lấy theo dự án đang chọn (projects-core.js).
 * Chỉ đọc trang kết quả tìm kiếm và trả về danh sách để người dùng chọn. Việc tham gia vẫn đi qua
 * hàng đợi "Tự động tham gia nhóm mới" có sẵn, với giãn cách của nó.
 */

const GROUP_SEARCH_MAX_KEYWORDS = 10;
const GROUP_SEARCH_MAX_RESULTS = 200;

async function groupSearchState() {
  const { groupSearch } = await chrome.storage.local.get("groupSearch");
  return groupSearch || { running: false, at: 0, summary: "", results: [] };
}

async function handleGroupSearchMessage(message) {
  switch (message.type) {
    case "GROUP_SEARCH_GET": {
      const project = await getActiveProject();
      return {
        ok: true,
        groupSearch: await groupSearchState(),
        suggested: project ? project.groupKeywords : [],
        project: project ? { id: project.id, name: project.name } : null,
      };
    }
    case "GROUP_SEARCH_RUN":
      return runGroupSearch(message.keywords);
    case "GROUP_SEARCH_CLEAR":
      await chrome.storage.local.set({ groupSearch: { running: false, at: 0, summary: "", results: [] } });
      return { ok: true, groupSearch: await groupSearchState() };
    default:
      return { ok: false, error: `Unknown message ${message.type}` };
  }
}

function parseKeywords(text) {
  const seen = new Set();
  const out = [];
  for (const line of String(text || "").split(/\r?\n|,/)) {
    const kw = line.trim();
    const key = kw.toLowerCase();
    if (!kw || seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
  }
  return out.slice(0, GROUP_SEARCH_MAX_KEYWORDS);
}

async function runGroupSearch(keywordsText) {
  const current = await groupSearchState();
  if (current.running && Date.now() - (current.at || 0) < 10 * 60 * 1000) {
    return { ok: false, error: "Đang tìm rồi, đợi lượt này xong nhé.", groupSearch: current };
  }
  const keywords = parseKeywords(keywordsText);
  if (!keywords.length) return { ok: false, error: "Nhập ít nhất 1 từ khoá.", groupSearch: current };

  const project = await getActiveProject();
  if (!project) return { ok: false, error: "Chọn dự án trước khi tìm nhóm.", groupSearch: current };
  const joined = new Set(((await getState()).groups || []).map((g) => String(g.id)));
  const byId = new Map();
  const save = (running, summary) =>
    chrome.storage.local.set({
      groupSearch: {
        running,
        at: Date.now(),
        summary,
        results: [...byId.values()]
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, GROUP_SEARCH_MAX_RESULTS),
      },
    });

  await save(true, "Đang tìm...");
  let errors = 0;
  try {
    for (const keyword of keywords) {
      const url = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(keyword)}`;
      await log("info", `Đang tìm nhóm: «${keyword}»`);
      try {
        const tab = await openWorkTab(url, { active: true });
        const res = await sendToTab(tab.id, { type: "SEARCH_GROUPS", limit: 40 });
        if (!res?.ok) throw new Error(res?.error || "Không đọc được kết quả tìm kiếm.");
        for (const g of res.groups || []) {
          if (joined.has(String(g.id)) || byId.has(g.id)) continue;
          byId.set(g.id, { ...g, keyword, relevance: ProjectsCore.groupRelevance(project, g.name) });
        }
      } catch (error) {
        errors += 1;
        await log("error", `Tìm nhóm «${keyword}» lỗi: ${error.message || error}`);
      }
      await save(true, `Đang tìm... đã thấy ${byId.size} nhóm chưa tham gia.`);
      await sleep(2500 + Math.round(Math.random() * 3000));
    }
  } finally {
    const relevant = [...byId.values()].filter((g) => g.relevance === 2).length;
    const summary = `Tìm ${keywords.length} từ khoá: ${byId.size} nhóm chưa tham gia, ${relevant} nhóm rất hợp với ${project.name}${errors ? `, ${errors} từ khoá lỗi` : ""}.`;
    await save(false, summary);
    await log("success", summary);
  }
  return { ok: true, groupSearch: await groupSearchState() };
}
