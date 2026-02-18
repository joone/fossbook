const fs = require("fs");
const path = require("path");

function initProject() {
  const cwd = process.cwd();

  // Create directories
  const dirs = [
    "content/posts",
    "static/images",
  ];

  dirs.forEach((dir) => {
    const dirPath = path.join(cwd, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created: ${dir}/`);
    }
  });

  // Create fossbook.config.js
  const configPath = path.join(cwd, "fossbook.config.js");
  if (!fs.existsSync(configPath)) {
    const configContent = `module.exports = {
  blogName: "My Blog",
  authorName: "",
  authorDescription: "",
  authorWebsite: "",
  blogDescription: "A blog powered by fossbook",
  blogsite: "http://localhost:3000",

  // Optional
  githubCNAME: "",
  googleAnalyticsID: "",
  authorTwitter: "",
  siteTwitter: "",
  githubRepository: "",
  image: "",
  theme: "archie",

  // Directory overrides (defaults shown)
  content: "./content",
  postsDir: "./content/posts",
  outputDir: "./public",
  staticDir: "./static",
  themesDir: "./themes",
};
`;
    fs.writeFileSync(configPath, configContent);
    console.log("Created: fossbook.config.js");
  }

  // Create content/about.md
  const aboutPath = path.join(cwd, "content", "about.md");
  if (!fs.existsSync(aboutPath)) {
    const aboutContent = `---
title: About
---

Welcome to my blog!
`;
    fs.writeFileSync(aboutPath, aboutContent);
    console.log("Created: content/about.md");
  }

  // Create package.json if it doesn't exist
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    const pkg = {
      name: path.basename(cwd),
      version: "1.0.0",
      private: true,
      scripts: {
        build: "fossbook build",
        start: "fossbook serve",
      },
      dependencies: {
        fossbook: "latest",
      },
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log("Created: package.json");
  }

  console.log("\nSite initialized! Next steps:");
  console.log('  1. Edit fossbook.config.js with your site settings');
  console.log('  2. Run: fossbook new "My First Post"');
  console.log("  3. Edit your post in content/posts/");
  console.log("  4. Run: fossbook build");
  console.log("  5. Run: fossbook serve");
}

module.exports = { initProject };
