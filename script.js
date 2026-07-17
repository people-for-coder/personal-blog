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
const messageForm = document.querySelector("[data-message-form]");
const messageImageInput = document.querySelector("[data-message-image]");
const messagePreview = document.querySelector("[data-message-preview]");
const messagePreviewImage = document.querySelector("[data-message-preview-image]");
const clearMessageImage = document.querySelector("[data-clear-message-image]");
const messageStatus = document.querySelector("[data-message-status]");
const localMessages = document.querySelector("[data-local-messages]");
const localMessageKey = "fz-blog-guestbook-messages";
let selectedMessageImage = "";

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

const pad2 = (value) => String(value).padStart(2, "0");

const formatMinuteTime = (date) => {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-") + " " + [
    pad2(date.getHours()),
    pad2(date.getMinutes()),
  ].join(":");
};

const setMessageStatus = (text) => {
  if (!messageStatus) return;
  messageStatus.textContent = text;
};

const loadMessages = () => {
  try {
    const raw = localStorage.getItem(localMessageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveMessages = (messages) => {
  localStorage.setItem(localMessageKey, JSON.stringify(messages));
};

const createMessageElement = (message) => {
  const details = document.createElement("details");
  details.className = "message-post";
  details.open = true;

  const summary = document.createElement("summary");
  const time = document.createElement("span");
  const title = document.createElement("strong");
  time.textContent = message.createdAt;
  title.textContent = message.title;
  summary.append(time, title);

  const body = document.createElement("div");
  body.className = "message-body";

  const paragraph = document.createElement("p");
  paragraph.textContent = message.body;
  body.append(paragraph);

  if (message.image) {
    const image = document.createElement("img");
    image.src = message.image;
    image.alt = `${message.title} 配图`;
    body.append(image);
  }

  details.append(summary, body);
  return details;
};

const renderLocalMessages = () => {
  if (!localMessages) return;
  const messages = loadMessages();
  const fragment = document.createDocumentFragment();
  messages.forEach((message) => {
    fragment.append(createMessageElement(message));
  });
  localMessages.replaceChildren(fragment);
};

const clearSelectedMessageImage = () => {
  selectedMessageImage = "";
  if (messageImageInput) {
    messageImageInput.value = "";
  }
  if (messagePreview && messagePreviewImage) {
    messagePreview.classList.add("is-hidden");
    messagePreviewImage.removeAttribute("src");
  }
};

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

messageImageInput?.addEventListener("change", () => {
  const file = messageImageInput.files?.[0];
  if (!file) {
    clearSelectedMessageImage();
    return;
  }

  if (!file.type.startsWith("image/")) {
    setMessageStatus("请选择图片文件。");
    clearSelectedMessageImage();
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setMessageStatus("图片不能超过 2MB。");
    clearSelectedMessageImage();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    selectedMessageImage = String(reader.result || "");
    if (messagePreview && messagePreviewImage && selectedMessageImage) {
      messagePreviewImage.src = selectedMessageImage;
      messagePreview.classList.remove("is-hidden");
    }
    setMessageStatus("图片已选择。");
  });
  reader.addEventListener("error", () => {
    setMessageStatus("图片读取失败，请重新选择。");
    clearSelectedMessageImage();
  });
  reader.readAsDataURL(file);
});

clearMessageImage?.addEventListener("click", () => {
  clearSelectedMessageImage();
  setMessageStatus("图片已移除。");
});

messageForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(messageForm);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!title || !body) {
    setMessageStatus("请填写标题和内容。");
    return;
  }

  const message = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    title,
    body,
    image: selectedMessageImage,
    createdAt: formatMinuteTime(new Date()),
  };

  try {
    const messages = loadMessages();
    messages.unshift(message);
    saveMessages(messages);
    renderLocalMessages();
    messageForm.reset();
    clearSelectedMessageImage();
    setMessageStatus(`发布成功：${message.createdAt}`);
  } catch {
    setMessageStatus("保存失败：浏览器本地存储空间可能不足。");
  }
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
renderLocalMessages();
