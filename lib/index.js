const fs = require("fs");
const path = require("path");

const Page = require("./mod/page");
const HomePagination = require("./home");
const AllPostsPage = require("./all_posts");
const Posts = require("./posts");
const TagPages = require("./tag");

function copyDirectoryRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createPostTranslationIndex(languageConfigs) {
  const translationIndex = new Map();
  if (languageConfigs.length === 0) return translationIndex;

  const postsDir = languageConfigs[0].dev.postsdir;
  if (!fs.existsSync(postsDir)) return translationIndex;

  for (const entry of fs.readdirSync(postsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const translations = [];
    for (const config of languageConfigs) {
      const sourceFile = config.language === config.defaultLanguage
        ? "index.md"
        : `index.${config.language}.md`;
      if (!fs.existsSync(path.join(postsDir, entry.name, sourceFile))) continue;

      const prefix = config.postsPath ? `${config.postsPath}/` : "";
      translations.push({
        language: config.language,
        languageName: config.languageName,
        path: `${config.basePath}${prefix}${entry.name}/`,
        url: `${config.blogsite}/${prefix}${entry.name}/`,
        isDefault: config.language === config.defaultLanguage,
      });
    }
    translationIndex.set(entry.name, translations);
  }

  return translationIndex;
}

function createAboutTranslations(languageConfigs) {
  if (languageConfigs.length === 0) return [];

  const contentDir = languageConfigs[0].dev.content;
  return languageConfigs.flatMap((config) => {
    const sourceFile = config.language === config.defaultLanguage
      ? "about.md"
      : `about.${config.language}.md`;
    if (!fs.existsSync(path.join(contentDir, sourceFile))) return [];

    return [{
      language: config.language,
      languageName: config.languageName,
      path: `${config.basePath || "/"}about/`,
      url: `${config.blogsite}/about/`,
      isDefault: config.language === config.defaultLanguage,
    }];
  });
}

function buildLanguage(config) {
  fs.mkdirSync(config.dev.outdir, { recursive: true });

  // Create post pages in output directory
  const posts = new Posts(config);
  const postObjects = posts.createPostObjects();

  postObjects.forEach((post) => {
    post.generateContent("post.html");
  });

  // Create home page and pagination in output/page directory
  const homePagination = new HomePagination(config);
  homePagination.generateContent(postObjects);

  // Create all posts page in output/all_posts directory
  const allPostsPage = new AllPostsPage(config);
  allPostsPage.generateContent(postObjects);

  // Create tag pages in output/tags directory
  const tagPages = new TagPages(config);
  tagPages.generateContent(postObjects);

  // Create about page in output/about directory
  const aboutFile = config.language === config.defaultLanguage
    ? "about.md"
    : `about.${config.language}.md`;
  const aboutPath = path.resolve(config.dev.content, aboutFile);
  if (fs.existsSync(aboutPath)) {
    const aboutPage = new Page(config);
    aboutPage.readSource(aboutPath, "about");
    aboutPage.translations = config.aboutTranslations || [];
    aboutPage.generateContent("page.html", "about");
  }

  // Copy static directory to output directory
  const staticImagesDir = path.join(config.dev.staticDir, "images");
  if (fs.existsSync(staticImagesDir)) {
    copyDirectoryRecursive(staticImagesDir, path.join(config.dev.outdir, "images"));
  }

  // Copy theme assets to output directory
  const themeAssetsDir = path.join(config.themePath, "assets");
  if (fs.existsSync(themeAssetsDir)) {
    copyDirectoryRecursive(themeAssetsDir, config.dev.outdir);
  }
}

function build(config) {
  // Remove the output directory
  if (fs.existsSync(config.dev.outdir))
    fs.rmSync(config.dev.outdir, { recursive: true });
  fs.mkdirSync(config.dev.outdir, { recursive: true });

  const languageConfigs = config.languageConfigs || [config];
  const postTranslationIndex = createPostTranslationIndex(languageConfigs);
  const aboutTranslations = createAboutTranslations(languageConfigs);
  languageConfigs.forEach((languageConfig) => {
    languageConfig.postTranslationIndex = postTranslationIndex;
    languageConfig.aboutTranslations = aboutTranslations;
  });
  languageConfigs.forEach(buildLanguage);

  // Create CNAME file for GitHub Pages
  if (config.githubCNAME)
    fs.writeFileSync(path.join(config.dev.outdir, "CNAME"), config.githubCNAME);

  console.log("Build completed successfully");
}

module.exports = {
  build,
  buildLanguage,
  createPostTranslationIndex,
  createAboutTranslations,
};
