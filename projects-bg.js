/**
 * projects-bg.js — dự án đang quảng bá, phía service worker. Được background.js nạp bằng importScripts,
 * dùng chung log, getState từ background.js và ProjectsCore từ projects-core.js.
 *
 * Lưu trong chrome.storage.local:
 *   projects          chỉnh sửa của preset + dự án tự thêm (ProjectsCore.mergeProjects ghép lại)
 *   activeProjectId   dự án đang chọn; null = chưa chọn, app.html hiện màn chọn dự án
 *   projectScoped     { [projectId]: { ...SCOPED_KEYS, enabledGroupIds, nadezhnoEnabled } }
 */

async function projectsLoad() {
  const data = await chrome.storage.local.get(["projects", "activeProjectId", "projectScoped"]);
  const projects = ProjectsCore.mergeProjects(data.projects);
  const active = projects.find((p) => p.id === data.activeProjectId) || null;
  return { projects, active, scoped: data.projectScoped || {}, stored: data.projects || [] };
}

async function getActiveProject() {
  return (await projectsLoad()).active;
}

/**
 * Phần nối vào system prompt cho job AI trên `platform`. Rỗng khi chưa chọn dự án hoặc dự án không
 * nhắm nền tảng này. Mức nhắc dự án (full / soft / none) được tung ở đây để mỗi lượt độc lập.
 */
async function projectPromptSuffix(platform, kind = "comment") {
  const project = await getActiveProject();
  if (!project || !ProjectsCore.appliesTo(project, platform)) return { suffix: "", project: null, mention: "none" };
  const mention = ProjectsCore.mentionMode(project, kind);
  return { suffix: ProjectsCore.buildPromptBlock(project, { platform, kind, mention }), project, mention };
}

/**
 * Ô project-scoped bị để trống (nguồn bài, từ khoá, chủ đề đăng bài) thì lúc chạy lấy giá trị suy ra từ
 * hồ sơ dự án đang chọn, để job không rơi về feed chung / chủ đề chung không dính gì tới dự án.
 * Chỉ đổi bản state trong bộ nhớ của lượt chạy, không ghi đè ô người dùng.
 */
async function withProjectFallbacks(state, keys) {
  if (keys.every((k) => String(state[k] || "").trim())) return state;
  const active = await getActiveProject();
  if (!active) return state;
  const defaults = ProjectsCore.scopedDefaults(active);
  const next = { ...state };
  for (const k of keys) if (!String(state[k] || "").trim() && defaults[k]) next[k] = defaults[k];
  return next;
}

async function handleProjectMessage(message) {
  switch (message.type) {
    case "PROJECT_GET":
      return { ok: true, ...(await projectPublicState()) };
    case "PROJECT_SELECT":
      return selectProject(message.id);
    case "PROJECT_SAVE":
      return saveProject(message.project);
    case "PROJECT_DELETE":
      return deleteProject(message.id);
    case "PROJECT_APPLY_DEFAULTS":
      return applyProjectDefaults(message.keys);
    default:
      return { ok: false, error: `Unknown message ${message.type}` };
  }
}

async function projectPublicState() {
  const { projects, active } = await projectsLoad();
  return {
    projects,
    activeProjectId: active?.id || null,
    defaults: active ? ProjectsCore.scopedDefaults(active) : null,
  };
}

// Ảnh chụp các ô project-scoped + nhóm Facebook đang bật của dự án đang chọn.
function snapshotScoped(state, nadezhnoSettings) {
  const snap = {};
  for (const key of ProjectsCore.SCOPED_KEYS) snap[key] = state[key] ?? "";
  snap.enabledGroupIds = (state.groups || []).filter((g) => g.enabled).map((g) => String(g.id));
  snap.nadezhnoEnabled = Boolean(nadezhnoSettings?.enabled);
  return snap;
}

async function selectProject(id) {
  const { projects, active, scoped } = await projectsLoad();
  const next = projects.find((p) => p.id === id);
  if (!next) return { ok: false, error: "Không tìm thấy dự án." };
  if (active?.id === next.id) return { ok: true, ...(await projectPublicState()) };

  const state = await getState();
  const { nadezhnoSettings } = await chrome.storage.local.get("nadezhnoSettings");
  const nextScoped = { ...scoped };
  // Lần chọn dự án đầu tiên: cất cài đặt cũ (trước khi có dự án) vào "_before" để không mất gì.
  if (active) nextScoped[active.id] = snapshotScoped(state, nadezhnoSettings);
  else if (!nextScoped._before) nextScoped._before = snapshotScoped(state, nadezhnoSettings);

  const saved = nextScoped[next.id];
  const values = saved
    ? Object.fromEntries(ProjectsCore.SCOPED_KEYS.map((k) => [k, saved[k] ?? ""]))
    : ProjectsCore.scopedDefaults(next);

  // Lần đầu dùng dự án: bật sẵn các nhóm đã tham gia có tên rất hợp (điểm 2); sau đó giữ lựa chọn riêng.
  const enabledIds = new Set(
    saved?.enabledGroupIds ||
      (state.groups || []).filter((g) => ProjectsCore.groupRelevance(next, g.name) === 2).map((g) => String(g.id))
  );
  const groups = (state.groups || []).map((g) => ({ ...g, enabled: enabledIds.has(String(g.id)) }));

  const patch = { ...values, groups, activeProjectId: next.id, projectScoped: nextScoped };
  // Chế độ trả lời Nadezhno của job bình luận Facebook chỉ chạy khi đang ở dự án Nadezhno.
  if (nadezhnoSettings || next.id === "nadezhno") {
    patch.nadezhnoSettings = {
      ...(nadezhnoSettings || {}),
      enabled: next.id === "nadezhno" ? (saved ? Boolean(saved.nadezhnoEnabled) : true) : false,
    };
  }
  await chrome.storage.local.set(patch);
  await log("info", `Đã chuyển sang dự án ${next.name}. Các job đang bật sẽ chạy tiếp theo dự án này.`);
  return { ok: true, ...(await projectPublicState()) };
}

async function saveProject(input) {
  if (!input || !String(input.name || "").trim()) return { ok: false, error: "Dự án cần có tên." };
  const { stored, projects } = await projectsLoad();
  const id = input.id || ProjectsCore.slugify(input.name);
  if (!input.id && projects.some((p) => p.id === id)) return { ok: false, error: "Đã có dự án trùng tên." };

  const clean = { id };
  for (const field of ProjectsCore.EDITABLE_FIELDS) if (field in input) clean[field] = input[field];
  const normalized = ProjectsCore.normalizeProject({ ...(projects.find((p) => p.id === id) || {}), ...clean });
  const rest = stored.filter((p) => p?.id !== id);
  await chrome.storage.local.set({ projects: [...rest, normalized] });
  return { ok: true, id, ...(await projectPublicState()) };
}

async function deleteProject(id) {
  const { stored, active, scoped } = await projectsLoad();
  const isPreset = Boolean(ProjectsCore.presetById(id));
  // Preset không xoá được, chỉ khôi phục về mặc định.
  const rest = stored.filter((p) => p?.id !== id);
  const nextScoped = { ...scoped };
  delete nextScoped[id];
  const patch = { projects: rest, projectScoped: nextScoped };
  if (!isPreset && active?.id === id) patch.activeProjectId = null;
  await chrome.storage.local.set(patch);
  return { ok: true, ...(await projectPublicState()) };
}

/**
 * Ghi đè các ô project-scoped bằng giá trị suy ra từ hồ sơ dự án: các ô trong `keys`, hoặc mọi ô có
 * giá trị mặc định (không đụng nội dung tự viết như mẫu bài đăng, danh sách follow).
 */
async function applyProjectDefaults(keys) {
  const active = await getActiveProject();
  if (!active) return { ok: false, error: "Chưa chọn dự án." };
  const defaults = ProjectsCore.scopedDefaults(active);
  const wanted =
    Array.isArray(keys) && keys.length
      ? keys.filter((k) => k in defaults)
      : Object.keys(defaults).filter((k) => defaults[k] !== "");
  const patch = Object.fromEntries(wanted.map((k) => [k, defaults[k]]));
  await chrome.storage.local.set(patch);
  return { ok: true, applied: wanted, ...(await projectPublicState()) };
}
