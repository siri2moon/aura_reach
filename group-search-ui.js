/**
 * group-search-ui.js — thẻ "Tìm nhóm theo từ khoá" trong Facebook › Nhóm. Độc lập với popup.js:
 * gọi các lệnh GROUP_SEARCH_* của service worker, rồi đẩy link nhóm đã chọn vào ô #joinUrls có sẵn.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    keywords: $("gsKeywords"),
    suggest: $("gsSuggestBtn"),
    run: $("gsRunBtn"),
    summary: $("gsSummary"),
    wrap: $("gsResultsWrap"),
    onlyRelevant: $("gsOnlyRelevant"),
    onlyRelevantLabel: $("gsOnlyRelevantText"),
    results: $("gsResults"),
    selectAll: $("gsSelectAll"),
    selectNone: $("gsSelectNone"),
    add: $("gsAddBtn"),
    joinUrls: $("joinUrls"),
  };
  if (!els.results) return;

  const KEYWORDS_KEY = "groupSearchKeywords";
  let gs = null;
  let suggested = [];
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

  function visible() {
    const min = els.onlyRelevant.checked ? 2 : 0;
    return (gs?.results || []).filter((g) => g.relevance >= min);
  }

  function renderResults(force) {
    const list = visible();
    const sig = `${els.onlyRelevant.checked}|${list.map((g) => g.id).join(",")}`;
    if (!force && sig === renderedSig) return;
    renderedSig = sig;
    els.wrap.hidden = !(gs?.results || []).length;
    if (!list.length) {
      els.results.innerHTML = '<p class="nz-empty">Không có nhóm nào khớp. Bỏ tick ô lọc để xem tất cả.</p>';
      return;
    }
    els.results.innerHTML = list
      .map(
        (g) => `<label class="gs-item">
          <input type="checkbox" data-id="${escapeHtml(g.id)}" ${checked.has(g.id) ? "checked" : ""} />
          <span class="gs-item-body">
            <a href="${escapeHtml(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a>
            <span class="gs-item-meta">${escapeHtml(g.meta || "")}${g.meta ? " · " : ""}từ khoá «${escapeHtml(g.keyword)}»</span>
          </span>
        </label>`
      )
      .join("");
  }

  function render(force) {
    if (!gs) return;
    els.summary.textContent = gs.running ? gs.summary || "Đang tìm..." : gs.summary || "";
    els.run.disabled = Boolean(gs.running);
    for (const g of gs.results || []) {
      // Nhóm rất hợp được chọn sẵn khi mới xuất hiện; sau đó giữ nguyên lựa chọn của người dùng.
      if (known.has(g.id)) continue;
      known.add(g.id);
      if (g.relevance === 2) checked.add(g.id);
    }
    renderResults(force);
  }

  async function load(first) {
    const res = await chrome.runtime.sendMessage({ type: "GROUP_SEARCH_GET" }).catch(() => null);
    if (!res?.ok) return;
    gs = res.groupSearch;
    suggested = res.suggested || [];
    if (res.project) {
      els.suggest.textContent = `Dùng từ khoá của ${res.project.name}`;
      els.onlyRelevantLabel.textContent = `Chỉ hiện nhóm rất hợp với ${res.project.name}`;
    }
    render(first);
  }

  function bind() {
    els.keywords.addEventListener("input", () => {
      chrome.storage.local.set({ [KEYWORDS_KEY]: els.keywords.value }).catch(() => {});
    });
    els.suggest.addEventListener("click", () => {
      els.keywords.value = suggested.join("\n");
      chrome.storage.local.set({ [KEYWORDS_KEY]: els.keywords.value }).catch(() => {});
    });
    els.run.addEventListener("click", async () => {
      els.run.disabled = true;
      els.summary.textContent = "Đang tìm... (extension mở lần lượt từng từ khoá trong tab Facebook)";
      const res = await chrome.runtime
        .sendMessage({ type: "GROUP_SEARCH_RUN", keywords: els.keywords.value })
        .catch((error) => ({ ok: false, error: error.message }));
      if (res && res.ok === false && res.error) alert(res.error);
      await load(false);
      els.run.disabled = false;
    });
    els.onlyRelevant.addEventListener("change", () => renderResults(true));
    els.results.addEventListener("change", (event) => {
      const box = event.target.closest("input[data-id]");
      if (!box) return;
      if (box.checked) checked.add(box.dataset.id);
      else checked.delete(box.dataset.id);
    });
    els.selectAll.addEventListener("click", () => {
      for (const g of visible()) checked.add(g.id);
      renderResults(true);
    });
    els.selectNone.addEventListener("click", () => {
      checked.clear();
      renderResults(true);
    });
    els.add.addEventListener("click", () => {
      const picked = (gs?.results || []).filter((g) => checked.has(g.id)).map((g) => g.url);
      if (!picked.length) {
        alert("Chưa chọn nhóm nào.");
        return;
      }
      const existing = els.joinUrls.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...picked])];
      els.joinUrls.value = merged.join("\n");
      // popup.js lưu ô này khi có sự kiện input.
      els.joinUrls.dispatchEvent(new Event("input", { bubbles: true }));
      els.joinUrls.scrollIntoView({ block: "center", behavior: "smooth" });
      alert(`Đã thêm ${merged.length - existing.length} nhóm vào danh sách. Bấm «Tham gia danh sách nhóm» để bắt đầu.`);
    });
  }

  async function init() {
    const stored = await chrome.storage.local.get(KEYWORDS_KEY).catch(() => ({}));
    els.keywords.value = stored[KEYWORDS_KEY] || "";
    await load(true);
    if (!els.keywords.value && suggested.length) els.keywords.value = suggested.join("\n");
    bind();
    setInterval(() => load(false), 3000);
  }

  init();
})();
