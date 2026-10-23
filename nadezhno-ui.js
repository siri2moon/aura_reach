/**
 * nadezhno-ui.js — thẻ "Dùng cho dự án Nadezhno" trong mục Bình luận Facebook của app.html. Độc lập với popup.js:
 * tự gọi các lệnh NADEZHNO_* của service worker và tự làm mới mỗi vài giây.
 */
(() => {
  const Core = window.NadezhnoCore;
  const $ = (id) => document.getElementById(id);
  const els = {
    enabled: $("nzEnabled"),
    reviewFirst: $("nzReviewFirst"),
    options: $("nzOptions"),
    defaultCity: $("nzDefaultCity"),
    linkMode: $("nzLinkMode"),
    dailyLimit: $("nzDailyLimit"),
    groupGap: $("nzGroupGap"),
    useAi: $("nzUseAi"),
    prompt: $("nzPrompt"),
    resetPrompt: $("nzResetPrompt"),
    scanBtn: $("nzScanBtn"),
    scanSummary: $("nzScanSummary"),
    quota: $("nzQuota"),
    drafts: $("nzDrafts"),
    clearDone: $("nzClearDone"),
    misses: $("nzMisses"),
    clearMisses: $("nzClearMisses"),
  };
  if (!Core || !els.drafts) return;

  let nz = null;
  let draftSig = "";

  async function send(type, extra = {}) {
    const res = await chrome.runtime.sendMessage({ type, ...extra });
    if (res?.nadezhno) nz = res.nadezhno;
    if (res && res.ok === false && res.error) alert(res.error);
    return res;
  }

  function collectSettings() {
    return {
      enabled: els.enabled.checked,
      reviewFirst: els.reviewFirst.checked,
      defaultCity: els.defaultCity.value,
      linkMode: els.linkMode.value,
      dailyLimit: els.dailyLimit.value,
      groupGapHours: els.groupGap.value,
      useAi: els.useAi.checked,
      aiPrompt: els.prompt.value.trim() === nz?.defaultPrompt?.trim() ? "" : els.prompt.value,
    };
  }

  function fillSettings() {
    const s = nz.settings;
    els.enabled.checked = s.enabled;
    els.reviewFirst.checked = s.reviewFirst;
    els.options.hidden = !s.enabled;
    els.defaultCity.value = s.defaultCity;
    els.linkMode.value = s.linkMode;
    els.dailyLimit.value = s.dailyLimit;
    els.groupGap.value = s.groupGapHours;
    els.useAi.checked = s.useAi;
    els.prompt.value = s.aiPrompt || nz.defaultPrompt;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function label(cityId, categoryId) {
    const city = Core.cityById(cityId);
    const cat = Core.categoryById(categoryId);
    return { city: city ? city.name_vi : cityId, cat: cat ? cat.name_ru : categoryId };
  }

  const STATUS = { new: "Chờ duyệt", filled: "Đã điền sẵn", skipped: "Đã bỏ qua", posted: "Đã tự đăng" };

  function renderDrafts() {
    const drafts = nz.drafts || [];
    if (!drafts.length) {
      els.drafts.innerHTML =
        '<p class="nz-empty">Chưa có câu trả lời nào. Bật lịch bình luận hoặc bấm "Quét ngay các nhóm đã chọn".</p>';
      return;
    }
    els.drafts.innerHTML = drafts
      .map((d) => {
        const { city, cat } = label(d.cityId, d.categoryId);
        const done = d.status !== "new";
        return `<div class="nz-draft${done ? " done" : ""}" data-id="${escapeHtml(d.id)}">
          <div class="nz-draft-head">
            <span class="nz-pill">${escapeHtml(cat)}</span>
            <span class="nz-pill">${escapeHtml(city)}${d.cityFromText ? "" : " (mặc định)"}</span>
            ${d.groupName ? `<span>${escapeHtml(d.groupName)}</span>` : ""}
            <span>· ${d.source === "ai" ? "AI" : "Mẫu"}</span>
            <span>· ${STATUS[d.status] || d.status}</span>
          </div>
          <div class="nz-post">${escapeHtml(d.postText)}</div>
          <textarea data-role="text" ${done ? "disabled" : ""}>${escapeHtml(d.text)}</textarea>
          <div class="nz-draft-actions">
            <a href="${escapeHtml(d.permalink)}" target="_blank" rel="noopener">Xem bài gốc</a>
            ${
              done
                ? ""
                : `<button class="btn btn-subtle" type="button" data-role="skip"><span>Bỏ qua</span></button>
                   <button class="btn btn-primary" type="button" data-role="fill"><span>Mở bài &amp; điền sẵn</span></button>`
            }
          </div>
        </div>`;
      })
      .join("");
  }

  function renderMisses() {
    const entries = Object.entries(nz.misses || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      els.misses.innerHTML = '<p class="nz-empty">Chưa ghi nhận.</p>';
      return;
    }
    els.misses.innerHTML = entries
      .map(([key, n]) => {
        const [cityId, categoryId] = key.split("|");
        const { city, cat } = label(cityId, categoryId);
        return `<div class="nz-miss"><span>${escapeHtml(cat)} · ${escapeHtml(city)}</span><b>${n} bài hỏi</b></div>`;
      })
      .join("");
  }

  function renderStatus() {
    const s = nz.settings;
    els.quota.textContent = s.enabled ? `Hôm nay ${nz.fillsToday}/${s.dailyLimit}` : "Đang tắt";
    els.scanSummary.textContent = nz.scan.running
      ? "Đang quét..."
      : nz.scan.at
        ? `Lần quét trước (${new Date(nz.scan.at).toLocaleString("vi-VN")}): ${nz.scan.summary}`
        : "";
    els.scanBtn.disabled = Boolean(nz.scan.running);
  }

  function render(force) {
    if (!nz) return;
    renderStatus();
    renderMisses();
    const sig = (nz.drafts || []).map((d) => `${d.id}:${d.status}`).join(",");
    const editing = document.activeElement?.closest?.(".nz-draft");
    if (force || (sig !== draftSig && !editing)) {
      draftSig = sig;
      renderDrafts();
    }
  }

  async function refresh() {
    const res = await chrome.runtime.sendMessage({ type: "NADEZHNO_GET_STATE" }).catch(() => null);
    if (res?.ok) {
      nz = res.nadezhno;
      render(false);
    }
  }

  function bind() {
    let saveTimer = null;
    const queueSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        // send() đã alert khi lỗi; thành công thì báo nhỏ để biết đã lưu.
        const res = await send("NADEZHNO_SAVE_SETTINGS", { settings: collectSettings() }).catch((error) => {
          window.AuraToast?.error(error.message || error);
          return null;
        });
        if (res?.ok) window.AuraToast?.ok("Đã lưu cài đặt Nadezhno");
        render(false);
      }, 400);
    };
    for (const el of [els.dailyLimit, els.groupGap, els.prompt]) el.addEventListener("input", queueSave);
    for (const el of [els.defaultCity, els.linkMode, els.useAi, els.reviewFirst]) el.addEventListener("change", queueSave);
    els.enabled.addEventListener("change", () => {
      els.options.hidden = !els.enabled.checked;
      queueSave();
    });

    els.resetPrompt.addEventListener("click", () => {
      els.prompt.value = nz.defaultPrompt;
      queueSave();
    });

    els.scanBtn.addEventListener("click", async () => {
      els.scanBtn.disabled = true;
      els.scanSummary.textContent = "Đang quét... (extension mở lần lượt từng nhóm trong tab Facebook)";
      clearTimeout(saveTimer);
      await send("NADEZHNO_SCAN", { settings: collectSettings() });
      render(true);
    });

    els.clearDone.addEventListener("click", async () => {
      await send("NADEZHNO_CLEAR_DONE");
      render(true);
    });
    els.clearMisses.addEventListener("click", async () => {
      await send("NADEZHNO_CLEAR_MISSES");
      render(true);
    });

    const textTimers = new Map();
    els.drafts.addEventListener("input", (event) => {
      const box = event.target.closest('[data-role="text"]');
      const card = event.target.closest(".nz-draft");
      if (!box || !card) return;
      clearTimeout(textTimers.get(card.dataset.id));
      textTimers.set(
        card.dataset.id,
        setTimeout(() => send("NADEZHNO_UPDATE_DRAFT", { id: card.dataset.id, text: box.value }), 500)
      );
    });

    els.drafts.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-role]");
      const card = event.target.closest(".nz-draft");
      if (!btn || !card) return;
      const id = card.dataset.id;
      btn.disabled = true;
      try {
        if (btn.dataset.role === "skip") {
          await send("NADEZHNO_SKIP", { id });
        } else if (btn.dataset.role === "fill") {
          clearTimeout(textTimers.get(id));
          const text = card.querySelector('[data-role="text"]').value;
          const res = await send("NADEZHNO_FILL", { id, text });
          if (res?.ok) {
            alert("Đã điền sẵn bình luận trong tab Facebook. Đọc lại một lượt rồi tự bấm Enter để đăng.");
          }
        }
      } finally {
        btn.disabled = false;
        render(true);
      }
    });
  }

  async function init() {
    els.defaultCity.innerHTML = [
      '<option value="">Không đoán (bỏ qua bài không nói thành phố)</option>',
      ...Core.CITIES.map((c) => `<option value="${c.id}">${escapeHtml(c.name_vi)} · ${escapeHtml(c.name_ru)}</option>`),
    ].join("");
    const res = await chrome.runtime.sendMessage({ type: "NADEZHNO_GET_STATE" }).catch(() => null);
    if (!res?.ok) return;
    nz = res.nadezhno;
    fillSettings();
    render(true);
    bind();
    setInterval(refresh, 3000);
  }

  init();
})();
