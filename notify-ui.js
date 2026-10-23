/**
 * notify-ui.js — trang «Thông báo Telegram» của app.html. Độc lập với popup.js: đọc/ghi qua
 * NOTIFY_* của service worker (notify-bg.js). Danh sách loại sự kiện lấy từ background để hai bên khớp nhau.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$("tab-notify")) return;

  let events = [];

  async function send(type, extra = {}) {
    return chrome.runtime.sendMessage({ type, ...extra }).catch((error) => ({ ok: false, error: error.message }));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function status(text, isError) {
    const el = $("ntStatus");
    el.textContent = text;
    el.style.color = isError ? "var(--danger-text)" : "";
  }

  function render(res) {
    const s = res.settings;
    events = res.events || [];
    $("ntEnabled").checked = Boolean(s.enabled);
    $("ntToken").value = s.token || "";
    $("ntChatId").value = s.chatId || "";
    $("ntEvents").innerHTML = events
      .map(
        (e) => `
        <div class="toggle-card-row">
          <div class="field-label">${escapeHtml(e.icon)} ${escapeHtml(e.label)}</div>
          <label class="switch">
            <input type="checkbox" data-event="${escapeHtml(e.key)}" ${s.events?.[e.key] ? "checked" : ""} />
            <span class="slider"></span>
          </label>
        </div>`
      )
      .join("");
    if (res.lastError) {
      const when = new Date(res.lastError.at).toLocaleString("vi-VN", { hour12: false });
      status(`Lần gửi gần nhất bị lỗi (${when}): ${res.lastError.message}`, true);
    }
  }

  function read() {
    const out = {
      enabled: $("ntEnabled").checked,
      token: $("ntToken").value.trim(),
      chatId: $("ntChatId").value.trim(),
      events: {},
    };
    for (const input of $("ntEvents").querySelectorAll("input[data-event]")) out.events[input.dataset.event] = input.checked;
    return out;
  }

  async function save() {
    const res = await send("NOTIFY_SAVE", { settings: read() });
    if (!res?.ok) {
      // Bật khi chưa đủ token / chat ID bị từ chối: trả công tắc về tắt cho khớp với cài đặt đã lưu.
      $("ntEnabled").checked = false;
      window.AuraToast?.error(res?.error || "Không lưu được.");
      return status(res?.error || "Không lưu được.", true);
    }
    render(res);
    const text = res.settings.enabled ? "Đã lưu. Thông báo đang bật." : "Đã lưu. Thông báo đang tắt.";
    status(text);
    window.AuraToast?.ok(text);
  }

  async function test() {
    const btn = $("ntTest");
    btn.disabled = true;
    status("Đang gửi thử…");
    const res = await send("NOTIFY_TEST", { settings: read() });
    btn.disabled = false;
    if (!res?.ok) {
      window.AuraToast?.error(res?.error || "không rõ lỗi", "Gửi thử thất bại");
      return status(res?.error || "Gửi thử thất bại.", true);
    }
    status("Đã gửi. Kiểm tra Telegram, rồi bấm «Lưu cài đặt thông báo».");
    window.AuraToast?.ok("Đã gửi tin thử lên Telegram");
  }

  async function detect() {
    const btn = $("ntDetect");
    btn.disabled = true;
    status("Đang tìm Chat ID…");
    const res = await send("NOTIFY_DETECT_CHAT", { token: $("ntToken").value });
    btn.disabled = false;
    if (!res?.ok) return status(res?.error || "Không lấy được Chat ID.", true);
    $("ntChatId").value = res.chatId;
    status(`Đã lấy Chat ID ${res.chatId}${res.name ? ` (${res.name})` : ""}. Bấm «Gửi thử» để kiểm tra.`);
  }

  async function init() {
    const res = await send("NOTIFY_GET");
    if (res?.ok) render(res);
    $("ntSave").addEventListener("click", save);
    $("ntTest").addEventListener("click", test);
    $("ntDetect").addEventListener("click", detect);
    // Bật/tắt công tắc tổng và từng loại sự kiện thì lưu ngay; token / chat ID lưu khi bấm nút.
    $("ntEnabled").addEventListener("change", save);
    $("ntEvents").addEventListener("change", save);
  }

  init();
})();
