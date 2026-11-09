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
 * opts.noMention: nơi đăng cấm tự quảng cáo (nhóm Facebook có luật đó) nên lượt này luôn "none".
 * Bài đăng sẽ kèm ảnh dự án (projectImageFor) thì luôn "full" để ảnh đi cùng link.
 */
async function projectPromptSuffix(platform, kind = "comment", opts = {}) {
  const project = await getActiveProject();
  if (!project || !ProjectsCore.appliesTo(project, platform)) return { suffix: "", project: null, mention: "none" };
  const withImage = !opts.noMention && kind === "post" && ProjectsCore.canAttachImages(platform) && (await projectHasImages(project));
  const mention = opts.noMention ? "none" : ProjectsCore.mentionMode(project, kind, Math.random, platform, { withImage });
  return { suffix: ProjectsCore.buildPromptBlock(project, { platform, kind, mention }), project, mention };
}

async function projectHasImages(project) {
  if (ProjectsCore.presetImages(project.id).length) return true;
  return (await ProjectImages.count(project.id).catch(() => 0)) > 0;
}

/**
 * Ảnh dự án gửi kèm lệnh đăng cho content script (attach-image.js), hoặc null nếu lượt này không kèm ảnh.
 * Quy tắc ở ProjectsCore.shouldAttachImage: bài đăng luôn kèm, bình luận / trả lời chỉ khi có link dự án,
 * nơi cấm tự quảng cáo (opts.noPromo) thì không. Chọn ngẫu nhiên giữa ảnh có sẵn trong repo và ảnh tự tải lên.
 * Lỗi đọc ảnh chỉ ghi nhật ký: lượt đó vẫn đăng chữ.
 */
async function projectImageFor(kind, text, opts = {}) {
  const project = await getActiveProject();
  if (!project || !ProjectsCore.appliesTo(project, opts.platform)) return null;
  const hasLink = ProjectsCore.containsProjectLink(project, text);
  if (!ProjectsCore.shouldAttachImage({ kind, hasLink, noPromo: opts.noPromo })) return null;
  try {
    const bundled = ProjectsCore.presetImages(project.id).map((path) => ({ path, name: path.split("/").pop() }));
    const uploaded = await ProjectImages.list(project.id);
    const pool = [...bundled, ...uploaded];
    if (!pool.length) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const res = await fetch(pick.dataUrl || chrome.runtime.getURL(pick.path));
    if (!res.ok) throw new Error(`thiếu file ${pick.path}`);
    const image = await stampedImage(await res.blob(), pick.name, project);
    await log("info", `Kèm ảnh «${image.name}» vào ${kind === "post" ? "bài đăng" : "bình luận"} (${pool.length} ảnh của ${project.name}).`);
    return image;
  } catch (error) {
    await log("warning", `Không đọc được ảnh của ${project.name} (${error?.message || error}), lượt này chỉ đăng chữ.`);
    return null;
  }
}

/**
 * In tên miền dự án lên một dải màu ở giữa cạnh trên ảnh (ảnh game thường có nút ở cạnh dưới), để ai lướt qua
 * ảnh cũng biết vào đâu, kể cả khi bài không có link bấm được. In hỏng thì gửi ảnh gốc.
 */
async function stampedImage(blob, name, project) {
  const label = ProjectsCore.imageStampText(project);
  if (!label) return { name, type: blob.type || "image/jpeg", dataUrl: await blobToDataUrl(blob) };
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const size = Math.max(16, Math.round(Math.max(bitmap.width, bitmap.height) * 0.028));
    bitmap.close();
    ctx.font = `700 ${size}px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif`;
    const padX = Math.round(size * 0.8);
    const height = Math.round(size * 1.9);
    const width = Math.round(ctx.measureText(label).width) + padX * 2;
    const x = Math.round((canvas.width - width) / 2);
    const y = Math.round(size * 0.6);
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = Math.round(size * 0.4);
    ctx.fillStyle = project.color || "#4f46e5";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, y + height / 2 + 1);
    const out = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    return { name: `${String(name).replace(/\.[^.]+$/, "")}.jpg`, type: "image/jpeg", dataUrl: await blobToDataUrl(out) };
  } catch (error) {
    await log("warning", `Không in được ${label} lên ảnh (${error?.message || error}), gửi ảnh gốc.`);
    return { name, type: blob.type || "image/jpeg", dataUrl: await blobToDataUrl(blob) };
  }
}

// Data URL để gửi ảnh qua tin nhắn cho content script.
async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
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
