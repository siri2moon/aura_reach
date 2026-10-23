/**
 * notify-bg.js — thông báo Telegram do người dùng tự cấu hình (bot token + chat ID của chính họ).
 * Được background.js nạp bằng importScripts, dùng chung telegramSendMessage, clip, getActiveProject.
 *
 * Tách hẳn với "nhận diện phiên" của telegram.env: cái này chỉ gửi khi người dùng bật, tới bot của họ.
 *
 * Lưu trong chrome.storage.local:
 *   telegramNotify           { enabled, token, chatId, events: { [event]: boolean } }
 *   telegramNotifyLastError  { at, message } lần gửi lỗi gần nhất, để trang cài đặt hiện ra
 *
 * background.js gọi notifyEvent qua log(level, message, event, link): event là một khoá của NOTIFY_EVENTS,
 * link là bài / video vừa thao tác (có thì gửi kèm);
 * log("error", ...) tự tính là event "error".
 */

const NOTIFY_KEY = "telegramNotify";
const NOTIFY_ERROR_KEY = "telegramNotifyLastError";

// def: bật sẵn khi người dùng chưa chỉnh. Lướt feed / thả tim không có ở đây vì quá dày.
const NOTIFY_EVENTS = {
  comment: { label: "Bình luận thành công", icon: "💬", def: true },
  post: { label: "Đăng bài thành công", icon: "📝", def: true },
  reply: { label: "Trả lời bình luận thành công", icon: "↩️", def: true },
  draft: { label: "Bản nháp chờ duyệt (Nadezhno)", icon: "🕓", def: true },
  follow: { label: "Follow / subscribe / kết bạn", icon: "➕", def: false },
  message: { label: "Nhắn tin Zalo", icon: "✉️", def: false },
  review: { label: "Đánh giá Google Maps", icon: "⭐", def: false },
  group: { label: "Tham gia / rời nhóm Facebook", icon: "👥", def: false },
  error: { label: "Lỗi và job tự dừng", icon: "⚠️", def: true },
};

// Cùng một lỗi lặp lại liên tục (ví dụ checkpoint) chỉ báo một lần mỗi 10 phút.
const NOTIFY_REPEAT_MS = 10 * 60 * 1000;
const notifyRecent = new Map();

function notifyDefaults() {
  return {
    enabled: false,
    token: "",
    chatId: "",
    events: Object.fromEntries(Object.entries(NOTIFY_EVENTS).map(([k, v]) => [k, v.def])),
  };
}

async function notifyLoad() {
  const stored = (await chrome.storage.local.get(NOTIFY_KEY))[NOTIFY_KEY] || {};
  const base = notifyDefaults();
  return { ...base, ...stored, events: { ...base.events, ...(stored.events || {}) } };
}

function notifyConfigReady(cfg) {
  return Boolean(cfg.token && cfg.chatId);
}

function queueNotifyEvent(event, message, link) {
  notifyEvent(event, message, link).catch(() => {});
}

async function notifyEvent(event, message, link) {
  const meta = NOTIFY_EVENTS[event];
  if (!meta) return;
  const cfg = await notifyLoad();
  if (!cfg.enabled || !notifyConfigReady(cfg) || !cfg.events[event]) return;

  const dedupeKey = `${event}:${message}`;
  const last = notifyRecent.get(dedupeKey) || 0;
  if (event === "error" && Date.now() - last < NOTIFY_REPEAT_MS) return;
  notifyRecent.set(dedupeKey, Date.now());

  try {
    await telegramSendMessage({ token: cfg.token, chatId: cfg.chatId }, await notifyFormat(meta, message, link));
  } catch (error) {
    // Không gọi log(): log lỗi sẽ lại kích hoạt thông báo lỗi và lặp vô hạn.
    await chrome.storage.local.set({ [NOTIFY_ERROR_KEY]: { at: Date.now(), message: String(error?.message || error) } });
  }
}

async function notifyFormat(meta, message, link) {
  const project = await getActiveProject().catch(() => null);
  const when = new Date().toLocaleString("vi-VN", { hour12: false });
  // Telegram tự biến URL trong tin nhắn thường thành link bấm được.
  const linkLine = /^https?:\/\//i.test(String(link || "")) ? `🔗 ${link}` : "";
  return [`${meta.icon} ${meta.label}${project ? ` · ${project.name}` : ""}`, "", clip(message, 3500), linkLine, "", `Aura Reach · ${when}`]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

async function handleNotifyMessage(message) {
  switch (message.type) {
    case "NOTIFY_GET":
      return { ok: true, ...(await notifyPublicState()) };
    case "NOTIFY_SAVE":
      return notifySave(message.settings);
    case "NOTIFY_TEST":
      return notifyTest(message.settings);
    case "NOTIFY_DETECT_CHAT":
      return notifyDetectChat(message.token);
    default:
      return { ok: false, error: `Unknown message ${message.type}` };
  }
}

async function notifyPublicState() {
  const settings = await notifyLoad();
  const lastError = (await chrome.storage.local.get(NOTIFY_ERROR_KEY))[NOTIFY_ERROR_KEY] || null;
  const events = Object.entries(NOTIFY_EVENTS).map(([key, v]) => ({ key, label: v.label, icon: v.icon }));
  return { settings, events, lastError };
}

function notifyClean(input) {
  const base = notifyDefaults();
  const events = {};
  for (const key of Object.keys(NOTIFY_EVENTS)) {
    events[key] = typeof input?.events?.[key] === "boolean" ? input.events[key] : base.events[key];
  }
  return {
    enabled: Boolean(input?.enabled),
    token: String(input?.token || "").trim(),
    chatId: String(input?.chatId || "").trim(),
    events,
  };
}

async function notifySave(input) {
  const settings = notifyClean(input);
  if (settings.enabled && !notifyConfigReady(settings)) {
    return { ok: false, error: "Cần nhập Bot token và Chat ID trước khi bật thông báo." };
  }
  await chrome.storage.local.set({ [NOTIFY_KEY]: settings });
  return { ok: true, ...(await notifyPublicState()) };
}

async function notifyTest(input) {
  const settings = notifyClean(input || (await notifyLoad()));
  if (!notifyConfigReady(settings)) return { ok: false, error: "Cần nhập Bot token và Chat ID." };
  try {
    const text = await notifyFormat({ icon: "🔔", label: "Thử thông báo" }, "Aura Reach đã kết nối Telegram. Bạn sẽ nhận tin ở đây theo các mục đã chọn.");
    await telegramSendMessage({ token: settings.token, chatId: settings.chatId }, text);
    await chrome.storage.local.remove(NOTIFY_ERROR_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

/** Lấy chat ID từ tin nhắn gần nhất mà người dùng gửi cho bot (getUpdates). */
async function notifyDetectChat(token) {
  const clean = String(token || "").trim();
  if (!clean) return { ok: false, error: "Nhập Bot token trước." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${clean}/getUpdates`);
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) return { ok: false, error: `Telegram lỗi: ${payload?.description || `HTTP ${res.status}`}` };
    const updates = Array.isArray(payload.result) ? payload.result : [];
    for (let i = updates.length - 1; i >= 0; i -= 1) {
      const u = updates[i];
      const chat = (u.message || u.channel_post || u.my_chat_member || u.edited_message)?.chat;
      if (chat?.id) {
        const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "";
        return { ok: true, chatId: String(chat.id), name };
      }
    }
    return { ok: false, error: "Chưa thấy tin nhắn nào. Mở bot trên Telegram, gửi /start rồi bấm lại." };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}
