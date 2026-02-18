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

function build(config) {
  // Remove the output directory
  if (fs.existsSync(config.dev.outdir))
    fs.rmSync(config.dev.outdir, { recursive: true });
  fs.mkdirSync(config.dev.outdir);

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
  const aboutPath = config.dev.about;
  if (fs.existsSync(aboutPath)) {
    const aboutPage = new Page(config);
    aboutPage.readSource(aboutPath);
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

  // Create CNAME file for GitHub Pages
  if (config.githubCNAME)
    fs.writeFileSync(path.join(config.dev.outdir, "CNAME"), config.githubCNAME);

  console.log("Build completed successfully");
}

module.exports = { build };
