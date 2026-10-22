(() => {
  "use strict";
  if (window.__SA_TT_PAGE__) return;
  window.__SA_TT_PAGE__ = true;

  const ISO = "sa-tt-iso";
  const PAGE = "sa-tt-page";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== ISO) return;
    handle(msg)
      .then((result) => {
        window.postMessage({ source: PAGE, requestId: msg.requestId, ...result }, "*");
      })
      .catch((error) => {
        window.postMessage({
          source: PAGE,
          requestId: msg.requestId,
          ok: false,
          error: error?.message || String(error),
        }, "*");
      });
  });

  async function handle(msg) {
    if (msg.type === "PING") return { ok: true, pong: true };
    if (msg.type === "TYPE_COMMENT") return typeComment(String(msg.text || ""));
    return { ok: false, error: "unknown" };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function isEditor(el) {
    if (!(el instanceof Element) || !visible(el)) return false;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return true;
    const ce = String(el.getAttribute("contenteditable") || "").toLowerCase();
    return ce === "true" || ce === "plaintext-only" || el.getAttribute("role") === "textbox";
  }

  function findEditor() {
    const root = document.querySelector('[data-e2e="comment-input"]');
    const pool = [
      ...(root ? root.querySelectorAll('[contenteditable="plaintext-only"], [contenteditable="true"], [contenteditable], textarea, [role="textbox"]') : []),
      ...document.querySelectorAll(
        '[data-e2e="comment-input"] [contenteditable], .public-DraftEditor-content[contenteditable], [data-lexical-editor="true"], [contenteditable="plaintext-only"]'
      ),
    ];
    return [...pool].find(isEditor) || null;
  }

  function editorText(el) {
    if (!el) return "";
    const raw = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : el.innerText || el.textContent || "";
    return String(raw).replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/\s+/g, " ").trim();
  }

  function findPostButton() {
    const direct = document.querySelector('[data-e2e="comment-post"], [data-e2e="comment-publish"]');
    if (direct && visible(direct)) return direct;
    const root = document.querySelector('[data-e2e="comment-input"]')?.closest("form, div") || document;
    return (
      Array.from(root.querySelectorAll("button, [role='button'], [data-e2e*='comment']")).find((el) => {
        if (!visible(el)) return false;
        const label = `${el.innerText || ""} ${el.getAttribute("aria-label") || ""}`.trim();
        return /^(đăng|post|send)$/i.test(label);
      }) || null
    );
  }

  function buttonFingerprint(el) {
    if (!el) return "";
    const s = getComputedStyle(el);
    return [el.getAttribute("aria-disabled"), s.color, s.backgroundColor, s.opacity, String(el.className || "")].join("|");
  }

  function looksEnabled(el, beforeFp) {
    if (!el || !visible(el)) return false;
    if (el.disabled || el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    if (el.getAttribute("aria-disabled") === "false") return true;
    const cls = `${el.className || ""} ${el.parentElement?.className || ""}`;
    if (/\b(disabled|disable|is-disable|inactive|not-allow)\b/i.test(cls)) return false;
    const s = getComputedStyle(el);
    if (s.pointerEvents === "none") return false;
    const color = s.color || "";
    const bg = s.backgroundColor || "";
    const rgb = (c) => {
      const m = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? m.slice(1).map(Number) : null;
    };
    const redish = (c) => {
      const p = rgb(c);
      return p && p[0] > 180 && p[1] < 90 && p[2] < 130;
    };
    if (redish(color) || redish(bg)) return true;
    if (beforeFp && buttonFingerprint(el) !== beforeFp) return true;
    return false;
  }

  function placeCaret(el) {
    el.focus({ preventScroll: true });
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // ignore
    }
  }

  function clickAt(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + Math.min(18, Math.max(6, rect.width * 0.2));
    const y = rect.top + rect.height / 2;
    const mouse = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new MouseEvent("mousedown", { ...mouse, buttons: 1 }));
    el.dispatchEvent(new MouseEvent("mouseup", { ...mouse, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("click", mouse));
    el.focus({ preventScroll: true });
  }

  function fireKey(el, type, char) {
    const isEnter = char === "\n";
    const key = isEnter ? "Enter" : char;
    const keyCode = isEnter ? 13 : char.charCodeAt(0);
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code: isEnter ? "Enter" : /[a-zA-Z]/.test(char) ? `Key${char.toUpperCase()}` : "Unidentified",
        keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    );
  }

  function dispatchPaste(el, text) {
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    let paste;
    try {
      paste = new ClipboardEvent("paste", { bubbles: true, cancelable: true, composed: true, clipboardData: dt });
    } catch {
      paste = new ClipboardEvent("paste", { bubbles: true, cancelable: true, composed: true });
    }
    try {
      Object.defineProperty(paste, "clipboardData", { value: dt });
    } catch {
      // already set
    }
    el.dispatchEvent(paste);
  }

  function triggerReact(el, text) {
    let node = el;
    for (let i = 0; i < 10 && node; i += 1) {
      const key = Object.keys(node).find((k) => k.startsWith("__reactProps$") || k.startsWith("__reactEventHandlers$"));
      const props = key ? node[key] : null;
      if (props && (props.onInput || props.onChange || props.onKeyDown)) {
        const fake = {
          bubbles: true,
          cancelable: true,
          target: node,
          currentTarget: node,
          nativeEvent: { inputType: "insertText", data: text },
        };
        try {
          props.onKeyDown?.({ ...fake, key: text.slice(-1) || "a" });
          props.onInput?.(fake);
          props.onChange?.(fake);
        } catch {
          // Draft.js EditorState shape is different
        }
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  async function clearEditor(el) {
    placeCaret(el);
    await sleep(40);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
    await sleep(30);
    placeCaret(el);
  }

  async function typeChar(el, char) {
    fireKey(el, "keydown", char);
    const inserted =
      char === "\n" ? document.execCommand("insertLineBreak", false, null) : document.execCommand("insertText", false, char);
    if (!inserted) {
      try {
        const ev = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType: char === "\n" ? "insertLineBreak" : "insertText",
          data: char,
        });
        el.dispatchEvent(ev);
        if (!ev.defaultPrevented) document.execCommand("insertText", false, char);
      } catch {
        document.execCommand("insertText", false, char);
      }
    }
    fireKey(el, "keypress", char);
    fireKey(el, "keyup", char);
  }

  function humanDelay(char, index) {
    let ms = 55 + Math.round(Math.random() * 110);
    if (char === " ") ms += 25 + Math.round(Math.random() * 55);
    if (/[.,!?;:]/.test(char)) ms += 90 + Math.round(Math.random() * 160);
    if (index > 8 && Math.random() < 0.06) ms += 220 + Math.round(Math.random() * 380);
    return ms;
  }

  async function typeComment(text) {
    const want = String(text || "");
    if (!want) return { ok: false, error: "empty" };
    const el = findEditor();
    if (!el) return { ok: false, error: "no-editor" };

    const postBefore = findPostButton();
    const beforeFp = buttonFingerprint(postBefore);

    clickAt(el);
    await sleep(160 + Math.round(Math.random() * 120));
    placeCaret(el);
    await sleep(80);
    await clearEditor(el);

    const chars = [...want];
    for (let i = 0; i < chars.length; i += 1) {
      if (document.activeElement !== el && !el.contains(document.activeElement)) placeCaret(el);
      await typeChar(el, chars[i]);
      await sleep(humanDelay(chars[i], i));
    }

    await sleep(280);
    let typed = editorText(el);
    if (!typed) {
      placeCaret(el);
      dispatchPaste(el, want);
      await sleep(250);
      typed = editorText(el);
    }
    if (!typed) {
      triggerReact(el, want);
      await sleep(120);
      typed = editorText(el);
    }

    const postBtn = findPostButton();
    const enabled = looksEnabled(postBtn, beforeFp);
    if (!enabled && typed) {
      await clearEditor(el);
      dispatchPaste(el, want);
      await sleep(300);
    }

    return {
      ok: Boolean(editorText(el)),
      typed: editorText(el),
      postEnabled: looksEnabled(findPostButton(), beforeFp),
    };
  }
})();
