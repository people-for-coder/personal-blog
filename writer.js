const writerSettings = window.FZ_BLOG_CONFIG || {};
const postForm = document.querySelector("[data-post-form]");
const postTitleInput = document.querySelector("[data-post-title]");
const postSlugInput = document.querySelector("[data-post-slug]");
const postContentInput = document.querySelector("[data-post-content]");
const postStatus = document.querySelector("[data-post-status]");
const postPreview = document.querySelector("[data-post-preview]");
const coverFileInput = document.querySelector("[data-cover-file]");
const coverUrlInput = document.querySelector("[data-cover-url]");
const coverPreview = document.querySelector("[data-cover-preview]");
const coverPreviewImage = document.querySelector("[data-cover-preview-image]");
const clearCoverButton = document.querySelector("[data-clear-cover]");
let selectedCoverFile = null;
let slugWasEdited = false;

const writerConfigured = () => Boolean(writerSettings.supabaseUrl && writerSettings.supabaseAnonKey);

const setPostStatus = (message) => {
  if (postStatus) postStatus.textContent = message;
};

const writerBaseUrl = () => String(writerSettings.supabaseUrl || "").replace(/\/$/, "");

const slugify = (value = "") => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (slug) return slug;

  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-:t]/gi, "")
    .toLowerCase();
  return `post-${stamp}`;
};

const parseTags = (value = "") => {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
};

const clearCover = () => {
  selectedCoverFile = null;
  if (coverFileInput) coverFileInput.value = "";
  if (coverPreview && coverPreviewImage) {
    coverPreview.classList.add("is-hidden");
    coverPreviewImage.removeAttribute("src");
  }
};

const uploadCoverImage = async () => {
  if (!selectedCoverFile) return "";

  const bucket = writerSettings.supabaseStorageBucket || "guestbook";
  const extension = selectedCoverFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const key = `articles/${Date.now()}-${id}.${safeExtension}`;
  const uploadUrl = `${writerBaseUrl()}/storage/v1/object/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: writerSettings.supabaseAnonKey,
      Authorization: `Bearer ${writerSettings.supabaseAnonKey}`,
      "Content-Type": selectedCoverFile.type || "image/jpeg",
      "x-upsert": "false",
    },
    body: selectedCoverFile,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`封面上传失败：${details || response.status}`);
  }

  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  const storedKey = typeof result?.Key === "string" ? result.Key.replace(`${bucket}/`, "") : key;
  return `${writerBaseUrl()}/storage/v1/object/public/${bucket}/${storedKey}`;
};

const createPost = async (payload) => {
  const response = await fetch(`${writerBaseUrl()}/rest/v1/rpc/create_blog_post`, {
    method: "POST",
    headers: {
      apikey: writerSettings.supabaseAnonKey,
      Authorization: `Bearer ${writerSettings.supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const details = data?.message || data?.details || text || response.status;
    throw new Error(String(details));
  }

  return data;
};

const updatePreview = () => {
  if (!postPreview || !postForm) return;

  const formData = new FormData(postForm);
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim();
  const category = String(formData.get("category") || "Notes");
  const tags = parseTags(String(formData.get("tags") || ""));
  const content = String(formData.get("content_markdown") || "");
  const coverUrl = String(formData.get("cover_image_url") || "").trim();

  if (!title && !content) {
    postPreview.innerHTML = '<p class="message-empty">开始输入标题和正文后，这里会显示预览。</p>';
    return;
  }

  postPreview.innerHTML = `
    <section class="article-hero preview-hero">
      <p class="kicker">${escapeHtml(category)}</p>
      <h1>${escapeHtml(title || "未命名文章")}</h1>
      <div class="article-meta">
        <time>${formatBlogDate(new Date().toISOString())}</time>
        ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
    </section>
    ${coverUrl ? `<figure class="article-image"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(title || "文章封面")}" /></figure>` : ""}
    <section class="article-body solo">${markdownToHtml(content || "")}</section>
  `;
};

postTitleInput?.addEventListener("input", () => {
  if (!postSlugInput || slugWasEdited) return;
  postSlugInput.value = slugify(postTitleInput.value);
});

postSlugInput?.addEventListener("input", () => {
  slugWasEdited = true;
  postSlugInput.value = slugify(postSlugInput.value);
});

postForm?.addEventListener("input", updatePreview);

coverFileInput?.addEventListener("change", () => {
  const file = coverFileInput.files?.[0];
  if (!file) {
    clearCover();
    return;
  }

  if (!file.type.startsWith("image/")) {
    setPostStatus("请选择图片文件。");
    clearCover();
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setPostStatus("封面图不能超过 5MB。");
    clearCover();
    return;
  }

  selectedCoverFile = file;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (coverPreview && coverPreviewImage) {
      coverPreviewImage.src = String(reader.result || "");
      coverPreview.classList.remove("is-hidden");
    }
  });
  reader.readAsDataURL(file);
  setPostStatus("封面图已选择，发布时会上传。");
});

clearCoverButton?.addEventListener("click", () => {
  clearCover();
  setPostStatus("封面图已移除。");
  updatePreview();
});

coverUrlInput?.addEventListener("input", () => {
  if (coverPreview && coverPreviewImage && coverUrlInput.value.trim()) {
    coverPreviewImage.src = coverUrlInput.value.trim();
    coverPreview.classList.remove("is-hidden");
  }
});

postForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!writerConfigured()) {
    setPostStatus("Supabase 尚未配置，无法发布文章。");
    return;
  }

  const submitButton = postForm.querySelector("button[type='submit']");
  const formData = new FormData(postForm);
  const title = String(formData.get("title") || "").trim();
  const slug = slugify(String(formData.get("slug") || title));
  const contentMarkdown = String(formData.get("content_markdown") || "").trim();
  const writerSecret = String(formData.get("writer_secret") || "");

  if (!title || !slug || !contentMarkdown || !writerSecret) {
    setPostStatus("请填写发布密码、标题、slug 和正文。");
    return;
  }

  submitButton.disabled = true;
  setPostStatus("正在发布...");

  try {
    const uploadedCoverUrl = await uploadCoverImage();
    const coverImageUrl = uploadedCoverUrl || String(formData.get("cover_image_url") || "").trim() || null;
    const post = await createPost({
      p_writer_secret: writerSecret,
      p_slug: slug,
      p_title: title,
      p_summary: String(formData.get("summary") || "").trim(),
      p_category: String(formData.get("category") || "Notes"),
      p_tags: parseTags(String(formData.get("tags") || "")),
      p_cover_image_url: coverImageUrl,
      p_content_markdown: contentMarkdown,
    });

    setPostStatus("发布成功，正在打开文章...");
    const targetSlug = encodeURIComponent(post?.slug || slug);
    window.location.href = `post.html?slug=${targetSlug}`;
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "未知错误";
    setPostStatus(`发布失败：${message.slice(0, 180)}`);
  } finally {
    submitButton.disabled = false;
  }
});

updatePreview();
