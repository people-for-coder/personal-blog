# Writing posts

GitHub Pages cannot safely host an admin backend, so posts are managed in Supabase.

Open:

`Supabase Dashboard -> Table Editor -> blog_posts`

Create a row with these fields:

- `slug`: URL-safe article id, for example `fpga-timing-notes`.
- `title`: article title.
- `summary`: short description shown on the article list.
- `category`: one of `C`, `CPP`, `JavaScript`, `Java`, `HTML`, `CSS`, `Python`, `Linux`, `FPGA`, or `Notes`.
- `tags`: text array, for example `{FPGA,Timing,Verilog}`.
- `cover_image_url`: optional public image URL.
- `content_markdown`: article body in Markdown.
- `is_published`: defaults to `true`; new rows appear on the blog immediately.
- `published_at`: defaults to the current time; set a custom time only when you need backdating.

Readers can comment directly on posts. Comments are stored in `post_comments` and do not require moderation.
