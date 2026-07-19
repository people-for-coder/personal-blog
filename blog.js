const blogSettings = window.FZ_BLOG_CONFIG || {};
const articleListNode = document.querySelector("[data-dynamic-article-list]");
const blogSearchInput = document.querySelector("[data-blog-search-input]");
const blogClearSearch = document.querySelector("[data-blog-clear-search]");
const blogSearchResults = document.querySelector("[data-blog-search-results]");
const blogFilterGroup = document.querySelector("[data-blog-filter-group]");
const postDetailNode = document.querySelector("[data-post-detail]");
const commentsSection = document.querySelector("[data-comments-section]");
const commentsList = document.querySelector("[data-comments-list]");
const commentForm = document.querySelector("[data-comment-form]");
const commentStatus = document.querySelector("[data-comment-status]");
let dynamicPosts = [];
let currentPostSlug = "";

const blogConfigured = () => Boolean(blogSettings.supabaseUrl && blogSettings.supabaseAnonKey);

const blogRequest = async (path, options = {}) => {
  const baseUrl = String(blogSettings.supabaseUrl || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: blogSettings.supabaseAnonKey,
      Authorization: `Bearer ${blogSettings.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${details}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatBlogDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const inlineMarkdown = (value = "") => {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
};

const imageMarkdown = (value = "") => {
  const image = value.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
  if (!image) return "";
  return `<figure class="article-image inline-image"><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1] || "文章图片")}" /></figure>`;
};

const markdownToHtml = (markdown = "") => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  const flushCode = () => {
    if (!code.length) return;
    blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    code = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      code.push(line);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    const imageBlock = imageMarkdown(line.trim());
    if (imageBlock) {
      flushParagraph();
      flushList();
      blocks.push(imageBlock);
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 1;
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      return;
    }

    paragraph.push(line.trim());
  });

  flushParagraph();
  flushList();
  flushCode();
  return blocks.join("\n");
};

const normalizeBlogSearch = (value = "") => value.trim().toLowerCase();

const matchesPost = (post, query, filter) => {
  const categoryMatched = filter === "all" || post.category === filter;
  const haystack = [
    post.title,
    post.summary,
    post.category,
    Array.isArray(post.tags) ? post.tags.join(" ") : "",
  ].join(" ").toLowerCase();
  return categoryMatched && (!query || haystack.includes(query));
};

const renderArticleCards = () => {
  if (!articleListNode) return;

  const query = normalizeBlogSearch(blogSearchInput?.value || "");
  const active = blogFilterGroup?.querySelector("[data-filter].active")?.getAttribute("data-filter") || "all";
  const visiblePosts = dynamicPosts.filter((post) => matchesPost(post, query, active));

  if (!visiblePosts.length) {
    articleListNode.innerHTML = '<p class="message-empty">没有匹配的文章。可以先在 Supabase 的 blog_posts 表里发布一篇。</p>';
    if (blogSearchResults) blogSearchResults.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  visiblePosts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "list-card";
    const tags = Array.isArray(post.tags) ? post.tags : [];
    article.innerHTML = `
      <div>
        <span class="pill">${escapeHtml(post.category || "Notes")}</span>
        <time>${formatBlogDate(post.published_at || post.created_at)}</time>
      </div>
      <h2><a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2>
      <p>${escapeHtml(post.summary || "暂无摘要。")}</p>
      <div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    `;
    fragment.append(article);
  });
  articleListNode.replaceChildren(fragment);

  if (blogSearchResults) {
    blogSearchResults.replaceChildren();
  }
};

const loadArticleList = async () => {
  if (!articleListNode) return;

  if (!blogConfigured()) {
    articleListNode.innerHTML = '<p class="message-empty">还没有配置 Supabase，无法读取动态文章。</p>';
    return;
  }

  try {
    dynamicPosts = await blogRequest("blog_posts?select=slug,title,summary,category,tags,cover_image_url,published_at,created_at&is_published=eq.true&order=published_at.desc,created_at.desc");
    renderArticleCards();
  } catch (error) {
    console.error(error);
    articleListNode.innerHTML = '<p class="message-empty">文章加载失败，请检查 blog_posts 表和 RLS 策略。</p>';
  }
};

const renderPost = (post) => {
  document.title = `${post.title} | FZ 的博客`;
  postDetailNode.innerHTML = `
    <section class="article-hero">
      <p class="kicker">${escapeHtml(post.category || "Post")}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="article-meta">
        <time>${formatBlogDate(post.published_at || post.created_at)}</time>
        ${(Array.isArray(post.tags) ? post.tags : []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <p>${escapeHtml(post.summary || "")}</p>
    </section>
    ${post.cover_image_url ? `<figure class="article-image"><img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" /></figure>` : ""}
    <section class="article-body solo">${markdownToHtml(post.content_markdown || "")}</section>
  `;
};

const renderComments = (comments = []) => {
  if (!commentsList) return;

  if (!comments.length) {
    commentsList.innerHTML = '<p class="message-empty">还没有评论，来写第一条吧。</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  comments.forEach((comment) => {
    const article = document.createElement("article");
    article.className = "comment-card";
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(comment.author_name)}</strong>
        <time>${new Date(comment.created_at).toLocaleString("zh-CN", { hour12: false })}</time>
      </div>
      <p>${escapeHtml(comment.content)}</p>
    `;
    fragment.append(article);
  });
  commentsList.replaceChildren(fragment);
};

const loadComments = async () => {
  if (!commentsList || !currentPostSlug) return;

  try {
    const comments = await blogRequest(`post_comments?select=id,author_name,content,created_at&post_slug=eq.${encodeURIComponent(currentPostSlug)}&order=created_at.desc&limit=100`);
    renderComments(comments || []);
  } catch (error) {
    console.error(error);
    commentsList.innerHTML = '<p class="message-empty">评论加载失败。</p>';
  }
};

const loadPostDetail = async () => {
  if (!postDetailNode) return;

  const slug = new URLSearchParams(window.location.search).get("slug") || "";
  currentPostSlug = slug;

  if (!slug) {
    postDetailNode.innerHTML = '<p class="message-empty">缺少文章 slug。</p>';
    return;
  }

  try {
    const posts = await blogRequest(`blog_posts?select=slug,title,summary,category,tags,cover_image_url,content_markdown,published_at,created_at&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`);
    const post = posts?.[0];

    if (!post) {
      postDetailNode.innerHTML = '<p class="message-empty">文章不存在或尚未发布。</p>';
      return;
    }

    renderPost(post);
    if (commentsSection) commentsSection.hidden = false;
    await loadComments();
  } catch (error) {
    console.error(error);
    postDetailNode.innerHTML = '<p class="message-empty">文章加载失败。</p>';
  }
};

commentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentPostSlug) return;

  const button = commentForm.querySelector("button[type='submit']");
  const formData = new FormData(commentForm);
  const authorName = String(formData.get("author_name") || "").trim();
  const content = String(formData.get("content") || "").trim();

  if (authorName.length < 2 || content.length < 2) {
    if (commentStatus) commentStatus.textContent = "请填写昵称和评论内容。";
    return;
  }

  button.disabled = true;
  if (commentStatus) commentStatus.textContent = "正在发布...";

  try {
    await blogRequest("post_comments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        post_slug: currentPostSlug,
        author_name: authorName,
        content,
      }),
    });
    commentForm.reset();
    if (commentStatus) commentStatus.textContent = "评论已发布。";
    await loadComments();
  } catch (error) {
    console.error(error);
    if (commentStatus) commentStatus.textContent = "评论发布失败，请稍后再试。";
  } finally {
    button.disabled = false;
  }
});

blogSearchInput?.addEventListener("input", renderArticleCards);
blogClearSearch?.addEventListener("click", () => {
  if (!blogSearchInput) return;
  blogSearchInput.value = "";
  blogSearchInput.focus();
  renderArticleCards();
});

if (blogFilterGroup) {
  const buttons = Array.from(blogFilterGroup.querySelectorAll("[data-filter]"));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderArticleCards();
    });
  });
}

loadArticleList();
loadPostDetail();
