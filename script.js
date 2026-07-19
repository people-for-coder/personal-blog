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
const remoteMessages = document.querySelector("[data-remote-messages]");
let selectedMessageFile = null;

const storedTheme = localStorage.getItem("blog-theme");
const blogConfig = window.FZ_BLOG_CONFIG || {};

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

const setMessageStatus = (text) => {
  if (!messageStatus) return;
  messageStatus.textContent = text;
};

const isSupabaseConfigured = () => {
  return Boolean(blogConfig.supabaseUrl && blogConfig.supabaseAnonKey);
};

const supabaseFetch = async (path, options = {}) => {
  const baseUrl = String(blogConfig.supabaseUrl || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: blogConfig.supabaseAnonKey,
      Authorization: `Bearer ${blogConfig.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Database request failed (${response.status}): ${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const uploadMessageImage = async (file) => {
  if (!file) return "";

  const bucket = blogConfig.supabaseStorageBucket || "guestbook";
  const baseUrl = String(blogConfig.supabaseUrl || "").replace(/\/$/, "");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const key = `guestbook/${Date.now()}-${id}.${safeExtension}`;
  const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: blogConfig.supabaseAnonKey,
      Authorization: `Bearer ${blogConfig.supabaseAnonKey}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: file,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Image upload failed (${response.status}): ${details}`);
  }

  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  const storedKey = typeof result?.Key === "string" ? result.Key.replace(`${bucket}/`, "") : key;
  return `${baseUrl}/storage/v1/object/public/${bucket}/${storedKey}`;
};

const createMessageElement = (message) => {
  const details = document.createElement("details");
  details.className = "message-post";
  details.open = true;

  const summary = document.createElement("summary");
  const time = document.createElement("span");
  const title = document.createElement("strong");
  time.textContent = new Date(message.created_at).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  title.textContent = message.author_name;
  summary.append(time, title);

  const body = document.createElement("div");
  body.className = "message-body";

  const paragraph = document.createElement("p");
  paragraph.textContent = message.content;
  body.append(paragraph);

  if (message.image_url) {
    const image = document.createElement("img");
    image.src = message.image_url;
    image.alt = `${message.author_name} 的留言配图`;
    body.append(image);
  }

  details.append(summary, body);
  return details;
};

const renderRemoteMessages = async () => {
  if (!remoteMessages) return;

  if (!isSupabaseConfigured()) {
    remoteMessages.innerHTML = '<p class="message-empty">留言板还没有配置 Supabase。请在 config.js 填入 supabaseUrl 和 supabaseAnonKey，并执行 docs/supabase-guestbook-schema.sql。</p>';
    return;
  }

  try {
    const messages = await supabaseFetch("guestbook_messages?select=id,author_name,content,image_url,created_at&status=eq.approved&order=created_at.desc&limit=100");
    const fragment = document.createDocumentFragment();

    if (!messages.length) {
      remoteMessages.innerHTML = '<p class="message-empty">还没有公开留言，欢迎成为第一个留言的人。</p>';
      return;
    }

    messages.forEach((message) => fragment.append(createMessageElement(message)));
    remoteMessages.replaceChildren(fragment);
  } catch {
    remoteMessages.innerHTML = '<p class="message-empty">留言加载失败，请稍后再试。</p>';
  }
};

const clearSelectedMessageImage = () => {
  selectedMessageFile = null;
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

  if (file.size > 5 * 1024 * 1024) {
    setMessageStatus("图片不能超过 5MB。");
    clearSelectedMessageImage();
    return;
  }

  selectedMessageFile = file;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (messagePreview && messagePreviewImage) {
      messagePreviewImage.src = String(reader.result || "");
      messagePreview.classList.remove("is-hidden");
    }
    setMessageStatus("图片已选择。");
  });
  reader.readAsDataURL(file);
});

clearMessageImage?.addEventListener("click", () => {
  clearSelectedMessageImage();
  setMessageStatus("图片已移除。");
});

messageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isSupabaseConfigured()) {
    setMessageStatus("请先在 config.js 配置 Supabase。");
    return;
  }

  const submitButton = messageForm.querySelector("button[type='submit']");
  const formData = new FormData(messageForm);
  const authorName = String(formData.get("author_name") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (authorName.length < 2 || content.length < 4) {
    setMessageStatus("请填写昵称和留言内容。");
    return;
  }

  submitButton.disabled = true;
  setMessageStatus("正在提交...");

  try {
    const imageUrl = await uploadMessageImage(selectedMessageFile);
    await supabaseFetch("guestbook_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        author_name: authorName,
        content,
        image_url: imageUrl || null,
        status: "pending",
      }),
    });

    messageForm.reset();
    clearSelectedMessageImage();
    setMessageStatus("留言已提交，审核通过后会公开显示。");
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    setMessageStatus(`提交失败：${message.slice(0, 180)}`);
  } finally {
    submitButton.disabled = false;
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
renderRemoteMessages();
