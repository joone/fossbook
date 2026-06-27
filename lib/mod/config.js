const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const defaults = {
  blogName: "My Blog",
  authorName: "",
  authorDescription: "",
  authorWebsite: "",
  blogDescription: "",
  blogsite: "http://localhost:3000",
  githubCNAME: "",
  googleAnalyticsID: "",
  authorTwitter: "",
  siteTwitter: "",
  githubRepository: "",
  image: "",
  theme: "archie",
  basePath: "",  // auto-detected for GitHub Pages project sites, e.g. "/repo-name/"
  postsPath: "posts",  // URL prefix for posts: "posts" serves articles at /posts/<slug>/; set "" for root
  comments: null,  // { provider: "utterances", repo: "user/repo", issueTerm: "pathname", theme: "github-light" }
  content: "./content",
  postsDir: "./content/posts",
  outputDir: "./public",
  staticDir: "./static",
  themesDir: "./themes",
};

/**
 * Resolve the theme path, checking the user's themesDir first,
 * then falling back to the built-in themes directory.
 */
function resolveThemePath(config) {
  const themeName = config.theme || "archie";
  const userThemePath = path.resolve(config.themesDir || "./themes", themeName);
  const builtinThemePath = path.resolve(__dirname, "../../themes", themeName);

  if (fs.existsSync(userThemePath)) {
    return userThemePath;
  }
  if (fs.existsSync(builtinThemePath)) {
    return builtinThemePath;
  }
  console.error(`Theme "${themeName}" not found in ${userThemePath} or ${builtinThemePath}`);
  process.exit(1);
}

/**
 * Load configuration from the user's fossbook.config.js (or a custom path),
 * merge with defaults, and build the internal dev paths.
 */
function loadConfig(configPath) {
  const resolvedConfigPath = path.resolve(configPath || "./fossbook.config.js");

  let userConfig = {};
  if (fs.existsSync(resolvedConfigPath)) {
    userConfig = require(resolvedConfigPath);
  } else if (configPath) {
    // Only error if user explicitly specified a config path
    console.error(`Config file not found: ${resolvedConfigPath}`);
    process.exit(1);
  } else {
    console.warn("No fossbook.config.js found, using defaults.");
  }

  const merged = { ...defaults, ...userConfig };

  // Build the internal dev paths object used by the generator modules
  const themePath = resolveThemePath(merged);

  merged.dev = {
    postsdir: path.resolve(merged.postsDir),
    content: path.resolve(merged.content),
    about: path.resolve(merged.content, "about.md"),
    outdir: path.resolve(merged.outputDir),
    themePath: path.dirname(themePath), // e.g. /path/to/themes
    staticDir: path.resolve(merged.staticDir),
  };

  merged.themePath = themePath; // full path to the active theme directory

  // Inject version and build date
  merged.version = require("../../package.json").version;
  merged.date_time = formatDate(new Date());

  // Auto-detect basePath if not explicitly set
  if (!merged.basePath) {
    merged.basePath = detectBasePath(merged);
  }
  // Ensure basePath has trailing slash
  if (!merged.basePath.endsWith("/")) {
    merged.basePath += "/";
  }

  // Normalize postsPath into a bare segment without surrounding slashes
  merged.postsPath = (merged.postsPath || "").replace(/^\/+|\/+$/g, "");

  return merged;
}

function formatDate(
  date,
  locale = "en-US",
  options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  return date.toLocaleDateString(locale, options);
}

/**
 * Auto-detect basePath for GitHub Pages project sites.
 * Returns "/repo-name/" for project sites, or "/" for user sites / custom domains.
 */
function detectBasePath(config) {
  // If user has a custom domain, no prefix needed
  if (config.githubCNAME) return "/";

  try {
    const remoteUrl = execSync("git remote get-url origin", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split("/");
      // User/org sites (e.g. username.github.io) are served at root
      if (repo === `${owner}.github.io`) return "/";
      // Project sites need the repo name as prefix
      return `/${repo}/`;
    }
  } catch {
    // Not a git repo or no remote — fall back to root
  }
  return "/";
}

module.exports = { loadConfig, resolveThemePath, formatDate };
