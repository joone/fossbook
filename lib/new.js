const fs = require("fs");
const path = require("path");

function createPost(config, title, languageOption) {
  const postsDir = config.dev.postsdir;
  const postDir = path.join(postsDir, title);
  const defaultLanguage = config.defaultLanguage || "en";
  const requestedLanguages = parseLanguages(languageOption);
  const configuredLanguages = config.languages
    ? Object.keys(config.languages)
    : [defaultLanguage];
  const unsupportedLanguages = requestedLanguages.filter(
    (language) => !configuredLanguages.includes(language),
  );
  if (unsupportedLanguages.length > 0) {
    throw new Error(
      `Language${unsupportedLanguages.length > 1 ? "s" : ""} "${unsupportedLanguages.join(", ")}" ` +
      `not configured. Available languages: ${configuredLanguages.join(", ")}`,
    );
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
  if (fs.existsSync(placeholderSrc) && !fs.existsSync(placeholderDest)) {
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

  const languages = [defaultLanguage, ...requestedLanguages];
  const uniqueLanguages = [...new Set(languages)];
  const results = uniqueLanguages.map((language) => {
    const fileName = language === defaultLanguage
      ? "index.md"
      : `index.${language}.md`;
    const filePath = path.join(postDir, fileName);
    if (fs.existsSync(filePath)) {
      console.log(`Skipped existing post: ${filePath}`);
      return { language, filePath, created: false };
    }

    fs.writeFileSync(filePath, frontMatter);
    console.log(`Created new post: ${filePath}`);
    return { language, filePath, created: true };
  });

  console.log(`Images: ${path.join(postDir, "images/")}`);
  return results;
}

function parseLanguages(languageOption) {
  if (!languageOption) return [];
  return [...new Set(
    languageOption
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean),
  )];
}

module.exports = { createPost, parseLanguages };
