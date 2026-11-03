const fs = require("fs");
const path = require("path");

const FEED_FILE_NAME = "feed.xml";

function escapeXml(value) {
  return (
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      // Strip characters that are not allowed anywhere in XML 1.0.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
  );
}

// Feed readers resolve relative URLs inconsistently (many ignore xml:base),
// so every URL in an entry is rewritten against the post's public URL.
function resolveUrl(value, baseUrl) {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  )
    return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

// Post URLs are built from source folder names, which may contain spaces.
// Percent-encode them (without double-encoding) so ids and links are valid.
function normalizeUrl(value) {
  try {
    return new URL(String(value).trim()).href;
  } catch {
    return String(value ?? "");
  }
}

function absolutizeUrls(html, baseUrl) {
  return html
    .replace(
      /(<(?:a|img|source)\b[^>]*?\s(?:href|src))="([^"]*)"/gi,
      (match, prefix, value) => `${prefix}="${resolveUrl(value, baseUrl)}"`,
    )
    .replace(/(\ssrcset)="([^"]*)"/gi, (match, prefix, value) => {
      const candidates = value.split(",").map((candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        return [resolveUrl(url, baseUrl), ...descriptor].join(" ");
      });
      return `${prefix}="${candidates.join(", ")}"`;
    });
}

// Turn a rendered post body into self-contained HTML for a feed reader:
// absolute image and link URLs, and no scripts. Feed readers cannot run the
// Mermaid renderer, so diagrams become a link to the post instead of source.
function feedContent(post) {
  const diagramLabel =
    post.config?.feedDiagramLabel || "View this diagram on the website";
  let html = post.body
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(
      /<pre class="mermaid">[\s\S]*?<\/pre>/g,
      () =>
        `<p><a href="${escapeXml(post.url)}">${escapeXml(diagramLabel)}</a></p>`,
    );
  html = absolutizeUrls(html, post.url);
  return html.trim();
}

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function feedUrl(config) {
  return `${config.blogsite}/${FEED_FILE_NAME}`;
}

function feedPath(config) {
  return `${config.basePath || "/"}${FEED_FILE_NAME}`;
}

function createFeedTranslations(languageConfigs) {
  return languageConfigs.map((config) => ({
    language: config.language,
    languageName: config.languageName,
    path: feedPath(config),
    url: feedUrl(config),
    isDefault: config.language === config.defaultLanguage,
  }));
}

function renderEntry(post, config) {
  const published = toIsoDate(post.date);
  const postUrl = normalizeUrl(post.url);
  const lines = [
    "  <entry>",
    `    <title>${escapeXml(post.title)}</title>`,
    `    <link rel="alternate" type="text/html" href="${escapeXml(postUrl)}"/>`,
  ];

  for (const translation of post.translations || []) {
    if (translation.language === config.language) continue;
    lines.push(
      `    <link rel="alternate" type="text/html" hreflang="${escapeXml(translation.language)}" title="${escapeXml(translation.languageName)}" href="${escapeXml(normalizeUrl(translation.url))}"/>`,
    );
  }

  lines.push(`    <id>${escapeXml(postUrl)}</id>`);
  if (published) {
    lines.push(`    <published>${published}</published>`);
    lines.push(`    <updated>${published}</updated>`);
  }
  if (config.authorName) {
    lines.push(
      `    <author><name>${escapeXml(config.authorName)}</name></author>`,
    );
  }
  for (const tag of post.tags || []) {
    lines.push(`    <category term="${escapeXml(tag)}"/>`);
  }
  if (post.description) {
    lines.push(`    <summary>${escapeXml(post.description)}</summary>`);
  }
  if (post.image) {
    lines.push(
      `    <media:thumbnail url="${escapeXml(normalizeUrl(post.imageURL))}"/>`,
    );
  }
  lines.push(
    `    <content type="html" xml:base="${escapeXml(postUrl)}">${escapeXml(feedContent(post))}</content>`,
  );
  lines.push("  </entry>");
  return lines.join("\n");
}

function renderFeed(config, posts) {
  const configuredAuthor = String(config.authorName ?? "").trim();
  const authorName = configuredAuthor || String(config.blogName ?? "").trim();
  if (!authorName) {
    throw new Error("Atom feeds require a non-empty authorName or blogName.");
  }
  if (!configuredAuthor) {
    console.warn(
      `Atom feed (${config.language || "en"}): authorName is empty; using blogName "${authorName}" as the author. Set authorName to specify the author explicitly.`,
    );
  }
  const feedConfig = { ...config, authorName };
  const limit =
    Number.isInteger(config.feedLimit) && config.feedLimit > 0
      ? config.feedLimit
      : posts.length;
  const entries = posts.slice(0, limit);
  const updated =
    entries
      .map((post) => toIsoDate(post.date))
      .filter(Boolean)
      .sort()
      .pop() || new Date(0).toISOString();
  const homeUrl = `${config.blogsite}/`;

  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xml:lang="${escapeXml(config.language || "en")}">`,
    `  <title>${escapeXml(config.blogName)}</title>`,
  ];
  if (config.blogDescription) {
    lines.push(`  <subtitle>${escapeXml(config.blogDescription)}</subtitle>`);
  }
  lines.push(
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(feedUrl(config))}"/>`,
    `  <link rel="alternate" type="text/html" href="${escapeXml(homeUrl)}"/>`,
  );
  for (const translation of config.feedTranslations || []) {
    if (translation.language === config.language) continue;
    lines.push(
      `  <link rel="alternate" type="application/atom+xml" hreflang="${escapeXml(translation.language)}" title="${escapeXml(translation.languageName)}" href="${escapeXml(translation.url)}"/>`,
    );
  }
  lines.push(
    `  <id>${escapeXml(homeUrl)}</id>`,
    `  <updated>${updated}</updated>`,
  );
  lines.push(`  <author><name>${escapeXml(authorName)}</name></author>`);
  if (config.image) {
    lines.push(`  <logo>${escapeXml(config.image)}</logo>`);
  }
  lines.push(
    `  <generator uri="https://github.com/joone/fossbook" version="${escapeXml(config.version || "")}">Fossbook</generator>`,
  );
  for (const post of entries) lines.push(renderEntry(post, feedConfig));
  lines.push("</feed>", "");
  return lines.join("\n");
}

// Write <outdir>/feed.xml for one language. Posts must already have been
// generated so their bodies include the published <picture> markup.
function generateFeed(config, posts) {
  if (config.feed === false) return null;
  const outputPath = path.join(config.dev.outdir, FEED_FILE_NAME);
  fs.writeFileSync(outputPath, renderFeed(config, posts));
  console.log(
    `${path.relative(process.cwd(), outputPath)} was created successfully`,
  );
  return outputPath;
}

module.exports = {
  FEED_FILE_NAME,
  createFeedTranslations,
  feedContent,
  feedPath,
  feedUrl,
  generateFeed,
  renderFeed,
};
