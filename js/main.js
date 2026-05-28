const DATA_PATHS = {
  competitions: "data/competitions.json",
  themes: "data/themes.json",
  works: "data/works.json",
  articles: "data/articles.json",
  cases: "data/cases.json"
};

const CATEGORIES = ["全部", "广告设计", "视觉传达", "品牌设计", "包装设计", "插画设计", "数字媒体", "文创设计", "海报设计"];
const SCOPES = ["全部", "全国性", "区域性", "国际/专项"];
const ARTICLE_CATEGORIES = ["全部", "新手指南", "命题分析", "作品准备", "展板排版", "设计说明", "作品集整理", "常见问题"];
const COPYRIGHT_NOTICE = "本站为设计学习与竞赛资料整理网站，仅用于学习研究、信息索引与设计分析。本站展示的比赛信息、主题内容与作品资料均以各比赛官网、主办方公告及原始发布平台为准。涉及优秀作品、图片及相关视觉内容的版权归原作者、主办方或相关权利人所有。如有侵权或信息不当，请联系本站处理。本站不提供他人作品的高清下载、商用授权或二次分发。";
const HELPER_DRAFT_KEY = "designBriefArchiveSubmissionDraft";
const DASHBOARD_KEY = "designBriefArchiveDashboard";
const DASHBOARD_STATUSES = ["待了解", "准备材料中", "已进入官网", "已提交", "等待结果"];
const MEMORY_KEYS = {
  profile: "designBriefArchiveLocalProfile",
  competitionFavorites: "designBriefArchiveCompetitionFavorites",
  workFavorites: "designBriefArchiveWorkFavorites",
  plans: "designBriefArchivePlans",
  preferences: "designBriefArchivePreferences",
  privacyNotice: "designBriefArchivePrivacyNoticeSeen",
  welcomeSeen: "designBriefArchiveWelcomeSeen"
};
const PLAN_STATUSES = ["想参加", "准备中", "已提交", "已放弃"];
const DEFAULT_PREFERENCES = {
  themeMode: "system",
  lastCompetitionCategory: "全部",
  lastCompetitionQuery: "",
  lastSearchQuery: ""
};

document.addEventListener("DOMContentLoaded", () => {
  setupLocalMemory();
  setupChrome();
  setupFooter();
  setupReveal();
  setActiveNav();
  setupDashboardActions();
  setupPrivacyActions();
  routePage();
});

function setupChrome() {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".menu-toggle");
  const progress = document.querySelector(".progress-bar span");
  const backTop = document.querySelector(".back-top");

  toggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll("a[href='#']").forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
  });

  window.addEventListener("scroll", () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progressValue = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    header?.classList.toggle("scrolled", window.scrollY > 12);
    backTop?.classList.toggle("visible", window.scrollY > 520);
    if (progress) progress.style.width = `${progressValue}%`;
  }, { passive: true });

  backTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setupFooter() {
  const footer = document.querySelector(".site-footer");
  if (!footer || footer.querySelector(".footer-links")) return;
  footer.insertAdjacentHTML("beforeend", `
    <nav class="footer-links" aria-label="页脚导航">
      <a href="guide.html">使用指南</a>
      <a href="search.html">全站搜索</a>
      <a href="privacy.html">隐私与版权</a>
      <a href="maintenance.html">维护中心</a>
      <a href="about.html">关于本站</a>
    </nav>
  `);
}

function setupReveal() {
  const elements = document.querySelectorAll(".reveal, .card, .article-card, .work-card, .timeline-item, .category-card");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  elements.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index % 6, 5) * 45}ms`;
    observer.observe(el);
  });
}

function setActiveNav() {
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === file);
  });
}

function setupLocalMemory() {
  applyThemePreference(getPreferences().themeMode);
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getPreferences().themeMode === "system") applyThemePreference("system");
  });
  setupLocalMemoryActions();
  renderProfileChip();
  if (!localRead(MEMORY_KEYS.welcomeSeen, false)) {
    window.setTimeout(() => showProfileDialog(), 360);
  }
}

function setupLocalMemoryActions() {
  document.addEventListener("click", (event) => {
    const profileButton = event.target.closest("[data-local-profile-open]");
    if (profileButton) {
      showProfileDialog();
      return;
    }

    const favoriteCompetition = event.target.closest("[data-favorite-competition]");
    if (favoriteCompetition) {
      const id = favoriteCompetition.dataset.favoriteCompetition;
      toggleFavorite(MEMORY_KEYS.competitionFavorites, id);
      syncFavoriteButtons("competition", id);
      refreshLocalMemoryHub();
      showLocalPrivacyNotice();
      return;
    }

    const favoriteWork = event.target.closest("[data-favorite-work]");
    if (favoriteWork) {
      const id = favoriteWork.dataset.favoriteWork;
      toggleFavorite(MEMORY_KEYS.workFavorites, id);
      syncFavoriteButtons("work", id);
      refreshLocalMemoryHub();
      showLocalPrivacyNotice();
      return;
    }

    const addPlan = event.target.closest("[data-plan-add]");
    if (addPlan) {
      const id = addPlan.dataset.planAdd;
      addLocalPlan(id);
      syncPlanButtons(id);
      refreshLocalMemoryHub();
      showLocalPrivacyNotice();
      return;
    }

    const removeFavorite = event.target.closest("[data-local-remove-favorite]");
    if (removeFavorite) {
      removeFavoriteByType(removeFavorite.dataset.localRemoveFavorite, removeFavorite.dataset.id);
      refreshLocalMemoryHub();
      return;
    }

    const removePlan = event.target.closest("[data-plan-remove]");
    if (removePlan) {
      removeLocalPlan(removePlan.dataset.planRemove);
      refreshLocalMemoryHub();
      return;
    }

    const clearLocal = event.target.closest("[data-local-clear-all]");
    if (clearLocal) {
      clearLocalMemory();
      refreshLocalMemoryHub();
      renderProfileChip();
      resetLocalActionButtons();
      clearLocal.textContent = "已清空本地数据";
      return;
    }

    const exportLocal = event.target.closest("[data-local-export]");
    if (exportLocal) {
      exportLocalMemory();
    }
  });

  document.addEventListener("change", (event) => {
    const themeSelect = event.target.closest("[data-theme-mode]");
    if (themeSelect) {
      savePreferences({ themeMode: themeSelect.value });
      applyThemePreference(themeSelect.value);
      return;
    }

    const planStatus = event.target.closest("[data-plan-status]");
    if (planStatus) {
      updateLocalPlan(planStatus.dataset.planStatus, { status: planStatus.value });
      return;
    }

    const importLocal = event.target.closest("[data-local-import]");
    if (importLocal) {
      importLocalMemory(importLocal.files?.[0]);
      importLocal.value = "";
    }
  });

  document.addEventListener("input", (event) => {
    const planNote = event.target.closest("[data-plan-note]");
    if (planNote) {
      updateLocalPlan(planNote.dataset.planNote, { note: planNote.value.slice(0, 160) });
    }
  });
}

function showProfileDialog() {
  const current = getLocalProfile();
  const preferences = getPreferences();
  document.querySelector(".profile-dialog")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="profile-dialog" role="dialog" aria-modal="true" aria-label="本地资料设置">
      <form class="profile-dialog-card">
        <p class="eyebrow">本地资料</p>
        <h2>欢迎来到赛题档案馆</h2>
        <p class="muted">这里不是登录系统。昵称、头像和主题偏好只保存在你的浏览器本地，不需要填写真实姓名、学校、手机号或邮箱。</p>
        <div class="form-grid">
          <label>昵称<input name="nickname" type="text" maxlength="16" value="${safe(current.nickname || "")}" placeholder="例如：设计新同学"></label>
          <label>头像标记<select name="avatar">
            ${["档", "赛", "设", "学", "A"].map((item) => `<option ${item === current.avatar ? "selected" : ""}>${item}</option>`).join("")}
          </select></label>
          <label>头像颜色<select name="avatarTone">
            ${["sage", "clay", "ink", "gold", "blue", "rose"].map((item) => `<option value="${item}" ${item === current.avatarTone ? "selected" : ""}>${avatarToneLabel(item)}</option>`).join("")}
          </select></label>
          <label>主题模式<select name="themeMode">
            ${themeOptions(preferences.themeMode)}
          </select></label>
        </div>
        <div class="card-actions">
          <button class="button primary" type="submit">保存本地资料</button>
          <button class="button ghost" type="button" data-profile-skip>跳过</button>
        </div>
      </form>
    </div>
  `);
  const dialog = document.querySelector(".profile-dialog");
  const form = dialog?.querySelector("form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    localWrite(MEMORY_KEYS.profile, {
      nickname: String(data.nickname || "设计新同学").trim().slice(0, 16) || "设计新同学",
      avatar: data.avatar || "档",
      avatarTone: data.avatarTone || "sage",
      updatedAt: new Date().toISOString()
    });
    savePreferences({ themeMode: data.themeMode || "system" });
    applyThemePreference(data.themeMode || "system");
    localWrite(MEMORY_KEYS.welcomeSeen, true);
    dialog.remove();
    renderProfileChip();
    refreshLocalMemoryHub();
  });
  dialog?.querySelector("[data-profile-skip]")?.addEventListener("click", () => {
    localWrite(MEMORY_KEYS.welcomeSeen, true);
    dialog.remove();
  });
}

function renderProfileChip() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const profile = getLocalProfile();
  let chip = header.querySelector(".profile-chip");
  if (!chip) {
    header.insertAdjacentHTML("beforeend", `<button class="profile-chip" type="button" data-local-profile-open></button>`);
    chip = header.querySelector(".profile-chip");
  }
  chip.innerHTML = `<span class="profile-avatar avatar-${safe(profile.avatarTone)}">${safe(profile.avatar)}</span><span>${safe(profile.nickname)}</span>`;
}

function getLocalProfile() {
  return {
    nickname: "设计新同学",
    avatar: "档",
    avatarTone: "sage",
    ...localRead(MEMORY_KEYS.profile, {})
  };
}

function getPreferences() {
  return { ...DEFAULT_PREFERENCES, ...localRead(MEMORY_KEYS.preferences, {}) };
}

function savePreferences(patch) {
  localWrite(MEMORY_KEYS.preferences, { ...getPreferences(), ...patch });
}

function applyThemePreference(mode = "system") {
  const resolved = mode === "system"
    ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;
  document.documentElement.dataset.theme = resolved === "dark" ? "dark" : "light";
}

function themeOptions(value) {
  return [
    ["light", "浅色"],
    ["dark", "深色"],
    ["system", "跟随系统"]
  ].map(([id, label]) => `<option value="${id}" ${id === value ? "selected" : ""}>${label}</option>`).join("");
}

function avatarToneLabel(value) {
  return ({ sage: "青灰", clay: "陶土", ink: "墨色", gold: "旧金", blue: "蓝灰", rose: "玫瑰灰" })[value] || "青灰";
}

function localRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function localWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    alert("本地存储写入失败，可能是浏览器限制或存储空间不足。");
  }
}

function getIdList(key) {
  const value = localRead(key, []);
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function setIdList(key, ids) {
  localWrite(key, [...new Set(ids.filter(Boolean))]);
}

function isFavorite(key, id) {
  return getIdList(key).includes(id);
}

function toggleFavorite(key, id) {
  if (!id) return;
  const items = getIdList(key);
  setIdList(key, items.includes(id) ? items.filter((item) => item !== id) : [id, ...items]);
}

function updateFavoriteButton(button, active, label) {
  button.textContent = active ? "已收藏" : label;
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", String(active));
}

function syncFavoriteButtons(type, id) {
  const key = type === "work" ? MEMORY_KEYS.workFavorites : MEMORY_KEYS.competitionFavorites;
  const label = type === "work" ? "收藏作品" : "收藏比赛";
  const selector = type === "work" ? `[data-favorite-work="${cssEscape(id)}"]` : `[data-favorite-competition="${cssEscape(id)}"]`;
  document.querySelectorAll(selector).forEach((button) => updateFavoriteButton(button, isFavorite(key, id), label));
}

function favoriteButton(type, id) {
  const key = type === "work" ? MEMORY_KEYS.workFavorites : MEMORY_KEYS.competitionFavorites;
  const label = type === "work" ? "收藏作品" : "收藏比赛";
  const active = isFavorite(key, id);
  return `<button class="button ghost ${active ? "active" : ""}" type="button" data-favorite-${type}="${safe(id)}" aria-pressed="${active}">${active ? "已收藏" : label}</button>`;
}

function getLocalPlans() {
  const value = localRead(MEMORY_KEYS.plans, []);
  return Array.isArray(value) ? value : [];
}

function saveLocalPlans(items) {
  localWrite(MEMORY_KEYS.plans, items);
}

function addLocalPlan(competitionId) {
  if (!competitionId) return;
  const items = getLocalPlans();
  if (items.some((item) => item.competitionId === competitionId)) return;
  items.unshift({ competitionId, status: PLAN_STATUSES[0], note: "", createdAt: new Date().toISOString() });
  saveLocalPlans(items);
}

function updateLocalPlan(competitionId, patch) {
  saveLocalPlans(getLocalPlans().map((item) => item.competitionId === competitionId ? { ...item, ...patch } : item));
}

function removeLocalPlan(competitionId) {
  saveLocalPlans(getLocalPlans().filter((item) => item.competitionId !== competitionId));
}

function removeFavoriteByType(type, id) {
  const key = type === "work" ? MEMORY_KEYS.workFavorites : MEMORY_KEYS.competitionFavorites;
  setIdList(key, getIdList(key).filter((item) => item !== id));
}

function planButton(id) {
  const active = getLocalPlans().some((item) => item.competitionId === id);
  return `<button class="button ghost ${active ? "active" : ""}" type="button" data-plan-add="${safe(id)}">${active ? "已加入计划" : "加入参赛计划"}</button>`;
}

function syncPlanButtons(id) {
  const active = getLocalPlans().some((item) => item.competitionId === id);
  document.querySelectorAll(`[data-plan-add="${cssEscape(id)}"]`).forEach((button) => {
    button.textContent = active ? "已加入计划" : "加入参赛计划";
    button.classList.toggle("active", active);
  });
}

function showLocalPrivacyNotice() {
  if (localRead(MEMORY_KEYS.privacyNotice, false)) return;
  localWrite(MEMORY_KEYS.privacyNotice, true);
  document.querySelector(".local-toast")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="local-toast" role="status">
      这些数据仅保存在你的浏览器本地，不会上传到服务器。清理浏览器数据后可能会丢失。
    </div>
  `);
  window.setTimeout(() => document.querySelector(".local-toast")?.remove(), 5200);
}

function clearLocalMemory() {
  Object.values(MEMORY_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(DASHBOARD_KEY);
  localStorage.removeItem(HELPER_DRAFT_KEY);
  applyThemePreference(DEFAULT_PREFERENCES.themeMode);
}

function refreshLocalMemoryHub() {
  if (!["planner", "dashboard"].includes(document.body.dataset.page) || !window.archivePlannerData) return;
  renderLocalMemoryHub(window.archivePlannerData.competitions, window.archivePlannerData.works);
}

function resetLocalActionButtons() {
  document.querySelectorAll("[data-favorite-competition]").forEach((button) => updateFavoriteButton(button, false, "收藏比赛"));
  document.querySelectorAll("[data-favorite-work]").forEach((button) => updateFavoriteButton(button, false, "收藏作品"));
  document.querySelectorAll("[data-plan-add]").forEach((button) => {
    button.textContent = "加入参赛计划";
    button.classList.remove("active");
  });
}

function exportLocalMemory() {
  const payload = {
    exportedAt: new Date().toISOString(),
    note: "赛题档案馆本地记忆导出文件，仅包含昵称、头像、主题偏好、收藏和参赛计划。",
    profile: getLocalProfile(),
    preferences: getPreferences(),
    competitionFavorites: getIdList(MEMORY_KEYS.competitionFavorites),
    workFavorites: getIdList(MEMORY_KEYS.workFavorites),
    plans: getLocalPlans()
  };
  downloadTextFile(`赛题档案馆-本地记忆-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
}

function importLocalMemory(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      if (payload.profile && typeof payload.profile === "object") localWrite(MEMORY_KEYS.profile, sanitizeProfile(payload.profile));
      if (payload.preferences && typeof payload.preferences === "object") savePreferences(sanitizePreferences(payload.preferences));
      if (Array.isArray(payload.competitionFavorites)) setIdList(MEMORY_KEYS.competitionFavorites, payload.competitionFavorites.map(String));
      if (Array.isArray(payload.workFavorites)) setIdList(MEMORY_KEYS.workFavorites, payload.workFavorites.map(String));
      if (Array.isArray(payload.plans)) saveLocalPlans(payload.plans.map(sanitizePlan).filter(Boolean));
      localWrite(MEMORY_KEYS.welcomeSeen, true);
      applyThemePreference(getPreferences().themeMode);
      renderProfileChip();
      refreshLocalMemoryHub();
      showLocalPrivacyNotice();
    } catch (error) {
      alert("导入失败，请确认文件是赛题档案馆导出的本地记忆 JSON。");
    }
  };
  reader.readAsText(file, "utf-8");
}

function sanitizeProfile(profile) {
  const tones = ["sage", "clay", "ink", "gold", "blue", "rose"];
  return {
    nickname: String(profile.nickname || "设计新同学").trim().slice(0, 16) || "设计新同学",
    avatar: String(profile.avatar || "档").slice(0, 2),
    avatarTone: tones.includes(profile.avatarTone) ? profile.avatarTone : "sage",
    updatedAt: new Date().toISOString()
  };
}

function sanitizePreferences(preferences) {
  const modes = ["light", "dark", "system"];
  return {
    themeMode: modes.includes(preferences.themeMode) ? preferences.themeMode : DEFAULT_PREFERENCES.themeMode,
    lastCompetitionCategory: CATEGORIES.includes(preferences.lastCompetitionCategory) ? preferences.lastCompetitionCategory : DEFAULT_PREFERENCES.lastCompetitionCategory,
    lastCompetitionQuery: String(preferences.lastCompetitionQuery || "").slice(0, 80),
    lastSearchQuery: String(preferences.lastSearchQuery || "").slice(0, 80)
  };
}

function sanitizePlan(plan) {
  if (!plan?.competitionId) return null;
  return {
    competitionId: String(plan.competitionId),
    status: PLAN_STATUSES.includes(plan.status) ? plan.status : PLAN_STATUSES[0],
    note: String(plan.note || "").slice(0, 160),
    createdAt: plan.createdAt || new Date().toISOString()
  };
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value || ""));
  return String(value || "").replace(/"/g, '\\"');
}

async function routePage() {
  const page = document.body.dataset.page;
  try {
    if (page === "home") await renderHome();
    if (page === "search") await renderSearchPage();
    if (page === "competitions") await renderCompetitionsPage();
    if (page === "competition-detail") await renderCompetitionDetail();
    if (page === "similar") await renderSimilarPage();
    if (page === "themes") await renderThemesPage();
    if (page === "works") await renderWorksPage();
    if (page === "cases") await renderCasesPage();
    if (page === "case-detail") await renderCaseDetail();
    if (page === "work-detail") await renderWorkDetail();
    if (page === "analysis") await renderAnalysisPage();
    if (page === "article-detail") await renderArticleDetail();
    if (page === "planner") await renderPlanner();
    if (page === "dashboard") await renderDashboard();
    if (page === "maintenance") await renderMaintenance();
    if (page === "submit-helper") await renderSubmitHelper();
    setupReveal();
  } catch (error) {
    const main = document.querySelector("main");
    if (main) main.innerHTML = emptyState("内容加载失败，请检查数据文件路径或稍后重试。");
  }
}

async function loadData(key) {
  try {
    const response = await fetch(DATA_PATHS[key]);
    if (!response.ok) throw new Error(`Failed to load ${key}`);
    return response.json();
  } catch (error) {
    try {
      return await loadDataWithXHR(DATA_PATHS[key]);
    } catch (xhrError) {
      if (window.ARCHIVE_DATA && window.ARCHIVE_DATA[key]) return window.ARCHIVE_DATA[key];
      throw xhrError;
    }
  }
}

function loadDataWithXHR(path) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open("GET", path, true);
    request.onload = () => {
      if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
        try {
          resolve(JSON.parse(request.responseText));
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`Failed to load ${path}`));
      }
    };
    request.onerror = () => reject(new Error(`Failed to load ${path}`));
    request.send();
  });
}

async function renderHome() {
  const [competitions, themes, works, articles, cases] = await Promise.all([
    loadData("competitions"),
    loadData("themes"),
    loadData("works"),
    loadData("articles"),
    loadData("cases")
  ]);
  const realCompetitions = competitions.filter((item) => item.scope !== "示例数据");
  fill("#home-stats", homeStatsCards(competitions, cases));
  fill("#home-competitions", realCompetitions.slice(-6).reverse().map(competitionCard).join(""));
  fill("#category-cloud", CATEGORIES.filter((item) => item !== "全部").map(categoryCard).join(""));
  fill("#home-regions", regionCoverageCards(competitions));
  fill("#home-themes", themes.slice(0, 4).map(themeItem).join(""));
  fill("#home-works", works.slice(0, 3).map(workRow).join(""));
  fill("#home-cases", cases.slice(0, 3).map(caseCard).join(""));
  fill("#home-articles", articles.slice(0, 6).map(articleCard).join(""));
  bindTimeline();
}

async function renderCompetitionsPage() {
  const competitions = await loadData("competitions");
  const preferences = getPreferences();
  let state = { query: preferences.lastCompetitionQuery || "", category: preferences.lastCompetitionCategory || "全部", difficulty: "全部", beginner: "全部", scope: "全部", region: "全部", realOnly: true, verifiedOnly: false };
  createFilterButtons("[data-filter-group='category']", CATEGORIES, (value) => {
    state.category = value;
    savePreferences({ lastCompetitionCategory: value });
    update();
  });
  fillSelect("#difficulty-filter", ["全部", "入门", "中等", "较高"]);
  fillSelect("#beginner-filter", ["全部", "适合新手", "更适合有基础"]);
  fillSelect("#scope-filter", SCOPES);
  const regions = ["全部", ...unique(competitions.map((item) => item.region || "待补充")).sort()];
  fillSelect("#region-filter", regions);
  createFilterButtons("[data-filter-group='region-tags']", regions, (value) => {
    state.region = value;
    const regionSelect = document.querySelector("#region-filter");
    if (regionSelect) regionSelect.value = value;
    update();
  });
  const competitionSearch = document.querySelector("#competition-search");
  if (competitionSearch) competitionSearch.value = state.query;
  syncFilterButton("[data-filter-group='category']", state.category);
  onInput("#competition-search", (value) => {
    state.query = value;
    savePreferences({ lastCompetitionQuery: value });
    update();
  });
  onChange("#difficulty-filter", (value) => { state.difficulty = value; update(); });
  onChange("#beginner-filter", (value) => { state.beginner = value; update(); });
  onChange("#scope-filter", (value) => { state.scope = value; update(); });
  onChange("#region-filter", (value) => {
    state.region = value;
    syncFilterButton("[data-filter-group='region-tags']", value);
    update();
  });
  document.querySelector("#real-only-filter")?.addEventListener("change", (event) => {
    state.realOnly = event.target.checked;
    update();
  });
  const realOnlyFilter = document.querySelector("#real-only-filter");
  if (realOnlyFilter) realOnlyFilter.checked = true;
  document.querySelector("#verified-only-filter")?.addEventListener("change", (event) => {
    state.verifiedOnly = event.target.checked;
    update();
  });

  function update() {
    const result = competitions.filter((item) => {
      const matchesQuery = includesAny(item, state.query, ["name", "category", "summary", "tags", "suitableMajor", "workTypes"]);
      const matchesCategory = state.category === "全部" || item.category === state.category || hasValue(item.tags, state.category);
      const matchesDifficulty = state.difficulty === "全部" || item.difficulty === state.difficulty;
      const matchesBeginner = state.beginner === "全部" || (state.beginner === "适合新手" ? item.suitableForBeginner : !item.suitableForBeginner);
      const matchesScope = state.scope === "全部" || (item.scope || "待补充") === state.scope;
      const matchesRegion = state.region === "全部" || (item.region || "待补充") === state.region;
      const matchesRealOnly = !state.realOnly || item.scope !== "示例数据";
      const matchesVerified = !state.verifiedOnly || hasOfficialSource(item);
      return matchesQuery && matchesCategory && matchesDifficulty && matchesBeginner && matchesScope && matchesRegion && matchesRealOnly && matchesVerified;
    });
    fill("#competition-count", `当前显示 ${result.length} 个比赛`);
    fill("#competitions-list", result.length ? result.map(competitionCard).join("") : emptyState("暂无匹配内容。你可以尝试更换关键词或筛选条件。"));
    setupReveal();
  }
  update();
}

async function renderSearchPage() {
  const [competitions, themes, works, articles, cases] = await Promise.all([
    loadData("competitions"),
    loadData("themes"),
    loadData("works"),
    loadData("articles"),
    loadData("cases")
  ]);
  const input = document.querySelector("#global-search");
  const initialQuery = getParam("q") || getPreferences().lastSearchQuery || "";
  if (input) input.value = initialQuery;

  const records = [
    ...competitions.map((item) => searchRecord("比赛", item.name, item.summary || item.description, `competition-detail.html?id=${item.id}`, item)),
    ...themes.map((item) => searchRecord("主题", item.theme, `${item.competitionName} ${item.direction} ${item.analysis}`, "themes.html", item)),
    ...works.map((item) => searchRecord("作品", item.title, `${item.competitionName} ${item.type} ${flattenText(item.analysis)}`, `work-detail.html?id=${item.id}`, item)),
    ...cases.map((item) => searchRecord("案例", item.title, `${item.competitionName} ${item.workType} ${item.caseHighlight} ${item.analysis}`, `case-detail.html?id=${item.id}`, item)),
    ...articles.map((item) => searchRecord("文章", item.title, `${item.summary} ${flattenText(item.content)}`, `article-detail.html?id=${item.id}`, item))
  ];

  function update() {
    const query = input?.value || "";
    savePreferences({ lastSearchQuery: query });
    const normalized = normalizeText(query);
    const result = normalized ? records
      .map((record) => ({ ...record, score: scoreSearchRecord(record, normalized) }))
      .filter((record) => record.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "zh-CN"))
      .slice(0, 48) : [];
    fill("#global-search-count", normalized ? `找到 ${result.length} 条相关内容` : "输入关键词后开始检索");
    fill("#global-search-results", normalized ? (result.length ? result.map(searchResultCard).join("") : emptyState("暂无匹配内容，可以换一个关键词。")) : searchSuggestions());
    setupReveal();
  }

  onInput("#global-search", update);
  update();
}

async function renderCompetitionDetail() {
  const id = getParam("id");
  const [competitions, themes, works] = await Promise.all([loadData("competitions"), loadData("themes"), loadData("works")]);
  const item = competitions.find((entry) => entry.id === id);
  const root = document.querySelector("#competition-detail");
  if (!item || !root) {
    fill("#competition-detail", emptyState("没有找到对应内容，请返回上一页查看。"));
    return;
  }
  const relatedThemes = themes.filter((theme) => theme.competitionId === item.id);
  const relatedWorks = works.filter((work) => work.competitionId === item.id);
  root.innerHTML = `
    <section class="detail-hero reveal">
      <div>
        <p class="eyebrow">Competition File / ${safe(item.id)}</p>
        <h1>${safe(item.name)}</h1>
        <p class="hero-note">${safe(item.description || item.summary)}</p>
        <div class="meta-row">${tags([item.category, item.difficulty, item.suitableForBeginner ? "适合新手" : "更适合有基础"])}</div>
      </div>
      <aside class="detail-aside">
        ${coverArt(item, "Competition", "cover-detail")}
        <p class="eyebrow">Source</p>
        <p>${safe(item.sourceName)}</p>
        ${sourceLink(item.sourceUrl || item.officialUrl, "查看官方来源")}
        ${favoriteButton("competition", item.id)}
        ${planButton(item.id)}
      </aside>
    </section>
    <section class="detail-grid">
      <article class="detail-block full">
        <h2>基本信息</h2>
        <dl class="field-list">
          ${field("比赛类型", item.category)}
          ${field("赛事范围", item.scope)}
          ${field("地区", item.region)}
          ${field("适合专业", join(item.suitableMajor))}
          ${field("适合年级", join(item.suitableGrade))}
          ${field("适合作品类型", join(item.workTypes))}
          ${field("参赛难度", item.difficulty)}
          ${field("新手适配", item.suitableForBeginner ? "适合新手" : "更适合有基础")}
        </dl>
      </article>
      <article class="detail-block">
        <h2>历年主题</h2>
        ${relatedThemes.length ? relatedThemes.map((theme) => `<p><strong>${safe(theme.year)}</strong> ${safe(theme.theme)}<br><span class="muted">${safe(theme.direction)}</span></p>`).join("") : "<p>暂无已整理主题。</p>"}
      </article>
      <article class="detail-block">
        <h2>优秀作品索引</h2>
        ${relatedWorks.length ? relatedWorks.map((work) => `<p><a class="text-link" href="work-detail.html?id=${safe(work.id)}">${safe(work.title)} <span>→</span></a><br><span class="muted">${safe(work.year)} / ${safe(work.type)}</span></p>`).join("") : "<p>暂无已整理作品索引。</p>"}
      </article>
      <article class="detail-block">
        <h2>参赛建议</h2>
        <p>${safe(item.suggestion)}</p>
      </article>
      <article class="detail-block">
        <h2>注意事项</h2>
        <p>${safe(item.notes)}</p>
      </article>
      <article class="notice-card detail-block full">
        <h2>来源与版权提示</h2>
        <p>${safe(item.copyrightNote)}</p>
        <p>比赛信息可能随时间变化，报名时间、参赛规则、作品要求等请以比赛官网或主办方官方发布信息为准。本站仅做学习研究与信息索引。</p>
      </article>
    </section>`;
}

async function renderSimilarPage() {
  const competitions = await loadData("competitions");
  const groups = buildSimilarityGroups(competitions);
  const tagsList = ["全部", ...groups.map((group) => group.tag)];
  const state = { query: "", tag: "全部" };

  createFilterButtons("[data-filter-group='similar-tags']", tagsList.slice(0, 20), (value) => {
    state.tag = value;
    update();
  });
  onInput("#similar-search", (value) => {
    state.query = value;
    update();
  });
  update();

  function update() {
    const query = normalizeText(state.query);
    const filtered = groups.filter((group) => {
      const matchesTag = state.tag === "全部" || group.tag === state.tag;
      const searchText = normalizeText([
        group.tag,
        group.items.map((item) => [item.name, item.category, item.region, item.summary, item.reuseAdvice, item.similarityTags].flat().join(" ")).join(" ")
      ].join(" "));
      return matchesTag && (!query || searchText.includes(query));
    });
    fill("#similar-count", `当前显示 ${filtered.length} 组相似赛题`);
    fill("#similar-groups", filtered.length ? filtered.map(similarityGroupCard).join("") : emptyState("暂无匹配的相似赛题分组。"));
    setupReveal();
  }
}

function buildSimilarityGroups(competitions) {
  const map = new Map();
  competitions
    .filter((item) => item.scope !== "示例数据")
    .forEach((item) => {
      const keys = unique([
        ...toArray(item.similarityTags),
        item.category,
        ...toArray(item.workTypes).slice(0, 2)
      ]).filter((tagName) => tagName && tagName !== "待补充");
      keys.forEach((tagName) => {
        if (!map.has(tagName)) map.set(tagName, []);
        map.get(tagName).push(item);
      });
    });
  return [...map.entries()]
    .map(([tagName, items]) => ({
      tag: tagName,
      items: uniqueById(items).sort((a, b) => Number(hasOfficialSource(b)) - Number(hasOfficialSource(a)) || a.name.localeCompare(b.name, "zh-CN"))
    }))
    .filter((group) => group.items.length >= 2)
    .sort((a, b) => b.items.length - a.items.length || a.tag.localeCompare(b.tag, "zh-CN"));
}

function regionCountMap(items) {
  const map = new Map();
  items.forEach((item) => {
    const region = item.region || "待补充";
    map.set(region, (map.get(region) || 0) + 1);
  });
  return map;
}

function similarityGroupCard(group) {
  const topItems = group.items.slice(0, 6);
  return `<article class="similarity-card reveal">
    <header>
      <div>
        <p class="eyebrow">Similar Brief</p>
        <h2>${safe(group.tag)}</h2>
      </div>
      <span class="archive-id">${group.items.length} 个</span>
    </header>
    <p class="muted">可以共用前期调研、用户洞察和基础视觉方向，但每个比赛的命题、格式、授权协议与提交系统都要单独核对。</p>
    <div class="similarity-list">
      ${topItems.map(similarityItem).join("")}
    </div>
  </article>`;
}

function similarityItem(item) {
  return `<section class="similarity-item">
    <div>
      <h3>${safe(item.name)}</h3>
      <p class="muted">${safe(item.scope)} / ${safe(item.region)} / ${safe(item.category)} / ${hasOfficialSource(item) ? "有公开来源" : "待核验"}</p>
      <p>${safe(item.reuseAdvice || item.summary)}</p>
    </div>
    <div class="card-actions">
      ${favoriteButton("competition", item.id)}
      ${planButton(item.id)}
      <a class="button ghost" href="competition-detail.html?id=${safe(item.id)}">详情 <span>→</span></a>
      ${sourceLink(item.sourceUrl || item.officialUrl, "来源")}
    </div>
  </section>`;
}

async function renderThemesPage() {
  const themes = await loadData("themes");
  let state = { query: "", competition: "全部", year: "全部" };
  fillSelect("#theme-competition-filter", ["全部", ...unique(themes.map((item) => item.competitionName))]);
  fillSelect("#theme-year-filter", ["全部", ...unique(themes.map((item) => item.year)).sort((a, b) => b.localeCompare(a))]);
  onInput("#theme-search", (value) => { state.query = value; update(); });
  onChange("#theme-competition-filter", (value) => { state.competition = value; update(); });
  onChange("#theme-year-filter", (value) => { state.year = value; update(); });
  function update() {
    const result = themes.filter((item) => {
      return includesAny(item, state.query, ["theme", "competitionName", "year", "direction", "keywords"])
        && (state.competition === "全部" || item.competitionName === state.competition)
        && (state.year === "全部" || item.year === state.year);
    });
    fill("#theme-count", `当前显示 ${result.length} 条主题`);
    fill("#themes-list", result.length ? result.map(themeItem).join("") : emptyState("暂无匹配内容。你可以尝试更换关键词或筛选条件。"));
    bindTimeline();
    setupReveal();
  }
  update();
}

async function renderWorksPage() {
  const works = await loadData("works");
  let state = { query: "", type: "全部", year: "全部" };
  fillSelect("#work-type-filter", ["全部", ...unique(works.map((item) => item.type))]);
  fillSelect("#work-year-filter", ["全部", ...unique(works.map((item) => item.year)).sort((a, b) => b.localeCompare(a))]);
  onInput("#work-search", (value) => { state.query = value; update(); });
  onChange("#work-type-filter", (value) => { state.type = value; update(); });
  onChange("#work-year-filter", (value) => { state.year = value; update(); });
  function update() {
    const result = works.filter((item) => includesAny(item, state.query, ["title", "competitionName", "author", "type", "keywords", "year"]) && (state.type === "全部" || item.type === state.type) && (state.year === "全部" || item.year === state.year));
    fill("#work-count", `当前显示 ${result.length} 条作品索引`);
    fill("#works-list", result.length ? result.map(workCard).join("") : emptyState("暂无匹配内容。你可以尝试更换关键词或筛选条件。"));
    setupReveal();
  }
  update();
}

async function renderCasesPage() {
  const cases = await loadData("cases");
  let state = { query: "", category: "全部", year: "全部" };
  fillSelect("#case-category-filter", ["全部", ...unique(cases.map((item) => item.category))]);
  fillSelect("#case-year-filter", ["全部", ...unique(cases.map((item) => item.year)).sort((a, b) => b.localeCompare(a))]);
  onInput("#case-search", (value) => { state.query = value; update(); });
  onChange("#case-category-filter", (value) => { state.category = value; update(); });
  onChange("#case-year-filter", (value) => { state.year = value; update(); });

  function update() {
    const result = cases.filter((item) => includesAny(item, state.query, ["title", "competitionName", "author", "category", "workType", "keywords", "year", "caseHighlight"]) && (state.category === "全部" || item.category === state.category) && (state.year === "全部" || item.year === state.year));
    fill("#case-count", `当前显示 ${result.length} 条案例`);
    fill("#cases-list", result.length ? result.map(caseCard).join("") : emptyState("暂无匹配内容。你可以尝试更换关键词或筛选条件。"));
    setupReveal();
  }
  update();
}

async function renderCaseDetail() {
  const id = getParam("id");
  const cases = await loadData("cases");
  const item = cases.find((entry) => entry.id === id);
  const root = document.querySelector("#case-detail");
  if (!item || !root) {
    fill("#case-detail", emptyState("没有找到对应内容，请返回上一页查看。"));
    return;
  }
  root.innerHTML = `
    <section class="detail-hero reveal">
      <div>
        <p class="eyebrow">Case File / ${safe(item.id)}</p>
        <h1>${safe(item.title)}</h1>
        <p class="hero-note">${safe(item.caseHighlight)}</p>
        <div class="meta-row">${tags([item.category, item.workType, item.year, item.competitionName])}</div>
      </div>
      <aside class="detail-aside">
        ${coverArt(item, "Case", "cover-detail")}
      </aside>
    </section>
    <section class="detail-grid">
      <article class="detail-block full">
        <h2>案例索引信息</h2>
        <dl class="field-list">
          ${field("所属比赛", item.competitionName)}
          ${field("年份", item.year)}
          ${field("作者/团队", item.author)}
          ${field("案例类别", item.category)}
          ${field("作品类型", item.workType)}
          ${field("视觉关键词", join(item.keywords))}
          ${field("来源平台", item.sourceName)}
        </dl>
        <div class="card-actions">${sourceLink(item.sourceUrl, "查看原始来源")}</div>
      </article>
      <article class="detail-block">
        <h2>案例亮点</h2>
        <p>${safe(item.caseHighlight)}</p>
      </article>
      <article class="detail-block">
        <h2>学习分析</h2>
        <p>${safe(item.analysis)}</p>
      </article>
      <article class="notice-card detail-block full">
        <h2>来源与版权提示</h2>
        <p>${safe(item.copyrightNote)}</p>
        <p>本站不提供高清下载、保存入口、商用授权或二次分发。请通过原始来源查看完整内容，并尊重原作者、主办方或相关权利人的权益。</p>
      </article>
    </section>`;
}

async function renderWorkDetail() {
  const id = getParam("id");
  const works = await loadData("works");
  const item = works.find((entry) => entry.id === id);
  const root = document.querySelector("#work-detail");
  if (!item || !root) {
    fill("#work-detail", emptyState("没有找到对应内容，请返回上一页查看。"));
    return;
  }
  const analysis = item.analysis || {};
  root.innerHTML = `
    <section class="detail-hero reveal">
      <div>
        <p class="eyebrow">Work Analysis / ${safe(item.id)}</p>
        <h1>${safe(item.title)}</h1>
        <p class="hero-note">本站仅整理作品来源、基础信息与学习分析，不提供高清下载或二次分发。</p>
        <div class="meta-row">${tags([item.type, item.year, item.competitionName])}</div>
      </div>
      <aside class="detail-aside">
        ${coverArt(item, "Work", "cover-detail")}
        ${favoriteButton("work", item.id)}
      </aside>
    </section>
    <section class="detail-grid">
      <article class="detail-block full">
        <h2>作品索引信息</h2>
        <dl class="field-list">
          ${field("所属比赛", item.competitionName)}
          ${field("年份", item.year)}
          ${field("作者/团队", item.author)}
          ${field("作品类型", item.type)}
          ${field("视觉关键词", join(item.keywords))}
          ${field("来源平台", item.sourceName)}
        </dl>
        <div class="card-actions">${sourceLink(item.sourceUrl, "查看原始来源")}</div>
      </article>
      ${analysisBlock("作品主题分析", analysis.theme)}
      ${analysisBlock("视觉风格分析", analysis.style)}
      ${analysisBlock("构图特点", analysis.composition)}
      ${analysisBlock("色彩特点", analysis.color)}
      ${analysisBlock("字体与版式特点", analysis.typography)}
      ${analysisBlock("值得学生学习的地方", analysis.learningPoints)}
      ${analysisBlock("对参赛创作的启发", analysis.inspiration)}
      <article class="notice-card detail-block full">
        <h2>版权提示</h2>
        <p>${safe(item.copyrightNote)}</p>
        <p>本页面仅用于学习研究与作品分析。作品版权归原作者、主办方或相关权利人所有，请通过原始来源查看完整内容。本站不提供高清下载、商用授权或二次分发。</p>
      </article>
    </section>`;
}

async function renderAnalysisPage() {
  const articles = await loadData("articles");
  let state = { query: "", category: "全部" };
  createFilterButtons("[data-filter-group='article-category']", ARTICLE_CATEGORIES, (value) => {
    state.category = value;
    update();
  });
  onInput("#article-search", (value) => { state.query = value; update(); });
  function update() {
    const result = articles.filter((item) => includesAny(item, state.query, ["title", "category", "tags", "summary"]) && (state.category === "全部" || item.category === state.category));
    fill("#article-count", `当前显示 ${result.length} 篇文章`);
    fill("#articles-list", result.length ? result.map(articleCard).join("") : emptyState("暂无匹配内容。你可以尝试更换关键词或筛选条件。"));
    setupReveal();
  }
  update();
}

async function renderArticleDetail() {
  const id = getParam("id");
  const articles = await loadData("articles");
  const item = articles.find((entry) => entry.id === id);
  const root = document.querySelector("#article-detail");
  if (!item || !root) {
    fill("#article-detail", emptyState("没有找到对应内容，请返回上一页查看。"));
    return;
  }
  const related = articles.filter((entry) => entry.id !== item.id && entry.category === item.category).slice(0, 3);
  root.innerHTML = `
    <section class="detail-hero reveal">
      <div>
        <p class="eyebrow">${safe(item.category)} / ${safe(item.id)}</p>
        <h1>${safe(item.title)}</h1>
        <p class="hero-note">${safe(item.summary)}</p>
        <div class="meta-row">${tags(item.tags)}</div>
      </div>
      <aside class="detail-aside">
        ${coverArt(item, "Article", "cover-detail")}
        <p class="eyebrow">Reading Note</p>
        <p>文章内容用于学习研究与参赛思路整理，建议结合具体比赛要求判断。</p>
      </aside>
    </section>
    <article class="article-body">
      ${(item.content || []).map((block) => `<h2>${safe(block.heading)}</h2><p>${safe(block.body)}</p>`).join("")}
    </article>
    <section class="detail-block full" style="margin-top:36px">
      <h2>相关阅读推荐</h2>
      ${related.length ? related.map((article) => `<p><a class="text-link" href="article-detail.html?id=${safe(article.id)}">${safe(article.title)} <span>→</span></a></p>`).join("") : "<p>暂无相关阅读。</p>"}
    </section>`;
}

async function renderPlanner() {
  const [competitions, works] = await Promise.all([loadData("competitions"), loadData("works")]);
  window.archivePlannerData = { competitions, works };
  const form = document.querySelector("#planner-form");
  const output = document.querySelector("#planner-output");
  if (!form || !output) return;
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  renderLocalMemoryHub(competitions, works);
  update();

  function update() {
    const data = Object.fromEntries(new FormData(form).entries());
    const recommendations = rankCompetitions(competitions, data).slice(0, 6);
    output.innerHTML = `
      <h2>推荐路线</h2>
      ${plannerSummary(data)}
      <div class="check-block">
        <h3>推荐比赛</h3>
        ${recommendations.length ? recommendations.map((item) => plannerCompetitionCard(item)).join("") : `<p class="muted">先输入专业、作品类型或主题关键词，系统会给出更准确的推荐。</p>`}
      </div>
      <div class="check-block">
        <h3>准备路线</h3>
        ${plannerSteps(data)}
      </div>
      <div class="check-block">
        <h3>相似赛题提醒</h3>
        <p class="muted">如果多个比赛主题相近，可以共用一套调研和基础作品方向，但不建议原样重复提交。请按不同比赛的命题、尺寸、格式、版权授权和提交系统分别调整。</p>
      </div>
    `;
  }
}

function renderLocalMemoryHub(competitions, works) {
  const profileRoot = document.querySelector("#local-profile-card");
  const competitionRoot = document.querySelector("#local-favorite-competitions");
  const workRoot = document.querySelector("#local-favorite-works");
  const planRoot = document.querySelector("#local-plans");
  if (!profileRoot || !competitionRoot || !workRoot || !planRoot) return;

  const profile = getLocalProfile();
  const preferences = getPreferences();
  const favoriteCompetitionIds = getIdList(MEMORY_KEYS.competitionFavorites);
  const favoriteWorkIds = getIdList(MEMORY_KEYS.workFavorites);
  const plans = getLocalPlans();
  const competitionMap = new Map(competitions.map((item) => [item.id, item]));
  const workMap = new Map(works.map((item) => [item.id, item]));

  profileRoot.innerHTML = `
    <article class="dashboard-card local-profile-card reveal">
      <header>
        <div>
          <p class="eyebrow">Local Profile</p>
          <h3>${safe(profile.nickname)}</h3>
        </div>
        <span class="profile-avatar avatar-${safe(profile.avatarTone)}">${safe(profile.avatar)}</span>
      </header>
      <p class="muted">头像、昵称、主题和收藏只保存在当前浏览器，不会上传到服务器。</p>
      <label class="status-control">主题模式
        <select data-theme-mode>${themeOptions(preferences.themeMode)}</select>
      </label>
      <div class="meta-row">${tags([`${favoriteCompetitionIds.length} 个收藏比赛`, `${favoriteWorkIds.length} 个收藏作品`, `${plans.length} 个参赛计划`])}</div>
      <div class="card-actions">
        <button class="button ghost" type="button" data-local-profile-open>编辑本地资料</button>
        <button class="button ghost" type="button" data-local-export>导出本地记忆</button>
        <label class="button ghost file-button">导入本地记忆<input type="file" accept="application/json,.json" data-local-import></label>
        <button class="button ghost" type="button" data-local-clear-all>清空本地数据</button>
      </div>
    </article>
  `;

  competitionRoot.innerHTML = favoriteCompetitionIds.length
    ? favoriteCompetitionIds.map((id) => localCompetitionCard(competitionMap.get(id), id)).join("")
    : emptyState("还没有收藏比赛。可以在比赛库或比赛详情页点击“收藏比赛”。");

  workRoot.innerHTML = favoriteWorkIds.length
    ? favoriteWorkIds.map((id) => localWorkCard(workMap.get(id), id)).join("")
    : emptyState("还没有收藏作品。可以在作品索引或作品详情页点击“收藏作品”。");

  planRoot.innerHTML = plans.length
    ? plans.map((plan) => localPlanCard(competitionMap.get(plan.competitionId), plan)).join("")
    : emptyState("还没有参赛计划。可以在比赛卡片或详情页点击“加入参赛计划”。");
}

function localCompetitionCard(item, id) {
  if (!item) {
    return `<article class="dashboard-card"><h3>已移除条目</h3><p class="muted">${safe(id)}</p><button class="button ghost" type="button" data-local-remove-favorite="competition" data-id="${safe(id)}">删除收藏</button></article>`;
  }
  return `<article class="dashboard-card reveal">
    <header><h3>${safe(item.name)}</h3><span class="archive-id">${safe(item.id)}</span></header>
    <p class="muted">${safe(item.scope)} / ${safe(item.region)} / ${safe(item.category)}</p>
    <div class="meta-row">${tags([item.difficulty, item.suitableForBeginner ? "适合新手" : "更适合有基础"])}</div>
    <div class="card-actions">
      ${planButton(item.id)}
      <a class="button ghost" href="competition-detail.html?id=${safe(item.id)}">查看详情 <span>→</span></a>
      <button class="button ghost" type="button" data-local-remove-favorite="competition" data-id="${safe(item.id)}">删除收藏</button>
    </div>
  </article>`;
}

function localWorkCard(item, id) {
  if (!item) {
    return `<article class="dashboard-card"><h3>已移除作品</h3><p class="muted">${safe(id)}</p><button class="button ghost" type="button" data-local-remove-favorite="work" data-id="${safe(id)}">删除收藏</button></article>`;
  }
  return `<article class="dashboard-card reveal">
    <header><h3>${safe(item.title)}</h3><span class="archive-id">${safe(item.year)}</span></header>
    <p class="muted">${safe(item.competitionName)} / ${safe(item.type)} / ${safe(item.author)}</p>
    <div class="meta-row">${tags(toArray(item.keywords).slice(0, 3))}</div>
    <div class="card-actions">
      <a class="button ghost" href="work-detail.html?id=${safe(item.id)}">查看作品 <span>→</span></a>
      <button class="button ghost" type="button" data-local-remove-favorite="work" data-id="${safe(item.id)}">删除收藏</button>
    </div>
  </article>`;
}

function localPlanCard(item, plan) {
  const title = item ? item.name : plan.competitionId;
  return `<article class="dashboard-card reveal">
    <header><h3>${safe(title)}</h3><span class="archive-id">${safe(formatDate(plan.createdAt))}</span></header>
    ${item ? `<p class="muted">${safe(item.scope)} / ${safe(item.region)} / ${safe(item.category)}</p>` : `<p class="muted">原比赛条目暂未找到。</p>`}
    <label class="status-control">计划状态
      <select data-plan-status="${safe(plan.competitionId)}">
        ${PLAN_STATUSES.map((status) => `<option value="${safe(status)}" ${status === plan.status ? "selected" : ""}>${safe(status)}</option>`).join("")}
      </select>
    </label>
    <label class="status-control">备注
      <textarea class="dashboard-note" rows="3" maxlength="160" data-plan-note="${safe(plan.competitionId)}" placeholder="例如：先整理海报版本，月底前完成说明。">${safe(plan.note || "")}</textarea>
    </label>
    <div class="card-actions">
      ${item ? `<a class="button ghost" href="competition-detail.html?id=${safe(item.id)}">查看详情 <span>→</span></a>` : ""}
      <button class="button ghost" type="button" data-plan-remove="${safe(plan.competitionId)}">删除计划</button>
    </div>
  </article>`;
}

function rankCompetitions(competitions, data) {
  const major = normalizeText(data.major);
  const workType = normalizeText(data.workType);
  const keywords = normalizeText(data.keywords);
  const grade = data.grade || "";
  const experience = data.experience || "beginner";

  return competitions
    .filter((item) => item.scope !== "示例数据")
    .map((item) => {
      let score = 0;
      const searchText = normalizeText([
        item.name,
        item.category,
        item.region,
        item.scope,
        item.summary,
        item.tags,
        item.suitableMajor,
        item.workTypes,
        item.similarityTags,
        item.reuseAdvice
      ].flat().join(" "));
      if (major && searchText.includes(major)) score += 28;
      if (workType && searchText.includes(workType)) score += 28;
      if (keywords) {
        keywords.split(/\s+/).filter(Boolean).forEach((word) => {
          if (word.length > 1 && searchText.includes(word)) score += 8;
        });
      }
      if (grade && toArray(item.suitableGrade).includes(grade)) score += 12;
      if (experience === "beginner" && item.suitableForBeginner) score += 18;
      if (experience === "advanced" && item.difficulty === "较高") score += 16;
      if (experience === "medium" && item.difficulty !== "较高") score += 10;
      if (item.scope === "区域性") score += 4;
      return { ...item, matchScore: score };
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name, "zh-CN"));
}

function plannerSummary(data) {
  const filled = [data.major, data.grade, data.workType, data.keywords].filter(Boolean).length;
  return `<p class="helper-status">${filled ? "已根据当前信息生成推荐" : "等待输入作品方向"}</p>`;
}

function plannerCompetitionCard(item) {
  return `<article class="planner-card">
    <div>
      <h4>${safe(item.name)}</h4>
      <p class="muted">${safe(item.scope)} / ${safe(item.region)} / ${safe(item.category)} / 匹配度 ${safe(item.matchScore)}</p>
      <div class="meta-row">${tags([item.difficulty, item.suitableForBeginner ? "适合新手" : "更适合有基础", ...toArray(item.similarityTags).slice(0, 2)])}</div>
      <p>${safe(item.reuseAdvice || item.summary)}</p>
    </div>
    <div class="card-actions">
      ${favoriteButton("competition", item.id)}
      ${planButton(item.id)}
      <a class="button ghost" href="competition-detail.html?id=${safe(item.id)}">查看详情 <span>→</span></a>
      ${sourceLink(item.sourceUrl || item.officialUrl, "官方来源")}
    </div>
  </article>`;
}

function plannerSteps(data) {
  const workType = safe(data.workType || "作品");
  return `<ol class="step-list">
    <li><strong>确认方向</strong><span>先把${workType}对应的主题关键词、目标受众和作品类型写清楚。</span></li>
    <li><strong>筛选比赛</strong><span>优先选择专业匹配、材料要求清晰、时间成本可控的比赛。</span></li>
    <li><strong>同题延展</strong><span>相似比赛可以共用调研，但标题、说明、尺寸和提交文件要分别调整。</span></li>
    <li><strong>整理材料</strong><span>进入参赛助手填写信息，生成清单和可复制报名信息。</span></li>
    <li><strong>官方提交</strong><span>最后必须进入比赛官网或主办方指定入口完成提交，并保存成功截图或确认邮件。</span></li>
  </ol>`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[，,、/|]+/g, " ");
}

function flattenText(value) {
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return String(value || "");
}

function coverArt(item, kind = "Archive", extraClass = "") {
  const title = item.title || item.name || item.theme || "赛题档案馆";
  const kicker = item.category || item.type || item.workType || item.scope || kind;
  const meta = item.region || item.year || item.competitionName || item.sourceName || "Design Brief Archive";
  const coverTags = toArray(item.keywords || item.similarityTags || item.tags).slice(0, 2);
  return `<div class="cover-art cover-${coverTone(title)} ${safe(extraClass)}" aria-label="${safe(title)}封面">
    <span>${safe(kind)}</span>
    <strong>${safe(title)}</strong>
    <em>${safe(kicker)} / ${safe(meta)}</em>
    <small>${coverTags.length ? safe(coverTags.join(" · ")) : "Research · Index"}</small>
  </div>`;
}

function coverTone(value) {
  const tones = ["sage", "clay", "ink", "gold", "blue", "rose"];
  const code = String(value || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[code % tones.length];
}

function competitionCard(item) {
  return `<article class="card reveal">
    ${coverArt(item, "Competition")}
    <header><h3>${safe(item.name)}</h3><span class="archive-id">${safe(item.id)}</span></header>
    <div class="meta-row">${tags([item.category, item.scope, item.region, item.difficulty, item.suitableForBeginner ? "适合新手" : "更适合有基础", hasOfficialSource(item) ? "有公开来源" : "待核验"])}</div>
    <div class="meta-row">${tags(toArray(item.similarityTags).slice(0, 2))}</div>
    <p>${safe(item.summary)}</p>
    <p class="muted">适合专业：${safe(join(item.suitableMajor))}</p>
      <p class="muted">资料来源：${safe(item.sourceName)}</p>
      <div class="card-actions">
        ${sourceLink(item.sourceUrl || item.officialUrl, "查看官方来源")}
        ${favoriteButton("competition", item.id)}
        ${planButton(item.id)}
        <a class="button ghost" href="competition-detail.html?id=${safe(item.id)}">查看详情 <span>→</span></a>
      </div>
  </article>`;
}

function searchRecord(type, title, summary, url, item) {
  return {
    type,
    title: title || "未命名",
    summary: summary || "",
    url,
    tags: [...toArray(item.tags), ...toArray(item.keywords), ...toArray(item.similarityTags), item.category, item.region, item.type, item.workType].filter(Boolean),
    raw: item
  };
}

function scoreSearchRecord(record, query) {
  const words = query.split(/\s+/).filter(Boolean);
  const titleText = normalizeText(record.title);
  const bodyText = normalizeText([record.summary, record.tags.join(" ")].join(" "));
  return words.reduce((score, word) => {
    if (titleText.includes(word)) score += 8;
    if (bodyText.includes(word)) score += 3;
    return score;
  }, 0);
}

function searchResultCard(record) {
  return `<article class="search-card reveal">
    ${coverArt({ ...record.raw, title: record.title, type: record.type, tags: record.tags }, record.type, "cover-mini")}
    <span class="tag">${safe(record.type)}</span>
    <h2>${safe(record.title)}</h2>
    <p>${safe(record.summary).slice(0, 180)}${record.summary.length > 180 ? "..." : ""}</p>
    <div class="meta-row">${tags(record.tags.slice(0, 4))}</div>
    <a class="button ghost" href="${safe(record.url)}">打开内容 <span>→</span></a>
  </article>`;
}

function searchSuggestions() {
  const suggestions = ["AI艺术", "文创设计", "广告设计", "环境设计", "区域赛事", "作品说明", "版权自查"];
  return `<div class="search-suggestions reveal">
    ${suggestions.map((item) => `<a class="button ghost" href="search.html?q=${encodeURIComponent(item)}">${safe(item)} <span>→</span></a>`).join("")}
  </div>`;
}

async function renderDashboard() {
  const [competitions, works] = await Promise.all([loadData("competitions"), loadData("works")]);
  migrateDashboardToPlans();
  window.archivePlannerData = { competitions, works };
  renderLocalMemoryHub(competitions, works);
  setupReveal();
}

async function renderMaintenance() {
  const [competitions, cases, works, articles] = await Promise.all([
    loadData("competitions"),
    loadData("cases"),
    loadData("works"),
    loadData("articles")
  ]);
  const realCompetitions = competitions.filter((item) => item.scope !== "示例数据");
  const sourced = realCompetitions.filter(hasOfficialSource);
  const missing = realCompetitions.filter((item) => !hasOfficialSource(item));
  const regions = [...regionCountMap(realCompetitions).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
  const actions = buildMaintenanceActions({ realCompetitions, sourced, missing, regions, cases, works, articles });

  fill("#maintenance-stats", [
    ["真实赛事", realCompetitions.length, "不含示例占位"],
    ["公开来源", sourced.length, "可直接查看官网或公开通知"],
    ["待核验", missing.length, "需要后续查找官方入口"],
    ["地区覆盖", regions.length, "已建立区域索引"],
    ["案例索引", cases.length, "不保存他人作品图"],
    ["文章/作品", articles.length + works.length, "站内学习内容"]
  ].map(([label, value, note]) => `<article class="stat-card reveal"><span>${safe(label)}</span><strong>${safe(value)}</strong><p>${safe(note)}</p></article>`).join(""));

  fill("#maintenance-missing", missing.length ? missing.map((item) => maintenanceItem(item)).join("") : `<p class="muted">当前没有待核验真实赛事条目。</p>`);
  fill("#maintenance-regions", regions.map(([region, count]) => `<p class="maintenance-row"><strong>${safe(region)}</strong><span>${count} 条</span></p>`).join(""));
  fill("#maintenance-actions", `<ol class="step-list">${actions.map((item) => `<li><strong>${safe(item.title)}</strong><span>${safe(item.body)}</span></li>`).join("")}</ol>`);
}

function setupDashboardActions() {
  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-dashboard-add]");
    if (addButton) {
      addLocalPlan(addButton.dataset.dashboardAdd);
      addButton.textContent = "已加入计划";
      addButton.setAttribute("aria-live", "polite");
      syncPlanButtons(addButton.dataset.dashboardAdd);
      refreshLocalMemoryHub();
      showLocalPrivacyNotice();
      return;
    }

    const removeButton = event.target.closest("[data-dashboard-remove]");
    if (removeButton) {
      removeFromDashboard(removeButton.dataset.dashboardRemove);
      if (document.body.dataset.page === "dashboard") renderDashboard();
      return;
    }

    const exportButton = event.target.closest("[data-dashboard-export]");
    if (exportButton) {
      exportDashboard();
    }
  });

  document.addEventListener("change", (event) => {
    const importInput = event.target.closest("[data-dashboard-import]");
    if (importInput) {
      importDashboard(importInput.files?.[0]);
      importInput.value = "";
      return;
    }

    const select = event.target.closest("[data-dashboard-status]");
    if (select) {
      updateDashboardStatus(select.dataset.dashboardStatus, select.value);
      if (document.body.dataset.page === "dashboard") renderDashboard();
      return;
    }

    const note = event.target.closest("[data-dashboard-note]");
    if (note) {
      updateDashboardNote(note.dataset.dashboardNote, note.value);
    }
  });
}

function setupPrivacyActions() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-clear-local-records]");
    if (!button) return;
    localStorage.removeItem(DASHBOARD_KEY);
    localStorage.removeItem(HELPER_DRAFT_KEY);
    clearLocalMemory();
    button.textContent = "已清除本地记录";
  });
}

function getDashboardItems() {
  try {
    const value = JSON.parse(localStorage.getItem(DASHBOARD_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    localStorage.removeItem(DASHBOARD_KEY);
    return [];
  }
}

function saveDashboardItems(items) {
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(items));
}

function addToDashboard(id) {
  if (!id) return;
  const items = getDashboardItems();
  const exists = items.some((item) => item.id === id);
  if (exists) return;
  items.unshift({ id, status: DASHBOARD_STATUSES[0], updatedAt: new Date().toISOString() });
  saveDashboardItems(items);
}

function removeFromDashboard(id) {
  saveDashboardItems(getDashboardItems().filter((item) => item.id !== id));
}

function updateDashboardStatus(id, status) {
  const items = getDashboardItems().map((item) => {
    if (item.id !== id) return item;
    return { ...item, status, updatedAt: new Date().toISOString() };
  });
  saveDashboardItems(items);
}

function updateDashboardNote(id, proofNote) {
  const items = getDashboardItems().map((item) => {
    if (item.id !== id) return item;
    return { ...item, proofNote, updatedAt: new Date().toISOString() };
  });
  saveDashboardItems(items);
}

function exportDashboard() {
  const payload = {
    exportedAt: new Date().toISOString(),
    note: "赛题档案馆本地参赛看板导出文件。个人信息和提交凭证请自行妥善保存。",
    items: getDashboardItems()
  };
  downloadTextFile(`赛题档案馆-参赛看板-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
}

function importDashboard(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      const incoming = Array.isArray(payload.items) ? payload.items : [];
      const current = getDashboardItems();
      const merged = [...incoming, ...current].reduce((acc, item) => {
        if (!item?.id || acc.some((entry) => entry.id === item.id)) return acc;
        acc.push({
          id: item.id,
          status: DASHBOARD_STATUSES.includes(item.status) ? item.status : DASHBOARD_STATUSES[0],
          proofNote: item.proofNote || "",
          updatedAt: item.updatedAt || new Date().toISOString()
        });
        return acc;
      }, []);
      saveDashboardItems(merged);
      if (document.body.dataset.page === "dashboard") renderDashboard();
    } catch (error) {
      alert("导入失败，请确认文件是赛题档案馆导出的 JSON。");
    }
  };
  reader.readAsText(file, "utf-8");
}

function migrateDashboardToPlans() {
  const oldItems = getDashboardItems();
  if (!oldItems.length) return;
  const plans = getLocalPlans();
  oldItems.forEach((item) => {
    if (!item?.id || plans.some((plan) => plan.competitionId === item.id)) return;
    plans.push({
      competitionId: item.id,
      status: dashboardStatusToPlanStatus(item.status),
      note: item.proofNote || "",
      createdAt: item.updatedAt || new Date().toISOString()
    });
  });
  saveLocalPlans(plans);
}

function dashboardStatusToPlanStatus(status) {
  if (status === "已提交" || status === "等待结果") return "已提交";
  if (status === "准备材料中" || status === "已进入官网") return "准备中";
  return "想参加";
}

function maintenanceItem(item) {
  return `<section class="maintenance-item">
    <div>
      <h3>${safe(item.name)}</h3>
      <p class="muted">${safe(item.region)} / ${safe(item.category)} / ${safe(item.scope)}</p>
      <p>${safe(item.notes || item.summary)}</p>
    </div>
    <div class="card-actions">
      <a class="button ghost" href="competition-detail.html?id=${safe(item.id)}">查看条目 <span>→</span></a>
    </div>
  </section>`;
}

function buildMaintenanceActions({ realCompetitions, sourced, missing, regions, cases, works, articles }) {
  const sourceRate = realCompetitions.length ? sourced.length / realCompetitions.length : 0;
  const lowRegions = regions.filter(([, count]) => count < 2).slice(0, 6).map(([region]) => region);
  const actions = [];
  if (missing.length) {
    actions.push({ title: "补官方来源", body: `优先核验 ${missing[0].region} 等 ${missing.length} 条待核验赛事，补充官网、教育厅或承办高校通知入口。` });
  }
  if (sourceRate < 0.8) {
    actions.push({ title: "提升来源率", body: "公开来源比例还可以继续提高，比赛库筛选和参赛助手会因此更可靠。" });
  }
  if (lowRegions.length) {
    actions.push({ title: "补弱覆盖地区", body: `优先补充 ${lowRegions.join("、")} 等地区，每个地区至少保留 2 条以上线索。` });
  }
  if (cases.length < realCompetitions.length * 0.35) {
    actions.push({ title: "补优秀案例", body: "案例索引数量仍偏少，建议优先补全国性赛事和区域重点赛事的官方获奖作品入口。" });
  }
  if (works.length < 8 || articles.length < 8) {
    actions.push({ title: "补学习内容", body: "继续增加作品索引和赛题解析文章，让学生不只找比赛，也能学习如何拆题和准备材料。" });
  }
  actions.push({ title: "每日自检", body: "更新 JSON 后同步 archive-data.js，并检查首页、比赛库、相似赛题、看板和参赛助手能正常打开。" });
  return actions;
}

async function renderSubmitHelper() {
  const competitions = await loadData("competitions");
  const form = document.querySelector("#submit-helper-form");
  const select = document.querySelector("#helper-competition");
  const output = document.querySelector("#helper-output");
  const similarBox = document.querySelector("#helper-similar");
  if (!form || !select || !output) return;

  select.innerHTML = competitions.map((item) => `<option value="${safe(item.id)}">${safe(item.name)} / ${safe(item.category)}</option>`).join("");
  restoreHelperDraft(form);
  const targetCompetition = getParam("competitionId");
  if (targetCompetition && competitions.some((item) => item.id === targetCompetition)) {
    select.value = targetCompetition;
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();

  function update() {
    const data = Object.fromEntries(new FormData(form).entries());
    const competition = competitions.find((item) => item.id === data.competitionId) || competitions[0];
    const missing = getMissingFields(data);
    const materials = toArray(competition.submissionMaterials);
    const officialUrl = competition.officialUrl || competition.sourceUrl || "#";
    const status = missing.length ? "材料未齐" : "材料信息已齐，待进入官网提交";

    if (similarBox) {
      const similarItems = toArray(competition.similarTo)
        .map((id) => competitions.find((item) => item.id === id))
        .filter(Boolean);
      similarBox.innerHTML = `
        <h3>相似赛题提醒</h3>
        <div class="meta-row">${tags(competition.similarityTags)}</div>
        <p>${safe(competition.reuseAdvice || "暂未整理复用建议。")}</p>
        ${similarItems.length ? `<p class="muted">相似比赛：${safe(similarItems.map((item) => item.name).join("、"))}</p>` : `<p class="muted">暂无已标记的相似比赛。</p>`}
      `;
    }

    output.innerHTML = `
      <h2>提交前检查</h2>
      <p class="helper-status">${safe(status)}</p>
      ${missing.length ? `<div class="check-block warning"><h3>还需补充</h3><ul>${missing.map((item) => `<li>${safe(item)}</li>`).join("")}</ul></div>` : `<div class="check-block success"><h3>基础信息完整</h3><p>请继续核对比赛官网的格式、时间、授权协议和提交成功提示。</p></div>`}
      <div class="check-block">
        <h3>目标比赛</h3>
        <p>${safe(competition.name)} / ${safe(competition.category)} / ${safe(competition.difficulty)}</p>
        <p class="muted">资料来源：${safe(competition.sourceName)}</p>
      </div>
      <div class="check-block">
        <h3>材料清单</h3>
        <ul>${materials.map((item) => `<li>${safe(item)}</li>`).join("")}</ul>
      </div>
      <div class="check-block">
        <h3>可复制报名信息</h3>
        <textarea class="copy-box" readonly>${safe(buildSubmissionText(data, competition))}</textarea>
      </div>
      <div class="card-actions">
        ${sourceLink(officialUrl, "前往官方提交入口")}
        <button class="button ghost" type="button" id="copy-helper-text">复制报名信息</button>
        <button class="button ghost" type="button" id="export-helper-text">导出报名信息</button>
        <button class="button ghost" type="button" id="save-helper-draft">保存本地草稿</button>
        <button class="button ghost" type="button" id="clear-helper-draft">清除本地草稿</button>
      </div>
      <p class="muted">最终是否报名成功，以比赛官网提交成功页面、确认邮件或主办方通知为准。建议学生自行保存提交成功截图。本地草稿只保存在当前浏览器，不会上传到服务器。</p>
    `;

    document.querySelector("#copy-helper-text")?.addEventListener("click", () => copyHelperText(data, competition));
    document.querySelector("#export-helper-text")?.addEventListener("click", () => exportHelperText(data, competition));
    document.querySelector("#save-helper-draft")?.addEventListener("click", () => saveHelperDraft(data));
    document.querySelector("#clear-helper-draft")?.addEventListener("click", () => clearHelperDraft(form, update));
  }
}

function restoreHelperDraft(form) {
  try {
    const draft = JSON.parse(localStorage.getItem(HELPER_DRAFT_KEY) || "{}");
    Object.entries(draft).forEach(([key, value]) => {
      const field = form.elements[key];
      if (field) field.value = value;
    });
  } catch (error) {
    localStorage.removeItem(HELPER_DRAFT_KEY);
  }
}

function saveHelperDraft(data) {
  localStorage.setItem(HELPER_DRAFT_KEY, JSON.stringify(data));
}

function clearHelperDraft(form, update) {
  localStorage.removeItem(HELPER_DRAFT_KEY);
  form.reset();
  update();
}

function getMissingFields(data) {
  const required = [
    ["school", "学校"],
    ["major", "专业"],
    ["grade", "年级"],
    ["studentName", "姓名"],
    ["studentId", "学号"],
    ["contact", "联系方式"],
    ["workTitle", "作品名称"],
    ["workType", "作品类型"],
    ["team", "作者/团队"],
    ["fileNote", "作品文件说明"],
    ["workDescription", "作品说明"]
  ];
  return required.filter(([key]) => !String(data[key] || "").trim()).map(([, label]) => label);
}

function buildSubmissionText(data, competition) {
  return [
    `目标比赛：${competition.name || "待选择"}`,
    `比赛类别：${competition.category || "待补充"}`,
    `学校：${data.school || ""}`,
    `专业：${data.major || ""}`,
    `年级：${data.grade || ""}`,
    `姓名：${data.studentName || ""}`,
    `学号：${data.studentId || ""}`,
    `联系方式：${data.contact || ""}`,
    `作品名称：${data.workTitle || ""}`,
    `作品类型：${data.workType || ""}`,
    `作者/团队：${data.team || ""}`,
    `作品文件说明：${data.fileNote || ""}`,
    `作品说明：${data.workDescription || ""}`,
    "",
    "提交提醒：请以比赛官网要求为准，核对报名时间、文件格式、授权协议和提交成功提示。"
  ].join("\n");
}

async function copyHelperText(data, competition) {
  const text = buildSubmissionText(data, competition);
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const box = document.querySelector(".copy-box");
    box?.select();
    document.execCommand("copy");
  }
}

function exportHelperText(data, competition) {
  const safeName = String(data.workTitle || competition.name || "报名信息").replace(/[\\/:*?"<>|]/g, "-").slice(0, 40);
  downloadTextFile(`赛题档案馆-${safeName}.txt`, buildSubmissionText(data, competition));
}

function categoryCard(name, index) {
  const labels = ["信息索引", "命题观察", "作品准备", "视觉分析"];
  return `<article class="category-card reveal"><span>${String(index + 1).padStart(2, "0")} / ${labels[index % labels.length]}</span><h3>${safe(name)}</h3></article>`;
}

function homeStatsCards(competitions, cases) {
  const realCompetitions = competitions.filter((item) => item.scope !== "示例数据");
  const regions = unique(realCompetitions.map((item) => item.region || "待补充"));
  const sourced = realCompetitions.filter(hasOfficialSource);
  const regional = realCompetitions.filter((item) => item.scope === "区域性");
  const stats = [
    ["比赛条目", competitions.length, "全国、区域与专项赛事"],
    ["真实/线索", realCompetitions.length, "可检索的真实赛事与公开线索"],
    ["区域覆盖", regions.length, "已建立地区筛选和覆盖入口"],
    ["公开来源", sourced.length, "有官网或公开来源链接的条目"],
    ["区域赛事", regional.length, "含小众与地方性赛事线索"],
    ["案例索引", cases.length, "只做来源入口与学习分析"]
  ];
  return stats.map(([label, value, note]) => `<article class="stat-card reveal">
    <span>${safe(label)}</span>
    <strong>${safe(value)}</strong>
    <p>${safe(note)}</p>
  </article>`).join("");
}

function regionCoverageCards(competitions) {
  return [...regionCountMap(competitions.filter((item) => item.scope !== "示例数据")).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, 12)
    .map(([region, count], index) => `<a class="region-card reveal" href="competitions.html">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${safe(region)}</strong>
      <em>${count} 条赛事线索</em>
    </a>`)
    .join("");
}

function themeItem(item) {
  return `<article class="timeline-item reveal">
    <button type="button" aria-expanded="false">
      <p class="eyebrow">${safe(item.year)} / ${safe(item.competitionName)}</p>
      <h3>${safe(item.theme)}</h3>
      <div class="meta-row">${tags(item.keywords)}</div>
      <p>${safe(item.direction)}</p>
    </button>
    <div class="timeline-detail">
      <p>${safe(item.analysis)}</p>
      <p class="muted">资料来源：${safe(item.sourceName)}</p>
      ${sourceLink(item.sourceUrl, "查看官方来源")}
    </div>
  </article>`;
}

function workCard(item) {
  return `<article class="work-card reveal">
    ${coverArt(item, "Work", "cover-side")}
    <div class="work-card-body">
      <header><h3>${safe(item.title)}</h3><span class="archive-id">${safe(item.year)}</span></header>
      <p>${safe(item.competitionName)} / ${safe(item.author)}</p>
      <div class="meta-row">${tags([item.type, ...toArray(item.keywords).slice(0, 3)])}</div>
      <p class="muted">来源：${safe(item.sourceName)}</p>
      <div class="card-actions">
        ${favoriteButton("work", item.id)}
        ${sourceLink(item.sourceUrl, "查看原始来源")}
        <a class="button ghost" href="work-detail.html?id=${safe(item.id)}">阅读本站分析 <span>→</span></a>
      </div>
    </div>
  </article>`;
}

function caseCard(item) {
  return `<article class="work-card reveal">
    ${coverArt(item, "Case", "cover-side")}
    <div class="work-card-body">
      <header><h3>${safe(item.title)}</h3><span class="archive-id">${safe(item.year)}</span></header>
      <p>${safe(item.competitionName)} / ${safe(item.author)}</p>
      <div class="meta-row">${tags([item.category, item.workType, ...toArray(item.keywords).slice(0, 2)])}</div>
      <p>${safe(item.caseHighlight)}</p>
      <p class="muted">来源：${safe(item.sourceName)}</p>
      <div class="card-actions">
        ${sourceLink(item.sourceUrl, "查看原始来源")}
        <a class="button ghost" href="case-detail.html?id=${safe(item.id)}">阅读案例分析 <span>→</span></a>
      </div>
      <p class="muted">${safe(item.analysis)}</p>
    </div>
  </article>`;
}

function workRow(item) {
  return `<article class="work-row reveal">
    ${coverArt(item, "Work", "cover-mini")}
    <div>
      <h3>${safe(item.title)}</h3>
      <p class="muted">${safe(item.competitionName)} / ${safe(item.year)} / ${safe(item.author)}</p>
      ${favoriteButton("work", item.id)}
      <a class="text-link" href="work-detail.html?id=${safe(item.id)}">阅读分析 <span>→</span></a>
    </div>
  </article>`;
}

function articleCard(item) {
  return `<article class="article-card reveal">
    ${coverArt(item, "Article", "cover-mini")}
    <header><h3>${safe(item.title)}</h3><span class="archive-id">${safe(item.category)}</span></header>
    <div class="meta-row">${tags(item.tags)}</div>
    <p>${safe(item.summary)}</p>
    <div class="card-actions">
      <a class="button ghost" href="article-detail.html?id=${safe(item.id)}">阅读文章 <span>→</span></a>
    </div>
  </article>`;
}

function bindTimeline() {
  document.querySelectorAll(".timeline-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".timeline-item");
      const open = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
  });
}

function createFilterButtons(selector, values, onSelect) {
  const root = document.querySelector(selector);
  if (!root) return;
  root.innerHTML = values.map((value, index) => `<button class="filter-button ${index === 0 ? "active" : ""}" type="button" data-value="${safe(value)}">${safe(value)}</button>`).join("");
  root.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      onSelect(button.dataset.value);
    });
  });
}

function syncFilterButton(selector, value) {
  const root = document.querySelector(selector);
  if (!root) return;
  root.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.value === value);
  });
}

function fillSelect(selector, values) {
  const select = document.querySelector(selector);
  if (!select) return;
  select.innerHTML = values.map((value) => `<option value="${safe(value)}">${safe(value)}</option>`).join("");
}

function onInput(selector, callback) {
  document.querySelector(selector)?.addEventListener("input", (event) => callback(event.target.value.trim()));
}

function onChange(selector, callback) {
  document.querySelector(selector)?.addEventListener("change", (event) => callback(event.target.value));
}

function includesAny(item, query, keys) {
  if (!query) return true;
  const lower = query.toLowerCase();
  return keys.some((key) => toArray(item[key]).join(" ").toLowerCase().includes(lower));
}

function hasValue(value, target) {
  return toArray(value).includes(target);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id && !map.has(item.id)) map.set(item.id, item);
  });
  return [...map.values()];
}

function join(value) {
  const list = toArray(value);
  return list.length ? list.join("、") : "待补充";
}

function tags(values) {
  return toArray(values).filter(Boolean).map((value) => `<span class="tag">${safe(value)}</span>`).join("");
}

function field(label, value) {
  return `<div><dt>${safe(label)}</dt><dd>${safe(join(value))}</dd></div>`;
}

function analysisBlock(title, body) {
  return `<article class="detail-block"><h2>${safe(title)}</h2><p>${safe(body || "待补充")}</p></article>`;
}

function hasOfficialSource(item) {
  const urls = [item?.sourceUrl, item?.officialUrl].filter(Boolean);
  return urls.some((url) => url !== "#" && /^https?:\/\//.test(url));
}

function formatDate(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function sourceLink(url, label) {
  if (!url || url === "#") return `<span class="button ghost is-disabled" aria-disabled="true">${safe(label)} <span>→</span></span>`;
  return `<a class="button ghost" href="${safe(url)}" target="_blank" rel="noopener noreferrer">${safe(label)} <span>→</span></a>`;
}

function emptyState(text) {
  return `<div class="empty-state">${safe(text)}</div>`;
}

function fill(selector, html) {
  const target = document.querySelector(selector);
  if (target) target.innerHTML = html;
}

function downloadTextFile(filename, text) {
  const type = filename.endsWith(".json") ? "application/json;charset=utf-8" : "text/plain;charset=utf-8";
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function safe(value) {
  return String(value ?? "待补充")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
