/**
 * Timeline Focus — Sync Status Indicator (Phase B FIX)
 *
 * Sửa: dùng đúng CSS variables của app.js
 *   --panel (NOT --card)
 *   --line (NOT --border)
 *   --text, --muted, --ok, --warn, --bad, --brand
 */

const STATUS_CONFIG = {
  'synced':     { icon: '✓', label: 'Đã đồng bộ',     color: 'var(--ok, #16a34a)' },
  'syncing':    { icon: '⟳', label: 'Đang đồng bộ...', color: 'var(--brand, #2563eb)' },
  'offline':    { icon: '⊘', label: 'Offline',         color: 'var(--warn, #d97706)' },
  'error':      { icon: '!', label: 'Lỗi đồng bộ',     color: 'var(--bad, #dc2626)' },
  'signed-out': { icon: '○', label: 'Chưa đăng nhập',  color: 'var(--muted, #6b7280)' },
};

let indicatorEl = null;
let iconEl = null;
let labelEl = null;
let currentStatus = 'signed-out';
let currentError = null;

function ensureIndicator() {
  if (indicatorEl) return indicatorEl;

  indicatorEl = document.createElement('div');
  indicatorEl.id = 'syncIndicator';
  indicatorEl.setAttribute('role', 'status');
  indicatorEl.setAttribute('aria-live', 'polite');
  // Dùng đúng CSS variables của app.js: --panel, --line, --text, --shadow
  indicatorEl.style.cssText = `
    position: fixed;
    bottom: max(12px, env(safe-area-inset-bottom, 12px));
    right: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--panel, #fff);
    border: 1px solid var(--line, #e5e7eb);
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text, #111);
    box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,.1));
    z-index: 50;
    cursor: pointer;
    user-select: none;
    transition: opacity 0.2s, transform 0.2s, border-color 0.2s;
    opacity: 0.85;
    line-height: 1.2;
  `;

  iconEl = document.createElement('span');
  iconEl.style.cssText = 'font-weight:700;font-size:14px;line-height:1;display:inline-block;';
  indicatorEl.appendChild(iconEl);

  labelEl = document.createElement('span');
  indicatorEl.appendChild(labelEl);

  indicatorEl.addEventListener('mouseenter', () => {
    indicatorEl.style.opacity = '1';
  });
  indicatorEl.addEventListener('mouseleave', () => {
    indicatorEl.style.opacity = currentStatus === 'error' ? '1' : '0.85';
  });

  indicatorEl.addEventListener('click', showDetails);

  document.body.appendChild(indicatorEl);
  injectKeyframes();
  return indicatorEl;
}

function injectKeyframes() {
  if (document.getElementById('tlf-spin-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'tlf-spin-keyframes';
  style.textContent = `
    @keyframes tlf-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @media (max-width: 640px) {
      #syncIndicator { bottom: max(70px, env(safe-area-inset-bottom, 0px) + 70px) !important; }
    }
  `;
  document.head.appendChild(style);
}

function render(status, error) {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG['signed-out'];
  ensureIndicator();
  iconEl.textContent = conf.icon;
  iconEl.style.color = conf.color;
  labelEl.textContent = conf.label;
  indicatorEl.style.borderColor = conf.color;
  indicatorEl.setAttribute('aria-label', `Trạng thái sync: ${conf.label}`);

  if (status === 'syncing') {
    iconEl.style.animation = 'tlf-spin 1s linear infinite';
  } else {
    iconEl.style.animation = '';
  }

  if (status === 'error') {
    indicatorEl.style.opacity = '1';
    indicatorEl.style.background = 'var(--bad-light, #fef2f2)';
  } else {
    indicatorEl.style.opacity = '0.85';
    indicatorEl.style.background = 'var(--panel, #fff)';
  }
}

function showDetails() {
  const conf = STATUS_CONFIG[currentStatus];
  let msg = `Trạng thái: ${conf.label}\n`;
  if (currentError) msg += `\nLỗi: ${currentError}\n`;
  msg += '\nMẹo:';
  if (currentStatus === 'error') {
    msg += '\n• Thử logout rồi login lại';
    msg += '\n• Xuất dữ liệu (nút "↑ Xuất dữ liệu") để backup ngay';
    msg += '\n• Kiểm tra console (F12) để xem chi tiết';
  } else if (currentStatus === 'offline') {
    msg += '\n• Dữ liệu vẫn lưu local, sẽ sync khi có mạng';
  } else if (currentStatus === 'signed-out') {
    msg += '\n• Nhấn "Đăng nhập Đồng bộ" để bật sync';
  } else if (currentStatus === 'syncing') {
    msg += '\n• Đang gửi/nhận dữ liệu...';
  } else {
    msg += '\n• Tất cả dữ liệu đã đồng bộ lên cloud';
  }
  alert(msg);
}

// Init
document.addEventListener('sync-status-change', (e) => {
  const { status, error } = e.detail || {};
  currentStatus = status || 'signed-out';
  currentError = error || null;
  render(currentStatus, currentError);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => render(currentStatus, currentError));
} else {
  render(currentStatus, currentError);
}
