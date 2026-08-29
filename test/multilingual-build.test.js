const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build, createAboutTranslations } = require("../lib");
const { createLanguageConfigs } = require("../lib/mod/config");

function writePost(postsDir, slug, fileName, title) {
  const postDir = path.join(postsDir, slug);
  fs.mkdirSync(path.join(postDir, "images"), { recursive: true });
  fs.writeFileSync(
    path.join(postDir, fileName),
    `---\ntitle: ${title}\ndate: 2026-08-23\ndescription: ${title}\nimage: panel.png\ntags: test\n---\n\n![](images/panel.png)\n`,
  );
  fs.writeFileSync(path.join(postDir, "images", "panel.png"), "image");
}

function writePage(contentDir, fileName, title) {
  fs.mkdirSync(contentDir, { recursive: true });
  fs.writeFileSync(
    path.join(contentDir, fileName),
    `---\ntitle: ${title}\ndescription: ${title}\n---\n\n${title}\n`,
  );
}

describe("Multilingual site build", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-build-i18n-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("includes only written About translations", () => {
    const contentDir = path.join(tempDir, "content");
    writePage(contentDir, "about.md", "About this site");
    const translations = createAboutTranslations([
      {
        language: "en",
        languageName: "English",
        defaultLanguage: "en",
        blogsite: "https://example.com",
        dev: { content: contentDir },
      },
      {
        language: "ko",
        languageName: "한국어",
        defaultLanguage: "en",
        blogsite: "https://example.com/ko",
        dev: { content: contentDir },
      },
    ]);

    assert.deepStrictEqual(translations, [
      {
        language: "en",
        languageName: "English",
        path: "/about/",
        url: "https://example.com/about/",
        isDefault: true,
      },
    ]);
  });

  it("generates separate static output for each configured language", () => {
    const contentDir = path.join(tempDir, "content");
    const postsDir = path.join(contentDir, "posts");
    const outputDir = path.join(tempDir, "public");
    writePost(postsDir, "translated", "index.md", "English title");
    writePost(postsDir, "translated", "index.ko.md", "한국어 제목");
    writePost(postsDir, "english-only", "index.md", "English only");
    writePage(contentDir, "about.md", "About this site");
    writePage(contentDir, "about.ko.md", "사이트 소개");

    const config = {
      blogName: "My Blog",
      authorName: "Default author",
      authorDescription: "Default author description",
      authorWebsite: "",
      blogDescription: "A blog",
      blogsite: "https://example.com",
      githubCNAME: "",
      googleAnalyticsID: "",
      authorTwitter: "",
      siteTwitter: "",
      githubRepository: "",
      image: "",
      theme: "archie",
      basePath: "/",
      postsPath: "posts",
      comments: null,
      defaultLanguage: "en",
      defaultLanguageInSubdir: false,
      languages: {
        en: { languageName: "English", locale: "en-US" },
        ko: { languageName: "한국어", locale: "ko-KR" },
      },
      themePath: path.resolve(__dirname, "../themes/archie"),
      dev: {
        postsdir: postsDir,
        content: contentDir,
        about: path.join(contentDir, "about.md"),
        outdir: outputDir,
        staticDir: path.join(tempDir, "static"),
      },
    };
    const configPath = path.join(tempDir, "fossbook.config.js");
    fs.writeFileSync(
      path.join(tempDir, "fossbook.config.en.js"),
      'module.exports = { blogName: "My Blog", authorName: "Jane Doe", authorDescription: "English author", blogDescription: "A blog" };\n',
    );
    fs.writeFileSync(
      path.join(tempDir, "fossbook.config.ko.js"),
      'module.exports = { blogName: "나의 블로그", authorName: "이수현", authorDescription: "한국어 작가 소개", blogDescription: "한국어 블로그" };\n',
    );
    config.languageConfigs = createLanguageConfigs(config, configPath);

    build(config);

    const englishPost = fs.readFileSync(
      path.join(outputDir, "posts", "translated", "index.html"),
      "utf8",
    );
    const koreanPost = fs.readFileSync(
      path.join(outputDir, "ko", "posts", "translated", "index.html"),
      "utf8",
    );
    const englishOnlyPost = fs.readFileSync(
      path.join(outputDir, "posts", "english-only", "index.html"),
      "utf8",
    );
    const englishAbout = fs.readFileSync(
      path.join(outputDir, "about", "index.html"),
      "utf8",
    );
    const koreanAbout = fs.readFileSync(
      path.join(outputDir, "ko", "about", "index.html"),
      "utf8",
    );
    const englishHome = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
    const koreanHome = fs.readFileSync(path.join(outputDir, "ko", "index.html"), "utf8");

    assert.match(englishPost, /<html lang="en">/);
    assert.match(englishPost, /English title/);
    assert.match(englishPost, /class="language-switcher"/);
    assert.match(englishPost, /href="\/posts\/translated\/"[^>]*aria-label="English"[^>]*aria-current="page"[^>]*>EN<\/a>/);
    assert.match(englishPost, /href="\/ko\/posts\/translated\/"[^>]*aria-label="한국어"[^>]*>KO<\/a>/);
    assert.match(englishPost, /hreflang="en" href="https:\/\/example\.com\/posts\/translated\/"/);
    assert.match(englishPost, /hreflang="ko" href="https:\/\/example\.com\/ko\/posts\/translated\/"/);
    assert.match(englishPost, /hreflang="x-default" href="https:\/\/example\.com\/posts\/translated\/"/);
    assert.match(koreanPost, /<html lang="ko">/);
    assert.match(koreanPost, /한국어 제목/);
    assert.match(koreanPost, /class="language-switcher"/);
    assert.match(koreanPost, /href="\/posts\/translated\/"[^>]*aria-label="English"[^>]*>EN<\/a>/);
    assert.match(koreanPost, /href="\/ko\/posts\/translated\/"[^>]*aria-label="한국어"[^>]*aria-current="page"[^>]*>KO<\/a>/);
    assert.doesNotMatch(englishOnlyPost, /class="language-switcher"/);
    assert.doesNotMatch(englishOnlyPost, /hreflang="ko"/);
    assert.match(englishAbout, /About this site/);
    assert.match(englishAbout, /href="\/about\/"[^>]*aria-label="English"[^>]*aria-current="page"[^>]*>EN<\/a>/);
    assert.match(englishAbout, /href="\/ko\/about\/"[^>]*aria-label="한국어"[^>]*>KO<\/a>/);
    assert.match(englishAbout, /hreflang="ko" href="https:\/\/example\.com\/ko\/about\/"/);
    assert.match(koreanAbout, /사이트 소개/);
    assert.match(koreanAbout, /href="\/about\/"[^>]*aria-label="English"[^>]*>EN<\/a>/);
    assert.match(koreanAbout, /href="\/ko\/about\/"[^>]*aria-label="한국어"[^>]*aria-current="page"[^>]*>KO<\/a>/);
    assert.match(englishHome, /href="\/"[^>]*aria-label="English"[^>]*aria-current="page"[^>]*>EN<\/a>/);
    assert.match(englishHome, /href="\/ko\/"[^>]*aria-label="한국어"[^>]*>KO<\/a>/);
    assert.match(englishHome, /hreflang="ko" href="https:\/\/example\.com\/ko\/"/);
    assert.match(englishHome, /<title>My Blog<\/title>/);
    assert.match(englishHome, /<p>A blog<\/p>/);
    assert.match(englishHome, /© \d{4} Jane Doe/);
    assert.match(koreanHome, /한국어 제목/);
    assert.match(koreanHome, /href="\/"[^>]*aria-label="English"[^>]*>EN<\/a>/);
    assert.match(koreanHome, /href="\/ko\/"[^>]*aria-label="한국어"[^>]*aria-current="page"[^>]*>KO<\/a>/);
    assert.match(koreanHome, /<title>나의 블로그<\/title>/);
    assert.match(koreanHome, /<p>한국어 블로그<\/p>/);
    assert.match(koreanHome, /© \d{4} 이수현/);
    assert.doesNotMatch(koreanHome, /English only/);
    assert.strictEqual(
      fs.existsSync(path.join(outputDir, "ko", "posts", "english-only", "index.html")),
      false,
    );
    assert.strictEqual(
      fs.existsSync(path.join(outputDir, "ko", "posts", "translated", "images", "panel.png")),
      true,
    );
  });
});
