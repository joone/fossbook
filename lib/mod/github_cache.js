const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { loadConfig } = require("./config");
const { CACHE_SCHEMA_VERSION } = require("./image");

function createGitHubCacheInfo(config, projectRoot = process.cwd()) {
  const hash = crypto.createHash("sha256");
  hash.update(
    JSON.stringify({
      schema: CACHE_SCHEMA_VERSION,
      languages: (config.languageConfigs || [config]).map((languageConfig) => ({
        imageOptimization: languageConfig.imageOptimization,
        imageMaxWidth: languageConfig.imageMaxWidth,
        imageMaxWidthOverride: languageConfig.imageMaxWidthOverride,
        imageWebP: languageConfig.imageWebP,
        imageResponsiveWidths: languageConfig.imageResponsiveWidths,
      })),
    }),
  );

  updateFile(
    hash,
    "package-lock.json",
    path.join(projectRoot, "package-lock.json"),
  );
  updateDirectory(
    hash,
    "posts",
    config.dev.postsdir,
    (filePath) => {
      const extension = path.extname(filePath).toLowerCase();
      return extension === ".md" || extension === ".png";
    },
    (filePath) =>
      path.extname(filePath).toLowerCase() === ".md"
        ? Buffer.from(extractImageTransformMetadata(filePath))
        : fs.readFileSync(filePath),
  );
  updateDirectory(
    hash,
    "static",
    path.join(config.dev.staticDir, "images"),
    (filePath) => path.extname(filePath).toLowerCase() === ".png",
  );
  updateDirectory(
    hash,
    "theme",
    path.join(config.themePath, "assets"),
    (filePath) => path.extname(filePath).toLowerCase() === ".png",
  );

  return {
    cachePath: config.dev.cacheDir,
    inputHash: hash.digest("hex"),
    statusPath: path.join(config.dev.cacheDir, "image-cache-status.json"),
  };
}

function writeGitHubCacheOutputs(configPath) {
  const info = createGitHubCacheInfo(loadConfig(configPath));
  if (!process.env.GITHUB_OUTPUT) {
    throw new Error("GITHUB_OUTPUT is required");
  }
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `cache-path=${info.cachePath}\n` +
      `input-hash=${info.inputHash}\n` +
      `status-path=${info.statusPath}\n`,
  );
  return info;
}

function updateDirectory(
  hash,
  label,
  root,
  includeFile,
  readContents = (filePath) => fs.readFileSync(filePath),
) {
  if (!fs.existsSync(root)) return;

  const files = [];
  collectFiles(root, includeFile, files);
  files.sort((left, right) => left.localeCompare(right));
  for (const filePath of files) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    updateContents(hash, `${label}/${relativePath}`, readContents(filePath));
  }
}

function collectFiles(directory, includeFile, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath, includeFile, files);
    } else if (entry.isFile() && includeFile(entryPath)) {
      files.push(entryPath);
    }
  }
}

function updateFile(hash, label, filePath) {
  if (!fs.existsSync(filePath)) return;
  updateContents(hash, label, fs.readFileSync(filePath));
}

function updateContents(hash, label, contents) {
  hash.update(label);
  hash.update("\0");
  hash.update(contents);
  hash.update("\0");
}

function extractImageTransformMetadata(filePath) {
  const markdown = fs.readFileSync(filePath, "utf8");
  const imagePattern = /!\[[^\]]*\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g;
  return JSON.stringify(
    [...markdown.matchAll(imagePattern)].map((match) => ({
      href: match[1],
      publishWidth: match[2]?.match(/publish-width:(\d+)/)?.[1] || null,
    })),
  );
}

module.exports = {
  createGitHubCacheInfo,
  extractImageTransformMetadata,
  writeGitHubCacheOutputs,
};
