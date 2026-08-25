const assert = require("assert");
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
