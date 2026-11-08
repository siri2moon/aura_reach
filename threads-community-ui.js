/**
 * threads-community-ui.js — Threads › Cộng đồng. Độc lập với popup.js: gọi các lệnh THREADS_COMMUNITY_*
 * của service worker (threads-community.js). Ô từ khoá và danh sách lưu thẳng vào chrome.storage dưới
 * key project-scoped (threadsCommunityKeywords, threadsCommunityListText) để đổi theo dự án.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    keywords: $("tcKeywords"),
    suggest: $("tcSuggestBtn"),
    run: $("tcRunBtn"),
    summary: $("tcSummary"),
    wrap: $("tcResultsWrap"),
    onlyRelevant: $("tcOnlyRelevant"),
    onlyRelevantLabel: $("tcOnlyRelevantText"),
    results: $("tcResults"),
    selectAll: $("tcSelectAll"),
    selectNone: $("tcSelectNone"),
    add: $("tcAddBtn"),
    list: $("tcList"),
    min: $("tcMinMinutes"),
    max: $("tcMaxMinutes"),
    status: $("tcStatus"),
    start: $("tcStartBtn"),
    stop: $("tcStopBtn"),
    joined: $("tcJoined"),
    dot: $("threadsTabDot-community"),
  };
  if (!els.results) return;

  const KEYWORDS_KEY = "threadsCommunityKeywords";
  const LIST_KEY = "threadsCommunityListText";
  let data = null;
  let renderedSig = "";
  const checked = new Set();
  const known = new Set();

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  const keyOf = (name) => String(name || "").trim().toLowerCase();

  function visible() {
    const min = els.onlyRelevant.checked ? 2 : 0;
    return (data?.search?.results || []).filter((t) => t.relevance >= min);
  }

  function renderResults(force) {
    const list = visible();
    const sig = `${els.onlyRelevant.checked}|${list.map((t) => keyOf(t.name)).join(",")}`;
    if (!force && sig === renderedSig) return;
    renderedSig = sig;
    els.wrap.hidden = !(data?.search?.results || []).length;
    if (!list.length) {
      els.results.innerHTML = '<p class="nz-empty">Không có chủ đề nào khớp. Bỏ tick ô lọc để xem tất cả.</p>';
      return;
    }
    els.results.innerHTML = list
      .map((t) => {
        const key = keyOf(t.name);
        return `<label class="gs-item">
          <input type="checkbox" data-key="${escapeHtml(key)}" ${checked.has(key) ? "checked" : ""} />
          <span class="gs-item-body">
            <a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(t.name)}</a>
            <span class="gs-item-meta">xuất hiện ${t.hits} lần · từ khoá «${escapeHtml(t.keyword)}»</span>
          </span>
        </label>`;
      })
      .join("");
  }

  function minutesUntil(at) {
    return Math.max(1, Math.round((Number(at) - Date.now()) / 60000));
  }

  function render(force) {
    if (!data) return;
    const search = data.search || {};
    els.summary.textContent = search.running ? search.summary || "Đang tìm..." : search.summary || "";
    els.run.disabled = Boolean(search.running);
    for (const t of search.results || []) {
      // Chủ đề rất hợp được chọn sẵn khi mới xuất hiện; sau đó giữ nguyên lựa chọn của người dùng.
      const key = keyOf(t.name);
      if (known.has(key)) continue;
      known.add(key);
      if (t.relevance === 2) checked.add(key);
    }
    renderResults(force);

    const q = data.queue || {};
    els.start.disabled = Boolean(q.enabled);
    els.stop.disabled = !q.enabled;
    if (els.dot) els.dot.classList.toggle("active", Boolean(q.enabled));
    if (q.enabled) {
      const done = Math.min(q.index, q.items.length);
      const next = q.nextAt && Number(q.nextAt) > Date.now() ? `, mục tiếp theo sau khoảng ${minutesUntil(q.nextAt)} phút` : "";
      els.status.textContent = `Đang chạy: đã xử lý ${done}/${q.items.length}${next}.`;
    } else {
      els.status.textContent = "";
    }
    if (document.activeElement !== els.min && !els.min.value) els.min.value = q.minMinutes || "";
    if (document.activeElement !== els.max && !els.max.value) els.max.value = q.maxMinutes || "";
    const joined = data.joined || [];
    els.joined.textContent = joined.length ? `Đã tham gia ${joined.length}: ${joined.slice(0, 12).join(", ")}${joined.length > 12 ? "…" : ""}` : "";
  }

  async function load(first) {
    const res = await chrome.runtime.sendMessage({ type: "THREADS_COMMUNITY_GET" }).catch(() => null);
    if (!res?.ok) return;
    data = res;
    if (res.project) {
      els.suggest.textContent = `Dùng từ khoá của ${res.project.name}`;
      els.onlyRelevantLabel.textContent = `Chỉ hiện chủ đề rất hợp với ${res.project.name}`;
    }
    render(first);
  }

  async function send(message) {
    const res = await chrome.runtime.sendMessage(message).catch((error) => ({ ok: false, error: error.message }));
    if (res && res.ok === false && res.error) alert(res.error);
    else if (res?.ok) data = res;
    render(true);
    return res;
  }

  function persist(key, value) {
    chrome.storage.local.set({ [key]: value }).catch(() => {});
  }

  function bind() {
    els.keywords.addEventListener("input", () => persist(KEYWORDS_KEY, els.keywords.value));
    els.list.addEventListener("input", () => persist(LIST_KEY, els.list.value));
    els.suggest.addEventListener("click", () => {
      els.keywords.value = (data?.suggested || []).join("\n");
      persist(KEYWORDS_KEY, els.keywords.value);
    });
    els.run.addEventListener("click", async () => {
      els.run.disabled = true;
      els.summary.textContent = "Đang tìm... (extension mở lần lượt từng từ khoá trong một tab Threads)";
      await send({ type: "THREADS_COMMUNITY_SEARCH", keywords: els.keywords.value });
      els.run.disabled = false;
    });
    els.onlyRelevant.addEventListener("change", () => renderResults(true));
    els.results.addEventListener("change", (event) => {
      const box = event.target.closest("input[data-key]");
      if (!box) return;
      if (box.checked) checked.add(box.dataset.key);
      else checked.delete(box.dataset.key);
    });
    els.selectAll.addEventListener("click", () => {
      for (const t of visible()) checked.add(keyOf(t.name));
      renderResults(true);
    });
    els.selectNone.addEventListener("click", () => {
      checked.clear();
      renderResults(true);
    });
    els.add.addEventListener("click", () => {
      const picked = (data?.search?.results || []).filter((t) => checked.has(keyOf(t.name))).map((t) => t.name);
      if (!picked.length) {
        alert("Chưa chọn chủ đề nào.");
        return;
      }
      const existing = els.list.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const have = new Set(existing.map(keyOf));
      const added = picked.filter((name) => !have.has(keyOf(name)));
      els.list.value = [...existing, ...added].join("\n");
      persist(LIST_KEY, els.list.value);
      els.list.scrollIntoView({ block: "center", behavior: "smooth" });
      alert(`Đã thêm ${added.length} mục vào danh sách. Bấm «Tham gia danh sách cộng đồng» để bắt đầu.`);
    });
    els.start.addEventListener("click", () => {
      const settings = { [LIST_KEY]: els.list.value };
      if (Number(els.min.value)) settings.threadsCommunityMinMinutes = Number(els.min.value);
      if (Number(els.max.value)) settings.threadsCommunityMaxMinutes = Number(els.max.value);
      send({ type: "THREADS_COMMUNITY_START", settings });
    });
    els.stop.addEventListener("click", () => send({ type: "THREADS_COMMUNITY_STOP" }));
  }

  // Đổi dự án thì background ghi lại hai ô này: nạp lại cho khớp, trừ khi người dùng đang gõ.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[KEYWORDS_KEY] && document.activeElement !== els.keywords) els.keywords.value = changes[KEYWORDS_KEY].newValue || "";
    if (changes[LIST_KEY] && document.activeElement !== els.list) els.list.value = changes[LIST_KEY].newValue || "";
  });

  async function init() {
    const stored = await chrome.storage.local.get([KEYWORDS_KEY, LIST_KEY]).catch(() => ({}));
    els.keywords.value = stored[KEYWORDS_KEY] || "";
    els.list.value = stored[LIST_KEY] || "";
    await load(true);
    if (!els.keywords.value && data?.suggested?.length) els.keywords.value = data.suggested.join("\n");
    bind();
    setInterval(() => load(false), 3000);
  }

  init();
})();
