// Họ và tên : Nguyễn Phước Điền | MSSV: 21002595
// Môn       : Chuyên ngành | Bài: Timeline Focus App

const $ = s => document.querySelector(s); const $$ = s => Array.from(document.querySelectorAll(s));
    const LEGACY_KEY = 'timeline_focus_product_final_v6';
    const ACTIVE_UID_KEY = 'timeline_focus_active_uid';
    function storageKey() {
      const activeUid = localStorage.getItem(ACTIVE_UID_KEY);
      const fallbackScope = activeUid ? `user-${encodeURIComponent(activeUid)}` : 'anonymous';
      return `${LEGACY_KEY}:${window.timelineStorageScope || fallbackScope}`;
    }
    const tabs = [
      ['dashboard', 'Hôm nay'],
      ['timeline', 'Timeline'],
      ['tasks', 'Tasks'],
      ['focus', 'Tập trung'],
      ['debt', 'Việc tồn'],
      ['calendar', 'Lịch & Sự kiện'],
      ['analytics', 'Thống kê'],
      ['settings', 'Cài đặt']
    ];
    const THEMES = [
      { id: 'github-light', name: 'GitHub Light', meta: '#0969da', swatches: ['#f6f8fa', '#ffffff', '#0969da', '#1a7f37', '#cf222e'] },
      { id: 'vscode-dark', name: 'VS Code Dark', meta: '#1e1e1e', swatches: ['#1e1e1e', '#252526', '#3794ff', '#6a9955', '#f44747'] },
      { id: 'vscode-dark-plus', name: 'VS Code Dark+', meta: '#181818', swatches: ['#181818', '#1f1f1f', '#4fc1ff', '#89d185', '#f14c4c'] },
      { id: 'one-dark-pro', name: 'One Dark Pro', meta: '#21252b', swatches: ['#21252b', '#282c34', '#61afef', '#98c379', '#e06c75'] },
      { id: 'dracula', name: 'Dracula', meta: '#282a36', swatches: ['#282a36', '#2f3240', '#8be9fd', '#50fa7b', '#ff5555'] },
      { id: 'monokai', name: 'Monokai', meta: '#272822', swatches: ['#272822', '#2f3129', '#66d9ef', '#a6e22e', '#f92672'] },
      { id: 'solarized-light', name: 'Solarized Light', meta: '#fdf6e3', swatches: ['#fdf6e3', '#fffaf0', '#268bd2', '#859900', '#dc322f'] },
      { id: 'system', name: 'Theo hệ điều hành', meta: '#2563eb', swatches: ['#f7f8fa', '#ffffff', '#2563eb', '#1e1e1e', '#3794ff'] }
    ];
    Object.assign(THEMES[0], { note: 'Sạch, sáng, kiểu GitHub issues.' });
    Object.assign(THEMES[1], { note: 'Mặc định thân quen của VS Code.' });
    Object.assign(THEMES[2], { note: 'Độ tương phản mạnh hơn.' });
    Object.assign(THEMES[3], { note: 'Cân bằng, dễ đọc khối nội dung dài.' });
    Object.assign(THEMES[4], { note: 'Nổi bật, hợp màn tối.' });
    Object.assign(THEMES[5], { note: 'Classic editor look.' });
    Object.assign(THEMES[6], { note: 'Theme sáng dịu mắt.' });
    Object.assign(THEMES[7], { note: 'Tự theo máy của bạn.' });
    THEMES.splice(THEMES.length - 1, 0,
      { id: 'github-dark-dimmed', name: 'GitHub Dark Dimmed', meta: '#22272e', swatches: ['#22272e', '#2d333b', '#539bf5', '#57ab5a', '#e5534b'], note: 'Đậm vừa, dễ nhìn lâu.' },
      { id: 'gitlab-dark', name: 'GitLab Dark', meta: '#171321', swatches: ['#171321', '#201a2d', '#fc6d26', '#6fd3a3', '#ff6b81'], note: 'Tông cam tím đậm kiểu GitLab.' },
      { id: 'tokyo-night', name: 'Tokyo Night', meta: '#1a1b26', swatches: ['#1a1b26', '#1f2335', '#7aa2f7', '#9ece6a', '#f7768e'], note: 'Vibe editor đêm rất gọn.' },
      { id: 'night-owl', name: 'Night Owl', meta: '#011627', swatches: ['#011627', '#0b2036', '#82aaff', '#addb67', '#ef5350'], note: 'Rất hợp khi làm khuya.' },
      { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', meta: '#1e1e2e', swatches: ['#1e1e2e', '#181825', '#89b4fa', '#a6e3a1', '#f38ba8'], note: 'Mềm mắt và hiện đại.' },
      { id: 'material-ocean', name: 'Material Ocean', meta: '#0f111a', swatches: ['#0f111a', '#161b2d', '#82aaff', '#c3e88d', '#f07178'], note: 'Đậm chất IDE dashboard.' },
      { id: 'ayu-mirage', name: 'Ayu Mirage', meta: '#1f2430', swatches: ['#1f2430', '#242936', '#73d0ff', '#d5ff80', '#f28779'], note: 'Ấm hơn dark theme truyền thống.' },
      { id: 'gruvbox-dark', name: 'Gruvbox Dark', meta: '#282828', swatches: ['#282828', '#32302f', '#83a598', '#b8bb26', '#fb4934'], note: 'Retro nhưng rất tập trung.' }
    );
    const BACKGROUND_PRESETS = [
      { id: 'none', name: 'Tối giản', note: 'Không nền, tập trung nội dung.', preview: 'linear-gradient(135deg, #dbeafe 0%, #f8fafc 55%, #eff6ff 100%)', image: 'none', overlay: 'linear-gradient(180deg, transparent, transparent)', blur: '0px' },
      { id: 'anime-sky', name: 'Anime Sky', note: 'Bầu trời xanh kiểu anime.', preview: 'linear-gradient(180deg, #60a5fa 0%, #8ec5ff 45%, #dbeafe 100%), radial-gradient(circle at 20% 24%, rgba(255,255,255,.85) 0 14%, transparent 15%), radial-gradient(circle at 74% 20%, rgba(255,255,255,.78) 0 12%, transparent 13%)', image: 'linear-gradient(180deg, rgba(96,165,250,1) 0%, rgba(132,204,255,1) 42%, rgba(224,242,254,1) 100%), radial-gradient(circle at 22% 18%, rgba(255,255,255,.88) 0 12%, transparent 13%), radial-gradient(circle at 72% 24%, rgba(255,255,255,.76) 0 10%, transparent 11%), radial-gradient(circle at 58% 74%, rgba(255,255,255,.42) 0 8%, transparent 9%)', overlay: 'linear-gradient(180deg, rgba(8,15,35,.18), rgba(8,15,35,.48))', blur: '1px' },
      { id: 'anime-dusk', name: 'Anime Dusk', note: 'Hoàng hôn tím cam mềm hơn.', preview: 'linear-gradient(135deg, #312e81 0%, #7c3aed 32%, #fb7185 70%, #f59e0b 100%)', image: 'linear-gradient(135deg, rgba(49,46,129,1) 0%, rgba(91,33,182,1) 35%, rgba(244,114,182,1) 74%, rgba(251,191,36,1) 100%)', overlay: 'linear-gradient(180deg, rgba(15,8,30,.28), rgba(15,8,30,.56))', blur: '2px' },
      { id: 'sakura-dream', name: 'Sakura Dream', note: 'Hồng pastel, nhẹ và sáng.', preview: 'linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 28%, #ddd6fe 62%, #bfdbfe 100%)', image: 'radial-gradient(circle at 16% 22%, rgba(255,255,255,.72) 0 9%, transparent 10%), radial-gradient(circle at 68% 28%, rgba(255,255,255,.55) 0 7%, transparent 8%), linear-gradient(135deg, rgba(251,207,232,1) 0%, rgba(249,168,212,1) 28%, rgba(221,214,254,1) 62%, rgba(191,219,254,1) 100%)', overlay: 'linear-gradient(180deg, rgba(45,20,45,.18), rgba(45,20,45,.38))', blur: '1px' },
      { id: 'neon-rain', name: 'Neon Rain', note: 'Cyber city + editor dark.', preview: 'linear-gradient(135deg, #020617 0%, #0f172a 42%, #0891b2 72%, #8b5cf6 100%)', image: 'repeating-linear-gradient(105deg, rgba(255,255,255,.05) 0 2px, transparent 2px 16px), linear-gradient(135deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 42%, rgba(8,145,178,1) 72%, rgba(139,92,246,1) 100%)', overlay: 'linear-gradient(180deg, rgba(2,6,23,.45), rgba(2,6,23,.62))', blur: '2px' },
      { id: 'classroom-window', name: 'Classroom Window', note: 'Ánh sáng lớp học anime.', preview: 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 36%, #93c5fd 100%)', image: 'linear-gradient(90deg, rgba(255,255,255,.55) 0 12%, transparent 12% 20%, rgba(255,255,255,.28) 20% 23%, transparent 23% 100%), linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(219,234,254,1) 36%, rgba(147,197,253,1) 100%)', overlay: 'linear-gradient(180deg, rgba(20,28,45,.18), rgba(20,28,45,.44))', blur: '1px' },
      { id: 'aurora-code', name: 'Aurora Code', note: 'Mảng sáng như terminal cực quang.', preview: 'radial-gradient(circle at 18% 18%, #34d399 0%, transparent 28%), radial-gradient(circle at 82% 16%, #60a5fa 0%, transparent 30%), linear-gradient(135deg, #020617 0%, #111827 42%, #172554 100%)', image: 'radial-gradient(circle at 18% 18%, rgba(52,211,153,.9) 0%, transparent 28%), radial-gradient(circle at 82% 16%, rgba(96,165,250,.72) 0%, transparent 30%), radial-gradient(circle at 58% 80%, rgba(168,85,247,.38) 0%, transparent 24%), linear-gradient(135deg, rgba(2,6,23,1) 0%, rgba(17,24,39,1) 42%, rgba(23,37,84,1) 100%)', overlay: 'linear-gradient(180deg, rgba(2,6,23,.38), rgba(2,6,23,.62))', blur: '3px' }
    ];
    const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    // Catalog sự kiện mặc định — id CỐ ĐỊNH để không bị nhân đôi khi merge giữa các thiết bị/nguồn.
    // PHẢI khai báo trước `let db = load()` vì load() → defaultData() → seedEvents() dùng nó.
    const SEED_EVENTS = [
      { id: 'seed-2026-01-01-tet-duong-lich', title: 'Tết Dương lịch', type: 'solar', date: '2026-01-01', recurring: true, notes: '' }, { id: 'seed-2026-02-14-valentine', title: 'Valentine', type: 'solar', date: '2026-02-14', recurring: true, notes: '' }, { id: 'seed-2026-03-08-quoc-te-phu-nu', title: 'Ngày Quốc tế Phụ nữ', type: 'solar', date: '2026-03-08', recurring: true, notes: '' }, { id: 'seed-2026-04-26-gio-to-hung-vuong', title: 'Giỗ Tổ Hùng Vương', type: 'lunar', date: '2026-04-26', recurring: true, notes: '10/3 âm lịch, ngày dương tham khảo theo bảng tra' },
      { id: 'seed-2026-04-30-giai-phong-mien-nam', title: 'Giải phóng miền Nam', type: 'solar', date: '2026-04-30', recurring: true, notes: '' }, { id: 'seed-2026-05-01-quoc-te-lao-dong', title: 'Quốc tế Lao động', type: 'solar', date: '2026-05-01', recurring: true, notes: '' }, { id: 'seed-2026-09-02-quoc-khanh', title: 'Quốc khánh Việt Nam', type: 'solar', date: '2026-09-02', recurring: true, notes: '' }, { id: 'seed-2026-09-25-tet-trung-thu', title: 'Tết Trung Thu', type: 'lunar', date: '2026-09-25', recurring: true, notes: '15/8 âm lịch, tham khảo' },
      { id: 'seed-2026-10-20-phu-nu-viet-nam', title: 'Ngày Phụ nữ Việt Nam', type: 'solar', date: '2026-10-20', recurring: true, notes: '' }, { id: 'seed-2026-11-20-nha-giao', title: 'Ngày Nhà giáo Việt Nam', type: 'solar', date: '2026-11-20', recurring: true, notes: '' }, { id: 'seed-2026-12-25-giang-sinh', title: 'Giáng sinh', type: 'solar', date: '2026-12-25', recurring: true, notes: '' }, { id: 'seed-2027-02-01-ong-cong-ong-tao', title: 'Ông Công Ông Táo', type: 'lunar', date: '2027-02-01', recurring: true, notes: '23 tháng Chạp âm lịch, tham khảo' },
      { id: 'seed-2027-02-06-tet-nguyen-dan', title: 'Tết Nguyên Đán', type: 'lunar', date: '2027-02-06', recurring: true, notes: 'Mùng 1 Tết âm lịch, tham khảo' }
    ];
    // Calendars mặc định (kiểu Google Calendar) — id CỐ ĐỊNH để seed idempotent,
    // không nhân đôi khi merge giữa thiết bị. "cal-personal" là lịch mặc định (primary).
    const CALENDAR_SEED = [
      { id: 'cal-personal', name: 'Cá nhân', color: '#2563eb', icon: '🙂', visible: true, system: true },
      { id: 'cal-tasks', name: 'Tasks', color: '#0ea5e9', icon: '✅', visible: true, system: true },
      { id: 'cal-selfcare', name: 'Self-care', color: '#10b981', icon: '🌿', visible: true, system: true },
      { id: 'cal-socialize', name: 'Socialize', color: '#f59e0b', icon: '🥂', visible: true, system: true },
      { id: 'cal-deadline', name: 'Deadline', color: '#ef4444', icon: '⏰', visible: true, system: true },
      { id: 'cal-schoolwork', name: 'Schoolwork', color: '#8b5cf6', icon: '📚', visible: true, system: true },
      { id: 'cal-deepwork', name: 'Deep Work', color: '#6366f1', icon: '🎯', visible: true, system: true },
      { id: 'cal-birthday', name: 'Sinh nhật', color: '#ec4899', icon: '🎂', visible: true, system: true }
    ];
    const DEFAULT_CALENDAR_ID = 'cal-personal';
    const WORKSPACE_DEFAULTS = {
      projects: [{ id: 'personal', name: 'Personal Ops', color: '#2563eb', status: 'active' }],
      goals: [],
      calendars: JSON.parse(JSON.stringify(CALENDAR_SEED))
    };
    const SETTINGS_DEFAULTS = { theme: 'github-light', accent: 'blue', availableStart: '07:00', availableEnd: '22:00', dailyMissionLimit: 3, notifications: false, backgroundPreset: 'none', backgroundImage: '', backgroundName: '', workspace: null };
    let currentTab = 'dashboard', selectedDate = fmtDate(new Date()), editingTaskId = null, detailTaskId = null, focusTimer = null, focusRemain = 0, focusTaskId = null, focusStartedAt = null, focusInitialSeconds = 0, focusEndAt = null;
    let undoStack = [], pendingFocusReview = null, analyticsPreviewDate = fmtDate(new Date()), dashboardMode = 'day', settingsSection = 'sync';
    let taskFilters = { q: '', status: 'all', priority: 'all', tag: 'all', project: 'all', special: 'all' };
    // Chế độ xem lịch (Tháng/Tuần/Ngày) — lưu riêng trong localStorage, KHÔNG đụng storage.js.
    const CAL_VIEW_KEY = 'tlf_calView';
    let calView = (() => { try { const v = localStorage.getItem(CAL_VIEW_KEY); return ['month', 'week', 'day'].includes(v) ? v : 'month'; } catch { return 'month'; } })();
    // Tháng đang hiển thị của mini-calendar (chuỗi 'YYYY-MM'); mặc định theo ngày đang chọn.
    let miniCalMonth = '';
    let lastNavRenderKey = '';
    let lastRealtimeTick = 0;
    let db = load();
    window.currentTab = currentTab;
    window.currentUserId = null;
    window.updateDbFromFirebase = function(newDb) {
      const remoteDb = coerceDbShape(newDb);
      const mergedDb = mergeDbStates(db, remoteDb);
      db = mergedDb;
      normalize();
      persistLocal(); // bypass standard save to avoid echo
      if (window.idbSaveAll) window.idbSaveAll(db);
      const mergedCloudStr = JSON.stringify(cloudComparableDb(mergedDb));
      const remoteCloudStr = JSON.stringify(cloudComparableDb(remoteDb));
      if (window.currentUserId && mergedCloudStr !== remoteCloudStr && window.firebaseSync) {
        window.firebaseSync(mergedDb);
      }
      render();
    };
    // Gọi bởi src/core/storage.js sau khi IndexedDB load xong (IDB là nguồn chính trên thiết bị).
    window.updateDbFromStorage = function(idbData) {
      const stored = coerceDbShape(idbData);
      const hadLocalImage = !!db.settings.backgroundImage;
      const before = JSON.stringify(db);
      const merged = mergeDbStates(db, stored);
      // localStorage boot-cache không chứa ảnh nền — khôi phục từ IndexedDB
      if (!hadLocalImage && stored.settings.backgroundImage) {
        merged.settings.backgroundImage = stored.settings.backgroundImage;
        merged.settings.backgroundName = stored.settings.backgroundName || '';
        merged.settings.backgroundPreset = stored.settings.backgroundPreset || 'upload';
      }
      db = merged;
      normalize();
      if (window.idbSaveAll) window.idbSaveAll(db);
      if (JSON.stringify(db) !== before) {
        persistLocal();
        applyTheme(db.settings.theme);
        applyBackground();
        render();
      }
    };
    window.replaceDbFromStorage = function(idbData) {
      db = Object.assign(defaultData(), coerceDbShape(idbData));
      normalize();
      persistLocal();
      applyTheme(db.settings.theme);
      applyBackground();
      render();
    };
    function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) }
    function pad2(n) { return String(n).padStart(2, '0') }
    function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
    function endOfDay(d) { const x = startOfDay(d); x.setDate(x.getDate() + 1); return x }
    function fmtDate(d) { d = new Date(d); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
    function hm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
    function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
    function minOf(t) { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
    function timeOfMin(n) { n = ((n % 1440) + 1440) % 1440; return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0') }
    function deriveEndTime(start, duration) { const s = minOf(start), d = Number(duration || 0); return s === null || !d ? '' : timeOfMin(s + d) }
    function hasWrappedTimeRange(start, end) { const s = minOf(start), e = minOf(end); return s !== null && e !== null && e <= s }
    function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }
    function pct(n) { return clamp(Math.round(n), 0, 100) }
    function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) }
    const iconPaths = {
      dashboard: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
      timeline: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
      focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>',
      debt: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
      calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/>',
      analytics: '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V7"/><path d="M17 16v-3"/>',
      settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.52a2 2 0 0 1-1 1.72l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.52a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
      login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
      palette: '<path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 10 10c0 1.7-1.3 3-3 3h-2.5a2.5 2.5 0 0 0 0 5H12z"/><circle cx="6.5" cy="11.5" r=".5" fill="currentColor"/><circle cx="9.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="14.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="11.5" r=".5" fill="currentColor"/>',
      play: '<path d="m6 3 14 9-14 9V3z"/>',
      pause: '<path d="M10 4H6v16h4V4z"/><path d="M18 4h-4v16h4V4z"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
      plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
      alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
    };
    function uiIcon(name, cls = 'icon') { return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>` }
    function toast(msg, action = null) {
      const t = $('#toast');
      if (!t) return;
      const opts = action && typeof action === 'object' ? action : null;
      const variant = opts?.variant;
      t.className = 'toast';
      if (['success', 'error', 'warn'].includes(variant)) t.classList.add(variant);
      t.textContent = msg;
      if (opts?.label) {
        const b = document.createElement('button');
        b.textContent = opts.label;
        b.onclick = () => { if (typeof opts.fn === 'function') opts.fn(); else if (typeof opts.fn === 'string' && window[opts.fn.replace('()','')]) window[opts.fn.replace('()','')](); };
        t.appendChild(document.createTextNode(' '));
        t.appendChild(b);
      }
      t.classList.add('show');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => t.classList.remove('show'), opts?.label ? 5200 : 2200);
    }
    function cloneDb() { return JSON.parse(JSON.stringify(db)) }
    function getDbSnapshot() { return cloneDb() }
    function isSyncLoginReady() { return typeof window.firebaseLogin === 'function' }
    function loginOrSyncHelp() {
      if (isSyncLoginReady()) {
        window.firebaseLogin();
        return;
      }
      const status = typeof window.getSyncStatus === 'function' ? window.getSyncStatus() : null;
      const error = status?.error ? ` Lỗi hiện tại: ${status.error}` : '';
      toast(`Đồng bộ Firebase chưa sẵn sàng. Hãy kiểm tra mạng rồi thử lại.${error}`);
    }
    async function purgeExpiredCloudData() {
      if (typeof window.firebasePurgeExpiredData !== 'function') {
        toast('Công cụ dọn dữ liệu cloud chưa sẵn sàng.');
        return;
      }
      await window.firebasePurgeExpiredData();
    }
    async function requestAccountDeletion() {
      if (!window.currentUserId || typeof window.firebaseDeleteAccount !== 'function') {
        toast('Bạn cần đăng nhập trước khi xóa tài khoản.');
        return;
      }
      const confirmation = prompt('Thao tác này xóa vĩnh viễn dữ liệu cloud và dữ liệu local của tài khoản. Nhập XOA để tiếp tục:');
      if (confirmation !== 'XOA') {
        toast('Đã hủy xóa tài khoản.');
        return;
      }
      await window.firebaseDeleteAccount();
    }
    function pushUndo(label) { undoStack.push({ label, db: cloneDb(), selectedDate }); if (undoStack.length > 20) undoStack.shift(); }
    function undoLast() { const item = undoStack.pop(); if (!item) return; db = item.db; selectedDate = item.selectedDate || selectedDate; normalize(); save(); render(); toast(`Đã hoàn tác: ${item.label}`) }
    function toastUndo(msg) { toast(msg, { label: 'Hoàn tác', fn: 'undoLast()' }) }
    function getHourHeight() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--h')) || 64 }
    function touchTask(t, extra = {}) { if (!t) return t; Object.assign(t, extra, { updatedAt: new Date().toISOString() }); return t }
    // Stamp settings mỗi khi user chủ động đổi — dùng cho merge LWW giữa các thiết bị
    function touchSettings() { db.settings.updatedAt = new Date().toISOString() }
    function defaultFlow() { return { summary: '', checklist: [], notes: [], blockers: [], nextActions: [], logs: [] } }
    function ensureFlow(t) {
      t.flow = Object.assign(defaultFlow(), t.flow || {});
      t.flow.checklist = (t.flow.checklist || []).map(x => typeof x === 'string' ? { id: uid(), text: x, done: false } : Object.assign({ id: uid(), text: '', done: false }, x, { id: safeId(x?.id), text: safeStr(x?.text), done: !!x?.done }));
      ['notes', 'blockers', 'nextActions', 'logs'].forEach(k => t.flow[k] = (t.flow[k] || []).map(x => typeof x === 'string' ? { id: uid(), text: x, createdAt: new Date().toISOString() } : Object.assign({ id: uid(), text: '', createdAt: new Date().toISOString() }, x, { id: safeId(x?.id), text: safeStr(x?.text) })));
      t.flow.summary = safeStr(t.flow.summary);
      return t.flow;
    }
    function normalizeThemeId(id) { if (id === 'light') return 'github-light'; if (id === 'dark') return 'vscode-dark'; return THEMES.some(t => t.id === id) ? id : 'github-light' }
    function activeTheme() { return THEMES.find(t => t.id === normalizeThemeId(db.settings.theme)) || THEMES[0] }
    function applyTheme(id = db.settings.theme) {
      const themeId = normalizeThemeId(id);
      db.settings.theme = themeId;
      document.documentElement.dataset.theme = themeId;
      // index.html có 2 meta theme-color (media light/dark) — cập nhật cả hai
      document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = activeTheme().meta; });
      const btn = $('#themeBtn');
      if (btn) btn.innerHTML = `${uiIcon('palette')}Giao diện: ${activeTheme().name}`;
    }
    function setTheme(id) { applyTheme(id); touchSettings(); save(); render(); toast(`Đã đổi sang ${activeTheme().name}`) }
    function cycleTheme() {
      const current = normalizeThemeId(db.settings.theme);
      const i = THEMES.findIndex(t => t.id === current);
      setTheme(THEMES[(i + 1) % THEMES.length].id);
    }
    function themePickerHTML() {
      const current = normalizeThemeId(db.settings.theme);
      return `<div class="themeGrid">${THEMES.map(t => `<button class="themeCard ${t.id === current ? 'active' : ''}" onclick="setTheme('${t.id}')"><div style="font-weight:700">${t.name}</div><small>${esc(t.note || '')}</small><div class="swatches">${t.swatches.map(c => `<i style="background:${c}"></i>`).join('')}</div></button>`).join('')}</div>`;
    }
    function activeBackground() {
      const id = db.settings.backgroundPreset || 'none';
      if (id === 'upload' && db.settings.backgroundImage) {
        return { id, name: db.settings.backgroundName || 'Ảnh tải lên', note: 'Ảnh nền cá nhân của bạn.', image: `url("${db.settings.backgroundImage}")`, overlay: 'linear-gradient(180deg, rgba(8,15,35,.24), rgba(8,15,35,.58))', blur: '2px' };
      }
      return BACKGROUND_PRESETS.find(bg => bg.id === id) || BACKGROUND_PRESETS[0];
    }
    function applyBackground() {
      const bg = activeBackground();
      const enabled = bg && bg.image && bg.image !== 'none';
      document.documentElement.style.setProperty('--wallpaper-image', enabled ? bg.image : 'none');
      document.documentElement.style.setProperty('--wallpaper-overlay', enabled ? bg.overlay : 'linear-gradient(180deg, transparent, transparent)');
      document.documentElement.style.setProperty('--wallpaper-opacity', enabled ? '1' : '0');
      document.documentElement.style.setProperty('--wallpaper-blur', enabled ? (bg.blur || '0px') : '0px');
      document.body.classList.toggle('has-wallpaper', !!enabled);
    }
    function backgroundPickerHTML() {
      const current = db.settings.backgroundPreset || 'none';
      const uploadActive = current === 'upload' && db.settings.backgroundImage;
      const uploadCard = db.settings.backgroundImage ? `<button class="bgCard ${uploadActive ? 'active' : ''}" onclick="setBackgroundPreset('upload')"><div class="bgPreview" style="--bg-preview:url('${db.settings.backgroundImage}')"></div><div class="bgMeta"><div style="font-weight:700">Ảnh của bạn</div><small>${esc(db.settings.backgroundName || 'Ảnh tùy chỉnh')}</small></div></button>` : '';
      return `<div class="bgGrid">${BACKGROUND_PRESETS.map(bg => `<button class="bgCard ${bg.id === current ? 'active' : ''}" onclick="setBackgroundPreset('${bg.id}')"><div class="bgPreview" style="--bg-preview:${bg.preview}"></div><div class="bgMeta"><div style="font-weight:700">${bg.name}</div><small>${bg.note}</small></div></button>`).join('')}${uploadCard}</div>`;
    }
    function defaultWorkspace() { return JSON.parse(JSON.stringify(WORKSPACE_DEFAULTS)) }
    // Bảng màu sticky kiểu macOS Stickies (pastel để chữ vẫn đọc rõ trên nền sáng/tối)
    const STICKY_COLORS = ['#fff7cc', '#ffd9e0', '#cfe8ff', '#d6f5d6', '#e9d8fd', '#ffe3c2', '#e6eaf0'];
    function normalizeWorkspace(raw = {}) {
      const source = raw && typeof raw === 'object' ? raw : {};
      const projects = (Array.isArray(source.projects) ? source.projects : [])
        .map(p => ({
          id: safeId(p?.id || uid()),
          name: safeStr(p?.name).trim().slice(0, 80) || 'Project',
          color: /^#[0-9a-f]{6}$/i.test(String(p?.color || '')) ? String(p.color) : '#2563eb',
          status: p?.status === 'archived' ? 'archived' : 'active'
        }))
        .filter(p => p.status !== 'archived')
        .slice(0, 24);
      if (!projects.length) projects.push(...defaultWorkspace().projects);
      const projectIds = new Set(projects.map(p => p.id));
      const goals = (Array.isArray(source.goals) ? source.goals : [])
        .map(g => ({
          id: safeId(g?.id || uid()),
          title: safeStr(g?.title).trim().slice(0, 120) || 'Goal',
          projectId: projectIds.has(String(g?.projectId || '')) ? String(g.projectId) : projects[0].id,
          targetDate: safeDate(g?.targetDate, ''),
          confidence: ['on-track', 'at-risk', 'off-track'].includes(g?.confidence) ? g.confidence : 'on-track',
          status: g?.status === 'archived' ? 'archived' : 'active',
          createdAt: safeStr(g?.createdAt) || new Date().toISOString(),
          updatedAt: safeStr(g?.updatedAt) || new Date().toISOString()
        }))
        .slice(0, 24);
      const notes = (Array.isArray(source.notes) ? source.notes : [])
        .map(n => ({
          id: safeId(n?.id || uid()),
          text: safeStr(n?.text).slice(0, 2000),
          color: /^#[0-9a-f]{6}$/i.test(String(n?.color || '')) ? String(n.color) : STICKY_COLORS[0],
          createdAt: safeStr(n?.createdAt) || new Date().toISOString(),
          updatedAt: safeStr(n?.updatedAt) || new Date().toISOString()
        }))
        .slice(0, 50);
      const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(String(source.birthDate || '')) ? source.birthDate : '';
      const calendars = normalizeCalendars(source.calendars);
      return { projects, goals, notes, calendars, birthDate };
    }
    function normalizeCalendars(raw) {
      const list = (Array.isArray(raw) ? raw : [])
        .map(c => ({
          id: safeId(c?.id || uid()),
          name: safeStr(c?.name).trim().slice(0, 80) || 'Lịch',
          color: /^#[0-9a-f]{6}$/i.test(String(c?.color || '')) ? String(c.color) : '#2563eb',
          icon: safeStr(c?.icon).slice(0, 8) || '📅',
          visible: c?.visible !== false,
          system: Boolean(c?.system)
        }))
        .slice(0, 50);
      const seen = new Set(list.map(c => c.id));
      // SEED idempotent: chỉ thêm lịch hệ thống còn THIẾU, KHÔNG ghi đè cái user đã có.
      for (const seed of CALENDAR_SEED) {
        if (!seen.has(seed.id)) { list.push({ ...seed }); seen.add(seed.id); }
      }
      return list.slice(0, 50);
    }
    function workspace() {
      db.settings.workspace = normalizeWorkspace(db.settings.workspace);
      return db.settings.workspace;
    }
    function projectName(id) { return workspace().projects.find(p => p.id === id)?.name || 'Inbox' }
    function projectColor(id) { return workspace().projects.find(p => p.id === id)?.color || '#94a3b8' }
    // ── Calendars (kiểu Google Calendar) ─────────────────────────────────────
    function calendars() { return workspace().calendars; }
    function getCalendar(id) { return calendars().find(c => c.id === id) || null; }
    function defaultCalendar() { return getCalendar(DEFAULT_CALENDAR_ID) || calendars()[0] || null; }
    function calendarColor(id) { return (getCalendar(id) || defaultCalendar())?.color || '#2563eb'; }
    function calendarIcon(id) { return (getCalendar(id) || defaultCalendar())?.icon || '📅'; }
    function isCalendarVisible(id) {
      const c = getCalendar(id) || defaultCalendar();
      return c ? c.visible !== false : true;
    }
    function calendarOptionsHTML(selected = '') {
      return calendars().map(c => `<option value="${esc(c.id)}" ${selected === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
    }
    function toggleCalendarVisible(id) {
      const c = getCalendar(id);
      if (!c) return;
      c.visible = c.visible === false;
      touchSettings(); save(); render();
    }
    function addCalendar() {
      const name = (prompt('Tên lịch mới:', '') || '').trim();
      if (!name) return;
      const color = (prompt('Màu (hex, ví dụ #2563eb):', '#2563eb') || '').trim();
      const icon = (prompt('Emoji/icon (1 ký tự):', '📅') || '').trim();
      calendars().push({
        id: uid(),
        name: name.slice(0, 80),
        color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#2563eb',
        icon: icon.slice(0, 8) || '📅',
        visible: true,
        system: false
      });
      touchSettings(); save(); render(); toast('Đã thêm lịch');
    }
    function editCalendar(id) {
      const c = getCalendar(id);
      if (!c) return;
      const name = (prompt('Tên lịch:', c.name) || '').trim();
      if (name) c.name = name.slice(0, 80);
      const color = (prompt('Màu (hex):', c.color) || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(color)) c.color = color;
      const icon = (prompt('Emoji/icon:', c.icon) || '').trim();
      if (icon) c.icon = icon.slice(0, 8);
      touchSettings(); save(); render(); toast('Đã cập nhật lịch');
    }
    function deleteCalendar(id) {
      const c = getCalendar(id);
      if (!c) return;
      if (c.system) { toast('Không thể xóa lịch hệ thống.'); return; }
      if (!confirm(`Xóa lịch "${c.name}"? Sự kiện thuộc lịch này sẽ về lịch mặc định.`)) return;
      const ws = workspace();
      ws.calendars = ws.calendars.filter(x => x.id !== id);
      // Sự kiện/task đang trỏ tới lịch bị xóa → rơi về lịch mặc định (xóa field).
      db.events.forEach(e => { if (e.calendarId === id) delete e.calendarId; });
      db.tasks.forEach(t => { if (t.calendarId === id) delete t.calendarId; });
      touchSettings(); save(); render(); toast('Đã xóa lịch');
    }
    // ── Sticky notes (Ghi chú nhanh) ──────────────────────────────────────────
    function stickyNotes() { return workspace().notes; }
    function addStickyNote() {
      const ws = workspace();
      const color = STICKY_COLORS[ws.notes.length % STICKY_COLORS.length];
      ws.notes.unshift({ id: uid(), text: '', color, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      touchSettings(); save(); render();
      // focus ngay vào note mới tạo
      const ta = document.querySelector('.sticky .stickyText');
      if (ta) ta.focus();
    }
    function updateStickyNote(id, text) {
      const n = workspace().notes.find(x => x.id === id);
      if (!n) return;
      n.text = String(text).slice(0, 2000); n.updatedAt = new Date().toISOString();
      touchSettings(); save(); // KHÔNG render: tránh huỷ textarea đang gõ → mất focus
    }
    function setStickyColor(id, color) {
      const n = workspace().notes.find(x => x.id === id);
      if (!n || !/^#[0-9a-f]{6}$/i.test(color)) return;
      n.color = color; n.updatedAt = new Date().toISOString();
      touchSettings(); save(); render();
    }
    function deleteStickyNote(id) {
      const ws = workspace();
      ws.notes = ws.notes.filter(x => x.id !== id);
      touchSettings(); save(); render(); toast('Đã xóa ghi chú');
    }
    function renderStickyNotesHTML() {
      const notes = stickyNotes();
      return `<div class="card stickyWrap"><div class="stickyHead"><h3>Ghi chú nhanh</h3><button class="btn sm" onclick="addStickyNote()">${uiIcon('plus')}Thêm note</button></div>${notes.length ? `<div class="stickyGrid">${notes.map(stickyNoteHTML).join('')}</div>` : '<div class="muted small" style="padding:8px 2px">Chưa có ghi chú. Bấm “Thêm note” để tạo mẩu giấy nhớ.</div>'}</div>`;
    }
    function stickyNoteHTML(n) {
      return `<div class="sticky" style="--sticky:${n.color}"><textarea class="stickyText" maxlength="2000" placeholder="Viết ghi chú..." oninput="updateStickyNote('${n.id}', this.value)">${esc(n.text)}</textarea><div class="stickyBar"><div class="stickyColors">${STICKY_COLORS.map(c => `<button class="stickyDot${c === n.color ? ' on' : ''}" style="background:${c}" title="Đổi màu" onclick="setStickyColor('${n.id}','${c}')"></button>`).join('')}</div><button class="stickyDel" title="Xóa" onclick="deleteStickyNote('${n.id}')">${uiIcon('x')}</button></div></div>`;
    }
    function goalName(id) { return workspace().goals.find(g => g.id === id && g.status !== 'archived')?.title || '' }
    function projectOptionsHTML(selected = '') {
      return workspace().projects.map(p => `<option value="${esc(p.id)}" ${selected === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    }
    function goalOptionsHTML(selected = '', projectId = '') {
      const goals = workspace().goals.filter(g => g.status !== 'archived' && (!projectId || g.projectId === projectId));
      return '<option value="">Khong gan goal</option>' + goals.map(g => `<option value="${esc(g.id)}" ${selected === g.id ? 'selected' : ''}>${esc(g.title)}</option>`).join('');
    }
    function defaultData() { return { tasks: [], events: seedEvents(), sessions: [], settings: { ...SETTINGS_DEFAULTS, workspace: defaultWorkspace() }, reviews: {} } }
    function coerceDbShape(source = {}) {
      const settings = Object.assign({}, SETTINGS_DEFAULTS, source.settings || {});
      settings.workspace = normalizeWorkspace(settings.workspace);
      return {
        tasks: Array.isArray(source.tasks) ? source.tasks : [],
        events: Array.isArray(source.events) ? source.events : [],
        sessions: Array.isArray(source.sessions) ? source.sessions : [],
        settings,
        reviews: source.reviews && typeof source.reviews === 'object' ? source.reviews : {}
      };
    }
    function newestStamp(item) { return item?.updatedAt || item?.doneAt || item?.stackedAt || item?.createdAt || ''; }
    function mergeById(localItems = [], remoteItems = []) {
      const map = new Map();
      const put = item => {
        if (!item || typeof item !== 'object') return;
        const key = item.id || uid();
        const candidate = { ...item, id: key };
        const existing = map.get(key);
        if (!existing) { map.set(key, candidate); return; }
        const currentStamp = newestStamp(existing);
        const nextStamp = newestStamp(candidate);
        if (nextStamp > currentStamp || (nextStamp === currentStamp && JSON.stringify(candidate).length > JSON.stringify(existing).length)) {
          map.set(key, candidate);
        }
      };
      remoteItems.forEach(put);
      localItems.forEach(put);
      return [...map.values()];
    }
    // Dữ liệu cũ chứa seed event với id ngẫu nhiên (uid mỗi lần defaultData chạy) → trùng
    // lặp khi merge nhiều nguồn. CHỈ dedupe các event khớp catalog seed; event do user tạo
    // không bao giờ bị gộp. Tombstone (đã xóa) thắng để tôn trọng quyết định xóa của user.
    const SEED_EVENT_KEYS = new Set(SEED_EVENTS.map(ev => `${ev.title}|${ev.date}|${ev.type}`));
    function dedupeEvents(events) {
      const out = [];
      const seedByKey = new Map();
      for (const ev of events) {
        if (!ev || typeof ev !== 'object') continue;
        const key = `${ev.title}|${ev.date}|${ev.type}`;
        if (!SEED_EVENT_KEYS.has(key)) { out.push(ev); continue; }
        const cur = seedByKey.get(key);
        if (!cur) { seedByKey.set(key, ev); continue; }
        const curDeleted = isDeletedItem(cur), evDeleted = isDeletedItem(ev);
        if (evDeleted && !curDeleted) { seedByKey.set(key, ev); continue; }
        if (curDeleted && !evDeleted) continue;
        // Cùng trạng thái: ưu tiên bản có createdAt cũ hơn (bản gốc đã sync)
        const a = cur.createdAt || '', b = ev.createdAt || '';
        if (b && (!a || b < a)) seedByKey.set(key, ev);
      }
      return [...out, ...seedByKey.values()];
    }
    function mergeReviews(localReviews = {}, remoteReviews = {}) {
      const merged = {};
      const keys = new Set([...Object.keys(localReviews), ...Object.keys(remoteReviews)]);
      keys.forEach(key => {
        const local = localReviews[key];
        const remote = remoteReviews[key];
        if (local == null) { merged[key] = remote; return; }
        if (remote == null) { merged[key] = local; return; }
        const localStamp = newestStamp(local);
        const remoteStamp = newestStamp(remote);
        merged[key] = localStamp > remoteStamp ? local : remote;
      });
      return merged;
    }
    function mergeDbStates(localSource = {}, remoteSource = {}) {
      const localDb = coerceDbShape(localSource);
      const remoteDb = coerceDbShape(remoteSource);
      // Settings: bên có updatedAt mới hơn thắng (LWW). Trước đây local luôn thắng
      // → thiết bị cũ ghi đè ngược thay đổi của thiết bị mới qua sync.
      const localNewer = (localDb.settings.updatedAt || '') >= (remoteDb.settings.updatedAt || '');
      const merged = {
        tasks: mergeById(localDb.tasks, remoteDb.tasks),
        events: dedupeEvents(mergeById(localDb.events, remoteDb.events)),
        sessions: mergeById(localDb.sessions, remoteDb.sessions),
        settings: localNewer
          ? Object.assign({}, remoteDb.settings, localDb.settings)
          : Object.assign({}, localDb.settings, remoteDb.settings),
        reviews: mergeReviews(localDb.reviews, remoteDb.reviews)
      };
      // Keep heavy background data local-only to avoid Firestore size issues.
      merged.settings.backgroundImage = localDb.settings.backgroundImage || '';
      merged.settings.backgroundName = localDb.settings.backgroundName || '';
      merged.settings.backgroundPreset = localDb.settings.backgroundImage ? (localDb.settings.backgroundPreset || 'upload') : (remoteDb.settings.backgroundPreset || 'none');
      return merged;
    }
    function cloudComparableDb(source = {}) {
      const copy = JSON.parse(JSON.stringify(coerceDbShape(source)));
      copy.settings.backgroundImage = '';
      copy.settings.backgroundName = '';
      copy.settings.backgroundPreset = 'none';
      return copy;
    }
    function load() {
      try {
        const scoped = localStorage.getItem(storageKey());
        const legacy = localStorage.getItem(LEGACY_KEY);
        return Object.assign(defaultData(), JSON.parse(scoped || legacy || '{}'));
      } catch (e) {
        return defaultData();
      }
    }
    // localStorage giờ chỉ là boot-cache: khi IndexedDB hoạt động, không lưu ảnh nền base64 vào đây nữa.
    function bootCachePayload(source = db) {
      return (window.idbActive && source.settings.backgroundImage)
        ? { ...source, settings: { ...source.settings, backgroundImage: '' } }
        : source;
    }
    function persistLocal(payloadOverride = null) {
      localStorage.setItem(storageKey(), JSON.stringify(payloadOverride || bootCachePayload()));
    }
    function save() {
      try {
        persistLocal();
        if (window.idbSaveAll) window.idbSaveAll(db);
        if (window.firebaseSync) window.firebaseSync(db);
      } catch (e) {
        // QuotaExceededError — warn user
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          console.warn('[TL] localStorage quota exceeded, attempting cleanup...');
          const compact = JSON.parse(JSON.stringify(bootCachePayload()));
          compact.tasks.forEach(t => {
            if (t.flow?.logs?.length > 10) t.flow.logs = t.flow.logs.slice(-10);
          });
          if (compact.sessions?.length > 500) compact.sessions = compact.sessions.slice(-500);
          try { persistLocal(compact); }
          catch (e2) { toast('⚠️ Bộ nhớ đầy! Hãy xuất dữ liệu rồi dọn bớt logs cũ.', { label: 'Xuất dữ liệu', fn: 'exportData()' }); }
          if (window.idbSaveAll) window.idbSaveAll(db);
          if (window.firebaseSync) window.firebaseSync(db);
          toast('Đã thu gọn boot-cache; dữ liệu đầy đủ vẫn được giữ trong IndexedDB.');
        }
      }
    }
    function setBackgroundPreset(id) {
      db.settings.backgroundPreset = id;
      touchSettings();
      applyBackground();
      save();
      render();
      toast(`Đã đổi nền sang ${activeBackground().name}`);
    }
    function clearBackgroundImage() {
      db.settings.backgroundImage = '';
      db.settings.backgroundName = '';
      db.settings.backgroundPreset = 'none';
      touchSettings();
      applyBackground();
      save();
      render();
      toast('Đã xóa ảnh nền tùy chỉnh');
    }
    function uploadBackgroundPrompt() {
      const input = $('#bgUpload');
      if (input) input.click();
    }
    function handleBackgroundUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast('Vui lòng chọn file ảnh hợp lệ');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxEdge = 1600;
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return toast('Trình duyệt không hỗ trợ xử lý ảnh nền');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          db.settings.backgroundImage = dataUrl;
          db.settings.backgroundName = file.name;
          db.settings.backgroundPreset = 'upload';
          touchSettings();
          applyBackground();
          save();
          if (window.idbFlush) window.idbFlush(); // ảnh chỉ nằm trong IDB — ghi ngay, không chờ debounce
          render();
          toast('Đã cập nhật ảnh nền cá nhân');
        };
        img.onerror = () => toast('Không đọc được ảnh này');
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
    function seedEvents() { return SEED_EVENTS.map(ev => ({ ...ev })) }
    // Sanitize field theo kiểu/pattern — dữ liệu có thể đến từ import JSON hoặc Firestore
    // sync nên KHÔNG được tin tưởng; các giá trị này được nội suy thẳng vào HTML khi render.
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
    function safeId(v) { const s = String(v ?? ''); return s && s.length <= 100 && !/['"<>&\\/]/.test(s) ? s : uid() }
    function safeDate(v, fallback = '') { return DATE_RE.test(String(v ?? '')) ? String(v) : fallback }
    function safeTime(v) { return TIME_RE.test(String(v ?? '')) ? String(v) : '' }
    function safeStr(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)) }
    // deadline đổi nghĩa từ NGÀY ("YYYY-MM-DD", định dạng cũ) sang GIỜ ("HH:MM", mới).
    // Chấp nhận & GIỮ LẠI cả 2 để không xóa trắng dữ liệu task cũ; chỉ loại bỏ rác.
    function safeDeadline(v) { const s = String(v ?? ''); return (TIME_RE.test(s) || DATE_RE.test(s)) ? s : '' }
    function sanitizeTaskFields(t) {
      t.id = safeId(t.id);
      t.title = safeStr(t.title);
      t.date = safeDate(t.date, fmtDate(new Date()));
      t.start = safeTime(t.start); t.end = safeTime(t.end);
      t.deadline = safeDeadline(t.deadline);
      t.duration = clamp(Number(t.duration) || 60, 1, 1440);
      t.priority = ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium';
      if (!['todo', 'doing', 'done', 'deferred', 'stack', 'deleted'].includes(t.status)) t.status = '';
      t.mission = !!t.mission; t.done = !!t.done;
      t.notes = safeStr(t.notes);
      t.reason = safeStr(t.reason);
      t.stackType = safeStr(t.stackType);
      t.eventId = safeStr(t.eventId);
      // calendarId: chỉ giữ nếu trỏ tới lịch có thật, ngược lại bỏ field (→ lịch mặc định)
      if (t.calendarId && !getCalendar(String(t.calendarId))) delete t.calendarId;
      else if (t.calendarId) t.calendarId = String(t.calendarId);
      const ws = workspace();
      const projectIds = new Set(ws.projects.map(p => p.id));
      const goalIds = new Set(ws.goals.filter(g => g.status !== 'archived').map(g => g.id));
      t.projectId = projectIds.has(String(t.projectId || '')) ? String(t.projectId) : ws.projects[0].id;
      t.goalId = goalIds.has(String(t.goalId || '')) ? String(t.goalId) : '';
      t.impact = ['high', 'medium', 'low'].includes(t.impact) ? t.impact : (t.mission ? 'high' : 'medium');
      t.energy = ['deep', 'normal', 'light'].includes(t.energy) ? t.energy : 'normal';
      t.tags = (Array.isArray(t.tags) ? t.tags : []).map(safeStr).filter(Boolean).slice(0, 50);
      t.deferCount = Math.max(0, Math.round(Number(t.deferCount) || 0));
    }
    function sanitizeEventFields(ev) {
      ev.id = safeId(ev.id);
      ev.title = safeStr(ev.title);
      ev.date = safeDate(ev.date, fmtDate(new Date()));
      ev.type = ev.type === 'lunar' ? 'lunar' : 'solar';
      ev.recurring = !!ev.recurring;
      if (ev.calendarId && !getCalendar(String(ev.calendarId))) delete ev.calendarId;
      else if (ev.calendarId) ev.calendarId = String(ev.calendarId);
      ev.notes = safeStr(ev.notes);
    }
    function sanitizeSessionFields(s) {
      s.id = safeId(s.id);
      s.taskId = safeStr(s.taskId);
      s.date = safeDate(s.date, fmtDate(new Date()));
      s.minutes = clamp(Number(s.minutes) || 0, 0, 1440);
    }
    function sanitizeSettingsFields(st) {
      if (!TIME_RE.test(String(st.availableStart ?? ''))) st.availableStart = SETTINGS_DEFAULTS.availableStart;
      if (!TIME_RE.test(String(st.availableEnd ?? ''))) st.availableEnd = SETTINGS_DEFAULTS.availableEnd;
      st.dailyMissionLimit = clamp(Math.round(Number(st.dailyMissionLimit) || 3), 1, 20);
      st.notifications = !!st.notifications;
      st.backgroundPreset = safeStr(st.backgroundPreset) || 'none';
      st.backgroundName = safeStr(st.backgroundName);
      // Ảnh nền chỉ chấp nhận data URL base64 do app tự tạo (canvas.toDataURL)
      if (st.backgroundImage && !/^data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]*$/i.test(st.backgroundImage)) st.backgroundImage = '';
    }
    function normalize() { db.settings = Object.assign({ ...SETTINGS_DEFAULTS, workspace: defaultWorkspace() }, db.settings || {}); db.settings.workspace = normalizeWorkspace(db.settings.workspace); db.settings.theme = normalizeThemeId(db.settings.theme); sanitizeSettingsFields(db.settings); if (db.settings.backgroundPreset === 'upload' && !db.settings.backgroundImage) db.settings.backgroundPreset = 'none'; if (!Array.isArray(db.tasks)) db.tasks = []; if (!Array.isArray(db.events)) db.events = seedEvents(); if (!Array.isArray(db.sessions)) db.sessions = []; db.tasks.forEach(t => { sanitizeTaskFields(t); if (t.done && t.status !== 'done') t.status = 'done'; if (!t.status) t.status = t.done ? 'done' : 'todo'; if (!t.createdAt) t.createdAt = new Date().toISOString(); if (!t.updatedAt) t.updatedAt = t.createdAt; if (t.start && !t.end) t.end = deriveEndTime(t.start, t.duration); if (hasWrappedTimeRange(t.start, t.end)) { t.start = ''; t.end = ''; } ensureFlow(t); }); db.events.forEach(sanitizeEventFields); db.sessions.forEach(sanitizeSessionFields); autoStackOld(); }
    function autoStackOld() {
      const today = fmtDate(new Date());
      localStorage.setItem('tl_last_opened_date', today);
      db.tasks.forEach(t => {
        if (t.date < today && !['done', 'stack', 'deleted'].includes(t.status)) {
          touchTask(t, {
            status: 'stack',
            stackType: t.deadline ? 'overdue' : 'unfinished',
            stackedAt: t.stackedAt || new Date().toISOString(),
            reason: t.reason || 'Qua ngày nhưng chưa Done',
            deferCount: t.deferCount || 0
          });
        }
      });
    }
    function isDeletedItem(t) { return t?.status === 'deleted' || !!t?.deletedAt }
    function dayTasks(date = selectedDate) { return db.tasks.filter(t => t.date === date && !isDeletedItem(t)) }
    function activeDayTasks(date = selectedDate) { return dayTasks(date).filter(t => t.status !== 'stack') }
    function stackTasks() { return db.tasks.filter(t => t.status === 'stack' && !isDeletedItem(t)) }
    function doneTasks(date = selectedDate) { return dayTasks(date).filter(t => t.status === 'done') }
    function incomplete(date = selectedDate) { return activeDayTasks(date).filter(t => t.status !== 'done') }
    function dayProgress() { const now = new Date(); return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60 }
    function remainingTodayMins() { const now = new Date(); return fmtDate(now) === selectedDate ? Math.max(0, 1440 - dayProgress()) : 1440 }
    function availableRemainMins(date = selectedDate) { const s = minOf(db.settings.availableStart) || 0, e = minOf(db.settings.availableEnd) || 1440; let rem = e - s; if (date === fmtDate(new Date())) rem = Math.max(0, e - dayProgress()); return rem }
    function durText(min) { min = Math.max(0, Math.round(min)); const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60; return (d ? d + ' ngày ' : '') + (h ? h + 'h ' : '') + (m || (!d && !h) ? m + 'm' : '') }
    function isMobileViewport() { return window.matchMedia ? window.matchMedia('(max-width: 780px)').matches : window.innerWidth <= 780 }
    function isInsightVisible() {
      const el = $('#insight');
      return !!el && getComputedStyle(el).display !== 'none';
    }
    function init() {
      normalize();
      applyTheme(db.settings.theme);
      applyBackground();
      $('#selectedDate').value = selectedDate;
      renderNav();
      bind();
      render();
      updateNetworkStatus();
      const requestedTab = location.hash.replace(/^#/, '');
      if (tabs.some(([id]) => id === requestedTab)) {
        currentTab = requestedTab;
        render();
      }
      if (new URLSearchParams(location.search).get('action') === 'new-task') {
        setTimeout(() => openTask(), 0);
      }
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (db.settings.theme === 'system') applyTheme('system') });
      setInterval(() => {
        const now = Date.now();
        const mobile = isMobileViewport();
        const shouldRunLightTick = !mobile || now - lastRealtimeTick >= 10000;

        if (shouldRunLightTick) {
          lastRealtimeTick = now;
          renderClock();
          if (currentTab === 'dashboard') updateHomeClock();
          if (isInsightVisible()) renderInsightCounters();
          if (currentTab === 'timeline') updateNowLine();
        }

        if (currentTab === 'focus') updateFocusRing();
      }, 1000);

      // Register SW
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('./sw.js?v=22', { updateViaCache: 'none' })
          .catch(err => console.warn('[SW]', err));
      }
    }
    const tabIcons = { dashboard: 'dashboard', timeline: 'timeline', tasks: 'tasks', focus: 'focus', debt: 'debt', calendar: 'calendar', analytics: 'analytics', settings: 'settings' };
    const mobilePrimaryTabs = ['dashboard', 'timeline', 'tasks', 'focus'];
    function renderNav() {
      const key = `${currentTab}|${isMobileViewport() ? 'm' : 'd'}`;
      if (key === lastNavRenderKey) return;
      lastNavRenderKey = key;
      const html = tabs.map(([id, name]) => `<button data-tab="${id}" class="${id === currentTab ? 'active' : ''}" aria-current="${id === currentTab ? 'page' : 'false'}" title="${name}">${uiIcon(tabIcons[id])}<span class="nav-label">${name}</span></button>`).join('');
      $('#nav').innerHTML = html;
      const moreActive = !mobilePrimaryTabs.includes(currentTab);
      $('#mobileTabs').innerHTML = mobilePrimaryTabs.map(id => {
        const name = { dashboard: 'Hôm nay', timeline: 'Timeline', tasks: 'Tasks', focus: 'Tập trung' }[id];
        return `<button data-tab="${id}" class="${id === currentTab ? 'active' : ''}">${uiIcon(tabIcons[id])}<span>${name}</span></button>`;
      }).join('') + `<button id="moreBtn" class="${moreActive ? 'active' : ''}"><span class="moreDots">...</span><span>Thêm</span></button>`;
      const moreBtn = $('#moreBtn');
      if (moreBtn) moreBtn.onclick = toggleMoreDrawer;
    }
    function toggleMoreDrawer() {
      let drawer = $('#moreDrawer');
      if (drawer) { drawer.remove(); return; }
      drawer = document.createElement('div');
      drawer.id = 'moreDrawer';
      drawer.style.cssText = 'position:fixed;bottom:56px;left:0;right:0;background:var(--panel);border-top:1px solid var(--line);z-index:39;padding:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
      const secondaryTabs = tabs.filter(([id]) => !mobilePrimaryTabs.includes(id));
      drawer.innerHTML = secondaryTabs.map(([id, name]) =>
        `<button data-tab="${id}" style="background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:10px 4px;font-size:12px;color:${id === currentTab ? 'var(--text)' : 'var(--muted)'}">${name}</button>`
      ).join('');
      const closeDrawer = () => { drawer.remove(); document.removeEventListener('click', onOutsideClick); };
      function onOutsideClick(ev) { if (!drawer.contains(ev.target) && ev.target.id !== 'moreBtn') closeDrawer(); }
      drawer._close = closeDrawer;
      drawer.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) closeDrawer(); });
      document.body.appendChild(drawer);
      // Đóng khi click ngoài
      setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
    }
    function bind() {
      document.body.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { currentTab = b.dataset.tab; render(); } });
      $('#selectedDate').onchange = e => { selectedDate = e.target.value; render() };
      $('#openTaskBtn').onclick = () => openTask();
      $('#loginBtn').onclick = loginOrSyncHelp;
      $('#saveTaskBtn').onclick = saveTask;
      $('#deleteTaskBtn').onclick = deleteTask;
      $('#exportBtn').onclick = exportData;
      $('#importBtn').onclick = () => $('#importFile').click();
      $('#importFile').onchange = importData;
      $('#themeBtn').onclick = cycleTheme;
      $('#notifyBtn').onclick = requestNotify;
      $('#saveEventBtn').onclick = saveEvent;
      $('#fDuration').oninput = autoEnd;
      $('#fStart').oninput = autoEnd;

      // Sidebar collapse
      const collapseBtn = $('#sideCollapseBtn');
      const appEl = $('#app');
      if (collapseBtn && appEl) {
        // Restore state
        if (localStorage.getItem('tl_sidebar_collapsed') === '1') appEl.classList.add('sidebar-collapsed');
        collapseBtn.onclick = () => {
          appEl.classList.toggle('sidebar-collapsed');
          const collapsed = appEl.classList.contains('sidebar-collapsed');
          collapseBtn.innerHTML = collapsed ? '&#8250;' : '&#8249;';
          collapseBtn.setAttribute('aria-label', collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar');
          localStorage.setItem('tl_sidebar_collapsed', collapsed ? '1' : '0');
        };
      }

      // Keyboard shortcuts
      document.addEventListener('keydown', e => {
        // Skip if typing in input/textarea
        const tag = document.activeElement?.tagName;
        const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
        const modalOpen = $$('.modal.open').length > 0;

        if (e.key === 'Escape') {
          const openModal = $('.modal.open');
          if (openModal) { const id = openModal.id; closeModal(id); }
          return;
        }
        if (inInput || modalOpen) return;

        switch (e.key) {
          case 'n': case 'N': e.preventDefault(); openTask(); break;
          case 't': case 'T': e.preventDefault(); selectedDate = fmtDate(new Date()); render(); break;
          case '1': goTab('dashboard'); break;
          case '2': goTab('timeline'); break;
          case '3': goTab('tasks'); break;
          case '4': goTab('focus'); break;
          case '5': goTab('debt'); break;
          case '6': goTab('calendar'); break;
          case '7': goTab('analytics'); break;
          case 'z': case 'Z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); undoLast(); } break;
        }
      });
    }
    function render() {
      window.currentTab = currentTab;
      applyBackground();
      renderNav();
      renderClock();
      $('#pageTitle').textContent = tabs.find(t => t[0] === currentTab)[1];
      $$('.section').forEach(s => s.classList.toggle('active', s.id === currentTab));
      $('#selectedDate').value = selectedDate;
      ({ dashboard: renderDashboard, timeline: () => renderTimeline(true), tasks: renderTasks, focus: renderFocus, debt: renderDebt, calendar: renderCalendar, analytics: renderAnalytics, settings: renderSettings }[currentTab])();
      if (isInsightVisible()) renderInsight();
    }
    function renderClock() { const n = new Date(); $('#clock').textContent = `${vnDays[n.getDay()]}, ${n.toLocaleDateString('vi-VN')}` }
    function updateNetworkStatus() { const online = navigator.onLine; const el = $('#netStatus'); if (el) el.innerHTML = `<span class="statusPill"><span class="statusDot ${online ? '' : 'offline'}"></span>${online ? 'Online' : 'Offline'}</span>` }
    function renderHomeClock(next) {
      return `<div class="card homeClock"><h3>Đồng hồ hôm nay</h3><div class="clockRing" id="homeClockRing"><div class="clockCenter"><div class="clockTime" id="homeClockTime"></div><div class="clockDate" id="homeClockDate"></div></div></div><div class="small muted" id="homeClockPct"></div><div style="width:100%;border-top:1px solid var(--line);padding-top:10px"><div class="small muted">Sự kiện gần nhất</div><div style="font-weight:700">${next ? esc(next.title) : 'Không có'}</div><div class="small muted">${next ? `${next.date} · còn ${next.days} ngày` : ''}</div></div></div>`;
    }
    function updateHomeClock() {
      const ring = $('#homeClockRing');
      if (!ring) return;
      const n = new Date();
      const pctDay = pct(dayProgress() / 1440 * 100);
      ring.style.setProperty('--clock-pct', pctDay + '%');
      const timeEl = $('#homeClockTime'); if (timeEl) timeEl.textContent = hm(n);
      const dateEl = $('#homeClockDate'); if (dateEl) dateEl.textContent = `${vnDays[n.getDay()]}, ${n.toLocaleDateString('vi-VN')}`;
      const pctEl = $('#homeClockPct'); if (pctEl) pctEl.textContent = `${pctDay}% ngày đã trôi`;
    }
    function stats(date = selectedDate) { const tasks = dayTasks(date), active = activeDayTasks(date), done = tasks.filter(t => t.status === 'done'), mission = active.filter(t => t.mission), need = incomplete(date).reduce((s, t) => s + Number(t.duration || 0), 0), blocked = active.filter(t => t.start && t.end).reduce((s, t) => s + (minOf(t.end) - minOf(t.start)), 0); const now = new Date(); const dayPct = date === fmtDate(now) ? dayProgress() / 1440 * 100 : (date < fmtDate(now) ? 100 : 0); return { tasks, active, done, mission, need, blocked, donePct: tasks.length ? done.length / tasks.length * 100 : 0, dayPct, remain: remainingTodayMins(), avail: availableRemainMins(date) } }
    function periodRange(mode = dashboardMode, date = selectedDate) {
      const base = parseDate(date);
      const start = startOfDay(base);
      if (mode === 'week') start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
      if (mode === 'month') start.setDate(1);
      const end = new Date(start);
      if (mode === 'day') end.setDate(end.getDate() + 1);
      if (mode === 'week') end.setDate(end.getDate() + 7);
      if (mode === 'month') end.setMonth(end.getMonth() + 1);
      return { start, end, startKey: fmtDate(start), endKey: fmtDate(new Date(end.getTime() - 86400000)) };
    }
    function periodTasks(mode = dashboardMode, date = selectedDate) {
      const { start, end } = periodRange(mode, date);
      return db.tasks.filter(t => !isDeletedItem(t) && parseDate(t.date) >= start && parseDate(t.date) < end);
    }
    function periodSnapshot(mode = dashboardMode, date = selectedDate) {
      const range = periodRange(mode, date);
      const tasks = periodTasks(mode, date);
      const active = tasks.filter(t => t.status !== 'stack');
      const done = tasks.filter(t => t.status === 'done');
      const blocked = active.filter(taskHasBlocker);
      const highImpactOpen = active.filter(t => t.impact === 'high' && t.status !== 'done');
      const scheduled = active.filter(t => t.start && t.end).reduce((sum, t) => sum + Math.max(0, (minOf(t.end) || 0) - (minOf(t.start) || 0)), 0);
      const need = active.filter(t => t.status !== 'done').reduce((sum, t) => sum + Number(t.duration || 0), 0);
      const days = Math.max(1, Math.round((range.end - range.start) / 86400000));
      const workDayMins = Math.max(0, (minOf(db.settings.availableEnd) || 1440) - (minOf(db.settings.availableStart) || 0));
      const capacity = workDayMins * days;
      const focus = db.sessions.filter(s => parseDate(s.date) >= range.start && parseDate(s.date) < range.end).reduce((sum, s) => sum + Number(s.minutes || 0), 0);
      return { ...range, tasks, active, done, blocked, highImpactOpen, scheduled, need, capacity, focus, donePct: tasks.length ? done.length / tasks.length * 100 : 0 };
    }
    function setDashboardMode(mode) { dashboardMode = ['day', 'week', 'month'].includes(mode) ? mode : 'day'; renderDashboard(); }
    function commandRisks(snap) {
      const risks = [];
      if (snap.need > snap.capacity) risks.push(`Quá tải ${durText(snap.need - snap.capacity)} so với capacity.`);
      if (snap.blocked.length) risks.push(`${snap.blocked.length} task đang có blocker.`);
      if (snap.highImpactOpen.length > 3) risks.push(`${snap.highImpactOpen.length} việc tác động cao chưa xong.`);
      const oldDebt = stackTasks().filter(t => debtAge(t) >= 3);
      if (oldDebt.length) risks.push(`${oldDebt.length} việc tồn trên 3 ngày cần triage.`);
      if (!risks.length) risks.push('Không có cảnh báo lớn. Giữ lịch gọn và chốt việc quan trọng trước.');
      return risks.slice(0, 4);
    }
    function goalProgress(goal) {
      const linked = db.tasks.filter(t => !isDeletedItem(t) && t.goalId === goal.id);
      const done = linked.filter(t => t.status === 'done').length;
      return { linked, done, pct: linked.length ? Math.round(done / linked.length * 100) : 0 };
    }
    function projectProgress(project, mode = dashboardMode) {
      const tasks = periodTasks(mode).filter(t => t.projectId === project.id);
      const done = tasks.filter(t => t.status === 'done').length;
      const open = tasks.filter(t => !['done', 'deleted'].includes(t.status)).length;
      return { tasks, done, open, pct: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
    }
    function statusSignal(snap) {
      if (snap.blocked.length || snap.need > snap.capacity) return { label: 'At risk', cls: 'warn', text: 'Cần giảm tải hoặc xử lý blocker trước.' };
      if (snap.donePct >= 70 || (snap.tasks.length && snap.need <= snap.capacity * 0.5)) return { label: 'On track', cls: 'ok', text: 'Nhịp đang ổn, tiếp tục chốt việc quan trọng.' };
      return { label: 'In progress', cls: '', text: 'Có thể hoàn thành nếu ưu tiên đúng việc tiếp theo.' };
    }
    function nextActionTask() {
      const nowMin = dayProgress();
      const scheduled = activeDayTasks().filter(t => t.status !== 'done' && t.start && t.end && minOf(t.end) >= nowMin).sort((a, b) => minOf(a.start) - minOf(b.start));
      if (scheduled[0]) return scheduled[0];
      return incomplete().sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority] || (b.impact === 'high') - (a.impact === 'high')))[0] || null;
    }
    function renderCockpitStrip() {
      const snap = periodSnapshot('day');
      const signal = statusSignal(snap);
      const nowTask = activeDayTasks().find(t => t.start && t.end && minOf(t.start) <= dayProgress() && minOf(t.end) >= dayProgress() && t.status !== 'done');
      const nextTask = nextActionTask();
      const topRisk = commandRisks(snap)[0];
      return `<div class="cockpitStrip">
        <div class="cockpitCard status ${signal.cls}">
          <span class="eyebrow">Today status</span>
          <strong>${signal.label}</strong>
          <p>${signal.text}</p>
        </div>
        <button class="cockpitCard" onclick="${nowTask ? `openTaskDetail('${nowTask.id}')` : `goTab('timeline')`}">
          <span class="eyebrow">Now</span>
          <strong>${nowTask ? esc(nowTask.title) : 'Mở timeline'}</strong>
          <p>${nowTask ? `${nowTask.start}-${nowTask.end} · ${durText(nowTask.duration)}` : 'Chưa có block đang chạy. Xem timeline để chọn việc.'}</p>
        </button>
        <button class="cockpitCard" onclick="${nextTask ? `openTaskDetail('${nextTask.id}')` : `openTask()`}">
          <span class="eyebrow">Next</span>
          <strong>${nextTask ? esc(nextTask.title) : 'Tạo việc tiếp theo'}</strong>
          <p>${nextTask ? `${esc(projectName(nextTask.projectId))} · ${nextTask.impact || 'medium'} impact` : 'Chưa có task mở cho hôm nay.'}</p>
        </button>
        <button class="cockpitCard risk" onclick="goTab('debt')">
          <span class="eyebrow">Risk</span>
          <strong>${snap.blocked.length || stackTasks().length || snap.need > snap.capacity ? 'Cần chú ý' : 'Ổn định'}</strong>
          <p>${esc(topRisk)}</p>
        </button>
      </div>`;
    }
    function renderCommandCenter() {
      const snap = periodSnapshot();
      const modeLabel = { day: 'Ngày', week: 'Tuần', month: 'Tháng' }[dashboardMode];
      const risks = commandRisks(snap);
      const projects = workspace().projects.map(p => ({ project: p, progress: projectProgress(p) })).filter(x => x.progress.tasks.length).slice(0, 4);
      const goals = workspace().goals.filter(g => g.status !== 'archived').map(g => ({ goal: g, progress: goalProgress(g) })).slice(0, 4);
      return `<div class="opsPanel">
        <div class="opsHead">
          <div>
            <h2>Command Center</h2>
            <div class="muted small">${modeLabel} ${snap.startKey}${snap.startKey !== snap.endKey ? ` → ${snap.endKey}` : ''}: tiến độ, tải việc và rủi ro chính.</div>
          </div>
          <div class="segmented">
            ${['day', 'week', 'month'].map(m => `<button class="${dashboardMode === m ? 'active' : ''}" onclick="setDashboardMode('${m}')">${{ day: 'Ngày', week: 'Tuần', month: 'Tháng' }[m]}</button>`).join('')}
          </div>
        </div>
        <div class="opsMetrics">
          <div class="analyticsMiniStat"><span class="small muted">Hoàn thành</span><strong>${pct(snap.donePct)}%</strong><div class="trendBar"><i style="width:${pct(snap.donePct)}%"></i></div><div class="small muted">${snap.done.length}/${snap.tasks.length} task</div></div>
          <div class="analyticsMiniStat"><span class="small muted">Tải việc còn lại</span><strong>${durText(snap.need)}</strong><div class="small muted">Capacity ${durText(snap.capacity)}</div></div>
          <div class="analyticsMiniStat"><span class="small muted">Focus logged</span><strong>${durText(snap.focus)}</strong><div class="small muted">Scheduled ${durText(snap.scheduled)}</div></div>
          <div class="analyticsMiniStat"><span class="small muted">Rủi ro</span><strong>${risks.length}</strong><div class="small muted">${snap.blocked.length} blocker</div></div>
        </div>
        <div class="opsGrid">
          <div class="card"><h3>Rủi ro cần xử lý</h3><div class="riskList">${risks.map(r => `<div class="riskItem">${esc(r)}</div>`).join('')}</div></div>
          <div class="card"><h3>Project trong kỳ</h3>${projects.length ? projects.map(({ project, progress }) => `<div class="progressRow"><div><b>${esc(project.name)}</b><div class="small muted">${progress.done}/${progress.tasks.length} done, ${progress.open} open</div></div><span class="metricBadge ${progress.pct >= 70 ? 'ok' : progress.pct < 35 ? 'warn' : ''}">${progress.pct}%</span></div>`).join('') : '<div class="muted">Chưa có task gắn project trong kỳ.</div>'}</div>
          <div class="card"><h3>Goal cá nhân</h3>${goals.length ? goals.map(({ goal, progress }) => `<div class="progressRow"><div><b>${esc(goal.title)}</b><div class="small muted">${esc(projectName(goal.projectId))}${goal.targetDate ? `, target ${goal.targetDate}` : ''}</div><div class="trendBar"><i style="width:${progress.pct}%"></i></div></div><span class="metricBadge ${goal.confidence === 'on-track' ? 'ok' : goal.confidence === 'off-track' ? 'warn' : ''}">${progress.pct}%</span></div>`).join('') : '<div class="muted">Chưa có goal. Tạo goal trong Settings để gắn task vào mục tiêu.</div>'}</div>
        </div>
      </div>`;
    }
    // ── Cảm hứng mỗi ngày: câu nói động lực + sự thật cung hoàng đạo ───────────
    const QUOTES = [
      { t: 'Cách duy nhất để làm việc lớn là yêu thích việc bạn làm.', a: 'Steve Jobs' },
      { t: 'Thành công là đi từ thất bại này đến thất bại khác mà không mất nhiệt huyết.', a: 'Winston Churchill' },
      { t: 'Tương lai thuộc về những người tin vào vẻ đẹp của giấc mơ mình.', a: 'Eleanor Roosevelt' },
      { t: 'Đừng nhìn đồng hồ; hãy làm như nó. Cứ tiếp tục đi.', a: 'Sam Levenson' },
      { t: 'Bí quyết để tiến lên là bắt đầu.', a: 'Mark Twain' },
      { t: 'Hành trình vạn dặm bắt đầu từ một bước chân.', a: 'Lão Tử' },
      { t: 'Bạn bỏ lỡ 100% những cú sút mà bạn không thực hiện.', a: 'Wayne Gretzky' },
      { t: 'Hãy là sự thay đổi mà bạn muốn thấy ở thế giới.', a: 'Mahatma Gandhi' },
      { t: 'Điều quan trọng không phải bạn ngã bao nhiêu lần, mà bạn đứng dậy bao nhiêu lần.', a: 'Vince Lombardi' },
      { t: 'Chất lượng không phải là một hành động, đó là một thói quen.', a: 'Aristotle' },
      { t: 'Người bi quan thấy khó khăn trong mọi cơ hội; người lạc quan thấy cơ hội trong mọi khó khăn.', a: 'Winston Churchill' },
      { t: 'Nếu muốn đi nhanh hãy đi một mình, nếu muốn đi xa hãy đi cùng nhau.', a: 'Ngạn ngữ châu Phi' },
      { t: 'Khó khăn chuẩn bị cho những con người bình thường một số phận phi thường.', a: 'C.S. Lewis' },
      { t: 'Đừng sợ đi chậm, chỉ sợ dừng lại.', a: 'Ngạn ngữ Trung Hoa' },
      { t: 'Kỷ luật là cầu nối giữa mục tiêu và thành tựu.', a: 'Jim Rohn' },
      { t: 'Mọi chuyên gia đều từng là người mới bắt đầu.', a: 'Helen Hayes' },
      { t: 'Cơ hội không tự gõ cửa, chính bạn tạo ra cánh cửa đó.', a: 'Milton Berle' },
      { t: 'Thành công thường đến với những ai quá bận rộn để đi tìm nó.', a: 'Henry David Thoreau' },
      { t: 'Giới hạn duy nhất cho ngày mai là những nghi ngờ của hôm nay.', a: 'Franklin D. Roosevelt' },
      { t: 'Hãy làm những gì bạn có thể, với những gì bạn có, ở nơi bạn đang đứng.', a: 'Theodore Roosevelt' },
      { t: 'Khả năng không cố định, nó được rèn luyện mỗi ngày.', a: 'Carol Dweck' },
      { t: 'Không phải vì mọi thứ khó nên ta không dám, mà vì ta không dám nên mọi thứ mới khó.', a: 'Seneca' },
      { t: 'Người chiến thắng không bao giờ bỏ cuộc, người bỏ cuộc không bao giờ chiến thắng.', a: 'Vince Lombardi' },
      { t: 'Đầu tư vào bản thân là khoản đầu tư sinh lời cao nhất.', a: 'Warren Buffett' },
      { t: 'Mỗi sáng bạn có hai lựa chọn: ngủ tiếp với giấc mơ, hoặc thức dậy và theo đuổi nó.', a: 'Khuyết danh' },
      { t: 'Thái độ là điều nhỏ tạo nên khác biệt lớn.', a: 'Winston Churchill' },
      { t: 'Đừng đếm những ngày, hãy làm cho những ngày trở nên đáng giá.', a: 'Muhammad Ali' },
      { t: 'Điều bạn nghĩ, bạn sẽ trở thành.', a: 'Đức Phật' },
      { t: 'Năng lượng và sự bền bỉ chinh phục mọi thứ.', a: 'Benjamin Franklin' },
      { t: 'Thành công là tổng của những nỗ lực nhỏ được lặp lại mỗi ngày.', a: 'Robert Collier' },
      { t: 'Cách tốt nhất để dự đoán tương lai là tạo ra nó.', a: 'Peter Drucker' },
      { t: 'Hãy mơ lớn và dám thất bại.', a: 'Norman Vaughan' },
      { t: 'Can đảm không phải là không sợ, mà là tiến lên dù đang sợ.', a: 'Khuyết danh' },
      { t: 'Gieo thói quen gặt tính cách, gieo tính cách gặt số phận.', a: 'Khuyết danh' }
    ];
    const ZODIAC = [
      { sign: 'Ma Kết', en: 'Capricorn', emoji: '♑', element: 'Đất' },
      { sign: 'Bảo Bình', en: 'Aquarius', emoji: '♒', element: 'Khí' },
      { sign: 'Song Ngư', en: 'Pisces', emoji: '♓', element: 'Nước' },
      { sign: 'Bạch Dương', en: 'Aries', emoji: '♈', element: 'Lửa' },
      { sign: 'Kim Ngưu', en: 'Taurus', emoji: '♉', element: 'Đất' },
      { sign: 'Song Tử', en: 'Gemini', emoji: '♊', element: 'Khí' },
      { sign: 'Cự Giải', en: 'Cancer', emoji: '♋', element: 'Nước' },
      { sign: 'Sư Tử', en: 'Leo', emoji: '♌', element: 'Lửa' },
      { sign: 'Xử Nữ', en: 'Virgo', emoji: '♍', element: 'Đất' },
      { sign: 'Thiên Bình', en: 'Libra', emoji: '♎', element: 'Khí' },
      { sign: 'Bọ Cạp', en: 'Scorpio', emoji: '♏', element: 'Nước' },
      { sign: 'Nhân Mã', en: 'Sagittarius', emoji: '♐', element: 'Lửa' }
    ];
    const ZODIAC_FACTS = {
      Capricorn: ['Ma Kết kỷ luật và kiên nhẫn bậc nhất hoàng đạo, luôn chơi đường dài.', 'Bạn xem thử thách là bậc thang chứ không phải rào cản.', 'Tham vọng thầm lặng nhưng bền bỉ là dấu ấn của bạn.', 'Bạn tin vào nỗ lực thực chất hơn may mắn nhất thời.', 'Một khi đã cam kết, Ma Kết hiếm khi bỏ cuộc giữa chừng.'],
      Aquarius: ['Bảo Bình tư duy độc lập và thích những ý tưởng đi trước thời đại.', 'Bạn coi trọng tự do và sự khác biệt của mỗi cá nhân.', 'Khả năng nhìn bức tranh lớn giúp bạn giải bài toán theo cách mới.', 'Bạn dễ truyền cảm hứng cho tập thể bằng tầm nhìn.', 'Bảo Bình thường là người gieo mầm cho sự đổi mới.'],
      Pisces: ['Song Ngư giàu trực giác và đồng cảm sâu sắc với người khác.', 'Trí tưởng tượng phong phú là nguồn sáng tạo vô tận của bạn.', 'Bạn cảm nhận được điều người khác chưa kịp nói ra.', 'Sự dịu dàng của bạn có sức chữa lành lớn.', 'Song Ngư thích nghi mềm mại như nước trước hoàn cảnh.'],
      Aries: ['Bạch Dương là người tiên phong, dám bắt đầu khi người khác còn do dự.', 'Nhiệt huyết và năng lượng của bạn lan tỏa rất nhanh.', 'Bạn hành động trước, sợ hãi tính sau.', 'Tinh thần cạnh tranh lành mạnh thúc bạn tiến lên.', 'Bạch Dương phục hồi sau thất bại nhanh hơn hầu hết mọi người.'],
      Taurus: ['Kim Ngưu bền bỉ và thực tế, xây mọi thứ để tồn tại lâu dài.', 'Bạn trân trọng giá trị và sự ổn định.', 'Một khi đã quyết, ý chí của bạn vững như đá.', 'Bạn biết tận hưởng thành quả mình tạo ra.', 'Kim Ngưu kiên định ngay cả khi tiến độ chậm.'],
      Gemini: ['Song Tử linh hoạt, học nhanh và giao tiếp khéo léo.', 'Tò mò là động cơ khiến bạn không ngừng khám phá.', 'Bạn dễ kết nối nhiều thế giới và nhiều con người.', 'Khả năng thích nghi giúp bạn xoay chuyển tình thế nhanh.', 'Song Tử nhìn một vấn đề từ nhiều góc cùng lúc.'],
      Cancer: ['Cự Giải tình cảm và che chở cho những người mình yêu thương.', 'Trực giác về cảm xúc của bạn rất nhạy bén.', 'Bạn xây dựng tổ ấm và sự an toàn cho tập thể.', 'Trí nhớ cảm xúc giúp bạn trân trọng từng kỷ niệm.', 'Cự Giải mạnh mẽ một cách âm thầm khi bảo vệ điều quan trọng.'],
      Leo: ['Sư Tử tự tin và có khí chất lãnh đạo tự nhiên.', 'Sự hào phóng và ấm áp khiến bạn được yêu mến.', 'Bạn tỏa sáng nhất khi được làm điều mình tin tưởng.', 'Lòng kiêu hãnh lành mạnh thúc bạn giữ chuẩn mực cao.', 'Sư Tử truyền lửa cho người xung quanh dám mơ lớn.'],
      Virgo: ['Xử Nữ tỉ mỉ, phân tích và hướng đến sự hoàn thiện.', 'Bạn nhìn ra chi tiết mà người khác bỏ sót.', 'Tinh thần phục vụ khiến bạn luôn muốn cải thiện mọi thứ.', 'Sự ngăn nắp giúp bạn biến hỗn loạn thành trật tự.', 'Xử Nữ thực tế nhưng giàu lòng tận tụy.'],
      Libra: ['Thiên Bình tìm kiếm sự cân bằng và hài hòa trong mọi việc.', 'Bạn có khiếu thẩm mỹ và sự công bằng tự nhiên.', 'Khả năng nhìn cả hai phía giúp bạn hòa giải khéo léo.', 'Bạn coi trọng các mối quan hệ chất lượng.', 'Thiên Bình ra quyết định kỹ lưỡng để giữ lẽ phải.'],
      Scorpio: ['Bọ Cạp mãnh liệt, quyết đoán và rất tập trung khi theo đuổi mục tiêu.', 'Ý chí và chiều sâu nội tâm là sức mạnh của bạn.', 'Bạn nhìn thấu bản chất ẩn sau bề mặt.', 'Lòng trung thành của bạn rất bền chặt.', 'Bọ Cạp tái sinh mạnh mẽ sau mỗi biến cố.'],
      Sagittarius: ['Nhân Mã phiêu lưu, lạc quan và khát khao tự do khám phá.', 'Bạn luôn hướng tới chân trời và ý nghĩa lớn hơn.', 'Tinh thần cởi mở giúp bạn học từ mọi nền văn hóa.', 'Sự chân thành thẳng thắn là nét đáng quý của bạn.', 'Nhân Mã giữ niềm tin ngay cả khi đường còn dài.']
    };
    function zodiacFor(birthDate) {
      const p = String(birthDate || '').split('-').map(Number);
      const m = p[1], d = p[2];
      if (!m || !d) return null;
      const md = m * 100 + d;
      if (md >= 1222 || md <= 119) return ZODIAC[0];
      if (md <= 218) return ZODIAC[1];
      if (md <= 320) return ZODIAC[2];
      if (md <= 419) return ZODIAC[3];
      if (md <= 520) return ZODIAC[4];
      if (md <= 620) return ZODIAC[5];
      if (md <= 722) return ZODIAC[6];
      if (md <= 822) return ZODIAC[7];
      if (md <= 922) return ZODIAC[8];
      if (md <= 1022) return ZODIAC[9];
      if (md <= 1121) return ZODIAC[10];
      return ZODIAC[11];
    }
    function daySeed(dateStr) { const p = String(dateStr).split('-').map(Number); return (p[0] || 0) * 372 + (p[1] || 0) * 31 + (p[2] || 0); }
    function pickDaily(arr, dateStr, salt = 0) { return arr.length ? arr[(daySeed(dateStr) + salt) % arr.length] : null; }
    function renderInspirationHTML() {
      const dateStr = fmtDate(new Date());
      const bd = String(workspace().birthDate || '').trim();
      const z = bd ? zodiacFor(bd) : null;
      const quote = pickDaily(QUOTES, dateStr, 0);
      const bp = bd.split('-').map(Number);
      const isBirthday = z && bp[1] === (new Date().getMonth() + 1) && bp[2] === new Date().getDate();
      let inner = '';
      if (z) {
        const fact = pickDaily(ZODIAC_FACTS[z.en] || [], dateStr, 7);
        inner += `<div class="inspireZodiac"><div class="inspireZHead"><span class="zodiacGlyph">${z.emoji}</span><div><b>${z.sign}</b> <span class="muted small">(${z.en} · ${z.element})</span></div></div>${fact ? `<div class="inspireFact">${esc(fact)}</div>` : ''}</div>`;
      }
      if (quote) {
        inner += `<blockquote class="inspireQuote">“${esc(quote.t)}”<cite>— ${esc(quote.a)}</cite></blockquote>`;
      }
      return `<div class="card inspireCard"><div class="inspireKicker">✨ Cảm hứng hôm nay${isBirthday ? ' · 🎂 Chúc mừng sinh nhật bạn!' : ''}</div>${inner}</div>`;
    }
    function renderDashboard() {
      const s = stats(); const week = weekStats(); const next = nextEvent(); const rec = recommendations(); const commandCenter = renderCommandCenter(); $('#dashboard').innerHTML = `
${renderInspirationHTML()}
<div class="cmd"><div class="recommend"><h2 style="margin:0">Kế hoạch hôm nay</h2><div class="muted small">Nhìn nhanh việc cần làm và thời gian còn lại</div><ol>${rec.map(x => `<li>${x}</li>`).join('')}</ol><div class="row" style="margin-top:12px"><button class="btn sm" onclick="goTab('timeline')">Mở timeline</button><button class="btn sm secondary" onclick="openTask()">Thêm task</button><button class="btn sm secondary" onclick="openTriage()">Xử lý việc tồn</button></div></div>${renderHomeClock(next)}</div>
${commandCenter}
<div class="cards"><div class="card"><h3>Hôm nay còn</h3><div class="big">${durText(s.remain)}</div><div class="bar"><i style="width:${100 - pct(s.dayPct)}%"></i></div><div class="small muted">Thời gian đang trôi trong ngày</div></div><div class="card"><h3>Task hoàn thành</h3><div class="big">${pct(s.donePct)}%</div><div class="bar"><i style="width:${pct(s.donePct)}%"></i></div><div class="small muted">${s.done.length}/${s.tasks.length} task</div></div><div class="card"><h3>Tuần này còn</h3><div class="big">${durText(week.remain)}</div><div class="bar"><i style="width:${100 - pct(week.passed)}%"></i></div><div class="small muted">${week.done}/${week.total} task xong</div></div><div class="card"><h3>Việc tồn</h3><div class="big">${stackTasks().length}</div><div class="small muted">Tổng: ${durText(stackTasks().reduce((a, t) => a + Number(t.duration || 0), 0))}</div></div></div>
<div class="split" style="margin-top:16px"><div>${renderTaskListHTML(activeDayTasks(), true)}</div><div class="card"><h3>Việc chính hôm nay</h3>${s.mission.length ? s.mission.map(t => taskMini(t)).join('') : '<div class="muted">Chưa chọn việc chính. Nên chọn tối đa 3 task quan trọng.</div>'}</div></div>
<div style="margin-top:16px">${renderStickyNotesHTML()}</div>`
      updateHomeClock();
    }
    function recommendations() { const s = stats(); const arr = []; if (!dayTasks().length) arr.push('Tạo 1-3 task quan trọng cho hôm nay, đừng lập kế hoạch quá tải.'); if (s.need > s.avail) arr.push(`Bạn đang thiếu khoảng <b>${durText(s.need - s.avail)}</b>. Hãy dời hoặc chia nhỏ task.`); if (s.dayPct > s.donePct + 25 && dayTasks().length) arr.push('Ngày đang trôi nhanh hơn tiến độ task. Nên bắt đầu task ưu tiên cao ngay.'); const debt = stackTasks().sort((a, b) => debtAge(b) - debtAge(a))[0]; if (debt) arr.push(`Xử lý việc tồn lâu nhất: <b>${esc(debt.title)}</b> đã ${debtAge(debt)} ngày.`); const next = nextEvent(); if (next) arr.push(`Sự kiện gần nhất là <b>${esc(next.title)}</b>. Gắn task chuẩn bị nếu cần.`); return arr.slice(0, 4) }
    function weekStats(date = selectedDate) {
      const d = parseDate(date);
      const monday = startOfDay(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const end = new Date(monday);
      end.setDate(end.getDate() + 7);
      let total = 0, done = 0;
      db.tasks.forEach(t => {
        const td = parseDate(t.date);
        if (!isDeletedItem(t) && td >= monday && td < end) {
          total++;
          if (t.status === 'done') done++;
        }
      });
      const today = fmtDate(new Date());
      let remain = 0, passed = 0;
      if (date === today) {
        remain = Math.max(0, (end - new Date()) / 60000);
        passed = 100 - remain / (7 * 1440) * 100;
      } else if (date < today) {
        remain = 0;
        passed = 100;
      } else {
        remain = 7 * 1440;
        passed = 0;
      }
      return { total, done, remain, passed: clamp(passed, 0, 100) };
    }
    function renderInsight() {
      const s = stats(); const next = nextEvent(); const bad = s.need > s.avail;
      $('#insight').innerHTML = `<h2>Tổng quan</h2><div class="grid">
        <div class="card"><h3>Ngày đã trôi</h3><div class="big" id="ins-dayPct">${pct(s.dayPct)}%</div><div class="bar"><i id="ins-dayBar" style="width:${pct(s.dayPct)}%"></i></div></div>
        <div class="card"><h3>Thời gian còn lại</h3><div class="big" id="ins-remain">${durText(s.remain)}</div><div class="bar"><i id="ins-remainBar" style="width:${100 - pct(s.dayPct)}%"></i></div><div class="small muted">Cập nhật theo thời gian thực</div></div>
        <div class="card"><h3>Task hoàn thành</h3><div class="big">${pct(s.donePct)}%</div><div class="bar"><i style="width:${pct(s.donePct)}%"></i></div></div>
        <div class="card"><h3>Cảnh báo</h3><p>Task chưa xong cần: <b>${durText(s.need)}</b></p><p>Thời gian khả dụng: <b id="ins-avail">${durText(s.avail)}</b></p><p class="${bad ? 'dangerText' : 'okText'}">${bad ? 'Quá tải ' + durText(s.need - s.avail) : 'Không quá tải theo ước lượng.'}</p>${s.dayPct > s.donePct + 20 && s.tasks.length ? `<p class="warnText">Ngày trôi ${pct(s.dayPct)}% nhưng task mới xong ${pct(s.donePct)}% -> đang chậm.</p>` : ''}</div>
        <div class="card"><h3>Sự kiện tiếp theo</h3>${next ? `<table class="table"><tr><th>Sự kiện</th><th>Ngày</th><th>Còn</th></tr><tr><td>${esc(next.title)}</td><td>${next.date}</td><td>${next.days} ngày</td></tr></table>` : '<div class="muted">Không có sự kiện</div>'}</div>
      </div>`;
    }
    // Chỉ cập nhật số liệu realtime, không rebuild toàn bộ insight DOM.
    function renderInsightCounters() {
      const s = stats();
      const dayPctEl = $('#ins-dayPct'); if (dayPctEl) dayPctEl.textContent = pct(s.dayPct) + '%';
      const dayBarEl = $('#ins-dayBar'); if (dayBarEl) dayBarEl.style.width = pct(s.dayPct) + '%';
      const remainEl = $('#ins-remain'); if (remainEl) remainEl.textContent = durText(s.remain);
      const remainBarEl = $('#ins-remainBar'); if (remainBarEl) remainBarEl.style.width = (100 - pct(s.dayPct)) + '%';
    }
    function renderTimeline(full = true) {
      const tasks = activeDayTasks().filter(t => t.start && t.end);
      const overlaps = findOverlaps(tasks);
      const hourH = getHourHeight();
      let hours = '';
      for (let h = 0; h < 24; h++) {
        hours += `<div class="hour" style="top:${h * hourH}px"><div class="hourLabel">${String(h).padStart(2, '0')}:00</div><div class="hourArea" data-hour="${h}"></div></div>`;
      }
      const now = new Date();
      const isToday = fmtDate(now) === selectedDate;
      const line = isToday ? `<div class="nowLine" id="nowLine" style="top:${(dayProgress() / 60) * hourH}px"></div>` : '';
      const blocks = tasks.map(t => {
        const top = (minOf(t.start) / 60) * hourH;
        const height = Math.max(42, ((minOf(t.end) - minOf(t.start)) / 60) * hourH - 4);
        return `<div class="tblock ${t.priority} ${overlaps.has(t.id) ? 'overlap' : ''} ${t.status === 'done' ? 'done' : ''}" style="top:${top}px;height:${height}px" onclick="openTaskDetail('${t.id}')">
          <div class="name">${esc(t.title)}</div>
          <div class="meta">${t.start}-${t.end} · ${t.duration}m ${t.mission ? '· Việc chính' : ''}</div>
        </div>`;
      }).join('');
      const uns = activeDayTasks().filter(t => !t.start || !t.end);
      const scheduledMins = tasks.reduce((sum, t) => sum + Math.max(0, (minOf(t.end) || 0) - (minOf(t.start) || 0)), 0);
      const freeMins = Math.max(0, availableRemainMins(selectedDate) - scheduledMins);
      $('#timeline').innerHTML = `
        <div class="quick">
          <input class="input" id="quickAdd" placeholder="Thêm nhanh: Ôn K-means 19:00 90m high #study">
          <button class="btn" onclick="quickAdd()">Thêm nhanh</button>
          <button class="btn secondary" onclick="autoSchedule()">Tự xếp task chưa có giờ</button>
        </div>
        <div class="split">
          <div>
            <div class="timelineSummary">
              <span class="pill">Ngày: ${selectedDate}</span>
              <span class="pill">Block: ${tasks.length}</span>
              <span class="pill">Scheduled: ${durText(scheduledMins)}</span>
              <span class="pill">Free: ${durText(freeMins)}</span>
              <span class="pill ${overlaps.size ? 'dangerText' : ''}">Overlap: ${overlaps.size}</span>
            </div>
            <div class="timelineWrap" id="timelineWrap" onclick="timelineClick(event)">${hours}${line}${blocks}</div>
          </div>
          <div class="card"><h3>Chưa xếp giờ</h3><div class="list">${uns.length ? uns.map(t => taskMini(t)).join('') : '<div class="muted">Không có task chưa xếp giờ.</div>'}</div></div>
        </div>`;
      if (isToday) requestAnimationFrame(() => scrollTimelineToNow());
    }
    // Chỉ di chuyển nowLine DOM node thay vì rebuild toàn bộ timeline mỗi giây.
    function updateNowLine() {
      const line = $('#nowLine');
      if (!line) return;
      if (fmtDate(new Date()) === selectedDate) {
        line.style.top = (dayProgress() / 60) * getHourHeight() + 'px';
      }
    }
    function scrollTimelineToNow() {
      const line = $('#nowLine');
      if (!line) return;
      line.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    // Sweep-line O(n log n) để phát hiện overlap.
    function findOverlaps(tasks) {
      const set = new Set();
      if (tasks.length < 2) return set;
      // Event: [time, type (0=end, 1=start), taskId].
      const events = [];
      tasks.forEach(t => {
        const s = minOf(t.start), e = minOf(t.end);
        if (s === null || e === null) return;
        events.push([s, 1, t.id]); // start
        events.push([e, 0, t.id]);
      });
      events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const active = new Set();
      for (const [, type, id] of events) {
        if (type === 1) { // start
          if (active.size > 0) {
            set.add(id);
            active.forEach(aid => set.add(aid));
          }
          active.add(id);
        } else { // end
          active.delete(id);
        }
      }
      return set;
    }
    function timelineClick(e) { const area = e.target.closest('.hourArea'); if (!area || e.target.closest('.tblock')) return; openTask(null, { date: selectedDate, start: timeOfMin(Number(area.dataset.hour) * 60), duration: 60 }) }
    function taskText(t) { const f = ensureFlow(t); return [t.title, t.notes, projectName(t.projectId), goalName(t.goalId), t.impact, t.energy, ...(t.tags || []), f.summary, ...f.checklist.map(x => x.text), ...f.notes.map(x => x.text), ...f.blockers.map(x => x.text), ...f.nextActions.map(x => x.text)].join(' ').toLowerCase() }
    function taskHasBlocker(t) { return ensureFlow(t).blockers.some(x => x.text && x.text.trim()) }
    function taskOverdue(t) { return t.date < fmtDate(new Date()) && !['done', 'deleted'].includes(t.status) }
    function filteredTasks(list) {
      const q = taskFilters.q.trim().toLowerCase();
      return list.filter(t => {
        if (q && !taskText(t).includes(q)) return false;
        if (taskFilters.status !== 'all' && t.status !== taskFilters.status) return false;
        if (taskFilters.priority !== 'all' && t.priority !== taskFilters.priority) return false;
        if (taskFilters.tag !== 'all' && !(t.tags || []).includes(taskFilters.tag)) return false;
        if (taskFilters.project !== 'all' && t.projectId !== taskFilters.project) return false;
        if (taskFilters.special === 'blocker' && !taskHasBlocker(t)) return false;
        if (taskFilters.special === 'overdue' && !taskOverdue(t)) return false;
        if (taskFilters.special === 'mission' && !t.mission) return false;
        return true;
      });
    }
    function updateTaskFilter(key, value) {
      taskFilters[key] = value;
      if (key === 'q') {
        const list = filteredTasks(dayTasks());
        const mount = $('#taskListMount');
        const count = $('#taskFilterCount');
        if (mount) mount.innerHTML = renderTaskListHTML(list, true);
        if (count) count.textContent = `${list.length} đang hiển thị`;
        return;
      }
      renderTasks();
    }
    function renderTasks() {
      const all = dayTasks();
      const list = filteredTasks(all);
      const tags = Array.from(new Set(db.tasks.flatMap(t => t.tags || []))).sort();
      $('#tasks').innerHTML = `<div class="quick"><input class="input" id="quickAddTasks" placeholder="Thêm nhanh: Viết báo cáo 08:00 50m high #work !mission"><button class="btn" onclick="quickAdd('quickAddTasks')">Thêm nhanh</button><button class="btn secondary" onclick="openTask()">Form đầy đủ</button></div>
      <div class="filterBar">
        <input class="input" value="${esc(taskFilters.q)}" placeholder="Tìm title, note, tag, blocker..." oninput="updateTaskFilter('q', this.value)">
        <select onchange="updateTaskFilter('status', this.value)"><option value="all">Mọi trạng thái</option>${['todo', 'doing', 'done', 'deferred', 'stack'].map(x => `<option value="${x}" ${taskFilters.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select onchange="updateTaskFilter('priority', this.value)"><option value="all">Mọi priority</option>${['high', 'medium', 'low'].map(x => `<option value="${x}" ${taskFilters.priority === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select onchange="updateTaskFilter('tag', this.value)"><option value="all">Mọi tag</option>${tags.map(x => `<option value="${esc(x)}" ${taskFilters.tag === x ? 'selected' : ''}>#${esc(x)}</option>`).join('')}</select>
        <select onchange="updateTaskFilter('project', this.value)"><option value="all">Mọi project</option>${workspace().projects.map(p => `<option value="${esc(p.id)}" ${taskFilters.project === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <select onchange="updateTaskFilter('special', this.value)"><option value="all">Tất cả</option><option value="blocker" ${taskFilters.special === 'blocker' ? 'selected' : ''}>Có blocker</option><option value="overdue" ${taskFilters.special === 'overdue' ? 'selected' : ''}>Quá hạn</option><option value="mission" ${taskFilters.special === 'mission' ? 'selected' : ''}>Việc chính</option></select>
      </div>
      <div class="cards"><div class="card"><h3>Tổng task</h3><div class="big">${all.length}</div><div class="small muted" id="taskFilterCount">${list.length} đang hiển thị</div></div><div class="card"><h3>Done</h3><div class="big">${doneTasks().length}</div></div><div class="card"><h3>Cần làm</h3><div class="big">${durText(incomplete().reduce((a, t) => a + Number(t.duration || 0), 0))}</div></div><div class="card"><h3>Việc chính</h3><div class="big">${all.filter(t => t.mission).length}</div></div></div><div id="taskListMount" style="margin-top:16px">${renderTaskListHTML(list, true)}</div>`
    }
    function renderTaskListHTML(list, actions = false) {
      if (!list.length) return `<div class="emptyState">${uiIcon('tasks', 'icon lg')}<h3>Chưa có task nào</h3><p>Bắt đầu bằng 1-3 việc chính, hoặc tạo một block deep work cho hôm nay.</p><div class="row"><button class="btn" onclick="openTask()">${uiIcon('plus')}Tạo công việc</button><button class="btn secondary" onclick="goTab('timeline')">Mở timeline</button></div></div>`;
      return `<div class="list">${list.map(t => {
        const goal = goalName(t.goalId);
        const stateClass = `${t.impact === 'high' ? 'impact-high' : ''} ${taskHasBlocker(t) ? 'has-blocker' : ''} ${taskOverdue(t) ? 'is-overdue' : ''} ${t.status === 'done' ? 'is-done' : ''}`;
        return `<div class="task ${stateClass}" style="--task-accent:${projectColor(t.projectId)}"><div class="taskTop"><div><div class="taskTitle">${esc(t.title)}</div><div class="muted small taskMeta"><span class="dateChip">${uiIcon('calendar')}${t.date}</span>${t.start ? `<span>${t.start}-${t.end}</span>` : ''}<span>${t.duration}m</span>${t.deadline ? `<span class="deadlineChip">deadline ${t.deadline}</span>` : ''}</div></div><span class="badge ${t.priority}">${t.priority}</span></div><div class="row"><span class="badge">${t.status}</span><span class="badge">${esc(projectName(t.projectId))}</span>${goal ? `<span class="badge">${esc(goal)}</span>` : ''}<span class="badge">${t.impact || 'medium'} impact</span><span class="badge">${t.energy || 'normal'}</span>${taskHasBlocker(t) ? '<span class="badge warn">blocked</span>' : ''}${t.mission ? '<span class="badge">Việc chính</span>' : ''}${(t.tags || []).map(x => `<span class="badge">#${esc(x)}</span>`).join('')}</div>${actions ? `<div class="row taskActions"><button class="btn sm" onclick="openTaskDetail('${t.id}')">Mở</button><button class="btn sm ok" onclick="markDone('${t.id}')">${uiIcon('check')}Done</button><button class="btn sm secondary" onclick="startFocus('${t.id}')">${uiIcon('focus')}Tập trung</button><button class="btn sm secondary" onclick="openTask('${t.id}')">Sửa</button><button class="btn sm warn" onclick="moveToStack('${t.id}')">${uiIcon('archive')}Tồn</button></div>` : ''}<div class="taskAccentBar" title="${esc(projectName(t.projectId))}"></div></div>`;
      }).join('')}</div>`;
    }
    function taskMini(t) { return `<div class="task"><div class="taskTitle">${esc(t.title)}</div><div class="muted small">${t.start ? `${t.start}-${t.end} · ` : ''}${t.duration}m · ${t.status}</div><div class="row"><button class="btn sm" onclick="openTaskDetail('${t.id}')">Mở</button><button class="btn sm ok" onclick="markDone('${t.id}')">Done</button></div></div>` }
    function openTask(id = null, preset = {}) {
      editingTaskId = id;
      const t = id ? db.tasks.find(x => x.id === id) : { title: '', date: selectedDate, duration: 60, priority: 'high', impact: 'medium', energy: 'normal', projectId: workspace().projects[0].id, goalId: '', status: 'todo', mission: false, done: false, flow: defaultFlow(), ...preset };
      if (!t) return;
      const endValue = t.end || deriveEndTime(t.start, t.duration);
      const projectValue = t.projectId || workspace().projects[0].id;
      $('#taskModalTitle').textContent = id ? 'Sửa task' : 'Thêm task';
      $('#fTitle').value = t.title || '';
      $('#fDate').value = t.date || selectedDate;
      $('#fDuration').value = t.duration || 60;
      $('#fPriority').value = t.priority || 'medium';
      $('#fProject').innerHTML = projectOptionsHTML(projectValue);
      $('#fProject').onchange = e => { $('#fGoal').innerHTML = goalOptionsHTML('', e.target.value); };
      $('#fGoal').innerHTML = goalOptionsHTML(t.goalId || '', projectValue);
      $('#fImpact').value = t.impact || (t.mission ? 'high' : 'medium');
      $('#fEnergy').value = t.energy || 'normal';
      $('#fStart').value = t.start || '';
      $('#fEnd').value = endValue;
      $('#fDeadline').value = t.deadline || '';
      $('#fStatus').value = t.status || 'todo';
      $('#fTags').value = (t.tags || []).map(x => '#' + x).join(' ');
      $('#fNotes').value = t.notes || '';
      $('#fMission').checked = !!t.mission;
      $('#fDone').checked = t.status === 'done';
      $('#deleteTaskBtn').style.display = id ? 'inline-flex' : 'none';
      $('#fEvent').innerHTML = '<option value="">Không liên kết</option>' + db.events.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
      $('#fEvent').value = t.eventId || '';
      $('#fCalendar').innerHTML = calendarOptionsHTML(t.calendarId || DEFAULT_CALENDAR_ID);
      $('#fCalendar').value = t.calendarId || DEFAULT_CALENDAR_ID;
      openModal('taskModal');
    }
    function saveTask() {
      const id = editingTaskId;
      let t = id ? db.tasks.find(x => x.id === id) : { id: uid(), createdAt: new Date().toISOString(), deferCount: 0, flow: defaultFlow() };
      if (!t) return;
      const taskDate = $('#fDate').value;
      const durationValue = Number($('#fDuration').value) || 0;
      const startValue = $('#fStart').value;
      const endValue = $('#fEnd').value || deriveEndTime(startValue, durationValue);
      // #fDeadline là input type="time" → không hiển thị được deadline NGÀY cũ ("YYYY-MM-DD"),
      // nên khi sửa task cũ ô này rỗng. Giữ lại giá trị ngày cũ đã lưu thay vì ghi đè thành ''.
      const deadlineInput = $('#fDeadline').value;
      const deadlineValue = deadlineInput || (DATE_RE.test(String(t.deadline ?? '')) ? t.deadline : '');
      if (!taskDate) { toast('Vui lòng chọn ngày cho task.'); return }
      if (durationValue <= 0) { toast('Duration phải lớn hơn 0 phút.'); return }
      const missionCount = activeDayTasks(taskDate).filter(x => x.mission && x.id !== id).length;
      if ($('#fMission').checked && missionCount >= Number(db.settings.dailyMissionLimit || 3)) { toast('Việc chính hôm nay chỉ nên tối đa 3 task.'); return }
      if (startValue && hasWrappedTimeRange(startValue, endValue)) { toast('Task vượt qua 00:00 chưa được hỗ trợ. Hãy tách task thành 2 phần.'); return }
      ensureFlow(t);
      touchTask(t, {
        title: $('#fTitle').value.trim() || 'Untitled task',
        date: taskDate,
        duration: durationValue,
        priority: $('#fPriority').value,
        projectId: $('#fProject').value || workspace().projects[0].id,
        goalId: $('#fGoal').value || '',
        impact: $('#fImpact').value || 'medium',
        energy: $('#fEnergy').value || 'normal',
        start: startValue,
        end: endValue,
        deadline: deadlineValue,
        status: $('#fDone').checked ? 'done' : $('#fStatus').value,
        done: $('#fDone').checked,
        mission: $('#fMission').checked,
        notes: $('#fNotes').value,
        tags: $('#fTags').value.split(/\s+/).filter(Boolean).map(x => x.replace(/^#/, '')).filter(Boolean),
        eventId: $('#fEvent').value || '',
        calendarId: $('#fCalendar').value || DEFAULT_CALENDAR_ID
      });
      if (t.status === 'done') t.doneAt = new Date().toISOString();
      if (!id) db.tasks.push(t);
      save();
      closeModal('taskModal');
      render();
      if (detailTaskId === t.id) renderTaskDetail(t.id);
      toast('Đã lưu task');
    }
    function softDeleteTask(id) {
      const task = db.tasks.find(t => t.id === id);
      if (!task) return false;
      touchTask(task, {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        mission: false,
        start: '',
        end: ''
      });
      return true;
    }
    function deleteTask() { if (!editingTaskId) return; pushUndo('Xoá task'); softDeleteTask(editingTaskId); if (detailTaskId === editingTaskId) closeModal('taskDetailModal'); save(); closeModal('taskModal'); render(); toastUndo('Đã xoá task') }
    function openTaskDetail(id) { detailTaskId = id; renderTaskDetail(id); openModal('taskDetailModal') }
    function renderTaskDetail(id = detailTaskId) {
      const t = db.tasks.find(x => x.id === id);
      if (!t) { closeModal('taskDetailModal'); return; }
      const flow = ensureFlow(t);
      $('#taskDetailContent').innerHTML = `
        <div class="detailHead">
          <div>
            <div class="h1">${esc(t.title)}</div>
            <div class="row" style="margin-top:8px">
              <span class="badge ${t.priority}">${t.priority}</span>
              <span class="badge">${t.status}</span>
              <span class="badge">${t.date}${t.start ? ` · ${t.start}-${t.end}` : ''}</span>
              <span class="badge">${esc(projectName(t.projectId))}</span>
              ${goalName(t.goalId) ? `<span class="badge">${esc(goalName(t.goalId))}</span>` : ''}
              <span class="badge">${t.impact || 'medium'} impact</span>
              <span class="badge">${t.energy || 'normal'}</span>
              ${t.mission ? '<span class="badge">Việc chính</span>' : ''}
            </div>
          </div>
          <div class="row"><button class="btn secondary" onclick="openTask('${t.id}')">Sửa</button><button class="btn secondary" onclick="closeModal('taskDetailModal')">Đóng</button></div>
        </div>
        <div class="detailBody">
          <div class="grid">
            <div class="flowSection">
              <h3>Tóm tắt</h3>
              <textarea id="flowSummary" placeholder="Mục tiêu, phạm vi, kết quả mong muốn..." oninput="updateFlowSummary('${t.id}', this.value)">${esc(flow.summary)}</textarea>
            </div>
            ${flowListHTML(t, 'checklist', 'Checklist', true)}
            ${flowListHTML(t, 'notes', 'Notes')}
          </div>
          <div class="grid">
            ${flowListHTML(t, 'blockers', 'Blockers')}
            ${flowListHTML(t, 'nextActions', 'Next action')}
            ${flowListHTML(t, 'logs', 'Focus logs', false, true)}
          </div>
        </div>`;
    }
    function flowListHTML(t, key, title, checklist = false, readonly = false) {
      const items = ensureFlow(t)[key] || [];
      const rows = items.map(item => `<div class="flowItem ${item.done ? 'done' : ''}">
        ${checklist ? `<input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleFlowCheck('${t.id}','${item.id}')">` : '<span class="muted">-</span>'}
        <span>${esc(item.text)}</span>
        ${readonly ? '<span></span>' : `<button class="btn sm ghost" onclick="removeFlowItem('${t.id}','${key}','${item.id}')">Xoá</button>`}
      </div>`).join('') || '<div class="muted small">Chưa có nội dung.</div>';
      const add = readonly ? '' : `<div class="flowAdd"><input class="input" id="flow-${key}-input" placeholder="Thêm ${title.toLowerCase()}"><button class="btn secondary" onclick="addFlowItem('${t.id}','${key}')">Thêm</button></div>`;
      return `<div class="flowSection"><h3>${title}</h3>${rows}${add}</div>`;
    }
    function updateFlowSummary(id, value) { const t = db.tasks.find(x => x.id === id); if (!t) return; ensureFlow(t).summary = value; t.updatedAt = new Date().toISOString(); save(); }
    function addFlowItem(id, key) { const t = db.tasks.find(x => x.id === id); const input = $(`#flow-${key}-input`); const text = input?.value.trim(); if (!t || !text) return; const flow = ensureFlow(t); flow[key].push(key === 'checklist' ? { id: uid(), text, done: false } : { id: uid(), text, createdAt: new Date().toISOString() }); input.value = ''; t.updatedAt = new Date().toISOString(); save(); renderTaskDetail(id); render(); }
    function removeFlowItem(id, key, itemId) { const t = db.tasks.find(x => x.id === id); if (!t) return; const flow = ensureFlow(t); flow[key] = flow[key].filter(x => x.id !== itemId); t.updatedAt = new Date().toISOString(); save(); renderTaskDetail(id); render(); }
    function toggleFlowCheck(id, itemId) { const t = db.tasks.find(x => x.id === id); if (!t) return; const item = ensureFlow(t).checklist.find(x => x.id === itemId); if (item) item.done = !item.done; t.updatedAt = new Date().toISOString(); save(); renderTaskDetail(id); render(); }
    function quickDur(m) { $('#fDuration').value = m; autoEnd() }
    function autoEnd() { const s = $('#fStart').value, d = Number($('#fDuration').value); if (s && d) $('#fEnd').value = timeOfMin(minOf(s) + d) }
    function quickAdd(inputId = 'quickAdd') {
      const el = $('#' + inputId) || $('#quickAdd');
      const str = el.value.trim();
      if (!str) return;
      const words = str.split(/\s+/);
      let time = '', dur = 60, priority = 'medium', mission = false, tags = [];
      let title = [];
      for (const w of words) {
        if (/^\d{1,2}:\d{2}$/.test(w)) time = w;
        else if (/^\d+(m|min|ph|p)$/i.test(w)) dur = parseInt(w);
        else if (/^\d+h$/i.test(w)) dur = parseInt(w) * 60;
        else if (['high', 'cao'].includes(w.toLowerCase())) priority = 'high';
        else if (['low', 'thap', 'thấp'].includes(w.toLowerCase())) priority = 'low';
        else if (['medium', 'vua', 'vừa'].includes(w.toLowerCase())) priority = 'medium';
        else if (w === '!mission') mission = true;
        else if (w.startsWith('#')) tags.push(w.slice(1));
        else title.push(w);
      }
      const titleStr = title.join(' ').trim();
      // Validate: phải có tiêu đề thật sự (không phải chỉ là command tokens)
      if (!titleStr) { toast('⚠️ Vui lòng nhập tiêu đề task trước các lệnh'); return; }
      // Cùng rule với saveTask: chưa hỗ trợ task vắt qua 00:00
      if (time && hasWrappedTimeRange(time, timeOfMin(minOf(time) + dur))) { toast('Task vượt qua 00:00 chưa được hỗ trợ. Hãy tách task thành 2 phần.'); return; }
      const t = {
        id: uid(), title: titleStr, date: selectedDate,
        duration: dur, priority, start: time,
        end: time ? timeOfMin(minOf(time) + dur) : '',
        deadline: '', status: 'todo', mission, notes: '', tags,
        projectId: workspace().projects[0].id,
        goalId: '',
        impact: mission || priority === 'high' ? 'high' : 'medium',
        energy: dur >= 90 ? 'deep' : 'normal',
        flow: defaultFlow(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deferCount: 0
      };
      db.tasks.push(t); el.value = ''; save(); render(); toast('✅ Đã thêm: ' + titleStr);
    }
    function markDone(id) { const t = db.tasks.find(x => x.id === id); if (t) { pushUndo('Done task'); touchTask(t, { status: 'done', doneAt: new Date().toISOString() }); save(); render(); if (detailTaskId === id) renderTaskDetail(id); toastUndo('Đã đánh dấu Done') } }
    function moveToStack(id, reason = 'Chủ động đưa vào việc tồn') { const t = db.tasks.find(x => x.id === id); if (t) { pushUndo('Chuyển vào việc tồn'); touchTask(t, { status: 'stack', stackType: t.deadline ? 'overdue' : 'unfinished', stackedAt: t.stackedAt || new Date().toISOString(), reason, deferCount: (t.deferCount || 0) + 1 }); save(); render(); toastUndo('Đã chuyển vào việc tồn') } }
    function autoSchedule() { pushUndo('Tự xếp lịch'); let cursor = minOf(db.settings.availableStart) || 420; const dayEnd = minOf(db.settings.availableEnd) || 1320; const occupied = activeDayTasks().filter(t => t.start && t.end).map(t => [minOf(t.start), minOf(t.end)]).sort((a, b) => a[0] - b[0]); const uns = activeDayTasks().filter(t => !t.start || !t.end).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])); let skipped = 0, changed = 0; for (const t of uns) { let placed = false; for (let i = 0; i <= occupied.length; i++) { const nextStart = i < occupied.length ? occupied[i][0] : dayEnd; cursor = Math.max(cursor, i ? occupied[i - 1][1] : cursor); const end = cursor + Number(t.duration || 60); if (nextStart - cursor >= Number(t.duration || 60) && end <= dayEnd) { touchTask(t, { start: timeOfMin(cursor), end: timeOfMin(end) }); occupied.splice(i, 0, [cursor, end]); placed = true; changed++; break } } if (!placed) skipped++; } if (!changed) { undoStack.pop(); toast('Không có task nào được tự xếp'); return; } save(); render(); toastUndo(skipped ? `Đã tự xếp, còn ${skipped} task quá giờ khả dụng` : 'Đã tự xếp task') }
    function renderFocus() {
      const tasks = activeDayTasks().filter(t => t.status !== 'done');
      const focusPct = focusInitialSeconds > 0 ? pct((focusInitialSeconds - Math.max(0, focusRemain)) / focusInitialSeconds * 100) : 0;
      const activeTask = focusTaskId ? db.tasks.find(t => t.id === focusTaskId) : null;
      const taskName = activeTask ? esc(activeTask.title || 'Task') : 'Chưa chọn task';
      const focusState = focusTimer ? 'Đang chạy' : (focusTaskId ? 'Đang pause' : 'Sẵn sàng');
      const focusLabel = focusTimer ? 'Đang tập trung' : (focusTaskId ? 'Đã pause' : 'Chọn task');
      const todayFocus = db.sessions.filter(s => s.date === selectedDate).reduce((sum, s) => sum + Number(s.minutes || 0), 0);
      const plannedMins = tasks.reduce((sum, t) => sum + Number(t.duration || 0), 0);
      const deepCount = tasks.filter(t => t.energy === 'deep' || t.impact === 'high' || t.mission).length;
      $('#focus').innerHTML = `
        <div class="focusShell">
          <section class="focusConsole card">
            <div class="focusPanelHead">
              <div>
                <div class="eyebrow">Focus console</div>
                <h2>${focusState}</h2>
              </div>
              <span class="metricBadge ${focusTimer ? 'ok' : focusTaskId ? '' : 'warn'}">${focusLabel}</span>
            </div>
            <div class="focusTimerStage">
              <div class="focusRing" id="focusRingEl">
                <div class="focusRingCenter">
                  <div class="focusRingTime" id="focusRemain">${formatFocusTime(focusRemain)}</div>
                  <div class="focusRingLabel">${focusLabel}</div>
                </div>
              </div>
              <div class="focusActiveTask">
                <span class="small muted">Task hiện tại</span>
                <strong>${taskName}</strong>
                <span class="small muted">${activeTask ? `${esc(projectName(activeTask.projectId))} · ${activeTask.duration || 0}m · ${activeTask.priority}` : 'Chọn một task trong danh sách bên dưới để bắt đầu.'}</span>
              </div>
            </div>
            <div class="focusQuickPresets" aria-label="Focus presets">
              <button class="btn sm" onclick="setFocusPreset(25)">25m</button>
              <button class="btn sm" onclick="setFocusPreset(50)">50m</button>
              <button class="btn sm" onclick="setFocusPreset(90)">90m</button>
            </div>
            <div class="focusControlGrid">
              <button class="btn" onclick="toggleFocusTimer()">${focusTimer ? 'Pause' : 'Resume'}</button>
              <button class="btn ok" onclick="completeFocus()">Kết thúc</button>
              <button class="btn secondary" onclick="addFocus(10)">+10m</button>
            </div>
          </section>
          <aside class="focusSidePanel">
            <div class="focusStatsGrid">
              <div class="focusStat">
                <span>Focus hôm nay</span>
                <strong>${durText(todayFocus)}</strong>
              </div>
              <div class="focusStat">
                <span>Task mở</span>
                <strong>${tasks.length}</strong>
              </div>
              <div class="focusStat">
                <span>Deep work</span>
                <strong>${deepCount}</strong>
              </div>
              <div class="focusStat">
                <span>Khối lượng</span>
                <strong>${durText(plannedMins)}</strong>
              </div>
            </div>
            <div class="focusTip card">
              <div class="eyebrow">Gợi ý nhịp làm</div>
              <p>${focusTaskId ? 'Giữ màn hình này ít nhiễu: chỉ pause, cộng thời gian hoặc kết thúc phiên khi cần review.' : 'Chọn 1 việc có tác động cao, chạy 25 phút trước, rồi mới quyết định có kéo dài phiên hay không.'}</p>
            </div>
          </aside>
        </div>
        <div class="focusTaskPanel">
          <div class="sectionHead">
            <div>
              <div class="eyebrow">Focus queue</div>
              <h2>Chọn task để tập trung</h2>
            </div>
            <div class="row">
              <button class="btn secondary" onclick="goTab('timeline')">Mở timeline</button>
              <button class="btn" onclick="openTask()">Tạo công việc</button>
            </div>
          </div>
          ${renderTaskListHTML(tasks, true)}
        </div>`;
      updateFocusRing();
    }
    function formatFocusTime(sec) {
      if (sec <= 0) return '0:00';
      const m = Math.floor(sec / 60), s = sec % 60;
      return `${m}:${String(s).padStart(2,'0')}`;
    }
    function updateFocusRing() {
      const ring = $('#focusRingEl');
      const el = $('#focusRemain');
      if (!ring) return;
      const focusPct = focusInitialSeconds > 0 ? Math.max(0, (focusInitialSeconds - Math.max(0, focusRemain)) / focusInitialSeconds * 100) : 0;
      ring.style.setProperty('--focus-pct', focusPct.toFixed(1) + '%');
      if (el) el.textContent = formatFocusTime(Math.max(0, focusRemain));
    }
    function runFocusTimer() {
      clearInterval(focusTimer);
      // Tính theo wall-clock thay vì đếm tick: setInterval bị browser throttle
      // khi tab ẩn (có thể chỉ chạy 1 lần/phút) làm phiên 25m kéo dài cả giờ.
      focusEndAt = Date.now() + focusRemain * 1000;
      focusTimer = setInterval(() => {
        focusRemain = Math.round((focusEndAt - Date.now()) / 1000);
        updateFocusRing();
        if (focusRemain <= 0) {
          notify('Focus xong', 'Hết phiên tập trung. Review task nhé.');
          completeFocus();
        }
      }, 1000);
    }
    function startFocus(id, min = 25) { focusTaskId = id; focusInitialSeconds = min * 60; focusRemain = focusInitialSeconds; focusStartedAt = new Date(); runFocusTimer(); goTab('focus') }
    function setFocusPreset(m) { if (!focusTaskId) { toast('Chọn task trước'); return } startFocus(focusTaskId, m) }
    function pauseFocus() { if (focusEndAt) focusRemain = Math.max(0, Math.round((focusEndAt - Date.now()) / 1000)); focusEndAt = null; clearInterval(focusTimer); focusTimer = null; renderFocus(); toast('Đã pause focus') }
    function resumeFocus() { if (!focusTaskId || focusTimer || focusRemain <= 0) return; runFocusTimer(); renderFocus(); toast('Đã tiếp tục focus') }
    function toggleFocusTimer() { if (focusTimer) pauseFocus(); else resumeFocus(); }
    function addFocus(m) { if (!focusTaskId) { toast('Chọn task trước'); return } focusRemain += m * 60; focusInitialSeconds += m * 60; if (focusEndAt) focusEndAt += m * 60 * 1000; updateFocusRing() }
    function completeFocus() {
      if (!focusTaskId) return;
      const taskId = focusTaskId;
      const t = db.tasks.find(x => x.id === taskId);
      const endedAt = new Date();
      const elapsed = Math.max(1, Math.round(((focusInitialSeconds || focusRemain) - focusRemain) / 60));
      const log = {
        id: uid(),
        text: `${focusStartedAt ? hm(focusStartedAt) : ''}-${hm(endedAt)} · ${elapsed}m tập trung`,
        createdAt: endedAt.toISOString()
      };
      pushUndo('Kết thúc focus');
      // date = ngày thực tế của phiên focus (không phải ngày đang xem trên lịch)
      db.sessions.push({ id: uid(), taskId, date: fmtDate(endedAt), minutes: elapsed, createdAt: endedAt.toISOString() });
      if (t) {
        ensureFlow(t).logs.push(log);
        t.updatedAt = endedAt.toISOString();
      }
      pendingFocusReview = { taskId, logId: log.id, elapsed };
      clearInterval(focusTimer);
      focusTimer = null;
      focusEndAt = null;
      focusRemain = 0;
      focusInitialSeconds = 0;
      focusStartedAt = null;
      focusTaskId = null;
      save();
      render();
      openFocusReview();
    }
    function updateFocusText() { updateFocusRing(); }
    function openFocusReview() {
      if (!pendingFocusReview) return;
      const t = db.tasks.find(x => x.id === pendingFocusReview.taskId);
      if (!t) return;
      const log = ensureFlow(t).logs.find(x => x.id === pendingFocusReview.logId);
      $('#focusReviewMeta').textContent = `${t.title} · ${pendingFocusReview.elapsed}m`;
      $('#focusReviewLog').value = log?.text || '';
      $('#focusReviewNext').value = '';
      openModal('focusReviewModal');
    }
    function saveFocusReviewLog() { if (!pendingFocusReview) return null; const t = db.tasks.find(x => x.id === pendingFocusReview.taskId); if (!t) return null; const log = ensureFlow(t).logs.find(x => x.id === pendingFocusReview.logId); if (log) { log.text = $('#focusReviewLog').value.trim() || log.text; touchTask(t); } save(); return t; }
    function closeFocusReview() { saveFocusReviewLog(); pendingFocusReview = null; closeModal('focusReviewModal'); render(); toastUndo('Đã lưu focus log') }
    function focusReviewSave() { closeFocusReview() }
    function focusReviewDone() { const t = saveFocusReviewLog(); const id = pendingFocusReview?.taskId; closeModal('focusReviewModal'); pendingFocusReview = null; if (id && t) markDone(id); }
    function focusReviewNextAction() { const t = saveFocusReviewLog(); const text = $('#focusReviewNext').value.trim(); if (t && text) { ensureFlow(t).nextActions.push({ id: uid(), text, createdAt: new Date().toISOString() }); touchTask(t); } pendingFocusReview = null; closeModal('focusReviewModal'); save(); render(); toastUndo(text ? 'Đã tạo bước tiếp theo' : 'Đã lưu focus log') }
    function focusReviewStack() { const id = pendingFocusReview?.taskId; saveFocusReviewLog(); pendingFocusReview = null; closeModal('focusReviewModal'); if (id) moveToStack(id, 'Sau phiên tập trung vẫn chưa xong'); }
    function renderDebt() { const list = stackTasks(); $('#debt').innerHTML = `<div class="row" style="margin-bottom:14px"><button class="btn" onclick="openTriage()">Xử lý việc tồn</button><span class="pill">Việc tồn: ${list.length}</span><span class="pill">Tổng: ${durText(list.reduce((a, t) => a + Number(t.duration || 0), 0))}</span></div><div class="cards"><div class="card"><h3>Tồn nhẹ 1-2 ngày</h3><div class="big">${list.filter(t => debtAge(t) <= 2).length}</div></div><div class="card"><h3>Tồn vừa 3-5 ngày</h3><div class="big">${list.filter(t => debtAge(t) > 2 && debtAge(t) <= 5).length}</div></div><div class="card"><h3>Tồn nặng >5 ngày</h3><div class="big">${list.filter(t => debtAge(t) > 5).length}</div></div><div class="card"><h3>Bị dời nhiều</h3><div class="big">${Math.max(0, ...list.map(t => t.deferCount || 0))}</div></div></div><div style="margin-top:16px">${list.length ? list.map(t => `<div class="task"><div class="taskTop"><div><div class="taskTitle">${esc(t.title)}</div><div class="muted small">${t.stackType || 'unfinished'} · tồn ${debtAge(t)} ngày · dời ${t.deferCount || 0} lần · ${t.duration}m</div><div class="small warnText">Lý do: ${esc(t.reason || 'Chưa có')}</div></div><span class="badge ${t.priority}">${t.priority}</span></div><div class="row"><button class="btn sm" onclick="doToday('${t.id}')">Làm hôm nay</button><button class="btn sm secondary" onclick="scheduleDebt('${t.id}')">Xếp lịch</button><button class="btn sm secondary" onclick="splitTask('${t.id}')">Chia nhỏ</button><button class="btn sm ok" onclick="markDone('${t.id}')">Done</button><button class="btn sm bad" onclick="deleteById('${t.id}')">Xoá</button></div></div>`).join('') : '<div class="card muted">Không có việc tồn.</div>'}</div>` }
    // debtAge: UTC-safe — so sánh date string YYYY-MM-DD thay vì local Date object
    function debtAge(t) {
      const todayStr = fmtDate(new Date());
      // stackedAt/createdAt là ISO UTC — convert sang ngày LOCAL trước khi lấy YYYY-MM-DD,
      // slice trực tiếp sẽ lệch 1 ngày với task stack lúc 00:00-07:00 (VN = UTC+7)
      const refIso = t.stackedAt || t.createdAt || new Date().toISOString();
      const refStr = refIso.length > 10 ? fmtDate(new Date(refIso)) : String(refIso).slice(0, 10);
      // Parse as local noon để tránh timezone offset làm lệch 1 ngày
      const today = new Date(todayStr + 'T12:00:00');
      const ref   = new Date(refStr   + 'T12:00:00');
      return Math.max(0, Math.floor((today - ref) / 86400000));
    }
    function openTriage() { const list = stackTasks().sort((a, b) => debtAge(b) - debtAge(a)); if (!list.length) { toast('Không có việc tồn'); return } renderTriage(list[0].id); openModal('triageModal') }
    function renderTriage(id) { const t = db.tasks.find(x => x.id === id); if (!t) { closeModal('triageModal'); render(); return } $('#triageContent').innerHTML = `<div class="row" style="justify-content:space-between"><div class="h1">Xử lý việc tồn</div><button class="btn secondary" onclick="closeModal('triageModal')">Đóng</button></div><div class="triageHero"><h2>${esc(t.title)}</h2><p>Đã tồn: <b>${debtAge(t)} ngày</b> · Dời: <b>${t.deferCount || 0} lần</b> · Thời lượng: <b>${t.duration}m</b></p><p class="warnText">Lý do: ${esc(t.reason || 'Chưa có')}</p></div><div class="row" style="margin-top:14px"><button class="btn" onclick="triageAction('${t.id}','today')">Làm hôm nay</button><button class="btn secondary" onclick="triageAction('${t.id}','schedule')">Xếp lịch</button><button class="btn secondary" onclick="triageAction('${t.id}','split')">Chia nhỏ</button><button class="btn ok" onclick="triageAction('${t.id}','done')">Done</button><button class="btn bad" onclick="triageAction('${t.id}','delete')">Xoá</button></div>` }
    function triageAction(id, act) { if (act === 'today') doToday(id, false); if (act === 'schedule') scheduleDebt(id, false); if (act === 'split') splitTask(id, false); if (act === 'done') markDone(id); if (act === 'delete') deleteById(id, false); const next = stackTasks().sort((a, b) => debtAge(b) - debtAge(a))[0]; next ? renderTriage(next.id) : closeModal('triageModal'); render() }
    function doToday(id, rerender = true) { const t = db.tasks.find(x => x.id === id); if (t) { pushUndo('Làm hôm nay'); touchTask(t, { date: fmtDate(new Date()), status: 'todo', stackType: '', reason: '', deferCount: (t.deferCount || 0) + 1 }); selectedDate = t.date; save(); if (rerender) render(); toastUndo('Đã dời sang hôm nay') } }
    // Dùng modal chọn ngày thay cho prompt().
    function scheduleDebt(id, rerender = true) {
      const modal = $('#scheduleModal');
      const input = $('#scheduleDate');
      input.value = selectedDate;
      openModal('scheduleModal');
      $('#scheduleConfirmBtn').onclick = () => {
        const d = input.value;
        if (!d) return;
        const t = db.tasks.find(x => x.id === id);
        if (t) {
          pushUndo('Xếp lịch việc tồn');
          touchTask(t, { date: d, status: 'todo', stackType: '', reason: '', deferCount: (t.deferCount || 0) + 1 });
          selectedDate = d;
          save();
        }
        closeModal('scheduleModal');
        if (rerender) render();
        toastUndo('Đã xếp lịch')
      };
      $('#scheduleCancelBtn').onclick = () => closeModal('scheduleModal');
    }
    function splitTask(id, rerender = true) {
      const t = db.tasks.find(x => x.id === id);
      if (!t) return;
      pushUndo('Chia nhỏ task');
      const half = Math.max(15, Math.round((t.duration || 60) / 2));
      const part2dur = Math.max(15, (t.duration || 60) - half);
      const nowIso = new Date().toISOString();
      db.tasks.push({ ...t, id: uid(), title: t.title + ' – phần 1', duration: half,    status: 'todo', done: false, doneAt: '', mission: false, date: selectedDate, start: '', end: '', stackType: '', stackedAt: '', reason: '', flow: defaultFlow(), createdAt: nowIso, updatedAt: nowIso });
      db.tasks.push({ ...t, id: uid(), title: t.title + ' – phần 2', duration: part2dur, status: 'todo', done: false, doneAt: '', mission: false, date: selectedDate, start: '', end: '', stackType: '', stackedAt: '', reason: '', flow: defaultFlow(), createdAt: nowIso, updatedAt: nowIso });
      // Soft-delete thay vì hard-delete: merge giữa các thiết bị là union theo id,
      // hard-delete sẽ bị snapshot remote "hồi sinh" task gốc.
      softDeleteTask(id);
      save();
      if (rerender) render();
      toastUndo('Đã chia nhỏ thành 2 phần');
    }
    function deleteById(id, rerender = true) { pushUndo('Xoá task'); softDeleteTask(id); save(); if (rerender) render(); toastUndo('Đã xoá task') }
    // Sự kiện rơi vào 1 ngày cụ thể (xét recurring theo tháng/ngày). Trả về list event
    // ĐÃ lọc theo lịch đang bật visible.
    function eventsOnDay(fd) {
      const x = parseDate(fd);
      return db.events.filter(e => {
        if (isDeletedItem(e)) return false;
        if (!isCalendarVisible(e.calendarId)) return false;
        const ed = parseDate(e.date);
        if (e.recurring) return ed.getMonth() === x.getMonth() && ed.getDate() === x.getDate();
        return e.date === fd;
      });
    }
    // ── View tuần/ngày: hằng số & helpers ────────────────────────────────────
    const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const WEEK_START_HOUR = 6; // bắt đầu lưới giờ ở 06:00 cho gọn (item sớm hơn vẫn hiện ở đầu)
    const WEEK_HOUR_H = 48;    // chiều cao mỗi giờ (px) trong view tuần/ngày
    // Thứ Hai đầu tuần chứa ngày fd.
    function weekStart(fd) { const x = parseDate(fd); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
    function addDays(date, n) { const x = new Date(date); x.setDate(x.getDate() + n); return x; }
    function shiftSelectedDate(deltaDays) { selectedDate = fmtDate(addDays(parseDate(selectedDate), deltaDays)); miniCalMonth = ''; render(); }
    function setCalView(view) { if (!['month', 'week', 'day'].includes(view)) return; calView = view; try { localStorage.setItem(CAL_VIEW_KEY, view); } catch { /* ignore */ } render(); }
    // Task có giờ (start+end) trong ngày, đã lọc theo lịch đang bật.
    function timedTasksOnDay(fd) {
      return dayTasks(fd).filter(t => t.start && t.end && isCalendarVisible(t.calendarId));
    }
    function allDayItemsOnDay(fd) {
      const tasks = dayTasks(fd).filter(t => (!t.start || !t.end) && isCalendarVisible(t.calendarId));
      const events = eventsOnDay(fd);
      return { tasks, events };
    }
    function calNavLabel() {
      const d = parseDate(selectedDate);
      if (calView === 'day') { return `${DOW_LABELS[(d.getDay() + 6) % 7]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; }
      if (calView === 'week') {
        const ws = weekStart(selectedDate), we = addDays(ws, 6);
        return `${ws.getDate()}/${ws.getMonth() + 1} – ${we.getDate()}/${we.getMonth() + 1}/${we.getFullYear()}`;
      }
      return `${d.getMonth() + 1}/${d.getFullYear()}`;
    }

    function renderCalendar() {
      const events = eventsUpcoming();
      const viewBtn = (id, label) => `<button class="btn sm ${calView === id ? '' : 'secondary'}" aria-pressed="${calView === id}" onclick="setCalView('${id}')">${label}</button>`;
      const navStep = calView === 'month' ? 'month' : (calView === 'week' ? 'week' : 'day');
      const body = calView === 'week' ? calWeekHTML() : calView === 'day' ? calDayHTML() : calMonthHTML();
      const hint = calView === 'month'
        ? 'Click ngày để chọn · Double click để thêm task'
        : 'Click ô giờ trống để thêm task · Click sự kiện/task để mở';
      $('#calendar').innerHTML = `
        <div class="row" style="margin-bottom:16px;gap:10px;align-items:center;flex-wrap:wrap">
          <div class="createMenu">
            <button class="btn" onclick="toggleCreateMenu(event)">${uiIcon('plus')}Tạo</button>
            <div class="createDropdown" id="createDropdown" hidden>
              <button class="createItem" onclick="createFromMenu('event')">📅 Sự kiện</button>
              <button class="createItem" onclick="createFromMenu('task')">✅ Việc cần làm</button>
            </div>
          </div>
          <div class="calViewSwitch">${viewBtn('month', 'Tháng')}${viewBtn('week', 'Tuần')}${viewBtn('day', 'Ngày')}</div>
          <div class="calNav">
            <button class="iconBtn calNavBtn" title="Trước" onclick="calNavigate('${navStep}',-1)">‹</button>
            <button class="btn sm secondary" onclick="calGoToday()">Hôm nay</button>
            <button class="iconBtn calNavBtn" title="Sau" onclick="calNavigate('${navStep}',1)">›</button>
            <span class="calNavLabel">${esc(calNavLabel())}</span>
          </div>
          <span class="pill">${hint}</span>
          <button class="btn secondary" onclick="goTab('timeline')">Mở timeline ngày chọn</button>
        </div>
        <div class="calMain">
          <div class="calLeft">
            ${body}
            <div class="card" style="margin-top:16px"><h3>Sự kiện + thời gian còn lại</h3><table class="table"><tr><th>Sự kiện</th><th>Ngày</th><th>Còn</th><th>Plan</th></tr>${events.map(e => `<tr><td>${esc(calendarIcon(e.calendarId))} ${esc(e.title)}</td><td>${e.date}</td><td>${e.days} ngày</td><td><button class="btn sm secondary" onclick="addPlanTask('${e.id}')">+ task chuẩn bị</button></td></tr>`).join('')}</table></div>
          </div>
          <aside class="calSide">${miniCalendarHTML()}${myCalendarsPanelHTML()}</aside>
        </div>`;
    }
    // Điều hướng theo bước của view hiện tại.
    function calNavigate(step, dir) {
      if (step === 'month') { const d = parseDate(selectedDate); selectedDate = fmtDate(new Date(d.getFullYear(), d.getMonth() + dir, Math.min(d.getDate(), 28))); miniCalMonth = ''; render(); }
      else if (step === 'week') shiftSelectedDate(7 * dir);
      else shiftSelectedDate(dir);
    }
    function calGoToday() { selectedDate = fmtDate(new Date()); $('#selectedDate').value = selectedDate; miniCalMonth = ''; render(); }

    // ── VIEW THÁNG (giữ nguyên hành vi cũ) ────────────────────────────────────
    function calMonthHTML() {
      const d = parseDate(selectedDate);
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const start = new Date(first);
      start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
      let days = '';
      for (let i = 0; i < 42; i++) {
        const x = new Date(start); x.setDate(start.getDate() + i);
        const fd = fmtDate(x);
        const tasks = dayTasks(fd).filter(t => isCalendarVisible(t.calendarId));
        const dayEvents = eventsOnDay(fd);
        const eventDots = dayEvents.slice(0, 4).map(e => `<span class="dot" title="${esc(e.title)}" style="background:${calendarColor(e.calendarId)}"></span>`).join('');
        const taskDots = tasks.slice(0, 6).map(t => `<span class="dot" title="${esc(t.title)}" style="background:${t.calendarId ? calendarColor(t.calendarId) : (t.status === 'done' ? 'var(--ok)' : t.status === 'stack' ? 'var(--warn)' : 'var(--brand2)')}"></span>`).join('');
        days += `<div class="day ${x.getMonth() !== d.getMonth() ? 'off' : ''} ${fd === selectedDate ? 'sel' : ''}" onclick="selectCalendarDay('${fd}')" ondblclick="openTask(null,{date:'${fd}'})"><div class="num">${x.getDate()}</div><div class="dots">${eventDots}${taskDots}</div><div class="small muted">${tasks.length ? `${tasks.filter(t => t.status === 'done').length}/${tasks.length} done` : ''}</div></div>`;
      }
      return `<div class="calendar">${DOW_LABELS.map(x => `<div class="dow">${x}</div>`).join('')}${days}</div>`;
    }

    // ── Khối thời gian (dùng chung cho view tuần & ngày) ──────────────────────
    function timeBlockHTML(t) {
      const s = minOf(t.start), e = minOf(t.end);
      const top = Math.max(0, ((s - WEEK_START_HOUR * 60) / 60) * WEEK_HOUR_H);
      const height = Math.max(20, ((e - s) / 60) * WEEK_HOUR_H - 2);
      const color = t.calendarId ? calendarColor(t.calendarId) : (t.status === 'done' ? 'var(--ok)' : t.status === 'stack' ? 'var(--warn)' : 'var(--brand2)');
      return `<div class="wkBlock ${t.status === 'done' ? 'done' : ''}" style="top:${top}px;height:${height}px;--cal:${color}" title="${esc(t.title)} · ${esc(t.start)}-${esc(t.end)}" onclick="event.stopPropagation();openTaskDetail('${t.id}')">
        <div class="wkBlockName">${esc(t.title)}</div>
        <div class="wkBlockTime">${esc(t.start)}-${esc(t.end)}</div>
      </div>`;
    }
    function allDayChipsHTML(fd) {
      const { tasks, events } = allDayItemsOnDay(fd);
      const evChips = events.map(ev => `<span class="wkChip" style="--cal:${calendarColor(ev.calendarId)}" title="${esc(ev.title)}">${esc(calendarIcon(ev.calendarId))} ${esc(ev.title)}</span>`).join('');
      const tkChips = tasks.map(t => `<span class="wkChip ${t.status === 'done' ? 'done' : ''}" style="--cal:${t.calendarId ? calendarColor(t.calendarId) : 'var(--brand2)'}" title="${esc(t.title)}" onclick="event.stopPropagation();openTaskDetail('${t.id}')">${esc(t.title)}</span>`).join('');
      return evChips + tkChips;
    }
    // Cột giờ chung (nhãn 06:00..23:00).
    function hourGutterHTML() {
      let h = '';
      for (let hr = WEEK_START_HOUR; hr < 24; hr++) h += `<div class="wkHourLabel" style="height:${WEEK_HOUR_H}px">${String(hr).padStart(2, '0')}:00</div>`;
      return `<div class="wkGutter"><div class="wkAllDaySpacer">cả ngày</div><div class="wkGutterHours">${h}</div></div>`;
    }
    // Một cột ngày: dải all-day + lưới giờ với các block.
    function dayColumnHTML(fd, withHeader) {
      const today = fmtDate(new Date());
      let grid = '';
      for (let hr = WEEK_START_HOUR; hr < 24; hr++) grid += `<div class="wkCell" style="height:${WEEK_HOUR_H}px" onclick="quickCreateAt('${fd}',${hr})"></div>`;
      const blocks = timedTasksOnDay(fd).map(timeBlockHTML).join('');
      const header = withHeader
        ? `<div class="wkColHead ${fd === today ? 'today' : ''} ${fd === selectedDate ? 'sel' : ''}" onclick="selectCalendarDay('${fd}')"><span class="wkDow">${DOW_LABELS[(parseDate(fd).getDay() + 6) % 7]}</span><span class="wkDate">${parseDate(fd).getDate()}</span></div>`
        : '';
      return `<div class="wkCol ${fd === selectedDate ? 'selCol' : ''}">
        ${header}
        <div class="wkAllDay">${allDayChipsHTML(fd)}</div>
        <div class="wkGrid" style="height:${(24 - WEEK_START_HOUR) * WEEK_HOUR_H}px">${grid}${blocks}</div>
      </div>`;
    }

    // ── VIEW TUẦN ─────────────────────────────────────────────────────────────
    function calWeekHTML() {
      const ws = weekStart(selectedDate);
      let cols = '';
      for (let i = 0; i < 7; i++) cols += dayColumnHTML(fmtDate(addDays(ws, i)), true);
      return `<div class="wkScroll"><div class="wkView">${hourGutterHTML()}<div class="wkCols">${cols}</div></div></div>`;
    }

    // ── VIEW NGÀY ─────────────────────────────────────────────────────────────
    function calDayHTML() {
      return `<div class="wkScroll"><div class="wkView dayMode">${hourGutterHTML()}<div class="wkCols">${dayColumnHTML(selectedDate, false)}</div></div></div>`;
    }
    // Tạo nhanh task tại ô giờ trống.
    function quickCreateAt(fd, hour) { openTask(null, { date: fd, start: timeOfMin(hour * 60), duration: 60 }); }
    function myCalendarsPanelHTML() {
      const rows = calendars().map(c => `
        <li class="calRow">
          <label class="calTick">
            <input type="checkbox" ${c.visible !== false ? 'checked' : ''} onchange="toggleCalendarVisible('${esc(c.id)}')">
            <span class="calBox" style="--cal:${c.color}"></span>
          </label>
          <span class="calIcon">${esc(c.icon)}</span>
          <span class="calName" title="${esc(c.name)}">${esc(c.name)}</span>
          <span class="calActions">
            <button class="iconBtn" title="Sửa" onclick="editCalendar('${esc(c.id)}')">✎</button>
            ${c.system ? '' : `<button class="iconBtn" title="Xóa" onclick="deleteCalendar('${esc(c.id)}')">✕</button>`}
          </span>
        </li>`).join('');
      return `<div class="card calPanel"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><h3 style="margin:0">Lịch của tôi</h3><button class="btn sm" onclick="addCalendar()">${uiIcon('plus')}</button></div><ul class="calList">${rows}</ul></div>`;
    }
    function selectCalendarDay(d) { selectedDate = d; $('#selectedDate').value = d; miniCalMonth = ''; render() }
    // ── MINI-CALENDAR (panel phải) ────────────────────────────────────────────
    function miniCalMonthDate() {
      if (/^\d{4}-\d{2}$/.test(miniCalMonth)) { const [y, m] = miniCalMonth.split('-').map(Number); return new Date(y, m - 1, 1); }
      const d = parseDate(selectedDate); return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    function miniCalNavigate(dir) {
      const base = miniCalMonthDate();
      const next = new Date(base.getFullYear(), base.getMonth() + dir, 1);
      miniCalMonth = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
      render();
    }
    function miniDayHasItems(fd) {
      if (eventsOnDay(fd).length) return true;
      return dayTasks(fd).some(t => isCalendarVisible(t.calendarId));
    }
    function miniCalendarHTML() {
      const first = miniCalMonthDate();
      const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
      const today = fmtDate(new Date());
      let cells = '';
      for (let i = 0; i < 42; i++) {
        const x = addDays(start, i);
        const fd = fmtDate(x);
        const cls = [
          'miniCell',
          x.getMonth() !== first.getMonth() ? 'off' : '',
          fd === today ? 'today' : '',
          fd === selectedDate ? 'sel' : '',
          miniDayHasItems(fd) ? 'has' : ''
        ].filter(Boolean).join(' ');
        cells += `<button class="${cls}" onclick="selectCalendarDay('${fd}')">${x.getDate()}</button>`;
      }
      const title = `${first.getMonth() + 1}/${first.getFullYear()}`;
      return `<div class="card miniCal">
        <div class="miniHead">
          <button class="iconBtn" title="Tháng trước" onclick="miniCalNavigate(-1)">‹</button>
          <span class="miniTitle">${esc(title)}</span>
          <button class="iconBtn" title="Tháng sau" onclick="miniCalNavigate(1)">›</button>
        </div>
        <div class="miniGrid">${DOW_LABELS.map(x => `<span class="miniDow">${x[1]}</span>`).join('')}${cells}</div>
      </div>`;
    }
    // Menu "+ Tạo"
    function toggleCreateMenu(ev) {
      if (ev) ev.stopPropagation();
      const dd = $('#createDropdown');
      if (!dd) return;
      const willShow = dd.hidden;
      dd.hidden = !willShow;
      if (willShow) setTimeout(() => document.addEventListener('click', closeCreateMenuOnce), 0);
    }
    function closeCreateMenuOnce() {
      const dd = $('#createDropdown');
      if (dd) dd.hidden = true;
      document.removeEventListener('click', closeCreateMenuOnce);
    }
    function createFromMenu(kind) {
      closeCreateMenuOnce();
      if (kind === 'task') openTask(null, { date: selectedDate });
      else openEvent();
    }
    function openEvent() { $('#eTitle').value = ''; $('#eDate').value = selectedDate; $('#eType').value = 'solar'; $('#eRecurring').value = 'yes'; $('#eNotes').value = ''; const sel = $('#eCalendar'); if (sel) sel.innerHTML = calendarOptionsHTML(DEFAULT_CALENDAR_ID); openModal('eventModal') }
    function saveEvent() { const date = $('#eDate').value; if (!date) { toast('Vui lòng chọn ngày cho sự kiện.'); return; } const nowIso = new Date().toISOString(); const calSel = $('#eCalendar'); const calendarId = calSel?.value || DEFAULT_CALENDAR_ID; db.events.push({ id: uid(), title: $('#eTitle').value || 'Sự kiện', type: $('#eType').value, date, recurring: $('#eRecurring').value === 'yes', calendarId, notes: $('#eNotes').value, createdAt: nowIso, updatedAt: nowIso }); save(); closeModal('eventModal'); render() }
    function eventsUpcoming() {
      const now = startOfDay(new Date());
      return db.events
        .map(eventItem => {
          let eventDate = parseDate(eventItem.date);
          if (eventItem.recurring) {
            eventDate = new Date(now.getFullYear(), eventDate.getMonth(), eventDate.getDate());
            if (eventDate < now) {
              eventDate = new Date(now.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
            }
          }
          return {
            ...eventItem,
            date: fmtDate(eventDate),
            days: Math.ceil((eventDate - now) / 86400000)
          };
        })
        .filter(eventItem => Number.isFinite(eventItem.days) && eventItem.days >= 0)
        .sort((a, b) => a.days - b.days)
        .slice(0, 12);
    }
    function nextEvent() { return eventsUpcoming()[0] || null }
    function addPlanTask(eventId) {
      const eventItem = db.events.find(x => x.id === eventId);
      openTask(null, {
        date: selectedDate,
        title: 'Chuẩn bị: ' + (eventItem?.title || ''),
        duration: 60,
        priority: 'high',
        eventId
      });
    }
    function calcStreak() {
      let streak = 0;
      const cursor = startOfDay(new Date());
      while (true) {
        const dateKey = fmtDate(cursor);
        const hasDoneTask = db.tasks.some(task => task?.date === dateKey && task?.status === 'done');
        if (!hasDoneTask) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    }
    function analyticsDaySnapshot(fd) {
      const s = stats(fd);
      const focus = db.sessions.filter(x => x.date === fd).reduce((sum, x) => sum + Number(x.minutes || 0), 0);
      return {
        date: fd,
        label: fd.slice(5).replace('-', '/'),
        done: Math.round(s.donePct || 0),
        focus,
        totalTasks: s.tasks.length,
        doneCount: s.done.length,
        need: incomplete(fd).reduce((sum, t) => sum + Number(t.duration || 0), 0),
        missionCount: s.active.filter(t => t.mission).length
      };
    }
    function setAnalyticsPreview(fd) { analyticsPreviewDate = fd; if (currentTab === 'analytics') renderAnalytics(); }
    function openAnalyticsDate(tab = 'timeline') { if (!analyticsPreviewDate) return; selectedDate = analyticsPreviewDate; currentTab = tab; render(); }
    function renderAnalytics() {
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push(analyticsDaySnapshot(fmtDate(d)));
      }
      const reasons = {};
      stackTasks().forEach(t => { reasons[t.reason || 'Không rõ'] = (reasons[t.reason || 'Không rõ'] || 0) + 1 });
      const reasonRows = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const totalFocus = db.sessions.reduce((a, x) => a + Number(x.minutes || 0), 0);
      const streak = calcStreak();
      const avg7 = Math.round(days.slice(-7).reduce((a, d) => a + d.done, 0) / 7);
      const topDay = [...days].sort((a, b) => (b.done + b.focus / 10) - (a.done + a.focus / 10))[0] || days[days.length - 1];
      const focusBest = [...days].sort((a, b) => b.focus - a.focus)[0] || days[days.length - 1];
      if (!days.some(d => d.date === analyticsPreviewDate)) analyticsPreviewDate = days[days.length - 1].date;
      const preview = days.find(d => d.date === analyticsPreviewDate) || days[days.length - 1];
      const heatData = {}; db.sessions.forEach(s => { heatData[s.date] = (heatData[s.date] || 0) + Number(s.minutes || 0); });
      const maxHeat = Math.max(...Object.values(heatData), 1);
      const heatCells = [];
      for (let i = 51; i >= 0; i--) {
        const col = [];
        for (let j = 6; j >= 0; j--) {
          const d2 = new Date(); d2.setDate(d2.getDate() - (i * 7 + j));
          const fd2 = fmtDate(d2);
          const v = heatData[fd2] || 0;
          const level = v === 0 ? 0 : v < maxHeat * 0.25 ? 1 : v < maxHeat * 0.5 ? 2 : v < maxHeat * 0.75 ? 3 : 4;
          col.push(`<button class="heatmap-cell" data-level="${level}" aria-label="${fd2}: ${v} phút" title="${fd2}: ${v}m focus" onclick="setAnalyticsPreview('${fd2}')"></button>`);
        }
        heatCells.push(`<div class="heatmap-col">${col.join('')}</div>`);
      }
      $('#analytics').innerHTML = `<div class="analyticsShell"><div class="cards"><div class="card"><h3>Tổng session</h3><div class="big">${db.sessions.length}</div><div class="small muted">${durText(totalFocus)} tập trung</div></div><div class="card"><h3>Streak hiện tại</h3><div class="big">${streak} ngày</div><div class="small muted">Liên tiếp có task done</div></div><div class="card"><h3>Việc tồn</h3><div class="big">${stackTasks().length}</div><div class="small muted">Cần xử lý</div></div><div class="card"><h3>Trung bình 7 ngày</h3><div class="big">${avg7}%</div><div class="small muted">Hoàn thành task</div></div></div><div class="analyticsHero"><div class="card analyticsChartCard"><div class="analyticsPreviewHead"><div><h3>Nhịp 14 ngày gần đây</h3><div class="small muted">Bảng này ưu tiên dễ đọc trên cả laptop và điện thoại: nhìn nhanh ngày nào ổn, ngày nào tụt nhịp.</div></div><span class="metricBadge ${avg7 >= 70 ? 'ok' : avg7 >= 40 ? '' : 'warn'}">${avg7 >= 70 ? 'Ổn định tốt' : avg7 >= 40 ? 'Đang giữ nhịp' : 'Cần siết lại nhịp'}</span></div><div class="cards" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px"><div class="analyticsMiniStat"><span class="small muted">Ngày tốt nhất</span><strong>${topDay.label}</strong><div class="small muted">${topDay.done}% hoàn thành</div></div><div class="analyticsMiniStat"><span class="small muted">Focus mạnh nhất</span><strong>${focusBest.label}</strong><div class="small muted">${focusBest.focus}m tập trung</div></div><div class="analyticsMiniStat"><span class="small muted">Ngày đang chọn</span><strong>${preview.label}</strong><div class="small muted">${preview.done}% hoàn thành</div></div></div><div class="trendBoard">${days.map(day => `<button class="trendRow ${day.date === preview.date ? 'active' : ''}" onclick="setAnalyticsPreview('${day.date}')"><div class="trendHead"><span class="trendDate">${day.label}</span><span class="trendPct">${day.done}%</span></div><div class="trendMeta"><span>${day.doneCount}/${day.totalTasks || 0} task xong</span><span>${day.focus}m focus</span></div><div class="trendBar"><i style="width:${day.done}%"></i></div></button>`).join('')}</div></div><div class="card analyticsPreviewCard"><div class="analyticsPreviewHead"><div><h3>Ngày đang xem</h3><div class="big">${preview.label}</div><div class="small muted">${preview.date}</div></div><span class="metricBadge ${preview.done >= 70 ? 'ok' : preview.done >= 40 ? '' : 'warn'}">${preview.done}% hoàn thành</span></div><div class="analyticsPreviewStats"><div class="analyticsMiniStat"><span class="small muted">Task xong</span><strong>${preview.doneCount}/${preview.totalTasks || 0}</strong></div><div class="analyticsMiniStat"><span class="small muted">Focus</span><strong>${preview.focus}m</strong></div><div class="analyticsMiniStat"><span class="small muted">Cần làm</span><strong>${durText(preview.need || 0)}</strong></div><div class="analyticsMiniStat"><span class="small muted">Việc chính</span><strong>${preview.missionCount}</strong></div></div><div class="analyticsActions"><button class="btn" onclick="openAnalyticsDate('timeline')">Mở timeline ngày này</button><button class="btn secondary" onclick="openAnalyticsDate('tasks')">Mở danh sách task</button></div><div class="small muted">Ngày tốt nhất gần đây là <b>${topDay.label}</b>. Nếu muốn bắt nhịp lại, hãy bắt đầu bằng 1 phiên focus ngắn rồi chốt 1 task nhỏ trong ngày.</div></div></div><div class="card"><div class="analyticsPreviewHead"><div><h3>Focus heatmap (52 tuần)</h3><div class="small muted">Click vào ô bất kỳ để chuyển panel sang ngày tương ứng.</div></div></div><div class="heatmap">${heatCells.join('')}</div><div class="row" style="margin-top:8px;gap:6px;align-items:center"><span class="small muted">Ít</span>${[0,1,2,3,4].map(l => `<span class="heatmap-cell" data-level="${l}" style="width:12px;height:12px;min-width:12px"></span>`).join('')}<span class="small muted">Nhiều</span></div></div><div class="analyticsSubgrid"><div class="card"><h3>Lý do tồn nhiều nhất</h3><div class="reasonList">${reasonRows.length ? reasonRows.map(([k, v]) => `<div class="reasonRow"><div class="reasonHead"><span>${esc(k)}</span><b>${v}</b></div><div class="reasonBar"><i style="width:${Math.max(12, Math.round(v / reasonRows[0][1] * 100))}%"></i></div></div>`).join('') : '<div class="muted">Chưa có việc tồn.</div>'}</div></div><div class="card"><h3>Gợi ý cải thiện</h3>${analyticsInsight(days, preview)}</div></div></div>`;
    }
    function analyticsInsight(days, preview) {
      const avg = days.reduce((a, d) => a + d.done, 0) / days.length;
      const debt = stackTasks().length;
      let html = `<p>Hoàn thành trung bình: <b>${Math.round(avg)}%</b></p>`;
      if (preview.focus === 0 && preview.totalTasks > 0) html += '<p class="warnText">Ngày đang xem có task nhưng chưa có phút focus nào. Hãy bật 1 phiên 25-50 phút để lấy đà.</p>';
      if (avg < 50) html += '<p class="warnText">Nên giảm số task/ngày hoặc chia nhỏ task dài hơn 90 phút.</p>';
      if (debt > 3) html += '<p class="dangerText">Việc tồn đang cao. Hãy dọn backlog trước khi thêm việc mới.</p>';
      if (preview.done >= 70) html += '<p class="okText">Ngày này đang là mẫu tốt. Có thể copy nhịp làm việc sang các ngày tiếp theo.</p>';
      return html;
    }
    function workspaceSettingsHTML() {
      const ws = workspace();
      const activeGoals = ws.goals.filter(g => g.status !== 'archived');
      return `<div class="workspaceSettings">
        <div class="workspaceColumn">
          <h3>Project cá nhân</h3>
          <div class="appearanceNote">Dùng project để gom việc theo ngữ cảnh: học tập, sản phẩm, khách hàng, sức khỏe.</div>
          <div class="workspaceForm"><input class="input" id="newProjectName" placeholder="Ví dụ: Launch website"><button class="btn secondary" onclick="addWorkspaceProject()">Thêm project</button></div>
          <div class="chipList">${ws.projects.map(p => `<span class="badge">${esc(p.name)}</span>`).join('')}</div>
        </div>
        <div class="workspaceColumn">
          <h3>Goal lite</h3>
          <div class="appearanceNote">Goal là mục tiêu có task liên kết. Progress tự tính theo task đã done.</div>
          <div class="workspaceGoalForm">
            <input class="input" id="newGoalTitle" placeholder="Ví dụ: Hoàn thành MVP workspace">
            <select id="newGoalProject">${projectOptionsHTML()}</select>
            <input class="input" id="newGoalTarget" type="date">
            <button class="btn secondary" onclick="addWorkspaceGoal()">Thêm goal</button>
          </div>
          <div class="goalList">${activeGoals.length ? activeGoals.map(g => {
            const progress = goalProgress(g);
            return `<div class="goalRow"><div><b>${esc(g.title)}</b><div class="small muted">${esc(projectName(g.projectId))}${g.targetDate ? ` · target ${g.targetDate}` : ''}</div><div class="trendBar"><i style="width:${progress.pct}%"></i></div></div><div class="goalActions"><select onchange="setGoalConfidence('${g.id}', this.value)"><option value="on-track" ${g.confidence === 'on-track' ? 'selected' : ''}>On track</option><option value="at-risk" ${g.confidence === 'at-risk' ? 'selected' : ''}>At risk</option><option value="off-track" ${g.confidence === 'off-track' ? 'selected' : ''}>Off track</option></select><button class="btn sm ghost" onclick="archiveWorkspaceGoal('${g.id}')">Archive</button></div></div>`;
          }).join('') : '<div class="muted">Chưa có goal cá nhân.</div>'}</div>
        </div>
      </div>`;
    }
    function addWorkspaceProject() {
      const input = $('#newProjectName');
      const name = input?.value.trim();
      if (!name) return toast('Nhập tên project trước.');
      const ws = workspace();
      ws.projects.push({ id: uid(), name: name.slice(0, 80), color: '#2563eb', status: 'active' });
      touchSettings(); save(); renderSettings(); toast('Đã thêm project');
    }
    function addWorkspaceGoal() {
      const title = $('#newGoalTitle')?.value.trim();
      if (!title) return toast('Nhập tên goal trước.');
      const ws = workspace();
      ws.goals.push({ id: uid(), title: title.slice(0, 120), projectId: $('#newGoalProject')?.value || ws.projects[0].id, targetDate: safeDate($('#newGoalTarget')?.value, ''), confidence: 'on-track', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      touchSettings(); save(); renderSettings(); toast('Đã thêm goal');
    }
    function setGoalConfidence(id, value) {
      const goal = workspace().goals.find(g => g.id === id);
      if (!goal) return;
      goal.confidence = ['on-track', 'at-risk', 'off-track'].includes(value) ? value : 'on-track';
      goal.updatedAt = new Date().toISOString();
      touchSettings(); save(); render(); toast('Đã cập nhật confidence');
    }
    function archiveWorkspaceGoal(id) {
      const goal = workspace().goals.find(g => g.id === id);
      if (!goal) return;
      goal.status = 'archived';
      goal.updatedAt = new Date().toISOString();
      db.tasks.forEach(t => { if (t.goalId === id) touchTask(t, { goalId: '' }); });
      touchSettings(); save(); renderSettings(); toast('Đã archive goal');
    }
    function setSettingsSection(id) { settingsSection = ['workspace', 'sync', 'appearance', 'data'].includes(id) ? id : 'workspace'; renderSettings(); }
    function settingsTabsHTML() {
      const labels = { workspace: 'Workspace', sync: 'Sync', appearance: 'Appearance', data: 'Data' };
      return `<div class="settingsTabs">${Object.keys(labels).map(id => `<button class="${settingsSection === id ? 'active' : ''}" onclick="setSettingsSection('${id}')">${labels[id]}</button>`).join('')}</div>`;
    }
    function renderSettings() {
      const syncInfo = typeof window.getSyncStatus === 'function' ? window.getSyncStatus() : { status: isSyncLoginReady() ? 'signed-out' : 'loading' };
      const syncLabels = { synced: 'Đã đồng bộ', syncing: 'Đang đồng bộ', offline: 'Offline', error: 'Lỗi đồng bộ', 'signed-out': 'Chưa đăng nhập', loading: 'Đang tải Firebase' };
      const loginHtml = window.currentUserId ?
        `<button class="btn secondary" onclick="window.firebaseLogout ? window.firebaseLogout() : null">Đăng xuất</button><span class="muted small" style="margin-left: 12px">Đã đồng bộ</span>` :
        `<button class="btn ok" onclick="loginOrSyncHelp()">&#128273; Đăng nhập Đồng bộ</button>`;

      const conflictCount = window._conflictCount || 0;
      const conflictHtml = conflictCount ? `<div class="small warnText" style="margin:10px 0">⚠️ ${conflictCount} xung đột dữ liệu giữa các thiết bị đã được ghi lại — app giữ bản mới hơn, bản còn lại lưu an toàn tại đây.<div class="row" style="margin-top:8px"><button class="btn sm secondary" onclick="window.exportConflicts()">Tải bản sao xung đột</button><button class="btn sm secondary" onclick="window.clearConflicts()">Xóa nhật ký</button></div></div>` : '';
      const sections = {
        workspace: `<div class="card"><h3>Workspace cá nhân</h3>${workspaceSettingsHTML()}</div><div class="card"><h3>Lịch làm việc</h3><div class="form"><label>Giờ bắt đầu khả dụng<input class="input" type="time" id="setStart" value="${db.settings.availableStart}"></label><label>Giờ kết thúc khả dụng<input class="input" type="time" id="setEnd" value="${db.settings.availableEnd}"></label><label>Giới hạn việc chính hôm nay<input class="input" type="number" id="setMission" value="${db.settings.dailyMissionLimit}"></label><label>Ngày sinh (để xem cung hoàng đạo mỗi ngày)<input class="input" type="date" id="setBirth" value="${esc(workspace().birthDate || '')}"></label><div class="full"><button class="btn" onclick="saveSettings()">Lưu settings</button></div></div></div>`,
        sync: `<div class="card syncCard"><div class="syncCardHead"><div><h3>Đồng bộ Đám mây</h3><div class="appearanceNote">Mỗi tài khoản Google là một workspace riêng. Đăng nhập cùng tài khoản trên nhiều thiết bị để cùng dùng một workspace cá nhân.</div></div><span class="metricBadge ${syncInfo.status === 'error' ? 'warn' : syncInfo.status === 'synced' ? 'ok' : ''}">${syncLabels[syncInfo.status] || syncInfo.status}</span></div>${syncInfo.error ? `<div class="small warnText" style="margin:10px 0">${esc(syncInfo.error)}</div>` : ''}${conflictHtml}<div class="row" style="margin-top:12px">${loginHtml}${window.currentUserId ? '<button class="btn secondary" onclick="purgeExpiredCloudData()">Dọn dữ liệu hết hạn</button>' : ''}</div></div>${window.currentUserId ? '<div class="card"><h3>Vùng nguy hiểm</h3><p class="small muted">Xóa tài khoản sẽ xóa vĩnh viễn dữ liệu cloud và dữ liệu local của tài khoản trên thiết bị này.</p><button class="btn bad" onclick="requestAccountDeletion()">Xóa tài khoản và dữ liệu</button></div>' : ''}`,
        appearance: `<div class="card"><h3>Appearance</h3><div class="appearanceNote" style="margin-bottom:12px">Bộ giao diện ưu tiên cảm giác editor/dashboard: rõ thông tin, ít nhiễu và dùng tốt trên nhiều thiết bị.</div>${themePickerHTML()}</div><div class="card"><h3>Background</h3><div class="appearanceNote" style="margin-bottom:12px">Bạn có thể dùng nền dựng sẵn hoặc upload ảnh riêng. Ảnh tải lên sẽ được nén trước khi lưu để app vẫn nhẹ.</div>${backgroundPickerHTML()}<div style="margin-top:14px" class="uploadRow"><button class="btn" onclick="uploadBackgroundPrompt()">Tải ảnh nền</button><button class="btn secondary" onclick="clearBackgroundImage()">Xóa ảnh cá nhân</button><span class="fileName">${esc(db.settings.backgroundName || 'Chưa có ảnh nền tùy chỉnh')}</span></div><input id="bgUpload" type="file" accept="image/*" hidden onchange="handleBackgroundUpload(event)"></div>`,
        data: `<div class="card"><h3>Offline app</h3><p>Trạng thái hiện tại: <b>${navigator.onLine ? 'Online' : 'Offline'}</b>. App cache bằng service worker và dữ liệu vẫn lưu trong trình duyệt.</p><p class="small muted">Bộ nhớ dữ liệu: <b>${window.idbActive ? 'IndexedDB (ổn định, dung lượng lớn)' : 'localStorage (chế độ dự phòng)'}</b></p><div class="row" style="margin-top:12px"><button class="btn secondary" onclick="exportData()">Xuất dữ liệu</button><button class="btn secondary" onclick="document.getElementById('importFile').click()">Nhập dữ liệu</button></div></div>`
      };
      $('#settings').innerHTML = `${settingsTabsHTML()}<div class="appearanceGrid">${sections[settingsSection] || sections.workspace}</div>`;
    }
    function saveSettings() { const start = $('#setStart').value; const end = $('#setEnd').value; const missionLimit = Number($('#setMission').value) || 3; if (start && end && minOf(end) <= minOf(start)) { toast('Giờ kết thúc phải lớn hơn giờ bắt đầu.'); return; } db.settings.availableStart = start; db.settings.availableEnd = end; db.settings.dailyMissionLimit = missionLimit; const birth = $('#setBirth') ? $('#setBirth').value : ''; workspace().birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : ''; touchSettings(); save(); render(); toast('Đã lưu settings') }
    function openModal(id) {
      const modal = $('#' + id);
      if (!modal) return;
      if (modal._trapHandler) modal.removeEventListener('keydown', modal._trapHandler);
      if (modal._backdropHandler) modal.removeEventListener('click', modal._backdropHandler);
      modal._returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      modal.classList.add('open');
      // Focus trap: focus first focusable element inside
      const focusables = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (first) first.focus();
      modal._trapHandler = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first?.focus(); } }
      };
      modal.addEventListener('keydown', modal._trapHandler);
      // Close on backdrop click
      modal._backdropHandler = (e) => { if (e.target === modal) closeModal(id); };
      modal.addEventListener('click', modal._backdropHandler);
    }
    function closeModal(id) {
      const modal = $('#' + id);
      if (!modal) return;
      modal.classList.remove('open');
      if (modal._trapHandler) modal.removeEventListener('keydown', modal._trapHandler);
      if (modal._backdropHandler) modal.removeEventListener('click', modal._backdropHandler);
      modal._returnFocus?.focus?.();
    }
    function goTab(id) { currentTab = id; render() }
    window.goTab = goTab;
    function exportData() {
      const payload = { ...db, _exportedAt: new Date().toISOString(), _version: 1 };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `timeline-focus-backup-${fmtDate(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href);
    }
    function importData(e) {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const raw = JSON.parse(r.result);
          // Schema validation: phải là object, có ít nhất tasks array
          if (!raw || typeof raw !== 'object') throw new Error('Not an object');
          if (!Array.isArray(raw.tasks)) throw new Error('Missing tasks array');
          if (raw._version && raw._version > 1) toast('Lưu ý: File backup này từ phiên bản mới hơn.');
          // Sanitize: chỉ lấy các field đã biết, bỏ qua field lạ
          const safe = {
            tasks:    raw.tasks.filter(t => t && typeof t === 'object' && typeof t.title === 'string'),
            events:   Array.isArray(raw.events)   ? raw.events   : [],
            sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
            settings: (raw.settings && typeof raw.settings === 'object') ? raw.settings : {},
            reviews:  (raw.reviews  && typeof raw.reviews  === 'object') ? raw.reviews  : {}
          };
          // Giới hạn kích thước để tránh DoS
          if (safe.tasks.length > 10000) throw new Error('Quá nhiều tasks (>10000)');
          db = Object.assign(defaultData(), safe);
          normalize(); save(); render();
          toast(`✅ Đã nhập ${safe.tasks.length} task, ${safe.events.length} sự kiện`);
        } catch (err) {
          console.error('[TL] Import failed:', err);
          toast('❌ File không hợp lệ: ' + err.message);
        }
      };
      r.readAsText(f);
    }
    function requestNotify() {
      if (!('Notification' in window)) { toast('Trình duyệt không hỗ trợ thông báo'); return; }
      if (Notification.permission === 'denied') {
        db.settings.notifications = false;
        touchSettings();
        save();
        toast('Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt nếu cần.');
        return;
      }
      if (Notification.permission === 'granted') {
        db.settings.notifications = true;
        touchSettings();
        save();
        toast('Thông báo đã được bật trước đó.');
        return;
      }
      Promise.resolve(Notification.requestPermission()).then(p => {
        db.settings.notifications = p === 'granted';
        touchSettings();
        save();
        toast(p === 'granted' ? 'Đã bật thông báo' : 'Chưa cấp quyền');
      }).catch(err => {
        console.warn('[TL] Notification.requestPermission failed:', err);
        toast('Không thể yêu cầu quyền thông báo. Hãy bật trong cài đặt trình duyệt.');
      });
    }
    function notify(title, body) { if (('Notification' in window) && db.settings.notifications && Notification.permission === 'granted') new Notification(title, { body }); else toast(title + ' - ' + body) }
    // SW registered once in init() — no duplicate here
    window.openTask = openTask; window.openTaskDetail = openTaskDetail; window.closeModal = closeModal; window.quickDur = quickDur; window.quickAdd = quickAdd; window.autoSchedule = autoSchedule; window.timelineClick = timelineClick; window.markDone = markDone; window.startFocus = startFocus; window.moveToStack = moveToStack; window.openTriage = openTriage; window.doToday = doToday; window.scheduleDebt = scheduleDebt; window.splitTask = splitTask; window.deleteById = deleteById; window.triageAction = triageAction; window.renderTriage = renderTriage; window.pauseFocus = pauseFocus; window.resumeFocus = resumeFocus; window.toggleFocusTimer = toggleFocusTimer; window.completeFocus = completeFocus; window.closeFocusReview = closeFocusReview; window.focusReviewDone = focusReviewDone; window.focusReviewSave = focusReviewSave; window.focusReviewNextAction = focusReviewNextAction; window.focusReviewStack = focusReviewStack; window.addFocus = addFocus; window.setFocusPreset = setFocusPreset; window.selectCalendarDay = selectCalendarDay; window.openEvent = openEvent; window.addPlanTask = addPlanTask; window.toggleCalendarVisible = toggleCalendarVisible; window.addCalendar = addCalendar; window.editCalendar = editCalendar; window.deleteCalendar = deleteCalendar; window.toggleCreateMenu = toggleCreateMenu; window.createFromMenu = createFromMenu; window.setCalView = setCalView; window.calNavigate = calNavigate; window.calGoToday = calGoToday; window.miniCalNavigate = miniCalNavigate; window.quickCreateAt = quickCreateAt; window.saveSettings = saveSettings; window.setTheme = setTheme; window.setBackgroundPreset = setBackgroundPreset; window.uploadBackgroundPrompt = uploadBackgroundPrompt; window.clearBackgroundImage = clearBackgroundImage; window.handleBackgroundUpload = handleBackgroundUpload; window.setAnalyticsPreview = setAnalyticsPreview; window.openAnalyticsDate = openAnalyticsDate; window.updateTaskFilter = updateTaskFilter; window.setDashboardMode = setDashboardMode; window.setSettingsSection = setSettingsSection; window.addWorkspaceProject = addWorkspaceProject; window.addWorkspaceGoal = addWorkspaceGoal; window.setGoalConfidence = setGoalConfidence; window.archiveWorkspaceGoal = archiveWorkspaceGoal; window.updateFlowSummary = updateFlowSummary; window.addFlowItem = addFlowItem; window.removeFlowItem = removeFlowItem; window.toggleFlowCheck = toggleFlowCheck; window.undoLast = undoLast; window.addStickyNote = addStickyNote; window.updateStickyNote = updateStickyNote; window.setStickyColor = setStickyColor; window.deleteStickyNote = deleteStickyNote; window.purgeExpiredCloudData = purgeExpiredCloudData; window.requestAccountDeletion = requestAccountDeletion; window.toast = toast; window.render = render; window.loginOrSyncHelp = loginOrSyncHelp; window.getTimelineDb = () => db; window.getTimelineDbSnapshot = getDbSnapshot;
    init();
