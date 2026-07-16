const root = document.documentElement;
const header = document.querySelector(".site-header");
const toggle = document.querySelector(".theme-toggle");
const storedTheme = localStorage.getItem("blog-theme");

if (storedTheme) {
  root.dataset.theme = storedTheme;
}

const syncHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
};

toggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem("blog-theme", nextTheme);
});

window.addEventListener("scroll", syncHeader, { passive: true });
syncHeader();
