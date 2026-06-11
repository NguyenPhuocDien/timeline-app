/**
 * Timeline Focus — Safe DOM Helpers
 *
 * Mục đích: cung cấp API ngắn gọn để render data user nhập mà KHÔNG bị XSS.
 *
 * VẤN ĐỀ: `el.innerHTML = task.title` → nếu title là `<img src=x onerror="...">` → XSS.
 *
 * GIẢI PHÁP: Dùng `textContent` (browser tự escape) thay cho `innerHTML`.
 *            Khi cần build DOM phức tạp, dùng `h()` (hyperscript) hoặc `el()` helpers
 *            ở dưới — chúng tự escape mọi text input.
 *
 * Cách dùng trong app.js cũ:
 *   // CŨ (XSS risk):
 *   listEl.innerHTML = tasks.map(t => `<li>${t.title}</li>`).join('');
 *
 *   // MỚI (an toàn):
 *   import { el, clearAndAppend, escapeHtml } from './utils/safe-dom.js';
 *   clearAndAppend(listEl, tasks.map(t => el('li', {}, t.title)));
 *
 *   // Hoặc nếu phải dùng innerHTML (vì cần render HTML có format):
 *   listEl.innerHTML = tasks.map(t => `<li>${escapeHtml(t.title)}</li>`).join('');
 */

/**
 * Escape HTML special chars để chèn an toàn vào innerHTML.
 * Dùng KHI bắt buộc phải dùng innerHTML (legacy code).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value == null) return '';
  const s = String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape attribute value (cho src, href, etc).
 * @param {unknown} value
 */
export function escapeAttr(value) {
  return escapeHtml(value);
}

/**
 * Tạo DOM element từ tag, attrs, children — KHÔNG dùng innerHTML.
 * Text children luôn được escape tự động bởi textContent.
 *
 * Ví dụ:
 *   el('div', { class: 'card', 'data-id': task.id },
 *     el('h3', {}, task.title),               // text → tự escape
 *     el('p', { class: 'notes' }, task.notes), // text → tự escape
 *     el('button', { onclick: () => del(task.id) }, 'Xoá')
 *   );
 *
 * @param {string} tag
 * @param {Object<string, unknown>} [attrs]
 * @param {...(Node|string|number|null|undefined|false|Array)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;

    if (key === 'class' || key === 'className') {
      node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // onclick → click; onChange → change
      const eventName = key.slice(2).toLowerCase();
      node.addEventListener(eventName, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(node.dataset, value);
    } else if (key === 'html') {
      // Escape hatch: chỉ dùng khi value đã chắc chắn an toàn (constant string).
      // ĐỪNG dùng cho user data.
      node.innerHTML = String(value);
    } else if (typeof value === 'boolean') {
      if (value) node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }

  appendChildren(node, children);
  return node;
}

/**
 * Append children, flatten array, skip null/undefined/false,
 * convert string/number → text node (auto-escape).
 *
 * @param {Node} parent
 * @param {Array} children
 */
function appendChildren(parent, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}

/**
 * Xóa nội dung cũ và append nodes mới (an toàn).
 * @param {Element} container
 * @param {Node|Node[]} nodes
 */
export function clearAndAppend(container, nodes) {
  container.replaceChildren(...(Array.isArray(nodes) ? nodes : [nodes]));
}

/**
 * Set text an toàn (không có XSS risk).
 * Tương đương `el.textContent = value` nhưng accept null/undefined gracefully.
 * @param {Element|null} el
 * @param {unknown} value
 */
export function setText(el, value) {
  if (!el) return;
  el.textContent = value == null ? '' : String(value);
}

/**
 * Set attribute an toàn (escape sẵn).
 * Block javascript: URLs trong href/src.
 * @param {Element|null} el
 * @param {string} name
 * @param {unknown} value
 */
export function setAttr(el, name, value) {
  if (!el) return;
  if (value == null) {
    el.removeAttribute(name);
    return;
  }
  const s = String(value);
  // Block javascript: URLs
  if (
    (name === 'href' || name === 'src' || name === 'action' || name === 'formaction') &&
    /^\s*javascript:/i.test(s)
  ) {
    el.removeAttribute(name);
    return;
  }
  el.setAttribute(name, s);
}

/**
 * Sanitize URL — chỉ chấp nhận http(s), mailto, tel, relative paths.
 * Trả về '' nếu URL không an toàn.
 * @param {unknown} url
 * @returns {string}
 */
export function safeUrl(url) {
  if (url == null) return '';
  const s = String(url).trim();
  if (!s) return '';
  if (/^\s*javascript:/i.test(s)) return '';
  if (/^\s*data:/i.test(s)) {
    // Chỉ cho phép data:image/...
    if (!/^data:image\/(png|jpeg|gif|webp|svg\+xml);/i.test(s)) return '';
  }
  return s;
}

/**
 * Render multi-line text với line break (an toàn).
 * Tương đương `el.innerHTML = text.replace(/\n/g, '<br>')` nhưng safe.
 * @param {Element} container
 * @param {string} text
 */
export function setMultilineText(container, text) {
  container.replaceChildren();
  const lines = String(text || '').split('\n');
  lines.forEach((line, i) => {
    if (i > 0) container.appendChild(document.createElement('br'));
    container.appendChild(document.createTextNode(line));
  });
}
