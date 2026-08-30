const fs = require("fs");
const path = require("path");

module.exports = class PageBase {
  constructor(config) {
    this.config = config;
    this.title = "";
    this.image = this.config.image;
    this.description = this.config.blogDescription;
    this.date = "";
    this.tags = [];
    this.content = "";
    this.url = "";
    this.theme = this.config.theme;
    this.translations = [];
  }

  formatDate(date) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString(this.config.locale || "en-US", options);
  }

  alternateLanguageLinks() {
    if (this.translations.length < 2) return "";

    const alternates = this.translations.map((translation) =>
      `<link rel="alternate" hreflang="${escapeHtml(translation.language)}" href="${escapeHtml(translation.url)}" />`,
    );
    const defaultTranslation = this.translations.find((translation) => translation.isDefault);
    if (defaultTranslation) {
      alternates.push(
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultTranslation.url)}" />`,
      );
    }
    return alternates.join("\n        ");
  }

  languageSwitcher() {
    if (this.translations.length < 2) return "";

    const links = this.translations.map((translation) => {
      const current = translation.language === this.config.language;
      const language = escapeHtml(translation.language);
      const label = escapeHtml(translation.languageName);
      const code = escapeHtml(translation.language.toUpperCase());
      return `<a href="${escapeHtml(translation.path || translation.url)}" lang="${language}" hreflang="${language}" aria-label="${label}"${current ? ' aria-current="page"' : ""}>${code}</a>`;
    });
    return `<nav class="language-switcher" aria-label="Languages">${links.join("")}</nav>`;
  }

  languagePreference(redirectFromDefaultHome = false) {
    if (this.translations.length < 2) return "";

    const supportedLanguages = this.translations.map((translation) => translation.language);
    const languagePaths = Object.fromEntries(
      this.translations.map((translation) => [
        translation.language,
        translation.path || translation.url,
      ]),
    );
    const shouldRedirect =
      redirectFromDefaultHome && this.config.language === this.config.defaultLanguage;

    return `<script>
          (() => {
            const storageKey = "fossbook-language";
            const supportedLanguages = ${JSON.stringify(supportedLanguages).replace(/</g, "\\u003c")};
            const languagePaths = ${JSON.stringify(languagePaths).replace(/</g, "\\u003c")};
            try {
              ${shouldRedirect ? `const preferredLanguage = localStorage.getItem(storageKey);
              if (preferredLanguage && preferredLanguage !== ${JSON.stringify(this.config.language)} && supportedLanguages.includes(preferredLanguage)) {
                location.replace(languagePaths[preferredLanguage]);
                return;
              }` : ""}
              document.addEventListener("DOMContentLoaded", () => {
                document.querySelectorAll('.language-switcher a[hreflang]').forEach((link) => {
                  link.addEventListener("click", () => {
                    const language = link.getAttribute("hreflang");
                    if (supportedLanguages.includes(language)) {
                      try {
                        localStorage.setItem(storageKey, language);
                      } catch (error) {}
                    }
                  });
                });
              });
            } catch (error) {}
          })();
        </script>`;
  }

  googleAnalytics(trackingId) {
    return `<script async src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag() {
            dataLayer.push(arguments);
          }
          gtag("js", new Date());
          gtag("config", "${trackingId}");
        </script>`;
  }

  // https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
  twitterCard(card) {
    return `<meta name="twitter:card" content="${card}" />
        <meta name="twitter:site" content="${this.config.siteTwitter}" />
        <meta name="twitter:creator" content="${this.config.authorTwitter}" />
        <meta name="twitter:title" content="${this.title}" />
        <meta name="twitter:description" content="${this.description}" />
        <meta name="twitter:image" content="${this.imageURL}" />`;
  }

  // https://ogp.me/
  openGraph(type, articleObj) {
    const result = `<meta property="og:type" content="${type}" />
        <meta property="og:site_name" content="${this.config.blogName}" />
        <meta property="og:url" content="${this.url}" />
        <meta property="og:title" content="${this.title}" />
        <meta property="og:description" content="${this.description}" />
        <meta property="og:image" content="${this.imageURL}" />`;

    if (type === "article" && articleObj) {
      return (
        result +
        `
        <meta property="article:author" content="${articleObj.authorName}" />
        <meta property="article:published_time" content="${articleObj.publishedDate}" />
        ${articleObj.tags.map((tag) => `<meta property="article:tag" content="${tag}">`).join("\n        ")}`
      );
    }
    return result;
  }

  footer() {
    const footerPath = path.join(this.config.themePath, "layouts", "partials", "footer.html");
    const footerTemplate = fs.readFileSync(footerPath, "utf-8");

    const funcFooter = new Function(
      "config",
      `return () => \`${footerTemplate}\`;`,
    );
    const result = funcFooter(this.config)();
    const footerHTML = result
      .split("\n")
      .map((line, index) => (index !== 0 ? `              ${line}` : line))
      .join("\n");

    return footerHTML;
  }

  generateHTML(templatePath, data) {
    const postTemplate = fs.readFileSync(templatePath, "utf-8");

    const funcPost = new Function(
      "page, data",
      `return () => \`${postTemplate}\`;`,
    );
    const result = funcPost(this, data)();
    const postHTML = result
      .split("\n")
      .map((line, index) => (index !== 0 ? `${line}` : line))
      .join("\n");

    return postHTML;
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
