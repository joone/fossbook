const fs = require("fs");
const path = require("path");

function createPost(config, title) {
  const postsDir = config.dev.postsdir;
  const postDir = path.join(postsDir, title);

  if (fs.existsSync(postDir)) {
    console.error(`Error: Post "${title}" already exists at ${postDir}`);
    process.exit(1);
  }

  // Ensure the posts directory exists
  fs.mkdirSync(postsDir, { recursive: true });

  // Create the post directory and images subdirectory
  fs.mkdirSync(postDir, { recursive: true });
  fs.mkdirSync(path.join(postDir, "images"), { recursive: true });

  // Generate today's date in YYYY-MM-DD format
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Copy placeholder image to the post's images directory
  const placeholderSrc = path.join(__dirname, "assets", "placeholder.svg");
  const placeholderDest = path.join(postDir, "images", "placeholder.svg");
  if (fs.existsSync(placeholderSrc)) {
    fs.copyFileSync(placeholderSrc, placeholderDest);
  }

  // Write index.md with front-matter
  const frontMatter = `---
title: ${title}
date: ${dateStr}
description: ""
image: "placeholder.svg"
tags: ""
---
`;

  fs.writeFileSync(path.join(postDir, "index.md"), frontMatter);

  console.log(`Created new post: ${postDir}`);
  console.log(`  - ${path.join(postDir, "index.md")}`);
  console.log(`  - ${path.join(postDir, "images/")}`);
}

module.exports = { createPost };
