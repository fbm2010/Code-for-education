/* ============================================================
   ZEROLINK — App Logic
   Offline-first SPA with hash routing
   ============================================================ */

'use strict';

// ── Constants ────────────────────────────────────────────────
const STORE_KEY = 'zerolink_state';

const LANGUAGES = {
  en: 'English', sw: 'Kiswahili', fr: 'Français',
  ar: 'العربية', hi: 'हिन्दी', es: 'Español',
  pt: 'Português', ha: 'Hausa'
};

const TECHNIQUES = {
  spaced: {
    name: 'Spaced Repetition',
    icon: '⏰',
    desc: 'Revisit this campfire at growing intervals. Each review strengthens the memory trail.',
    tip: '"Review after 1 day, then 3, then 7, then 14."'
  },
  retrieval: {
    name: 'Retrieval Practice',
    icon: '🧠',
    desc: 'Test yourself without the guidebook open. Struggling to recall is what builds the trail.',
    tip: '"Close the lesson and try to explain it aloud."'
  },
  streak: {
    name: 'Daily Streak',
    icon: '🔥',
    desc: 'Add this lesson to your daily trail. Consistency is more powerful than cramming.',
    tip: '"Even 10 minutes every day beats 2 hours once a week."'
  },
  interleaving: {
    name: 'Interleaving',
    icon: '🔀',
    desc: 'Mix different subjects or topics in the same study session to strengthen connections.',
    tip: '"Alternate: Math → Science → Math → Language."'
  }
};

const COURSES = [
  {
    id: 'math', title: 'Mathematics', region: 'Math Valley',
    emoji: '📐', bg: 'linear-gradient(135deg, #C4622D, #8B3A00)',
    count: 5, duration: 85,
    lessons: [
      { id: 'math-1', title: 'Numbers & Counting', duration: 15, langs: ['en','sw','fr','ar','hi'], icon: '🔢' },
      { id: 'math-2', title: 'Addition & Subtraction', duration: 20, langs: ['en','sw','fr','ar'], icon: '➕' },
      { id: 'math-3', title: 'Multiplication Basics', duration: 18, langs: ['en','fr','hi'], icon: '✖️' },
      { id: 'math-4', title: 'Fractions & Decimals', duration: 17, langs: ['en','fr','es'], icon: '½' },
      { id: 'math-5', title: 'Shapes & Geometry', duration: 15, langs: ['en','sw','fr'], icon: '🔷' }
    ]
  },
  {
    id: 'science', title: 'Science', region: 'Science Plains',
    emoji: '🔬', bg: 'linear-gradient(135deg, #4A5A2A, #6B7C3E)',
    count: 5, duration: 90,
    lessons: [
      { id: 'sci-1', title: 'The Living World', duration: 20, langs: ['en','sw','fr'], icon: '🌿' },
      { id: 'sci-2', title: 'Water & Weather', duration: 18, langs: ['en','sw','ha'], icon: '💧' },
      { id: 'sci-3', title: 'Plants & Photosynthesis', duration: 17, langs: ['en','fr','pt'], icon: '🌱' },
      { id: 'sci-4', title: 'Our Solar System', duration: 20, langs: ['en','hi','es'], icon: '🌍' },
      { id: 'sci-5', title: 'Simple Machines', duration: 15, langs: ['en','fr','ar'], icon: '⚙️' }
    ]
  },
  {
    id: 'language', title: 'Languages', region: 'Language River',
    emoji: '📚', bg: 'linear-gradient(135deg, #5B8DB8, #2A5A80)',
    count: 5, duration: 95,
    lessons: [
      { id: 'lang-1', title: 'Reading Fundamentals', duration: 20, langs: ['en','sw','fr','ar'], icon: '📖' },
      { id: 'lang-2', title: 'Building Vocabulary', duration: 18, langs: ['en','sw','fr','hi'], icon: '🗣️' },
      { id: 'lang-3', title: 'Writing Sentences', duration: 20, langs: ['en','fr','sw'], icon: '✏️' },
      { id: 'lang-4', title: 'Telling Stories', duration: 20, langs: ['en','sw','ha'], icon: '📜' },
      { id: 'lang-5', title: 'Poetry & Expression', duration: 17, langs: ['en','fr','ar'], icon: '🎭' }
    ]
  },
  {
    id: 'geography', title: 'Geography', region: 'Geography Highlands',
    emoji: '🌍', bg: 'linear-gradient(135deg, #2D5016, #4A7A28)',
    count: 4, duration: 70,
    lessons: [
      { id: 'geo-1', title: 'Maps & Directions', duration: 18, langs: ['en','sw','fr'], icon: '🗺️' },
      { id: 'geo-2', title: 'Continents & Oceans', duration: 18, langs: ['en','fr','ar'], icon: '🌊' },
      { id: 'geo-3', title: 'Climates & Biomes', duration: 17, langs: ['en','sw','fr'], icon: '🌡️' },
      { id: 'geo-4', title: 'Communities & Culture', duration: 17, langs: ['en','sw','ha'], icon: '🏘️' }
    ]
  },
  {
    id: 'arts', title: 'Arts & Culture', region: 'Arts Meadows',
    emoji: '🎨', bg: 'linear-gradient(135deg, #C4820D, #F4A820)',
    count: 4, duration: 65,
    lessons: [
      { id: 'art-1', title: 'Colors & Drawing', duration: 15, langs: ['en','fr','sw'], icon: '🖍️' },
      { id: 'art-2', title: 'Music & Rhythm', duration: 17, langs: ['en','sw','ha'], icon: '🎵' },
      { id: 'art-3', title: 'African Traditions', duration: 17, langs: ['en','sw','ha'], icon: '🥁' },
      { id: 'art-4', title: 'Storytelling Across Cultures', duration: 16, langs: ['en','fr','ar'], icon: '📿' }
    ]
  },
  {
    id: 'tech', title: 'Technology', region: 'Technology Frontier',
    emoji: '💻', bg: 'linear-gradient(135deg, #3A2010, #6B4020)',
    count: 4, duration: 72,
    lessons: [
      { id: 'tech-1', title: 'What is a Computer?', duration: 18, langs: ['en','sw','fr'], icon: '🖥️' },
      { id: 'tech-2', title: 'Internet Basics', duration: 18, langs: ['en','fr','ar'], icon: '🌐' },
      { id: 'tech-3', title: 'Coding & Logic', duration: 18, langs: ['en','fr','hi'], icon: '💡' },
      { id: 'tech-4', title: 'Staying Safe Online', duration: 18, langs: ['en','sw','fr'], icon: '🔒' }
    ]
  }
];

const RESOURCES = [
  {
    id: 'r1', type: 'Library', icon: '📚', title: 'Community Library Network',
    desc: 'Find public libraries with Wi-Fi zones and device lending programs near you.',
    tags: ['wifi', 'devices'], offline: false
  },
  {
    id: 'r2', type: 'Teacher Pack', icon: '👩‍🏫', title: 'Grade 1–3 Starter Bundle',
    desc: '42 offline lessons, activity sheets, and quizzes for early learners. Available in 5 languages.',
    tags: ['offline', 'grades 1-3'], offline: true
  },
  {
    id: 'r3', type: 'Wi-Fi Spot', icon: '📡', title: 'Free Wi-Fi Locator',
    desc: 'Map of community hotspots, schools, health centers, and markets with free internet.',
    tags: ['wifi', 'community'], offline: false
  },
  {
    id: 'r4', type: 'Teacher Pack', icon: '📦', title: 'Science & Math Advanced Bundle',
    desc: '35 lessons for grades 4–7. Includes videos, quizzes, and printable activity cards.',
    tags: ['offline', 'grades 4-7', 'science', 'math'], offline: true
  },
  {
    id: 'r5', type: 'Tip Sheet', icon: '💡', title: 'Study Tips in 8 Languages',
    desc: 'Printable study strategies: spaced repetition, retrieval practice, and more—in your language.',
    tags: ['multilingual', 'tips'], offline: true
  },
  {
    id: 'r6', type: 'Device Lending', icon: '📱', title: 'Device Loan Program',
    desc: 'Partner organizations offering short-term tablet and phone loans for learners without devices.',
    tags: ['devices', 'community'], offline: false
  }
];

// ── Default State ─────────────────────────────────────────────
const DEFAULT_STATE = {
  user: {
    name: '',
    language: 'en',
    device: 'smartphone',
    internet: 'no',
    dailyGoal: 30,
    techniques: ['spaced', 'retrieval'],
    setupDone: false
  },
  progress: {
    streak: 3,
    totalMinutes: 127,
    lessonsCompleted: 8,
    downloads: [],
    completedLessons: ['math-1', 'math-2', 'sci-1', 'lang-1'],
    techsUsed: { spaced: 12, retrieval: 8, streak: 6, interleaving: 2 }
  },
  settings: {
    lowBandwidth: false,
    autoDownloadWifi: true,
    notifications: true
  },
  ui: { currentPage: 'landing', currentLesson: null, expandedTerritory: null }
};

// ── State ─────────────────────────────────────────────────────
let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = { ...DEFAULT_STATE, ...parsed };
      merged.user = { ...DEFAULT_STATE.user, ...(parsed.user || {}) };
      merged.progress = { ...DEFAULT_STATE.progress, ...(parsed.progress || {}) };
      merged.settings = { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) };
      merged.ui = { ...DEFAULT_STATE.ui, ...(parsed.ui || {}) };
      merged.user.setupDone = true; // never auto-block the UI
      return merged;
    }
  } catch (e) {}
  return { ...DEFAULT_STATE, user: { ...DEFAULT_STATE.user, setupDone: true } };
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

function mergeState(patch) {
  state = deepMerge(state, patch);
  saveState();
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

// ── DOM Helpers ───────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function render(el, html) {
  el.innerHTML = html;
  el.classList.add('page-enter');
  requestAnimationFrame(() => el.classList.remove('page-enter'));
}

// ── Router ────────────────────────────────────────────────────
const Router = {
  init() {
    // hashchange covers back/forward buttons
    window.addEventListener('hashchange', () => this.handleRoute());

    // Delegated click for anything with data-page
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-page]');
      if (!btn) return;
      e.preventDefault();
      this.navigate(btn.dataset.page, btn.dataset);
    });

    this.handleRoute();
  },

  navigate(page, params = {}) {
    const hash = page === 'lesson' ? `#lesson/${params.id || ''}` : `#${page}`;
    // Update URL — works everywhere, triggers hashchange for back/forward
    try { history.pushState(null, '', hash); } catch (_) {
      try { location.hash = hash; } catch (_2) {}
    }
    this.render(page, params);
  },

  handleRoute() {
    const raw  = location.hash.slice(1) || 'landing';
    const page = raw.startsWith('lesson/') ? 'lesson' : raw;
    const id   = raw.startsWith('lesson/') ? raw.slice(7) : undefined;
    this.render(page, id ? { id } : {});
  },

  render(page, params = {}) {
    const main = $('#main-content');
    if (!main) { console.error('ZeroLink: #main-content not found'); return; }

    // Sync active state on all nav buttons
    $$('[data-page]').forEach(btn => {
      const p = btn.dataset.page;
      btn.classList.toggle('active', p === page);
      btn.setAttribute('aria-current', p === page ? 'page' : 'false');
    });

    mergeState({ ui: { currentPage: page } });

    try {
      const pages = { landing, library, coach, settings, community };
      if (page === 'lesson') {
        render(main, Pages.lesson(params.id));
        Pages.afterLesson(params.id);
      } else if (pages[page]) {
        render(main, pages[page]());
        const after = Pages[`after${cap(page)}`];
        if (after) after();
      } else {
        render(main, landing());
        Pages.afterLanding();
      }
    } catch (err) {
      console.error('ZeroLink render error:', err);
      main.innerHTML = `<div style="padding:2rem;font-family:sans-serif">
        <h2 style="color:#c00">Render error</h2>
        <pre style="font-size:.8rem;white-space:pre-wrap">${err}</pre>
        <button onclick="Router.navigate('landing')" style="margin-top:1rem;padding:.5rem 1rem;cursor:pointer">← Back to home</button>
      </div>`;
    }
  }
};

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// ── Landing Page ──────────────────────────────────────────────
function landing() {
  const name = state.user.name;
  const greeting = name ? `Welcome back, ${name}! 🌅` : '';
  return `
  <div class="landing-page">
    <!-- Hero -->
    <section class="hero" aria-label="Hero">
      <div class="hero-particles" aria-hidden="true">
        <span class="particle">🌿</span>
        <span class="particle">🦒</span>
        <span class="particle">🧭</span>
        <span class="particle">⭐</span>
        <span class="particle">🌾</span>
        <span class="particle">🦅</span>
        <span class="particle">🌙</span>
        <span class="particle">🏔️</span>
      </div>

      <div class="hero-logo">
        <div class="hero-compass" role="img" aria-label="Compass">🧭</div>
        <h1 class="hero-brand">
          <span class="brand-zero">Zero</span><span class="brand-link">Link</span>
        </h1>
        <span class="hero-subtitle-badge">No Internet Required</span>
      </div>

      <p class="hero-tagline">
        ${greeting ? `<strong>${greeting}</strong><br>` : ''}
        Your <strong>learning expedition</strong> — works in villages, on mountain trails,
        wherever you are. <strong>Zero internet link</strong> needed.
      </p>

      <div class="hero-cta">
        <button class="btn-hero btn-hero-primary" data-page="library">
          🌅 Start Your Journey
        </button>
        <button class="btn-hero btn-hero-secondary" data-page="library">
          🗺️ Explore the Map
        </button>
      </div>

      <div class="hero-scroll-hint" aria-hidden="true">
        <span>Scroll to discover</span>
        <span>↓</span>
      </div>
    </section>

    <!-- Mission -->
    <section class="mission-section" aria-labelledby="mission-title">
      <span class="section-eyebrow">Our Mission</span>
      <h2 class="section-title" id="mission-title">Learning Without Limits</h2>
      <p class="mission-text">
        ZeroLink brings quality lessons, multilingual support, and smart study techniques
        to every corner of the world — even where the internet doesn't reach.
        Pack your guidebook. The expedition begins here.
      </p>
      <div class="mission-stats">
        <div class="stat-item">
          <span class="stat-number">8</span>
          <span class="stat-label">Languages</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">28+</span>
          <span class="stat-label">Lessons</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">100%</span>
          <span class="stat-label">Offline Ready</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">4</span>
          <span class="stat-label">Study Methods</span>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features-section" aria-labelledby="features-title">
      <span class="section-eyebrow" style="display:block;text-align:center">Your Expedition Kit</span>
      <h2 class="section-title" id="features-title" style="text-align:center">Four Ways We Reach You</h2>
      <div class="features-grid">
        <article class="feature-card offline card-parchment">
          <span class="feature-icon" role="img" aria-label="Campfire">🏕️</span>
          <h3 class="feature-title">Offline Camp</h3>
          <p class="feature-desc">Download lessons to your device and study anywhere — no signal needed. Your knowledge travels with you.</p>
        </article>
        <article class="feature-card bandwidth card-parchment">
          <span class="feature-icon" role="img" aria-label="Trail">🛤️</span>
          <h3 class="feature-title">Low-Bandwidth Trail</h3>
          <p class="feature-desc">Compressed text, audio, and slides for slow or spotty connections. Quality learning on any signal.</p>
        </article>
        <article class="feature-card language card-parchment">
          <span class="feature-icon" role="img" aria-label="Compass">🧭</span>
          <h3 class="feature-title">Multilingual Compass</h3>
          <p class="feature-desc">Lessons in 8 languages including Swahili, Hausa, Hindi, and more. Learn in the language you think in.</p>
        </article>
        <article class="feature-card coach card-parchment">
          <span class="feature-icon" role="img" aria-label="Guidebook">📖</span>
          <h3 class="feature-title">Study Guidebook</h3>
          <p class="feature-desc">Science-backed techniques: spaced repetition, retrieval practice, and daily streaks tailored to you.</p>
        </article>
      </div>
    </section>

    <!-- Quick Setup -->
    <section class="setup-section" aria-labelledby="setup-section-title">
      <div style="text-align:center;margin-bottom:var(--sp-md)">
        <span class="section-eyebrow" style="color:var(--c-gold)">Pack Your Bag</span>
        <h2 class="section-title" id="setup-section-title" style="color:white">Tell Us About Your Trail</h2>
        <p style="color:rgba(255,255,255,.7);max-width:480px;margin:0 auto">
          Set your preferences once and ZeroLink personalizes every step of your journey.
        </p>
      </div>
      <div class="setup-card" id="landing-setup">
        ${setupFormHTML()}
      </div>
    </section>
  </div>
  `;
}

function setupFormHTML() {
  const u = state.user;
  return `
  <form id="quick-setup-form" novalidate>
    <div class="form-group">
      <label for="qs-name">Your explorer name</label>
      <input type="text" id="qs-name" value="${esc(u.name)}" placeholder="e.g. Amara">
    </div>
    <div class="form-group">
      <label>Do you have reliable internet?</label>
      <div class="radio-group">
        ${['yes','sometimes','no'].map(v => `
          <label class="radio-option">
            <input type="radio" name="qs-internet" value="${v}" ${u.internet === v ? 'checked' : ''}>
            ${v === 'yes' ? 'Yes, mostly' : v === 'sometimes' ? 'Sometimes' : 'Rarely / Never'}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label>Your device</label>
      <div class="radio-group" style="flex-direction:row;flex-wrap:wrap">
        ${[['smartphone','📱 Smartphone'],['tablet','📟 Tablet'],['laptop','💻 Laptop']].map(([v,l]) => `
          <label class="radio-option" style="flex:1;min-width:110px">
            <input type="radio" name="qs-device" value="${v}" ${u.device === v ? 'checked' : ''}>
            ${l}
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label for="qs-lang">Preferred language</label>
      <select id="qs-lang">
        ${Object.entries(LANGUAGES).map(([k,v]) =>
          `<option value="${k}" ${u.language === k ? 'selected' : ''}>${v}</option>`
        ).join('')}
      </select>
    </div>
    <button type="submit" class="btn-primary btn-full">Save Expedition Preferences 🌅</button>
  </form>
  `;
}

// ── Library Page ──────────────────────────────────────────────
function library() {
  const downloads = state.progress.downloads || [];
  const completed = state.progress.completedLessons || [];
  const expanded = state.ui.expandedTerritory;

  return `
  <div class="map-page">
    <div class="page-header">
      <div class="page-header-inner">
        <div class="page-title-group">
          <span class="page-eyebrow">🗺️ Course Library</span>
          <h1 class="page-title">The Expedition Map</h1>
          <p class="page-subtitle">Choose a territory to explore — each one holds lesson camps ready to download.</p>
        </div>
        <div>
          <button class="btn-secondary btn-sm" id="download-all-btn">
            🎒 Download All
          </button>
        </div>
      </div>
    </div>

    <!-- Language Filter -->
    <div class="filter-bar" role="group" aria-label="Filter by language">
      <button class="filter-chip active" data-lang="all">All Languages</button>
      ${Object.entries(LANGUAGES).map(([k,v]) =>
        `<button class="filter-chip" data-lang="${k}">${v}</button>`
      ).join('')}
    </div>

    <!-- Download summary -->
    <div style="display:flex;gap:var(--sp-md);margin-bottom:var(--sp-xl);flex-wrap:wrap">
      <span class="badge badge-olive">✓ ${completed.length} completed</span>
      <span class="badge badge-sky">⬇ ${downloads.length} downloaded</span>
      <span class="badge badge-terra">${state.settings.lowBandwidth ? '🛤️ Low-bandwidth ON' : '🌐 Full mode'}</span>
    </div>

    <!-- Territory Grid -->
    <div class="territory-grid" id="territory-grid">
      ${COURSES.map(course => renderTerritory(course, expanded, downloads, completed)).join('')}
    </div>
  </div>
  `;
}

function renderTerritory(course, expanded, downloads, completed) {
  const isExpanded = expanded === course.id;
  const courseCompleted = course.lessons.filter(l => completed.includes(l.id)).length;
  return `
  <div class="territory-card ${isExpanded ? 'expanded' : ''}" data-territory="${course.id}" role="region" aria-label="${course.region}">
    <div class="territory-header" style="background:${course.bg}">
      <span class="territory-emoji" role="img" aria-label="${course.title}">${course.emoji}</span>
      <div class="territory-info">
        <div class="territory-name">${course.region}</div>
        <div class="territory-meta">${course.lessons.length} camps · ${course.duration} min · ${courseCompleted} completed</div>
      </div>
      <span class="territory-arrow" aria-hidden="true">›</span>
    </div>
    <div class="territory-camps">
      ${course.lessons.map(lesson => renderCampItem(lesson, downloads, completed)).join('')}
    </div>
  </div>
  `;
}

function renderCampItem(lesson, downloads, completed) {
  const isDone = completed.includes(lesson.id);
  const isDownloaded = downloads.includes(lesson.id);
  const statusIcon = isDone ? '✅' : isDownloaded ? '📥' : '🏕️';
  const dlBtnClass = isDownloaded ? 'downloaded' : 'not-downloaded';
  const dlBtnLabel = isDownloaded ? '✓ Saved' : '⬇ Save';

  return `
  <div class="camp-item" data-lesson="${lesson.id}" role="button" tabindex="0" aria-label="Open lesson: ${lesson.title}">
    <span class="camp-icon">${statusIcon}</span>
    <div class="camp-info">
      <span class="camp-name">${lesson.title}</span>
      <span class="camp-meta">${lesson.duration} min · ${lesson.langs.map(l => LANGUAGES[l] || l).join(', ')}</span>
    </div>
    <div class="camp-actions">
      <button class="download-btn ${dlBtnClass}" data-dl="${lesson.id}" aria-label="${dlBtnLabel} ${lesson.title}">
        ${dlBtnLabel}
      </button>
    </div>
  </div>
  `;
}

// ── Lesson Page ───────────────────────────────────────────────
const Pages = {
  lesson(id) {
    const lesson = findLesson(id);
    if (!lesson) return `<div style="padding:2rem">Lesson not found. <button class="btn-ghost" data-page="library">← Back</button></div>`;
    const isLow = state.settings.lowBandwidth;
    const course = COURSES.find(c => c.lessons.some(l => l.id === id));

    return `
    <div class="lesson-page">
      <div class="lesson-topbar">
        <button class="lesson-back" data-page="library">← Expedition Map</button>
        <div class="lesson-topbar-title">${lesson.title}</div>
        <div class="badge badge-olive">${lesson.duration} min</div>
      </div>

      <div class="lesson-layout">
        <!-- Main content -->
        <div class="lesson-main">
          <div class="campfire-header">
            <span class="campfire-eyebrow">🔥 Campfire Lesson · ${course ? course.region : ''}</span>
            <h1 class="campfire-title">${lesson.title}</h1>
            <div class="campfire-meta">
              <span>⏱ ${lesson.duration} minutes</span>
              <span>🗣 ${lesson.langs.map(l => LANGUAGES[l]).join(' · ')}</span>
              <span id="offline-camp-badge">${isOffline() ? '🏕️ Offline campfire' : '🌐 Online'}</span>
            </div>
          </div>

          <!-- Bandwidth Toggle -->
          <div class="bandwidth-toggle">
            <button class="bw-btn ${!isLow ? 'active' : ''}" id="bw-full">
              🖼️ Full Lesson
            </button>
            <button class="bw-btn ${isLow ? 'active' : ''}" id="bw-low">
              🛤️ Low-Bandwidth Trail
            </button>
          </div>

          <!-- Lesson Content -->
          <div class="lesson-content" id="lesson-body">
            <div class="lesson-content-inner">
              ${getLessonContent(id, isLow)}
            </div>
          </div>

          <!-- Trail Quiz -->
          <div class="quiz-section">
            <h2 class="quiz-title">🎯 Trail Quiz</h2>
            <p style="font-size:.9rem;color:var(--c-text-light);margin-bottom:var(--sp-lg)">
              Test what you've learned at this campfire. Select your answers:
            </p>
            ${renderQuiz(id)}
            <button class="btn-primary" id="submit-quiz" style="margin-top:var(--sp-lg)">
              Check My Trail 🧭
            </button>
          </div>
        </div>

        <!-- Study Sidebar -->
        <aside class="study-sidebar" aria-label="Study Guidebook">
          <div class="guidebook-card">
            <div class="guidebook-title">📖 Your Study Guidebook</div>
            <p style="font-size:.85rem;color:var(--c-text-light)">How would you like to study this lesson?</p>
            <div class="technique-options">
              ${Object.entries(TECHNIQUES).map(([k,t]) => `
                <button class="technique-btn ${state.user.techniques.includes(k) ? 'active' : ''}"
                  data-technique="${k}">
                  ${t.icon} ${t.name}
                </button>
              `).join('')}
            </div>
            <div class="technique-desc" id="technique-desc">
              ${TECHNIQUES[state.user.techniques[0] || 'spaced'].desc}
            </div>
          </div>

          <div class="guidebook-card">
            <div class="guidebook-title">📊 Progress</div>
            <div style="font-size:.85rem;color:var(--c-text-med);margin-bottom:var(--sp-md)">
              <strong>${state.progress.lessonsCompleted}</strong> lessons completed
              · <strong>${state.progress.streak}</strong> day streak 🔥
            </div>
            <div style="height:6px;background:var(--c-earth-pale);border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${Math.min((state.progress.lessonsCompleted / 28) * 100, 100)}%;
                background:linear-gradient(90deg,var(--c-olive),var(--c-gold));border-radius:999px;transition:width .5s">
              </div>
            </div>
            <div style="font-size:.75rem;color:var(--c-text-light);margin-top:var(--sp-xs)">
              ${state.progress.lessonsCompleted}/28 lessons on the trail
            </div>
          </div>

          <div class="guidebook-card">
            <div class="guidebook-title">🗣️ Language</div>
            <select id="lesson-lang-select" style="width:100%;padding:var(--sp-sm);border:2px solid var(--c-earth-pale);border-radius:var(--r-md);font-family:var(--font)">
              ${lesson.langs.map(l => `<option value="${l}" ${state.user.language === l ? 'selected' : ''}>${LANGUAGES[l]}</option>`).join('')}
            </select>
            <p style="font-size:.75rem;color:var(--c-text-light);margin-top:var(--sp-sm)">
              Multilingual content adapts to your selection.
            </p>
          </div>
        </aside>
      </div>
    </div>
    `;
  },

  afterLesson(id) {
    // Bandwidth toggle
    const full = $('#bw-full'); const low = $('#bw-low');
    if (full && low) {
      full.addEventListener('click', () => { mergeState({settings:{lowBandwidth:false}}); refreshLessonContent(id); full.classList.add('active'); low.classList.remove('active'); });
      low.addEventListener('click', () => { mergeState({settings:{lowBandwidth:true}}); refreshLessonContent(id); low.classList.add('active'); full.classList.remove('active'); });
    }

    // Technique buttons
    $$('.technique-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.technique;
        const desc = $('#technique-desc');
        if (desc) desc.textContent = TECHNIQUES[k].desc;
        $$('.technique-btn').forEach(b => b.classList.toggle('active', b === btn));
        // Log usage
        const techs = state.progress.techsUsed || {};
        techs[k] = (techs[k] || 0) + 1;
        mergeState({ progress: { techsUsed: techs } });
      });
    });

    // Quiz
    const submitBtn = $('#submit-quiz');
    if (submitBtn) {
      submitBtn.onclick = () => checkQuiz(id);
    }

    // Lesson language select
    const langSelect = $('#lesson-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        mergeState({ user: { language: langSelect.value } });
        showToast(`Language set to ${LANGUAGES[langSelect.value]} 🗣️`);
      });
    }

    // Mark as in-progress (could mark completed on quiz submit)
    $$('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        // Allow selecting before submit
        const group = opt.closest('.quiz-question');
        if (group) group.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  },

  afterLanding() {
    const form = $('#quick-setup-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        saveSetupForm(form, 'qs');
        showToast('Trail preferences saved! 🌅');
      });
    }
  },
  afterLibrary() {
    // Territory expand/collapse
    $$('.territory-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.territory-card');
        const id = card.dataset.territory;
        const isNowExpanded = !card.classList.contains('expanded');
        mergeState({ ui: { expandedTerritory: isNowExpanded ? id : null } });
        $$('.territory-card').forEach(c => c.classList.remove('expanded'));
        if (isNowExpanded) card.classList.add('expanded');
      });
    });

    // Camp item click → lesson
    $$('.camp-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('.download-btn')) return;
        Router.navigate('lesson', { id: item.dataset.lesson });
      });
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!e.target.closest('.download-btn')) Router.navigate('lesson', { id: item.dataset.lesson });
        }
      });
    });

    // Download buttons
    $$('.download-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.dl;
        toggleDownload(id, btn);
      });
    });

    // Language filter
    $$('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        filterByLanguage(chip.dataset.lang);
      });
    });

    // Download all
    const dlAll = $('#download-all-btn');
    if (dlAll) {
      dlAll.addEventListener('click', () => {
        const allIds = COURSES.flatMap(c => c.lessons.map(l => l.id));
        mergeState({ progress: { downloads: allIds } });
        showToast('All lessons downloaded to your pack! 🎒');
        Router.navigate('library');
      });
    }
  },
  afterCoach() { bindCoachEvents(); },
  afterSettings() { bindSettingsEvents(); },
  afterCommunity() { bindCommunityEvents(); }
};

function refreshLessonContent(id) {
  const body = $('#lesson-body');
  if (body) body.querySelector('.lesson-content-inner').innerHTML = getLessonContent(id, state.settings.lowBandwidth);
}

// ── Coach Page ────────────────────────────────────────────────
function coach() {
  const p = state.progress;
  const trail = getDailyTrail();

  return `
  <div class="coach-page">
    <div class="page-header">
      <span class="page-eyebrow">📖 Study Coach</span>
      <h1 class="page-title">Your Guidebook & Trail Plan</h1>
      <p class="page-subtitle">Your personal expedition coach, built on proven learning science.</p>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-card-number">${p.streak}</span>
        <span class="stat-card-label">Day Streak 🔥</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-number">${p.lessonsCompleted}</span>
        <span class="stat-card-label">Lessons Done</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-number">${Math.round(p.totalMinutes / 60)}h</span>
        <span class="stat-card-label">Time Studied</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-number">${p.downloads ? p.downloads.length : 0}</span>
        <span class="stat-card-label">Lessons Saved</span>
      </div>
    </div>

    <!-- Trail Map -->
    <div class="trail-map-section">
      <div class="trail-map-title">🗺️ Your Progress Trail</div>
      <div class="trail-map">
        <div class="trail-path">
          ${generateTrailNodes()}
        </div>
      </div>
      <p style="font-size:.8rem;color:var(--c-text-light);margin-top:var(--sp-md)">
        🟡 Current position · 🟢 Completed · ⬜ Upcoming
      </p>
    </div>

    <!-- Daily Trail -->
    <div class="daily-trail">
      <div class="trail-header">
        <h2>📋 Today's Trail Plan</h2>
        <p>Based on your history and techniques, here's what the guidebook recommends:</p>
      </div>
      <div class="trail-items" id="trail-items">
        ${trail.map(item => renderTrailItem(item)).join('')}
      </div>
    </div>

    <!-- Technique Cards -->
    <h2 style="font-size:1.3rem;font-weight:800;color:var(--c-earth-dark);margin-bottom:var(--sp-lg)">
      📚 Your Study Techniques
    </h2>
    <div class="techniques-section">
      ${Object.entries(TECHNIQUES).map(([k, t]) => `
      <div class="technique-card ${state.user.techniques.includes(k) ? 'active-technique' : ''}">
        <div class="technique-card-icon">${t.icon}</div>
        <div class="technique-card-title">${t.name}</div>
        <div class="technique-card-desc">${t.desc}</div>
        <div class="technique-card-tip">${t.tip}</div>
        <button class="btn-ghost toggle-technique" data-tech="${k}" style="margin-top:var(--sp-sm)">
          ${state.user.techniques.includes(k) ? '✓ Active — Click to pause' : '+ Add to plan'}
        </button>
      </div>
      `).join('')}
    </div>

    <!-- Goal Setting -->
    <div style="background:white;border:1px solid var(--c-border);border-radius:var(--r-xl);padding:var(--sp-xl);box-shadow:0 2px 8px var(--c-shadow)">
      <h2 style="font-size:1.1rem;font-weight:800;color:var(--c-earth-dark);margin-bottom:var(--sp-lg)">
        🎯 Daily Trail Goal
      </h2>
      <div class="form-group" style="margin-bottom:0">
        <label for="daily-goal">Study time goal (minutes per day)</label>
        <input type="range" id="daily-goal" min="10" max="120" step="5" value="${state.user.dailyGoal}"
          style="width:100%;accent-color:var(--c-gold);margin-top:var(--sp-sm)">
        <div style="text-align:center;font-size:1.3rem;font-weight:900;color:var(--c-terra)" id="goal-display">
          ${state.user.dailyGoal} min / day
        </div>
      </div>
    </div>
  </div>
  `;
}

function generateTrailNodes() {
  const completed = state.progress.completedLessons || [];
  const allLessons = COURSES.flatMap(c => c.lessons);
  const nodes = allLessons.slice(0, 10); // Show first 10 as trail nodes
  const doneSet = new Set(completed);
  let currentFound = false;

  return nodes.map((lesson, i) => {
    const isDone = doneSet.has(lesson.id);
    let cls = '';
    let marker = '○';
    if (isDone) { cls = 'completed'; marker = '✓'; }
    else if (!currentFound) { cls = 'current'; marker = '●'; currentFound = true; }

    return `
    <div class="trail-node ${cls}" title="${lesson.title}">
      <div class="node-marker">${isDone ? '✓' : cls === 'current' ? '🧭' : ''}</div>
      <div class="node-label">${lesson.title.split(' ').slice(0,2).join(' ')}</div>
    </div>
    `;
  }).join('');
}

function getDailyTrail() {
  return [
    { id: 't1', type: 'spaced', icon: '⏰', title: 'Review: Numbers & Counting', sub: 'Spaced repetition — revisit after 3 days', done: false },
    { id: 't2', type: 'retrieval', icon: '🧠', title: 'Quiz yourself on The Living World', sub: 'Retrieval practice — no peeking at the lesson!', done: false },
    { id: 't3', type: 'streak', icon: '🔥', title: '15 min daily trail — Language River', sub: 'Keep your streak going · Day ' + state.progress.streak, done: false },
    { id: 't4', type: 'interleave', icon: '🔀', title: 'Mix: Math → Science session', sub: 'Interleaving — alternate subjects for stronger memory', done: true }
  ];
}

function renderTrailItem(item) {
  return `
  <div class="trail-item ${item.done ? 'done' : ''}" data-trail="${item.id}">
    <div class="trail-item-icon ${item.type}">
      ${item.icon}
    </div>
    <div class="trail-item-text">
      <div class="trail-item-title">${item.done ? '<s>' : ''}${item.title}${item.done ? '</s>' : ''}</div>
      <div class="trail-item-sub">${item.sub}</div>
    </div>
    ${item.done
      ? '<span style="color:var(--c-olive);font-size:1.2rem">✓</span>'
      : `<button class="trail-item-action" data-trail-action="${item.id}">Begin →</button>`
    }
  </div>
  `;
}

function bindCoachEvents() {
  // Daily goal slider
  const slider = $('#daily-goal');
  const display = $('#goal-display');
  if (slider && display) {
    slider.addEventListener('input', () => {
      display.textContent = `${slider.value} min / day`;
      mergeState({ user: { dailyGoal: parseInt(slider.value) } });
    });
  }

  // Technique toggles
  $$('.toggle-technique').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.tech;
      let techs = [...(state.user.techniques || [])];
      if (techs.includes(k)) { techs = techs.filter(t => t !== k); }
      else { techs.push(k); }
      mergeState({ user: { techniques: techs } });
      Router.navigate('coach');
    });
  });

  // Trail item actions
  $$('[data-trail-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate('library');
    });
  });
}

// ── Settings Page ─────────────────────────────────────────────
function settings() {
  const u = state.user; const s = state.settings;
  const storage = Math.round((state.progress.downloads || []).length * 2.4); // mock MB

  return `
  <div class="settings-page">
    <div class="page-header">
      <span class="page-eyebrow">🎒 Settings</span>
      <h1 class="page-title">Your Pack & Gear</h1>
      <p class="page-subtitle">Customize your expedition equipment.</p>
    </div>

    <!-- Explorer Profile -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-icon">🧭</span>
        <h2 class="settings-section-title">Explorer Profile</h2>
      </div>
      <div class="settings-body">
        <div class="form-group" style="margin-bottom:var(--sp-md)">
          <label for="s-name">Explorer name</label>
          <input type="text" id="s-name" value="${esc(u.name)}" placeholder="Your name">
        </div>
      </div>
    </div>

    <!-- Language -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-icon">🗣️</span>
        <h2 class="settings-section-title">Language Compass</h2>
      </div>
      <div class="settings-body">
        <div class="settings-row">
          <div>
            <div class="settings-row-label">App language</div>
            <div class="settings-row-sublabel">Interface language</div>
          </div>
          <select id="s-applang" style="padding:6px 10px;border:2px solid var(--c-earth-pale);border-radius:var(--r-md);font-family:var(--font)">
            ${Object.entries(LANGUAGES).map(([k,v]) => `<option value="${k}" ${u.language===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Lesson language</div>
            <div class="settings-row-sublabel">Preferred lesson language</div>
          </div>
          <select id="s-lesslan" style="padding:6px 10px;border:2px solid var(--c-earth-pale);border-radius:var(--r-md);font-family:var(--font)">
            ${Object.entries(LANGUAGES).map(([k,v]) => `<option value="${k}" ${u.language===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Connectivity -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-icon">📡</span>
        <h2 class="settings-section-title">Connectivity Trail</h2>
      </div>
      <div class="settings-body">
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Low-bandwidth mode</div>
            <div class="settings-row-sublabel">Text, audio & compressed images only</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="s-lowbw" ${s.lowBandwidth ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Auto-download on Wi-Fi</div>
            <div class="settings-row-sublabel">Download recommended lessons when connected</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="s-autowifi" ${s.autoDownloadWifi ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Storage -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-icon">🏕️</span>
        <h2 class="settings-section-title">Offline Camp</h2>
      </div>
      <div class="settings-body">
        <div style="font-size:.9rem;color:var(--c-text-med);margin-bottom:var(--sp-md)">
          <strong>${(state.progress.downloads || []).length}</strong> lessons saved ·
          <strong>${storage} MB</strong> used of available storage
        </div>
        <div class="storage-bar">
          <div class="storage-track">
            <div class="storage-fill" style="width:${Math.min(storage / 2, 100)}%"></div>
          </div>
          <div class="storage-labels">
            <span>${storage} MB used</span>
            <span>~200 MB device storage</span>
          </div>
        </div>
        <button class="btn-secondary btn-sm" id="clear-downloads" style="margin-top:var(--sp-lg)">
          🗑️ Clear Offline Data
        </button>
      </div>
    </div>

    <!-- Study Preferences -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-icon">📖</span>
        <h2 class="settings-section-title">Study Preferences</h2>
      </div>
      <div class="settings-body">
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Study notifications</div>
            <div class="settings-row-sublabel">Daily trail reminders</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="s-notif" ${s.notifications ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Daily goal</div>
            <div class="settings-row-sublabel">${u.dailyGoal} minutes per day</div>
          </div>
          <button class="btn-ghost" data-page="coach">Edit →</button>
        </div>
      </div>
    </div>

    <!-- About -->
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-icon">🌍</span>
        <h2 class="settings-section-title">About ZeroLink</h2>
      </div>
      <div class="settings-body" style="text-align:center;padding:var(--sp-xl)">
        <div style="font-size:3rem;margin-bottom:var(--sp-sm)">🧭</div>
        <div style="font-size:1.4rem;font-weight:900;color:var(--c-earth-dark)">
          <span style="color:var(--c-gold)">Zero</span>Link v1.0
        </div>
        <p style="font-size:.85rem;color:var(--c-text-light);margin-top:var(--sp-sm)">
          Bringing quality education to every corner of the world.<br>
          No internet link required.
        </p>
        <button class="btn-primary" id="reset-btn" style="margin-top:var(--sp-lg);background:linear-gradient(135deg,var(--c-terra),var(--c-earth))">
          Reset Expedition Data
        </button>
      </div>
    </div>

    <div style="text-align:center;padding:var(--sp-lg);font-size:.8rem;color:var(--c-text-light)">
      ZeroLink · Offline-First Learning · All data stored on your device
    </div>
  </div>
  `;
}

function bindSettingsEvents() {
  const inputs = {
    's-name': v => mergeState({ user: { name: v } }),
    's-applang': v => mergeState({ user: { language: v } }),
    's-lesslan': v => mergeState({ user: { language: v } }),
  };
  Object.entries(inputs).forEach(([id, fn]) => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('change', () => fn(el.value));
  });

  const toggles = {
    's-lowbw': v => mergeState({ settings: { lowBandwidth: v } }),
    's-autowifi': v => mergeState({ settings: { autoDownloadWifi: v } }),
    's-notif': v => mergeState({ settings: { notifications: v } }),
  };
  Object.entries(toggles).forEach(([id, fn]) => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('change', () => fn(el.checked));
  });

  const clearBtn = $('#clear-downloads');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all offline lessons from your pack?')) {
        mergeState({ progress: { downloads: [] } });
        showToast('Offline data cleared from your pack.');
        Router.navigate('settings');
      }
    });
  }

  const resetBtn = $('#reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all expedition data? This cannot be undone.')) {
        localStorage.removeItem(STORE_KEY);
        location.reload();
      }
    });
  }
}

// ── Community Page ────────────────────────────────────────────
function community() {
  return `
  <div class="community-page">
    <div class="page-header">
      <span class="page-eyebrow">🏘️ Community</span>
      <h1 class="page-title">The Village & Trail Markers</h1>
      <p class="page-subtitle">Connect with local resources, teacher packs, and learning tips in your language.</p>
    </div>

    <!-- Filters -->
    <div class="filter-bar" role="group" aria-label="Filter resources">
      <button class="filter-chip active" data-res-filter="all">All</button>
      <button class="filter-chip" data-res-filter="offline">Offline Only</button>
      <button class="filter-chip" data-res-filter="wifi">Wi-Fi</button>
      <button class="filter-chip" data-res-filter="packs">Teacher Packs</button>
      <button class="filter-chip" data-res-filter="tips">Tips</button>
    </div>

    <!-- Resources -->
    <div class="resource-grid" id="resource-grid">
      ${RESOURCES.map(r => renderResource(r)).join('')}
    </div>

    <!-- Multilingual Tips -->
    <h2 style="font-size:1.3rem;font-weight:800;color:var(--c-earth-dark);margin:var(--sp-2xl) 0 var(--sp-lg)">
      💬 Learning Tips in Your Language
    </h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--sp-md)">
      ${Object.entries(LANGUAGES).map(([k,v]) => `
      <button class="card" style="text-align:left;cursor:pointer" data-tip-lang="${k}">
        <div style="font-size:1.5rem;margin-bottom:var(--sp-xs)">
          ${langFlag(k)}
        </div>
        <div style="font-weight:800;color:var(--c-earth-dark)">${v}</div>
        <div style="font-size:.8rem;color:var(--c-text-light)">Study tips in ${v}</div>
      </button>
      `).join('')}
    </div>

    <!-- Teacher Packs -->
    <h2 style="font-size:1.3rem;font-weight:800;color:var(--c-earth-dark);margin:var(--sp-2xl) 0 var(--sp-lg)">
      📦 Teacher-Curated Lesson Packs
    </h2>
    <div class="pack-grid">
      ${[
        { title: 'Foundation Literacy Pack', desc: '20 reading & writing lessons, Grades 1–2', langs: 'en, sw, fr', size: '18 MB' },
        { title: 'Numeracy Starter', desc: '15 math lessons with activity sheets', langs: 'en, ar, hi', size: '12 MB' },
        { title: 'Science Explorers Bundle', desc: '25 science lessons + experiments guide', langs: 'en, fr, sw', size: '22 MB' },
        { title: 'Community Leaders Kit', desc: 'Adult literacy & civic education', langs: 'en, sw, ha', size: '16 MB' }
      ].map(pack => `
      <div class="pack-card">
        <div style="font-size:1.8rem">📦</div>
        <div style="font-weight:800;color:var(--c-earth-dark)">${pack.title}</div>
        <div style="font-size:.8rem;color:var(--c-text-light)">${pack.desc}</div>
        <div style="display:flex;gap:var(--sp-xs);flex-wrap:wrap;margin-top:var(--sp-xs)">
          <span class="badge badge-sky">${pack.langs}</span>
          <span class="badge badge-terra">${pack.size}</span>
        </div>
        <button class="btn-secondary btn-sm" style="margin-top:auto">⬇ Download Pack</button>
      </div>
      `).join('')}
    </div>
  </div>
  `;
}

function renderResource(r) {
  return `
  <div class="resource-card" data-resource="${r.id}">
    <div class="resource-card-header">
      <div class="resource-card-icon">${r.icon}</div>
      <div class="resource-card-type">${r.type}</div>
      <div class="resource-card-title">${r.title}</div>
      <div class="resource-card-desc">${r.desc}</div>
    </div>
    <div class="resource-card-footer">
      <div class="resource-tags">
        ${r.tags.map(t => `<span class="badge ${r.offline ? 'badge-olive' : 'badge-sky'}">${t}</span>`).join('')}
      </div>
      <button class="btn-ghost" style="font-size:.8rem">
        ${r.offline ? '⬇ Save offline' : '🌐 Open'}
      </button>
    </div>
  </div>
  `;
}

function bindCommunityEvents() {
  $$('[data-res-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('[data-res-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.resFilter;
      $$('.resource-card').forEach(card => {
        const r = RESOURCES.find(r => r.id === card.dataset.resource);
        if (!r) return;
        let show = filter === 'all';
        if (filter === 'offline') show = r.offline;
        if (filter === 'wifi')   show = r.tags.includes('wifi');
        if (filter === 'packs')  show = r.type === 'Teacher Pack';
        if (filter === 'tips')   show = r.type === 'Tip Sheet';
        card.style.display = show ? '' : 'none';
      });
    });
  });

  // Resource action buttons (Save offline / Open)
  $$('.resource-card').forEach(card => {
    const btn = card.querySelector('.btn-ghost');
    if (!btn) return;
    const r = RESOURCES.find(r => r.id === card.dataset.resource);
    if (!r) return;
    btn.addEventListener('click', () => {
      if (r.offline) {
        btn.textContent = '⏳ Saving…';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = '✓ Saved offline';
          btn.disabled = false;
          showToast(`"${r.title}" saved to your offline pack! 🎒`);
        }, 1000);
      } else {
        showToast(`Opening "${r.title}"… 🌐`);
      }
    });
  });

  // Teacher pack download buttons
  $$('.pack-card').forEach(card => {
    const btn = card.querySelector('.btn-secondary');
    const title = card.querySelector('[style*="font-weight:800"]')?.textContent || 'Pack';
    if (!btn) return;
    btn.addEventListener('click', () => {
      btn.textContent = '⏳ Downloading…';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✓ Downloaded';
        btn.disabled = false;
        showToast(`"${title}" downloaded to your pack! 📦`);
      }, 1500);
    });
  });

  $$('[data-tip-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.tipLang;
      showToast(`Study tips in ${LANGUAGES[lang]} — coming soon! 🌍`);
    });
  });
}

// ── Lesson Content ────────────────────────────────────────────
function getLessonContent(id, lowBandwidth) {
  const lesson = findLesson(id);
  if (!lesson) return '<p>Content not available offline.</p>';

  if (lowBandwidth) {
    return `
    <div class="badge badge-terra" style="margin-bottom:var(--sp-md)">🛤️ Low-Bandwidth Trail Mode</div>
    ${getLessonText(id)}
    `;
  }
  return `
  <div style="background:linear-gradient(135deg,rgba(244,168,32,.1),rgba(196,98,45,.08));border-radius:var(--r-lg);padding:var(--sp-md);margin-bottom:var(--sp-xl);font-size:.85rem;color:var(--c-text-med)">
    🖼️ <strong>Full lesson mode</strong> — images, audio, and rich content enabled.
    Switch to Low-Bandwidth Trail if your connection is slow.
  </div>
  ${getLessonText(id)}
  `;
}

function getLessonText(id) {
  const texts = {
    'math-1': `
      <h2>What Are Numbers?</h2>
      <p>Numbers are the language of the world around us. From counting goats in the morning to measuring rain, numbers help us make sense of our environment.</p>
      <div class="info-box">💡 <strong>Key Idea:</strong> Numbers tell us <span class="key-term">how many</span> or <span class="key-term">how much</span> of something there is.</div>
      <h2>Counting to 10</h2>
      <p>Let's start our trail with the first 10 numbers. In many African languages, counting is connected to the fingers on our hands.</p>
      <p>Practice saying each number out loud: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10</p>
      <div class="example-box">🌿 <strong>Trail Example:</strong> If you have 3 mangoes and pick 2 more, how many do you have? Count on your fingers: 3... 4, 5! You have 5 mangoes.</div>
      <h2>Zero — The Empty Basket</h2>
      <p>Zero (0) means <span class="key-term">nothing</span> or <span class="key-term">empty</span>. If all the mangoes are eaten, the basket has zero mangoes.</p>
    `,
    'sci-1': `
      <h2>What Makes Something Alive?</h2>
      <p>Our world is full of living things — from the great baobab tree to the tiny ant carrying food across the path. But what makes something alive?</p>
      <div class="info-box">💡 All living things: <strong>grow, feed, breathe, reproduce, and respond</strong> to their world.</div>
      <h2>Plants — The Silent Providers</h2>
      <p>Plants are living things that make their own food using sunlight, water, and air. This remarkable process is called <span class="key-term">photosynthesis</span>.</p>
      <div class="example-box">🌱 <strong>Observe:</strong> Find a leaf outside. Notice its color — that green color comes from <strong>chlorophyll</strong>, the plant's food-making tool.</div>
      <h2>Animals — Movers & Seekers</h2>
      <p>Animals cannot make their own food. They must find and eat plants or other animals. This is why the savanna is always in motion — the great search for food and water never stops.</p>
    `,
    'lang-1': `
      <h2>Why Reading Opens Every Door</h2>
      <p>Reading is the most powerful tool on your expedition. With it, you can explore any territory — science, history, mathematics — without needing a guide.</p>
      <div class="info-box">📖 Reading builds: <strong>vocabulary, imagination, critical thinking, and independence</strong>.</div>
      <h2>Letters Are Symbols With Sound</h2>
      <p>Every letter represents a sound. When we combine sounds, we form <span class="key-term">syllables</span>. When we combine syllables, we form <span class="key-term">words</span>. Words form <span class="key-term">sentences</span>. Sentences tell <span class="key-term">stories</span>.</p>
      <div class="example-box">✏️ <strong>Practice:</strong> Find 5 objects around you. Try to write their names. Don't worry about spelling — the attempt is the expedition.</div>
      <h2>Reading Every Day</h2>
      <p>Even 10 minutes of reading each day builds a powerful mind. Like a trail through the wilderness, each step takes you further into understanding.</p>
    `,
    'geo-1': `
      <h2>Maps — Windows Into Our World</h2>
      <p>A map is a picture of a place viewed from above, like an eagle soaring over the land. Maps help us understand where we are and where we want to go.</p>
      <div class="info-box">🗺️ Every map has: a <strong>title</strong> (what it shows), a <strong>key/legend</strong> (what the symbols mean), and a <strong>scale</strong> (how distances compare to real life).</div>
      <h2>Directions — The Compass Points</h2>
      <p>Our compass has four main directions: <span class="key-term">North, South, East, West</span>. The sun rises in the East and sets in the West — nature's own compass.</p>
      <div class="example-box">🧭 <strong>Trail Activity:</strong> In the morning, face the rising sun. You are facing East. Behind you is West. Your left hand points North, your right hand South.</div>
    `
  };

  return texts[id] || `
    <h2>${findLesson(id)?.title || 'Lesson'}</h2>
    <p>This lesson covers the foundations of the topic. The content is available offline and has been prepared by experienced educators.</p>
    <div class="info-box">💡 This lesson is part of your offline expedition pack. All content was downloaded and is available without internet.</div>
    <p>Work through the material at your own pace. Use the Study Guidebook on the right to choose your learning technique.</p>
    <div class="example-box">📝 <strong>Trail Activity:</strong> After completing this lesson, try to explain the key concepts to someone else — this is called the "Feynman Technique" and it's one of the most powerful ways to learn.</div>
  `;
}

function renderQuiz(id) {
  const quizzes = {
    'math-1': [
      { q: 'What does zero mean?', opts: ['The largest number', 'Nothing / empty', 'Ten', 'A kind of shape'], correct: 1 },
      { q: 'If you have 4 mangoes and eat 1, how many are left?', opts: ['5', '4', '3', '2'], correct: 2 }
    ],
    'sci-1': [
      { q: 'What do all living things do?', opts: ['Drive vehicles', 'Grow and reproduce', 'Build houses', 'Read books'], correct: 1 },
      { q: 'What color is chlorophyll in plants?', opts: ['Red', 'Blue', 'Green', 'Yellow'], correct: 2 }
    ]
  };

  const quiz = quizzes[id] || [
    { q: 'What is one key idea from this lesson?', opts: ['The main concept applies only in cities', 'Understanding this topic helps daily life', 'This subject is only for experts', 'None of these'], correct: 1 },
    { q: 'How can you practice what you learned?', opts: ['Avoid using it', 'Explain it to someone else', 'Forget it immediately', 'Only read it once'], correct: 1 }
  ];

  return quiz.map((q, qi) => `
    <div class="quiz-question" data-qi="${qi}" data-correct="${q.correct}">
      <div class="question-text">${qi + 1}. ${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((opt, oi) => `
          <button class="quiz-option" data-qi="${qi}" data-oi="${oi}">
            <span>${String.fromCharCode(65+oi)}.</span> ${opt}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function checkQuiz(id) {
  let allAnswered = true;
  let allCorrect = true;

  $$('.quiz-question').forEach(qEl => {
    const correct = parseInt(qEl.dataset.correct);
    const selected = qEl.querySelector('.quiz-option.selected');
    const opts = qEl.querySelectorAll('.quiz-option');

    if (!selected) { allAnswered = false; allCorrect = false; return; }

    opts.forEach((opt, i) => {
      opt.classList.remove('correct', 'wrong', 'selected');
      if (i === correct) opt.classList.add('correct');
    });

    if (parseInt(selected.dataset.oi) !== correct) {
      selected.classList.add('wrong');
      allCorrect = false;
    }
  });

  if (!allAnswered) {
    showToast('Please answer all questions before checking. 📝');
    return;
  }

  // Lock quiz options after submission
  $$('.quiz-option').forEach(opt => { opt.disabled = true; });

  const submitBtn = $('#submit-quiz');
  if (submitBtn) {
    submitBtn.textContent = allCorrect ? '✓ All Correct!' : '↩ Try Again';
    submitBtn.style.background = allCorrect
      ? 'linear-gradient(135deg,var(--c-olive-dark),var(--c-olive))'
      : 'linear-gradient(135deg,var(--c-sky),#4A7A9B)';
    submitBtn.onclick = () => {
      // Re-enable options for retry
      $$('.quiz-option').forEach(opt => {
        opt.disabled = false;
        opt.classList.remove('correct', 'wrong', 'selected');
      });
      submitBtn.textContent = 'Check My Trail 🧭';
      submitBtn.style.background = '';
      submitBtn.onclick = () => checkQuiz(id);
    };
  }

  if (allCorrect) {
    const completed = [...(state.progress.completedLessons || [])];
    if (!completed.includes(id)) {
      completed.push(id);
      mergeState({
        progress: {
          completedLessons: completed,
          lessonsCompleted: completed.length,
          totalMinutes: state.progress.totalMinutes + (findLesson(id)?.duration || 15)
        }
      });
    }
    showToast('🎉 Trail cleared! Lesson completed!');
  } else {
    showToast('Some answers need revisiting — check the highlighted options. 🗺️');
  }
}

// ── Helpers ───────────────────────────────────────────────────
function findLesson(id) {
  for (const course of COURSES) {
    const lesson = course.lessons.find(l => l.id === id);
    if (lesson) return lesson;
  }
  return null;
}

function isOffline() { return !navigator.onLine; }

function toggleDownload(id, btn) {
  const downloads = [...(state.progress.downloads || [])];
  const idx = downloads.indexOf(id);
  if (idx === -1) {
    btn.textContent = '⏳ Saving…';
    btn.className = 'download-btn downloading';
    setTimeout(() => {
      downloads.push(id);
      mergeState({ progress: { downloads } });
      btn.textContent = '✓ Saved';
      btn.className = 'download-btn downloaded';
      showToast('Lesson saved to your offline pack! 🎒');
    }, 1200);
  } else {
    downloads.splice(idx, 1);
    mergeState({ progress: { downloads } });
    btn.textContent = '⬇ Save';
    btn.className = 'download-btn not-downloaded';
  }
}

function filterByLanguage(lang) {
  $$('.camp-item').forEach(item => {
    if (lang === 'all') { item.style.display = ''; return; }
    const id = item.dataset.lesson;
    const lesson = findLesson(id);
    item.style.display = lesson && lesson.langs.includes(lang) ? '' : 'none';
  });
}

function saveSetupForm(form, prefix) {
  const name = form.querySelector(`#${prefix}-name`)?.value || '';
  const internet = form.querySelector(`[name="${prefix}-internet"]:checked`)?.value || 'no';
  const device = form.querySelector(`[name="${prefix}-device"]:checked`)?.value || 'smartphone';
  const language = form.querySelector(`#${prefix}-lang`)?.value || 'en';
  mergeState({ user: { name, internet, device, language, setupDone: true } });
}

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function langFlag(lang) {
  const flags = { en:'🇬🇧', sw:'🇹🇿', fr:'🇫🇷', ar:'🇸🇦', hi:'🇮🇳', es:'🇪🇸', pt:'🇵🇹', ha:'🇳🇬' };
  return flags[lang] || '🌍';
}

function showToast(msg, duration = 3000) {
  let toast = $('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
      background:var(--c-earth-dark);color:white;padding:12px 20px;
      border-radius:999px;font-size:.9rem;font-weight:600;
      z-index:1000;box-shadow:0 4px 20px rgba(0,0,0,.3);
      font-family:var(--font);text-align:center;max-width:300px;
      animation:slideUp .3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// ── Setup Modal ───────────────────────────────────────────────
function maybeShowSetup() {
  // Modal is opt-in only — the setup form lives on the landing page.
  // Never auto-block the UI on first load.
}

function dismissModal() {
  const modal = $('#setup-modal');
  if (modal) {
    mergeState({ user: { setupDone: true } });
    modal.classList.add('hidden');
  }
}

function bindSetupModal() {
  const modal = $('#setup-modal');
  const form = $('#setup-form');
  if (!form || !modal) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#setup-name')?.value || '';
    const internet = document.querySelector('[name="internet"]:checked')?.value || 'no';
    const device = document.querySelector('[name="device"]:checked')?.value || 'smartphone';
    const language = $('#setup-language')?.value || 'en';
    mergeState({ user: { name, internet, device, language, setupDone: true } });
    modal.classList.add('hidden');
    showToast(`Welcome, ${name || 'Explorer'}! Your expedition begins. 🌅`);
  });

  // Dismiss by clicking backdrop (outside the card)
  modal.addEventListener('click', e => {
    if (e.target === modal) dismissModal();
  });

  // Dismiss via skip button
  const skipBtn = $('#setup-skip');
  if (skipBtn) {
    skipBtn.addEventListener('click', dismissModal);
  }

  // Dismiss via Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) dismissModal();
  });
}

// ── Connection Status ─────────────────────────────────────────
function updateConnectionStatus() {
  const dot = $('#connection-dot');
  const label = $('#connection-label');
  const banner = $('#offline-banner');

  const online = navigator.onLine;
  if (dot) { dot.className = 'connection-dot ' + (online ? 'online' : 'offline'); }
  if (label) { label.textContent = online ? 'Online' : 'Offline camp'; }
  if (banner) { banner.classList.toggle('hidden', online); }
}

// ── Service Worker ────────────────────────────────────────────
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // Unregister all stale service workers so cached old JS never blocks updates
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  registerSW();
  updateConnectionStatus();
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  Router.init();
  bindSetupModal();
  maybeShowSetup();
}

document.addEventListener('DOMContentLoaded', init);
