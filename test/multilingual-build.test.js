const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { build } = require("../lib");
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

describe("Multilingual site build", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-build-i18n-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("generates separate static output for each configured language", () => {
    const contentDir = path.join(tempDir, "content");
    const postsDir = path.join(contentDir, "posts");
    const outputDir = path.join(tempDir, "public");
    writePost(postsDir, "translated", "index.md", "English title");
    writePost(postsDir, "translated", "index.ko.md", "한국어 제목");
    writePost(postsDir, "english-only", "index.md", "English only");

    const config = {
      blogName: "My Blog",
      authorName: "",
      authorDescription: "",
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
        ko: { languageName: "한국어", locale: "ko-KR", blogName: "나의 블로그" },
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
    config.languageConfigs = createLanguageConfigs(config);

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
    const koreanHome = fs.readFileSync(path.join(outputDir, "ko", "index.html"), "utf8");

    assert.match(englishPost, /<html lang="en">/);
    assert.match(englishPost, /English title/);
    assert.match(englishPost, /class="language-switcher"/);
    assert.match(englishPost, /href="https:\/\/example\.com\/posts\/translated\/"[^>]*aria-label="English"[^>]*aria-current="page"[^>]*>EN<\/a>/);
    assert.match(englishPost, /href="https:\/\/example\.com\/ko\/posts\/translated\/"[^>]*aria-label="한국어"[^>]*>KO<\/a>/);
    assert.match(englishPost, /hreflang="en" href="https:\/\/example\.com\/posts\/translated\/"/);
    assert.match(englishPost, /hreflang="ko" href="https:\/\/example\.com\/ko\/posts\/translated\/"/);
    assert.match(englishPost, /hreflang="x-default" href="https:\/\/example\.com\/posts\/translated\/"/);
    assert.match(koreanPost, /<html lang="ko">/);
    assert.match(koreanPost, /한국어 제목/);
    assert.match(koreanPost, /class="language-switcher"/);
    assert.match(koreanPost, /href="https:\/\/example\.com\/posts\/translated\/"[^>]*aria-label="English"[^>]*>EN<\/a>/);
    assert.match(koreanPost, /href="https:\/\/example\.com\/ko\/posts\/translated\/"[^>]*aria-label="한국어"[^>]*aria-current="page"[^>]*>KO<\/a>/);
    assert.doesNotMatch(englishOnlyPost, /class="language-switcher"/);
    assert.doesNotMatch(englishOnlyPost, /hreflang="ko"/);
    assert.match(koreanHome, /한국어 제목/);
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
