# FZ Personal Blog

A lightweight static personal blog built with plain HTML, CSS, and JavaScript. The site is designed for GitHub Pages and focuses on readable technical writing, responsive layouts, and a simple maintenance workflow.

## Live Site

The site is published with GitHub Pages:

<https://people-for-coder.github.io/personal-blog/>

## Current Version

`v1.0.0`

This is the first public release of the blog. It establishes the static site structure, responsive page layout, article list, message board page, author page, and GitHub Pages deployment workflow.

## Features

- Static HTML/CSS/JavaScript implementation with no runtime framework.
- Responsive layout for desktop, tablet, and mobile screens.
- Home page with technical stack navigation and recent writing cards.
- Article list page with keyword search and category filtering.
- Frontend article writer with Markdown preview and protected publishing password.
- Message board page with expandable entries.
- Supabase-backed guestbook submissions with optional image upload.
- Supabase-backed dynamic posts and instant comments.
- About page with profile and contact information.
- GitHub Pages deployment through GitHub Actions.
- UTF-8 source files with readable Chinese content.

## Project Structure

```text
.
├── .github/workflows/pages.yml   # GitHub Pages deployment workflow
├── assets/                       # SVG avatar assets
├── about.html                    # About page
├── articles.html                 # Article list and search page
├── write.html                    # Frontend article composer
├── writer.js                     # Article publishing flow
├── fz-overrides.css              # Site-specific visual refinements
├── index.html                    # Home page
├── projects.html                 # Message board page
├── script.js                     # Navigation, search, and filtering logic
└── styles.css                    # Base site styles
```

## Local Preview

You can preview the site with any static HTTP server:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

Opening `index.html` directly in a browser also works for basic viewing, but using a local HTTP server is closer to the production environment.

## Guestbook Sync Setup

GitHub Pages is static hosting, so the message board uses Supabase directly from the browser. To enable cross-device sync:

1. Create a Supabase project.
2. Run `docs/supabase-guestbook-schema.sql` in the Supabase SQL editor.
3. Copy the project URL and anon public key into `config.js`.
4. Keep `supabaseStorageBucket` as `guestbook` unless you changed the bucket name in SQL.

Public visitors can only insert `pending` messages and read `approved` messages. Review messages in the Supabase dashboard by changing `guestbook_messages.status` from `pending` to `approved`.

## Writing Posts and Comments

Posts can be published from `write.html`. The page calls a Supabase RPC with a publishing password and inserts into the `blog_posts` table. See `docs/writing-posts.md` for field details.

Published posts are visible on `articles.html` and open through `post.html?slug=...`.

Comments are stored in `post_comments`. They are public immediately after submission and do not require moderation.

## Deployment

The site is deployed automatically by GitHub Actions whenever changes are pushed to `main`.

Deployment workflow:

```text
.github/workflows/pages.yml
```

GitHub Pages URL:

```text
https://people-for-coder.github.io/personal-blog/
```

## Versioning and Release Branches

This project uses semantic versioning for public releases.

- Stable development branch: `main`
- First release branch: `release/v1.0.0`
- First release tag: `v1.0.0`

For future releases:

1. Complete and verify changes on `main`.
2. Create a release branch named `release/vX.Y.Z`.
3. Create a Git tag named `vX.Y.Z`.
4. Publish a GitHub Release from the tag.

## Maintenance Notes

- Update page content directly in the corresponding HTML file.
- Keep shared styles in `styles.css`.
- Keep project-specific visual overrides in `fz-overrides.css`.
- Keep interactive behavior in `script.js`.
- Run `git diff --check` before committing to catch whitespace issues.
- Run `node --check script.js`, `node --check blog.js`, and `node --check writer.js` after JavaScript changes.

## License

No license has been declared yet. Add a license file before distributing this project for reuse.
