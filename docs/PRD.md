# Fossbook — Product Requirements Document

**Version:** 1.0
**Date:** February 17, 2026
**Author:** Joone Hur

---

## 1. Overview

Fossbook is a lightweight static blog site generator, similar to Hugo, designed to be hosted on GitHub Pages. It is being extracted from the [fosscomics](https://github.com/joone/fosscomics) project, where the generator code and site content currently live in the same repository. The goal is to decouple the generator into a standalone, reusable tool that any user can install and use to build their own static blog site.

### 1.1 Problem Statement

The current fosscomics repository bundles the static site generator (`src/`), blog content (`content/`), and theme (`themes/`) together. This makes it impossible for others to use the generator for their own blogs without forking the entire repository and removing the existing content. Site-specific configuration (site name, author, analytics IDs, CNAME) is hard-coded in the generator source.

### 1.2 Goal

Separate the static site generator into its own **npm package** called `fossbook` so that:

- Users can install it via `npm install fossbook` (or globally with `npm install -g fossbook`).
- Users supply their own content, configuration, and optionally a custom theme.
- The generator reads from convention-based directories and produces a fully static site in an output directory ready for deployment to GitHub Pages.

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Generator** | The Node.js tooling that reads Markdown content, applies templates, and outputs static HTML. Currently in `src/`. |
| **Content** | Markdown posts, about pages, images, and other assets authored by the user. Currently in `content/`. |
| **Theme** | HTML layout templates, partials, CSS, fonts, and static assets that define the site's look and feel. Currently in `themes/archie/`. |
| **Output** | The generated static HTML site. Currently written to `public/`. |
| **Site project** | A user's blog repository that depends on `fossbook` and contains content, config, and optionally a custom theme. |

---

## 3. Architecture

### 3.1 Current Structure (fosscomics)

```
fosscomics/
├── content/              # Blog content (Markdown, images)
│   ├── about.md
│   ├── posts/
│   └── page/
├── src/                  # Generator code
│   ├── index.js          # Entry point (build + dev server)
│   ├── home.js           # Home page pagination
│   ├── all_posts.js      # All-posts listing page
│   ├── posts.js          # Post page generation
│   ├── tag/              # Tag pages
│   └── mod/
│       ├── config.js     # Hard-coded site config
│       ├── page.js       # Page model
│       ├── page_base.js  # Base class (templating, SEO tags)
│       └── marked.js     # Markdown parser config
├── themes/
│   └── archie/
│       ├── layouts/      # HTML templates
│       └── assets/       # CSS, fonts, images
├── static/               # Extra static files (images)
├── public/               # Generated output
└── package.json
```

### 3.2 Target Structure

The project will be split into **two repositories**:

#### A. `fossbook` (the generator — npm package)

```
fossbook/
├── bin/
│   └── fossbook.js       # CLI entry point
├── lib/
│   ├── index.js           # Core build orchestrator
│   ├── home.js            # Home page pagination
│   ├── all_posts.js       # All-posts listing page
│   ├── posts.js           # Post page generation
│   ├── tag/               # Tag pages
│   ├── server.js          # Dev server
│   └── mod/
│       ├── config.js      # Config loader (reads user's fossbook.config.js)
│       ├── page.js        # Page model
│       ├── page_base.js   # Base class
│       └── marked.js      # Markdown parser config
├── themes/
│   └── archie/            # Default bundled theme
│       ├── layouts/
│       └── assets/
├── package.json
└── README.md
```

#### B. `fosscomics` (the blog site — user project)

```
fosscomics/
├── content/
│   ├── about.md
│   ├── posts/
│   │   ├── 1. Charles Babbage and Ada Lovelace/
│   │   │   ├── index.md
│   │   │   └── images/
│   │   └── ...
│   └── page/
├── static/
│   └── images/
├── fossbook.config.js     # Site-specific configuration
├── package.json           # depends on "fossbook"
└── public/                # Generated output (gitignored or committed for GH Pages)
```

---

## 4. Functional Requirements

### 4.1 CLI Interface

The `fossbook` package exposes a CLI binary with the following commands:

| Command | Description |
|---------|-------------|
| `fossbook build` | Build the static site from content → output directory. |
| `fossbook serve` | Build and start a local dev server (default port 3000). |
| `fossbook new <title>` | Create a new post with scaffolded front-matter and directory structure. |
| `fossbook init` | Scaffold a new site project with default directories and config file. |
| `fossbook deploy` | Build, commit, push to GitHub, and wait for CI/CD to complete. Shows the live URL when done. |

**npm scripts shorthand** (in the user's `package.json`):

```json
{
  "scripts": {
    "build": "fossbook build",
    "start": "fossbook serve"
  }
}
```

### 4.2 Configuration File

Users provide a `fossbook.config.js` (or `fossbook.config.json`) in their project root. The generator reads this at build time.

```js
// fossbook.config.js
module.exports = {
  blogName: "F/OSS Comics",
  authorName: "Joone",
  authorDescription: "Open Source Developer and Comic Artist",
  authorWebsite: "https://fosscomics.com",
  blogDescription: "A comic series dedicated to Free and Open Source Software.",
  blogsite: "https://fosscomics.com",

  // Optional
  githubCNAME: "fosscomics.com",
  googleAnalyticsID: "",
  authorTwitter: "@joone",
  siteTwitter: "@fosscomics",
  githubRepository: "https://github.com/joone/fosscomics",
  image: "https://fosscomics.com/8.%20UNIX%20and%20C%20Language/images/feature.png",
  theme: "archie",          // Name of the theme to use

  // Directory overrides (defaults shown)
  content: "./content",
  postsDir: "./content/posts",
  outputDir: "./public",
  staticDir: "./static",
  themesDir: "./themes",    // For custom themes; falls back to built-in themes
};
```

**Config resolution order:**

1. User's `fossbook.config.js` in the current working directory.
2. Defaults provided by the generator.

### 4.3 Content Format

Content format remains unchanged from the current implementation:

- **Posts** are Markdown files (with front-matter) in `content/posts/<post-name>/index.md`.
- **Images** are co-located in `content/posts/<post-name>/images/`.
- **About page** is `content/about.md`.
- **Front-matter** fields: `title`, `date`, `description`, `image`, `tags` (comma-separated string).

### 4.4 Theming

- The `archie` theme ships as the **default built-in theme** inside the `fossbook` package.
- Users can override the theme by placing a custom theme in their project's `themes/` directory and setting `theme` in the config.
- Theme resolution order:
  1. `<userProject>/themes/<themeName>/`
  2. `<fossbook>/themes/<themeName>/` (built-in)
- A theme consists of:
  - `layouts/` — HTML template files (`home.html`, `post.html`, `page.html`, `all_posts.html`, `tag.html`, `tag_list.html`, and `partials/`).
  - `assets/` — Static assets (CSS, fonts, images) copied to the output directory.

### 4.5 Build Process

The build process mirrors the current implementation with paths resolved from config:

1. **Clean** the output directory.
2. **Read posts** from `content/posts/`, parse front-matter and Markdown, sort by date.
3. **Generate post pages** using the `post.html` template; copy co-located images.
4. **Generate home page** with pagination (5 posts per page) using `home.html`.
5. **Generate all-posts page** using `all_posts.html`.
6. **Generate tag pages** — a tag index and per-tag listing pages.
7. **Generate about page** using `page.html`.
8. **Copy static assets** — `static/` directory contents and theme `assets/`.
9. **Write CNAME** file if `githubCNAME` is configured.

### 4.6 Dev Server

- Serve the output directory using Express on a configurable port (default: 3000).
- Future: Add file watching and live reload (out of scope for v1).

### 4.7 CI/CD & GitHub Pages Deployment

Fossbook provides built-in support for deploying a user's blog to GitHub Pages via GitHub Actions.

#### 4.7.1 GitHub Repository Setup (`fossbook init --github`)

When the user runs `fossbook init --github`, fossbook will:

1. Initialize a local Git repository (`git init`) if one doesn't exist.
2. Create a GitHub repository using the GitHub CLI (`gh repo create`) or the GitHub API.
3. Set the repository as the `origin` remote.
4. Generate a `.github/workflows/deploy.yml` workflow file (see §4.7.2).
5. Commit and push the initial project to GitHub.

**Prerequisites:** The user must have the GitHub CLI (`gh`) installed and authenticated, or provide a GitHub personal access token via environment variable `GITHUB_TOKEN`.

#### 4.7.2 GitHub Actions Workflow (`deploy.yml`)

`fossbook init` (with or without `--github`) generates a `.github/workflows/deploy.yml` in the user's blog repository:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npx fossbook build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

This workflow automatically builds and deploys the blog whenever the user pushes to `main`.

#### 4.7.3 Publishing a Post (`fossbook deploy`)

The `fossbook deploy` command provides a one-command workflow for publishing:

1. **Build** the site (`fossbook build`).
2. **Git add & commit** all changes (content + generated output) with an auto-generated commit message (e.g., `"Publish: <post-title>"`).
3. **Push** to the `origin` remote on the `main` branch.
4. **Poll the GitHub Actions workflow** status via the GitHub API or `gh run watch`.
5. **Display the live URL** of the newly published article once the deployment completes.

**Example workflow:**

```bash
$ fossbook new "My New Article"
# ... edit content/posts/My New Article/index.md ...
$ fossbook deploy

Building site... done.
Committing: "Publish: My New Article"
Pushing to origin/main...
Waiting for GitHub Pages deployment... ✓

✅ Published! View your article at:
   https://username.github.io/my-blog/My%20New%20Article/
```

**Options:**

| Flag | Description |
|------|-------------|
| `--message <msg>` | Custom commit message (default: auto-generated) |
| `--no-wait` | Push and exit without waiting for CI/CD to finish |
| `--draft` | Commit but don't push (for staging changes locally) |

#### 4.7.4 Configuration

Deployment-related settings in `fossbook.config.js`:

```js
module.exports = {
  // ... existing config ...
  deploy: {
    branch: "main",           // Branch to push to (default: "main")
    remote: "origin",         // Git remote name (default: "origin")
  },
};
```

---

## 5. Non-Functional Requirements

| Requirement | Details |
|-------------|---------|
| **Runtime** | Node.js >= 18 |
| **Package manager** | npm (published to npmjs.com) |
| **Dependencies** | Minimal: `express`, `front-matter`, `marked`, `highlight.js` |
| **Performance** | Build completes in < 5 seconds for up to 100 posts |
| **Backward compatibility** | Existing fosscomics content and theme work without modification after migration |
| **License** | BSD 3-Clause for the generator; Archie theme retains MIT license |

---

## 6. Migration Plan

### Phase 1 — Extract generator into `fossbook` package

1. Create a new `fossbook` repository.
2. Move `src/` → `lib/`, removing hard-coded config.
3. Implement config loader that reads `fossbook.config.js` from the user's project root (CWD).
4. Replace all hard-coded paths (`./content`, `./public`, `./themes`) with config-driven paths.
5. Create `bin/fossbook.js` CLI entry point supporting `build` and `serve` commands.
6. Bundle `themes/archie/` as the default theme inside the package.
7. Add theme resolution logic (user theme → built-in theme fallback).
8. Implement `fossbook new <title>` command to scaffold new posts.
9. Generate `.github/workflows/deploy.yml` during `fossbook init`.
10. Implement `fossbook deploy` command (build → commit → push → poll CI → show URL).
11. Publish to npm as `fossbook`.

### Phase 2 — Refactor fosscomics as a user project

1. Remove `src/` from the fosscomics repository.
2. Add `fossbook` as an npm dependency.
3. Create `fossbook.config.js` with fosscomics-specific settings.
4. Update `package.json` scripts to use `fossbook build` / `fossbook serve`.
5. Verify the build output matches the current site.

### Phase 3 — Enhancements (post-launch)

1. `fossbook init` scaffolding command.
2. File watching and live reload in dev server.
3. RSS/Atom feed generation.
4. Sitemap generation.
5. Draft post support (front-matter `draft: true`).
6. Custom page support beyond "about".
7. Plugin/hook system for extensibility.
8. Multi-language (i18n) support (leveraging existing `content/korean/` pattern).

---

## 7. CLI Design Detail

```
Usage: fossbook <command> [options]

Commands:
  build          Build the static site
  serve          Build and start a local dev server
  new <title>    Create a new post
  init           Create a new fossbook site project
  deploy         Build, commit, push, and deploy to GitHub Pages

Options:
  -c, --config       Path to config file (default: ./fossbook.config.js)
  -o, --output       Output directory (default: ./public)
  -p, --port         Dev server port (default: 3000)
  --clean            Remove output directory before build (default: true)
  --github           (init) Also create a GitHub repository
  --message <msg>    (deploy) Custom commit message
  --no-wait          (deploy) Don't wait for CI/CD to finish
  -v, --version      Show version number
  -h, --help         Show help
```

---

## 8. Key Refactoring Changes

### 8.1 Config Module (`lib/mod/config.js`)

**Before:** Exports a hard-coded object with fosscomics-specific values.

**After:** Exports a function that merges user config with defaults:

```js
function loadConfig(configPath) {
  const defaults = {
    theme: "archie",
    content: "./content",
    postsDir: "./content/posts",
    outputDir: "./public",
    staticDir: "./static",
    themesDir: "./themes",
  };

  const userConfig = require(path.resolve(configPath || "./fossbook.config.js"));
  return { ...defaults, ...userConfig };
}
```

### 8.2 Path Resolution

All file system operations must resolve paths relative to the **user's project root** (CWD), not the `fossbook` package directory. Theme resolution must check the user's `themesDir` first, then fall back to the package's built-in `themes/` directory.

### 8.3 Post Scaffolding (`fossbook new`)

Running `fossbook new "My First Post"` will:

1. Read `postsDir` from the config (default: `./content/posts`).
2. Create the directory `<postsDir>/My First Post/`.
3. Create an empty `images/` subdirectory.
4. Write `index.md` with pre-filled front-matter:

```markdown
---
title: My First Post
date: 2026-02-17
description: ""
image: ""
tags: ""
---
```

The `date` field is set to today's date in `YYYY-MM-DD` format. If a post with the same title already exists, the command prints an error and exits without overwriting.

### 8.4 Template Engine

The current template engine uses JavaScript template literals evaluated via `new Function()`. This approach is preserved for v1 but should be documented and eventually replaced with a safer, more standard template engine.

---

## 9. Success Criteria

1. A user can `npm install fossbook`, create a `fossbook.config.js`, add content to `content/posts/`, and run `npx fossbook build` to generate a static site.
2. The generated fosscomics site is **identical** to the current build output after migration.
3. The `fossbook` package has **zero** hard-coded references to fosscomics-specific data.
4. A new user can set up a blog from scratch in under 5 minutes using `fossbook init`.

---

## 10. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should the default theme be bundled in the package or distributed as a separate npm package (e.g., `fossbook-theme-archie`)? | **Decided: bundled for v1** |
| 2 | Should `fossbook.config.js` support ESM (`export default`) in addition to CJS (`module.exports`)? | Open |
| 3 | Should the CLI use a framework like `commander` or `yargs`? | Open |
| 4 | Should the project migrate from CommonJS to ES Modules? | Open |
| 5 | What is the minimum Node.js version to support? | Proposed: 18+ |
