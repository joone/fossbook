const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createLanguageConfigs } = require("../lib/mod/config");

function createConfig(overrides = {}) {
  return {
    blogName: "My Blog",
    blogDescription: "A blog",
    blogsite: "https://example.com/fossbook",
    basePath: "/fossbook/",
    defaultLanguage: "en",
    defaultLanguageInSubdir: false,
    languages: null,
    dev: {
      outdir: path.resolve("public"),
      content: path.resolve("content"),
      postsdir: path.resolve("content/posts"),
    },
    ...overrides,
  };
}

describe("Language configuration", () => {
  it("preserves legacy paths when languages are not configured", () => {
    const [languageConfig] = createLanguageConfigs(createConfig());

    assert.strictEqual(languageConfig.language, "en");
    assert.strictEqual(languageConfig.languagePrefix, "");
    assert.strictEqual(languageConfig.basePath, "/fossbook/");
    assert.strictEqual(languageConfig.blogsite, "https://example.com/fossbook");
    assert.strictEqual(languageConfig.dev.outdir, path.resolve("public"));
  });

  it("creates an independent prefixed context for a secondary language", () => {
    const languageConfigs = createLanguageConfigs(createConfig({
      languages: {
        en: { languageName: "English", locale: "en-US" },
        ko: {
          languageName: "한국어",
          locale: "ko-KR",
          blogName: "나의 블로그",
        },
      },
    }));
    const korean = languageConfigs.find((config) => config.language === "ko");

    assert.strictEqual(korean.languageName, "한국어");
    assert.strictEqual(korean.locale, "ko-KR");
    assert.strictEqual(korean.blogName, "나의 블로그");
    assert.strictEqual(korean.languagePrefix, "ko");
    assert.strictEqual(korean.basePath, "/fossbook/ko/");
    assert.strictEqual(korean.blogsite, "https://example.com/fossbook/ko");
    assert.strictEqual(korean.dev.outdir, path.resolve("public/ko"));
  });

  it("loads blog information from a config file for each language", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-language-config-"));
    const configPath = path.join(tempDir, "fossbook.config.js");
    fs.writeFileSync(
      path.join(tempDir, "fossbook.config.en.js"),
      'module.exports = { blogName: "My Blog", authorName: "Jane Doe", authorDescription: "English author", blogDescription: "English blog" };\n',
    );
    fs.writeFileSync(
      path.join(tempDir, "fossbook.config.ko.js"),
      'module.exports = { blogName: "나의 블로그", authorName: "이수현", authorDescription: "한국어 작가 소개", blogDescription: "한국어 블로그" };\n',
    );

    try {
      const languageConfigs = createLanguageConfigs(createConfig({
        languages: {
          en: { languageName: "English", locale: "en-US" },
          ko: { languageName: "한국어", locale: "ko-KR" },
        },
      }), configPath);
      const english = languageConfigs.find((config) => config.language === "en");
      const korean = languageConfigs.find((config) => config.language === "ko");

      assert.strictEqual(english.blogName, "My Blog");
      assert.strictEqual(english.authorName, "Jane Doe");
      assert.strictEqual(english.authorDescription, "English author");
      assert.strictEqual(english.blogDescription, "English blog");
      assert.strictEqual(korean.blogName, "나의 블로그");
      assert.strictEqual(korean.authorName, "이수현");
      assert.strictEqual(korean.authorDescription, "한국어 작가 소개");
      assert.strictEqual(korean.blogDescription, "한국어 블로그");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("can place the default language in a subdirectory", () => {
    const [english] = createLanguageConfigs(createConfig({
      defaultLanguageInSubdir: true,
      languages: { en: { locale: "en-US" } },
    }));

    assert.strictEqual(english.languagePrefix, "en");
    assert.strictEqual(english.basePath, "/fossbook/en/");
    assert.strictEqual(english.dev.outdir, path.resolve("public/en"));
  });

  it("rejects a default language that is not configured", () => {
    assert.throws(
      () => createLanguageConfigs(createConfig({ languages: { ko: {} } })),
      /defaultLanguage "en" is not defined in languages/,
    );
  });

  it("rejects language keys that cannot be safe URL path segments", () => {
    assert.throws(
      () => createLanguageConfigs(createConfig({
        defaultLanguage: "../en",
        languages: { "../en": {} },
      })),
      /Invalid language key/,
    );
  });
});
