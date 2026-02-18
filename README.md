# Fossbook

A lightweight static blog site generator for GitHub Pages, similar to Hugo but built with Node.js.

## Features

- **Markdown-based** — Write posts in Markdown with YAML front-matter
- **Pagination** — Automatic home page pagination
- **Tags** — Tag-based categorization with tag index and per-tag listing pages
- **Theming** — Bundled Archie theme with support for custom themes
- **SEO** — Open Graph and Twitter Card meta tags out of the box
- **GitHub Pages** — Built-in CNAME support for custom domains
- **Dev server** — Local preview server with Express
- **Syntax highlighting** — Code block highlighting via highlight.js

## Quick Start

### Install globally

```bash
npm install -g fossbook
```

### Create a new site

```bash
mkdir my-blog && cd my-blog
fossbook init
```

This creates the following structure:

```
my-blog/
├── content/
│   ├── about.md
│   └── posts/
├── static/
│   └── images/
├── fossbook.config.js
└── package.json
```

### Create a new post

```bash
fossbook new "My First Post"
```

This creates `content/posts/My First Post/index.md` with pre-filled front-matter and an `images/` directory.

### Build the site

```bash
fossbook build
```

### Preview locally

```bash
fossbook serve
```

Open http://localhost:3000 to view your site.

## Configuration

Create a `fossbook.config.js` in your project root:

```js
module.exports = {
  blogName: "My Blog",
  authorName: "Your Name",
  authorDescription: "A short bio",
  authorWebsite: "https://example.com",
  blogDescription: "A blog about things",
  blogsite: "https://example.com",

  // Optional
  githubCNAME: "example.com",
  googleAnalyticsID: "",
  authorTwitter: "@you",
  siteTwitter: "@yourblog",
  githubRepository: "https://github.com/you/your-blog",
  image: "https://example.com/default-image.png",
  theme: "archie",

  // Directory overrides (defaults shown)
  content: "./content",
  postsDir: "./content/posts",
  outputDir: "./public",
  staticDir: "./static",
  themesDir: "./themes",
};
```

## Content Format

### Post front-matter

```markdown
---
title: My Post Title
date: 2026-02-17
description: "A brief summary of the post"
image: "feature.png"
tags: "JavaScript, Node.js, Static Site"
---

Your Markdown content here...
```

### Directory structure

```
content/posts/My Post Title/
├── index.md
└── images/
    └── feature.png
```

## CLI Reference

```
Usage: fossbook <command> [options]

Commands:
  build          Build the static site
  serve          Build and start a local dev server
  new <title>    Create a new post
  init           Create a new fossbook site project

Options:
  -c, --config   Path to config file (default: ./fossbook.config.js)
  -o, --output   Output directory (default: ./public)
  -p, --port     Dev server port (default: 3000)
  -v, --version  Show version number
  -h, --help     Show help
```

## Theming

Fossbook ships with the Archie theme by default. To use a custom theme:

1. Create a `themes/<your-theme>/` directory in your project
2. Add `layouts/` (HTML templates) and `assets/` (CSS, fonts, images)
3. Set `theme: "your-theme"` in `fossbook.config.js`

Theme resolution order: user project `themes/` → built-in `themes/`.

### Required layout files

```
layouts/
├── home.html        # Home page with pagination
├── post.html        # Individual post page
├── page.html        # Static pages (e.g., about)
├── all_posts.html   # All posts listing
├── tag.html         # Per-tag listing
├── tag_list.html    # Tag index page
└── partials/
    └── footer.html  # Footer partial
```

## License

- Generator code: [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause)
- Archie theme: [MIT License](https://github.com/athul/archie?tab=MIT-1-ov-file#readme)

## Credits

Adapted from [kartiknair's blog](https://github.com/kartiknair/blog) and styled using the [Archie theme](https://github.com/athul/archie).
