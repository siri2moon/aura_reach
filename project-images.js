/**
 * project-images.js — ảnh người dùng tự tải lên cho từng dự án, để đính kèm bài đăng / bình luận.
 * Dùng chung cho service worker (importScripts) và app.html (<script>), cùng một IndexedDB của extension.
 *
 * Ảnh có sẵn của dự án là file trong project-images/ (ProjectsCore.presetImages), máy nào pull repo về cũng có.
 * Ảnh tải lên chỉ nằm trên máy đó. Không lưu trong chrome.storage.local vì getState() đọc cả kho ở mọi lượt chạy.
 *
 * Mỗi ảnh: { id, projectId, name, type, dataUrl, addedAt }.
 */
(function (root) {
  const DB_NAME = "aura-project-images";
  const STORE = "images";
  let dbPromise = null;

  function openDb() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("projectId", "projectId");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      dbPromise.catch(() => (dbPromise = null));
    }
    return dbPromise;
  }

  // Chạy `work(store)` trong một transaction; trả về kết quả của request cuối cùng `work` trả ra (nếu có).
  async function withStore(mode, work) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Lưu ảnh bị huỷ."));
    });
  }

  async function list(projectId) {
    const rows = await withStore("readonly", (store) => store.index("projectId").getAll(String(projectId)));
    return (rows || []).sort((a, b) => a.addedAt - b.addedAt);
  }

  /** Thêm nhiều ảnh trong một transaction. items: [{ name, type, dataUrl }]. */
  async function addMany(projectId, items) {
    const now = Date.now();
    const rows = items.map((item, i) => ({
      id: `${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: String(projectId),
      name: String(item.name || "image.jpg"),
      type: String(item.type || "image/jpeg"),
      dataUrl: String(item.dataUrl || ""),
      addedAt: now + i,
    }));
    await withStore("readwrite", (store) => {
      for (const row of rows) store.put(row);
      return null;
    });
    return rows;
  }

  async function remove(id) {
    await withStore("readwrite", (store) => store.delete(String(id)));
  }

  root.ProjectImages = { list, addMany, remove };
})(typeof self !== "undefined" ? self : globalThis);
