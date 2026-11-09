/**
 * attach-image.js — đính kèm một ảnh vào ô soạn bài / bình luận đang mở (Facebook, Threads).
 * Nạp trước content script của nền tảng (manifest và ensureContentScript), dùng chung qua globalThis.AuraAttachImage.
 *
 * image: { name, type, dataUrl } do service worker gửi kèm lệnh đăng (projectImageFor trong projects-bg.js).
 * Cách gắn: gán file vào input[type=file] nhận ảnh gần ô soạn nhất; không có input thì dán ảnh (paste) vào ô soạn.
 * Chỉ dùng một cách cho mỗi lượt để không bao giờ gắn trùng hai ảnh.
 * Trả về "attached" (thấy ảnh xem trước), "unverified" (đã gán file nhưng không thấy ảnh xem trước) hoặc "failed".
 */
(() => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitFor(check, timeout) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const value = check();
      if (value) return value;
      await sleep(300);
    }
    return null;
  }

  function fileFromImage(image) {
    const [head, b64 = ""] = String(image.dataUrl || "").split(",");
    const type = image.type || (head.match(/^data:([^;,]+)/) || [])[1] || "image/jpeg";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], image.name || "image.jpg", { type, lastModified: Date.now() });
  }

  function acceptsImage(input) {
    const accept = (input.getAttribute("accept") || "").toLowerCase();
    return !input.disabled && (!accept || accept.includes("image"));
  }

  // Leo từ ô soạn lên tới `scope`, lấy input ảnh của khung gần nhất: đúng input của ô này, không phải của bài khác.
  function nearestImageInput(box, scope) {
    let node = box;
    for (let i = 0; i < 14 && node; i += 1) {
      const input = [...node.querySelectorAll('input[type="file"]')].find(acceptsImage);
      if (input) return input;
      if (node === scope) break;
      node = node.parentElement;
    }
    return null;
  }

  // Ảnh xem trước của file vừa chọn là blob: hoặc data:. Không đếm video vì video trên feed cũng dùng blob:.
  function previewCount(root) {
    return root.querySelectorAll('img[src^="blob:"], img[src^="data:image"]').length;
  }

  async function attach(image, { box, scope } = {}) {
    if (!image?.dataUrl || !box) return "failed";
    const area = scope || box.closest('[role="dialog"], [role="article"], form') || null;
    const root = area || document.body;
    try {
      const before = previewCount(root);
      const file = fileFromImage(image);
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = nearestImageInput(box, area);
      if (input) {
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        box.focus();
        box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      }
      const seen = await waitFor(() => previewCount(root) > before, 10000);
      if (!seen) return input ? "unverified" : "failed";
      // Chờ tải ảnh lên xong: thanh tiến trình trong khung soạn biến mất (tối đa 20 giây).
      await sleep(1200);
      await waitFor(() => !root.querySelector('[role="progressbar"]'), 20000);
      await sleep(600);
      return "attached";
    } catch {
      return "failed";
    }
  }

  globalThis.AuraAttachImage = attach;
})();
