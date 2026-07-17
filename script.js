const root = document.documentElement;
const header = document.querySelector(".topbar");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const searchInput = document.querySelector("[data-search-input]");
const clearSearch = document.querySelector("[data-clear-search]");
const searchResults = document.querySelector("[data-search-results]");
const articleList = document.querySelector("[data-article-list]");
const filterGroup = document.querySelector("[data-filter-group]");
const articleItems = Array.from(document.querySelectorAll("[data-search-item]"));

const storedTheme = localStorage.getItem("blog-theme");

if (storedTheme) {
  root.dataset.theme = storedTheme;
}

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

const closeNav = () => {
  if (!nav || !navToggle) return;
  nav.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
};

if (navToggle && nav) {
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "打开导航");

  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeNav();
    }
  });
}

const normalize = (value) => value.trim().toLowerCase();

const getArticleText = (item) => {
  return normalize([
    item.dataset.title,
    item.dataset.tags,
    item.dataset.body,
    item.textContent,
  ].filter(Boolean).join(" "));
};

const getActiveFilter = () => {
  const active = filterGroup?.querySelector("[data-filter].active");
  return active?.getAttribute("data-filter") || "all";
};

const renderSearchResults = (matches, query) => {
  if (!searchResults) return;

  if (!query) {
    searchResults.replaceChildren();
    return;
  }

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "search-result";
    empty.textContent = "没有匹配的文章。";
    searchResults.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  matches.forEach((item) => {
    const link = item.querySelector("h2 a");
    const result = document.createElement("a");
    result.className = "search-result";
    result.href = link?.getAttribute("href") || "#";
    result.textContent = link?.textContent || item.dataset.title || "未命名文章";
    fragment.append(result);
  });
  searchResults.replaceChildren(fragment);
};

const applyArticleFilters = () => {
  if (!articleList || articleItems.length === 0) return;

  const query = normalize(searchInput?.value || "");
  const activeFilter = getActiveFilter();
  const matches = [];

  articleItems.forEach((item) => {
    const category = item.getAttribute("data-category") || "";
    const categoryMatched = activeFilter === "all" || category === activeFilter;
    const queryMatched = !query || getArticleText(item).includes(query);
    const visible = categoryMatched && queryMatched;

    item.classList.toggle("is-hidden", !visible);
    if (visible && query) {
      matches.push(item);
    }
  });

  renderSearchResults(matches, query);
};

if (filterGroup) {
  const initialFilter = new URLSearchParams(window.location.search).get("category") || "all";
  const buttons = Array.from(filterGroup.querySelectorAll("[data-filter]"));

  buttons.forEach((button) => {
    const value = button.getAttribute("data-filter") || "all";
    button.classList.toggle("active", value === initialFilter);

    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      applyArticleFilters();
    });
  });

  if (!buttons.some((button) => button.classList.contains("active"))) {
    buttons[0]?.classList.add("active");
  }
}

searchInput?.addEventListener("input", applyArticleFilters);
clearSearch?.addEventListener("click", () => {
  if (!searchInput) return;
  searchInput.value = "";
  searchInput.focus();
  applyArticleFilters();
});

document.addEventListener("click", (event) => {
  if (!nav || !navToggle || !nav.classList.contains("open")) return;
  const target = event.target;
  if (target instanceof Node && !nav.contains(target) && !navToggle.contains(target)) {
    closeNav();
  }
});

window.addEventListener("scroll", syncHeader, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    closeNav();
  }
});

syncHeader();
applyArticleFilters();
