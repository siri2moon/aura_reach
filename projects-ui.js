/**
 * projects-ui.js — lớp "dự án" của app.html: màn chọn dự án (bắt buộc trước khi dùng nền tảng),
 * nút đổi dự án ở sidebar, sắp xếp nền tảng theo dự án, trang «Kế hoạch dự án» và hồ sơ dự án.
 * Độc lập với popup.js: gọi PROJECT_* / GET_STATE của service worker, điều hướng bằng cách bấm nút tab có sẵn.
 */
(() => {
  const Core = window.ProjectsCore;
  const $ = (id) => document.getElementById(id);
  if (!Core || !$("projectGate")) return;

  const PLATFORM_LABEL = {
    facebook: "Facebook",
    threads: "Threads",
    x: "X (Twitter)",
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    zalo: "Zalo",
    maps: "Google Maps",
  };
  const FIT_LABEL = { high: "Kênh chính", medium: "Kênh phụ", low: "Thử nghiệm", none: "Không dùng" };
  const LANG_LABEL = { en: "English", ru: "Русский", vi: "Tiếng Việt" };

  let projects = [];
  let activeId = null;
  let defaults = null;
  let appState = null;
  let editorFor = null;
  let planSig = "";

  const active = () => projects.find((p) => p.id === activeId) || null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function lines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && l !== "**" && !l.startsWith("#"));
  }

  function hostOf(url) {
    return String(url || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  }

  async function send(type, extra = {}) {
    const res = await chrome.runtime.sendMessage({ type, ...extra }).catch((error) => ({ ok: false, error: error.message }));
    if (res?.projects) {
      projects = res.projects;
      activeId = res.activeProjectId;
      defaults = res.defaults;
    }
    return res;
  }

  // ---------------------------------------------------------------- điều hướng

  function openTab(tab, subtab) {
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.click();
    if (subtab) document.querySelector(`#${tab}SubTabs .header-subtab-btn[data-${tab}-tab="${subtab}"]`)?.click();
    document.querySelector(".content")?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
  }

  // ---------------------------------------------------------------- màn chọn dự án

  function platformChips(project) {
    return Core.rankPlatforms(project)
      .filter((p) => p.fit === "high")
      .map((p) => `<span class="chip">${escapeHtml(PLATFORM_LABEL[p.name])}</span>`)
      .join("");
  }

  function renderGate() {
    $("gateProjects").innerHTML = projects
      .map((p) => {
        const isActive = p.id === activeId;
        return `<article class="gate-card${isActive ? " is-active" : ""}" style="--project:${escapeHtml(p.color)}">
          <div class="gate-card-top">
            <span class="project-mark lg">${escapeHtml(p.name.slice(0, 1))}</span>
            <div class="gate-card-id">
              <h2>${escapeHtml(p.name)}</h2>
              ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(hostOf(p.url))}</a>` : ""}
            </div>
            ${p.live ? '<span class="live-badge">Đã go live</span>' : ""}
          </div>
          <p class="gate-card-pitch">${escapeHtml(p.pitch || "Chưa có mô tả. Chọn dự án rồi điền hồ sơ ở trang Kế hoạch dự án.")}</p>
          <dl class="gate-card-meta">
            ${p.audience ? `<div><dt>Đối tượng</dt><dd>${escapeHtml(p.audience)}</dd></div>` : ""}
            <div><dt>Viết bằng</dt><dd>${escapeHtml(LANG_LABEL[p.language] || p.language)}${p.market ? ` · ${escapeHtml(p.market)}` : ""}</dd></div>
          </dl>
          <div class="chip-row">${platformChips(p)}</div>
          <button class="btn ${isActive ? "btn-secondary" : "btn-primary"} full-width" type="button" data-select="${escapeHtml(p.id)}">
            <span>${isActive ? "Đang chọn — tiếp tục" : "Chọn dự án này"}</span>
          </button>
        </article>`;
      })
      .join("");
  }

  function showGate(show) {
    const gated = show || !activeId;
    $("projectGate").hidden = !gated;
    document.body.classList.toggle("gated", gated);
    $("gateCancel").hidden = !activeId;
    if (gated) renderGate();
  }

  async function selectProject(id) {
    if (id === activeId) {
      showGate(false);
      return;
    }
    const res = await send("PROJECT_SELECT", { id });
    if (!res?.ok) {
      alert(res?.error || "Không chọn được dự án.");
      return;
    }
    // Các ô của popup.js đang giữ giá trị của dự án cũ: nạp lại trang để mọi form đọc bộ mới.
    await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: { uiTab: "project" } }).catch(() => {});
    location.reload();
  }

  // ---------------------------------------------------------------- sidebar, topbar, dải "đang viết cho dự án"

  function renderChrome() {
    const p = active();
    document.documentElement.style.setProperty("--project", p?.color || "#4f46e5");
    $("projectSwitchName").textContent = p ? p.name : "Chưa chọn dự án";
    $("projectSwitchUrl").textContent = p ? hostOf(p.url) : "";
    $("projectSwitchMark").textContent = p ? p.name.slice(0, 1) : "?";
    $("topbarProject").hidden = !p;
    $("topbarProjectText").textContent = p ? `Đang quảng bá ${p.name}` : "";

    if (!p) return;
    const main = $("navPlatforms");
    const other = $("navOther");
    let otherCount = 0;
    for (const { name, fit } of Core.rankPlatforms(p)) {
      const btn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
      if (!btn) continue;
      let badge = btn.querySelector(".fit-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "fit-badge";
        btn.appendChild(badge);
      }
      badge.dataset.fit = fit;
      badge.textContent = fit === "high" ? "Chính" : fit === "medium" ? "Phụ" : fit === "low" ? "Thử" : "";
      if (fit === "none") {
        other.appendChild(btn);
        otherCount += 1;
      } else {
        main.appendChild(btn);
      }
    }
    $("navOtherLabel").hidden = !otherCount;

    // Thẻ Nadezhno trong Facebook › Bình luận chỉ có nghĩa khi đang ở dự án Nadezhno.
    const nz = $("nadezhnoCard");
    if (nz) nz.hidden = p.id !== "nadezhno";

    for (const platform of Core.PLATFORMS) {
      const pane = $(`tab-${platform}`);
      if (!pane) continue;
      let strip = pane.querySelector(":scope > .focus-strip");
      if (!strip) {
        strip = document.createElement("div");
        strip.className = "focus-strip";
        pane.prepend(strip);
      }
      const applies = Core.appliesTo(p, platform);
      strip.classList.toggle("is-off", !applies);
      strip.innerHTML = applies
        ? `<span class="project-dot"></span>
           <span>AI trên ${escapeHtml(PLATFORM_LABEL[platform])} đang viết cho <strong>${escapeHtml(p.name)}</strong>
           · ${escapeHtml(LANG_LABEL[p.language] || p.language)} theo bài gốc
           · nhắc dự án ở khoảng ${Math.round(p.mentionRate * 100)}% bình luận, ${Math.round(p.postMentionRate * 100)}% bài đăng</span>
           <button type="button" class="btn-text-action" data-open-project>Sửa hồ sơ dự án</button>`
        : `<span>${escapeHtml(PLATFORM_LABEL[platform])} nằm ngoài kế hoạch của <strong>${escapeHtml(p.name)}</strong>: AI ở đây viết như cũ, không theo dự án.</span>
           <button type="button" class="btn-text-action" data-open-project>Đổi trong hồ sơ dự án</button>`;
    }
  }

  // ---------------------------------------------------------------- trang Kế hoạch dự án

  function renderHero() {
    const p = active();
    if (!p) return;
    $("projectHero").innerHTML = `
      <div class="hero-top">
        <span class="project-mark xl">${escapeHtml(p.name.slice(0, 1))}</span>
        <div class="hero-id">
          <div class="badge-row">
            <h2>${escapeHtml(p.name)}</h2>
            ${p.live ? '<span class="live-badge">Đã go live</span>' : ""}
          </div>
          ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(hostOf(p.url))}</a>` : ""}
        </div>
        <button id="heroSwitch" class="btn btn-subtle" type="button"><span>Đổi dự án</span></button>
      </div>
      <p class="hero-pitch">${escapeHtml(p.pitch)}</p>
      <dl class="hero-facts">
        <div><dt>Đối tượng</dt><dd>${escapeHtml(p.audience || "—")}</dd></div>
        <div><dt>Viết bằng</dt><dd>${escapeHtml(LANG_LABEL[p.language] || p.language)} (hoặc ngôn ngữ của bài gốc)</dd></div>
        <div><dt>Nhắc dự án</dt><dd>~${Math.round(p.mentionRate * 100)}% bình luận, ~${Math.round(p.postMentionRate * 100)}% bài đăng, luôn nói rõ là dự án của mình</dd></div>
      </dl>`;
  }

  function jobState(on) {
    return on ? '<span class="state on">Đang chạy</span>' : '<span class="state">Đang tắt</span>';
  }

  function sourceDetail(key, unit) {
    const n = lines(appState?.[key]).length;
    if (!n) return { ok: false, text: `Chưa có ${unit}` };
    const isDefault = defaults && String(appState[key] || "").trim() === String(defaults[key] || "").trim();
    return { ok: true, text: `${n} ${unit}${isDefault ? " theo từ khoá dự án" : " (đã chỉnh tay)"}` };
  }

  /** 3 bước cho mỗi nền tảng: vào cộng đồng, tìm bài, hành động. */
  function planFor(platform) {
    const s = appState || {};
    const p = active();
    switch (platform) {
      case "facebook": {
        const groups = s.groups || [];
        const fit = groups.filter((g) => Core.groupRelevance(p, g.name) === 2).length;
        const on = groups.filter((g) => g.enabled).length;
        return [
          {
            title: "Vào đúng nhóm",
            text: groups.length ? `${fit}/${groups.length} nhóm đã tham gia rất hợp dự án` : "Chưa quét nhóm đã tham gia",
            ok: fit > 0,
            go: ["facebook", "groups"],
            cta: "Tìm & tham gia nhóm",
          },
          {
            title: "Chọn nhóm để làm việc",
            text: on ? `${on} nhóm đang được chọn để bình luận / đăng bài` : "Chưa chọn nhóm nào",
            ok: on > 0,
            go: ["facebook", "comment"],
            cta: "Chọn nhóm",
          },
          {
            title: p.id === "nadezhno" ? "Trả lời bài hỏi địa chỉ" : "Bình luận & đăng bài",
            text: `${jobState(s.enabled)}${s.enabled && s.mode ? ` · ${s.mode === "post" ? "đăng bài" : s.mode === "comment" ? "bình luận" : s.mode}` : ""}`,
            ok: Boolean(s.enabled),
            go: ["facebook", "comment"],
            cta: "Mở bình luận",
            alt: ["facebook", "post", "Đăng bài"],
          },
        ];
      }
      case "threads": {
        const src = sourceDetail("threadsSourcesText", "nguồn tìm bài");
        return [
          {
            title: "Lướt & follow trong ngách",
            text: `${jobState(s.threadsScrollEnabled)}${s.threadsScrollFollow ? " · có follow tác giả" : ""}`,
            ok: Boolean(s.threadsScrollEnabled),
            go: ["threads", "scroll"],
            cta: "Mở lướt feed",
          },
          { title: "Tìm bài đúng chủ đề", text: src.text + (s.threadsFilterPrompt ? " · có bộ lọc" : ""), ok: src.ok, go: ["threads", "comment"], cta: "Xem nguồn" },
          {
            title: "Bình luận & đăng bài",
            text: `Bình luận: ${jobState(s.threadsEnabled)} · Đăng bài: ${jobState(s.threadsPostEnabled)}`,
            ok: Boolean(s.threadsEnabled || s.threadsPostEnabled),
            go: ["threads", "comment"],
            cta: "Bình luận",
            alt: ["threads", "post", "Đăng bài"],
          },
        ];
      }
      case "x": {
        const src = sourceDetail("xSourcesText", "nguồn tìm tweet");
        const follow = lines(s.xFollowTargetsText).length;
        return [
          { title: "Follow tài khoản trong ngách", text: follow ? `${follow} tài khoản · ${jobState(s.xFollowEnabled)}` : "Chưa có danh sách follow", ok: follow > 0, go: ["x", "follow"], cta: "Mở follow" },
          { title: "Tìm tweet đúng chủ đề", text: src.text + (s.xFilterPrompt ? " · có bộ lọc" : ""), ok: src.ok, go: ["x", "comment"], cta: "Xem nguồn" },
          {
            title: "Trả lời & đăng tweet",
            text: `Bình luận: ${jobState(s.xCommentEnabled)} · Đăng bài: ${jobState(s.xPostEnabled)}`,
            ok: Boolean(s.xCommentEnabled || s.xPostEnabled),
            go: ["x", "comment"],
            cta: "Bình luận",
            alt: ["x", "post", "Đăng tweet"],
          },
        ];
      }
      case "youtube": {
        const src = sourceDetail("youtubeKeywordsText", "từ khoá");
        const subs = lines(s.youtubeSubscribeChannelsText).length;
        return [
          { title: "Subscribe kênh trong ngách", text: subs ? `${subs} kênh · ${jobState(s.youtubeSubscribeEnabled)}` : "Chưa có danh sách kênh", ok: subs > 0, go: ["youtube", "subscribe"], cta: "Mở subscribe" },
          { title: "Tìm video đúng chủ đề", text: src.text, ok: src.ok, go: ["youtube", "keyword"], cta: "Xem từ khoá" },
          { title: "Bình luận video", text: jobState(s.youtubeKeywordEnabled), ok: Boolean(s.youtubeKeywordEnabled), go: ["youtube", "keyword"], cta: "Mở bình luận" },
        ];
      }
      case "instagram":
      case "tiktok": {
        const src = sourceDetail(`${platform}SourcesText`, platform === "instagram" ? "hashtag / nguồn" : "nguồn tìm video");
        const follow = lines(s[`${platform}FollowTargetsText`]).length;
        return [
          { title: "Follow tài khoản trong ngách", text: follow ? `${follow} tài khoản · ${jobState(s[`${platform}FollowEnabled`])}` : "Chưa có danh sách follow", ok: follow > 0, go: [platform, "follow"], cta: "Mở follow" },
          { title: platform === "instagram" ? "Tìm bài đúng chủ đề" : "Tìm video đúng chủ đề", text: src.text, ok: src.ok, go: [platform, "comment"], cta: "Xem nguồn" },
          { title: "Bình luận", text: jobState(s[`${platform}CommentEnabled`]), ok: Boolean(s[`${platform}CommentEnabled`]), go: [platform, "comment"], cta: "Mở bình luận" },
        ];
      }
      default:
        return [];
    }
  }

  function renderPlan() {
    const p = active();
    if (!p || !appState) return;
    const ranked = Core.rankPlatforms(p).filter((r) => r.fit !== "none");
    const html = ranked
      .map(({ name, fit }) => {
        const steps = planFor(name);
        const done = steps.filter((st) => st.ok).length;
        return `<section class="plan-card" data-fit="${fit}">
          <header class="plan-head">
            <h3>${escapeHtml(PLATFORM_LABEL[name])}</h3>
            <span class="fit-badge" data-fit="${fit}">${escapeHtml(FIT_LABEL[fit])}</span>
            <span class="plan-progress" title="Số bước đã sẵn sàng">${done}/${steps.length}</span>
          </header>
          <ol class="plan-steps">
            ${steps
              .map(
                (st, i) => `<li class="plan-step${st.ok ? " ok" : ""}">
                  <span class="plan-step-num">${st.ok ? "✓" : i + 1}</span>
                  <div class="plan-step-body">
                    <strong>${escapeHtml(st.title)}</strong>
                    <span class="plan-step-text">${st.text}</span>
                  </div>
                  <div class="plan-step-actions">
                    <button type="button" class="btn-text-action" data-go="${st.go.join("|")}">${escapeHtml(st.cta)}</button>
                    ${st.alt ? `<button type="button" class="btn-text-action" data-go="${st.alt[0]}|${st.alt[1]}">${escapeHtml(st.alt[2])}</button>` : ""}
                  </div>
                </li>`
              )
              .join("")}
          </ol>
        </section>`;
      })
      .join("");
    const others = Core.rankPlatforms(p).filter((r) => r.fit === "none").map((r) => PLATFORM_LABEL[r.name]);
    const full = html + (others.length ? `<p class="plan-note">Ngoài kế hoạch: ${escapeHtml(others.join(", "))}. Đổi ở mục Nền tảng trong hồ sơ dự án nếu muốn dùng.</p>` : "");
    if (full === planSig) return;
    planSig = full;
    $("projectPlan").innerHTML = full;
  }

  // ---------------------------------------------------------------- hồ sơ dự án

  const FIELD_IDS = {
    name: "pjName",
    url: "pjUrl",
    language: "pjLanguage",
    market: "pjMarket",
    pitch: "pjPitch",
    audience: "pjAudience",
    persona: "pjPersona",
    disclosure: "pjDisclosure",
    filterPrompt: "pjFilterPrompt",
  };
  const LIST_IDS = {
    postKeywords: "pjPostKeywords",
    groupKeywords: "pjGroupKeywords",
    youtubeKeywords: "pjYoutubeKeywords",
    hashtags: "pjHashtags",
    facts: "pjFacts",
    postTopics: "pjPostTopics",
    avoid: "pjAvoid",
  };

  function fillEditor() {
    const p = active();
    if (!p) return;
    editorFor = p.id;
    for (const [field, id] of Object.entries(FIELD_IDS)) $(id).value = p[field] || "";
    for (const [field, id] of Object.entries(LIST_IDS)) $(id).value = (p[field] || []).join("\n");
    $("pjLinks").value = p.links.map((l) => `${l.label} | ${l.url}`).join("\n");
    $("pjMentionRate").value = Math.round(p.mentionRate * 100);
    $("pjPostMentionRate").value = Math.round(p.postMentionRate * 100);
    $("pjPlatforms").innerHTML = Core.PLATFORMS.map(
      (name) => `<label class="fit-item">
        <span>${escapeHtml(PLATFORM_LABEL[name])}</span>
        <select data-platform="${name}">
          ${Object.keys(FIT_LABEL)
            .map((fit) => `<option value="${fit}" ${p.platforms[name] === fit ? "selected" : ""}>${escapeHtml(FIT_LABEL[fit])}</option>`)
            .join("")}
        </select>
      </label>`
    ).join("");
    $("pjPreviewPlatform").innerHTML = Core.PLATFORMS.filter((n) => Core.appliesTo(p, n))
      .map((n) => `<option value="${n}">${escapeHtml(PLATFORM_LABEL[n])}</option>`)
      .join("");
    $("pjReset").hidden = !p.preset;
    $("pjDelete").hidden = p.preset;
    renderPreview();
  }

  function readEditor() {
    const out = { id: editorFor };
    for (const [field, id] of Object.entries(FIELD_IDS)) out[field] = $(id).value.trim();
    for (const [field, id] of Object.entries(LIST_IDS)) out[field] = lines($(id).value);
    out.links = lines($("pjLinks").value)
      .map((line) => {
        const [label, url] = line.includes("|") ? line.split("|").map((x) => x.trim()) : ["", line];
        return { label: label || hostOf(url), url };
      })
      .filter((l) => /^https?:\/\//i.test(l.url));
    out.mentionRate = Number($("pjMentionRate").value) / 100;
    out.postMentionRate = Number($("pjPostMentionRate").value) / 100;
    out.platforms = {};
    for (const sel of $("pjPlatforms").querySelectorAll("select[data-platform]")) out.platforms[sel.dataset.platform] = sel.value;
    return out;
  }

  function renderPreview() {
    const draft = Core.normalizeProject({ ...active(), ...readEditor() });
    $("pjPreview").textContent = Core.buildPromptBlock(draft, {
      platform: $("pjPreviewPlatform").value || "x",
      mention: $("pjPreviewMention").checked,
    }).trim();
  }

  function status(text) {
    $("pjStatus").textContent = text;
    if (text) setTimeout(() => ($("pjStatus").textContent === text ? ($("pjStatus").textContent = "") : null), 6000);
  }

  async function saveEditor() {
    const res = await send("PROJECT_SAVE", { project: readEditor() });
    if (!res?.ok) return alert(res?.error || "Không lưu được.");
    renderAll(true);
    status("Đã lưu hồ sơ. AI dùng hồ sơ mới từ lượt chạy tiếp theo.");
  }

  async function applyDefaults() {
    await saveEditor();
    const res = await send("PROJECT_APPLY_DEFAULTS");
    if (!res?.ok) return alert(res?.error || "Không áp dụng được.");
    status(`Đã cập nhật ${res.applied.length} ô nguồn bài / từ khoá / bộ lọc. Đang nạp lại…`);
    setTimeout(() => location.reload(), 700);
  }

  // ---------------------------------------------------------------- nạp & gắn sự kiện

  function renderAll(withEditor) {
    renderChrome();
    renderHero();
    renderPlan();
    if (withEditor || editorFor !== activeId) fillEditor();
  }

  async function refreshState() {
    const res = await chrome.runtime.sendMessage({ type: "GET_STATE" }).catch(() => null);
    if (res?.ok) {
      appState = res.state;
      renderPlan();
    }
  }

  function bind() {
    $("gateProjects").addEventListener("click", (event) => {
      const btn = event.target.closest("[data-select]");
      if (btn) selectProject(btn.dataset.select);
    });
    $("gateCancel").addEventListener("click", () => showGate(false));
    $("projectSwitch").addEventListener("click", () => showGate(true));
    $("gateNewForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = $("gateNewName").value.trim();
      if (!name) return;
      const url = $("gateNewUrl").value.trim();
      const res = await send("PROJECT_SAVE", { project: { name, url, links: url ? [{ label: "Trang chủ", url }] : [] } });
      if (!res?.ok) return alert(res?.error || "Không thêm được dự án.");
      await selectProject(res.id);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("#heroSwitch")) return showGate(true);
      if (event.target.closest("[data-open-project]")) {
        openTab("project");
        $("projectEditor").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const go = event.target.closest("[data-go]");
      if (go) {
        const [tab, sub] = go.dataset.go.split("|");
        openTab(tab, sub);
      }
    });

    $("pjSave").addEventListener("click", saveEditor);
    $("pjApply").addEventListener("click", applyDefaults);
    $("pjReset").addEventListener("click", async () => {
      if (!confirm("Khôi phục hồ sơ dự án về mặc định? Các chỉnh sửa hồ sơ sẽ mất (cài đặt từng nền tảng giữ nguyên).")) return;
      await send("PROJECT_DELETE", { id: activeId });
      renderAll(true);
      status("Đã khôi phục hồ sơ mặc định.");
    });
    $("pjDelete").addEventListener("click", async () => {
      if (!confirm("Xoá dự án này?")) return;
      await send("PROJECT_DELETE", { id: activeId });
      location.reload();
    });
    $("projectEditor").addEventListener("input", renderPreview);
    $("projectEditor").addEventListener("change", renderPreview);
  }

  async function init() {
    const res = await send("PROJECT_GET");
    if (!res?.ok) return;
    bind();
    showGate(false);
    if (!activeId) return;
    await refreshState();
    renderAll(true);
    setInterval(refreshState, 3000);
  }

  init();
})();
