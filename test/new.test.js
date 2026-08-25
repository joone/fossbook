const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createPost, parseLanguages } = require("../lib/new");

describe("Multilingual post creation", () => {
  let tempDir;
  let config;
  let originalLog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-new-i18n-"));
    config = {
      defaultLanguage: "en",
      languages: { en: {}, ko: {}, ja: {} },
      dev: { postsdir: path.join(tempDir, "content", "posts") },
    };
    originalLog = console.log;
    console.log = () => {};
  });

  afterEach(() => {
    console.log = originalLog;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("normalizes comma-separated language lists", () => {
    assert.deepStrictEqual(parseLanguages("ko, ja,ko, "), ["ko", "ja"]);
  });

  it("creates the default article and all requested translations", () => {
    const results = createPost(config, "example", "ko,ja");
    const postDir = path.join(config.dev.postsdir, "example");

    assert.deepStrictEqual(
      results.map(({ language, created }) => ({ language, created })),
      [
        { language: "en", created: true },
        { language: "ko", created: true },
        { language: "ja", created: true },
      ],
    );
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.md")), true);
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.ko.md")), true);
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.ja.md")), true);
    assert.strictEqual(
      fs.existsSync(path.join(postDir, "images", "placeholder.svg")),
      true,
    );
  });

  it("preserves existing files and creates only missing translations", () => {
    createPost(config, "example", "ko");
    const postDir = path.join(config.dev.postsdir, "example");
    const defaultPath = path.join(postDir, "index.md");
    const koreanPath = path.join(postDir, "index.ko.md");
    fs.writeFileSync(defaultPath, "edited default");
    fs.writeFileSync(koreanPath, "edited Korean");

    const results = createPost(config, "example", "ko,ja");

    assert.deepStrictEqual(
      results.map(({ language, created }) => ({ language, created })),
      [
        { language: "en", created: false },
        { language: "ko", created: false },
        { language: "ja", created: true },
      ],
    );
    assert.strictEqual(fs.readFileSync(defaultPath, "utf8"), "edited default");
    assert.strictEqual(fs.readFileSync(koreanPath, "utf8"), "edited Korean");
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.ja.md")), true);
  });

  it("rejects unconfigured languages before creating the post bundle", () => {
    assert.throws(
      () => createPost(config, "example", "fr"),
      /Language "fr" not configured\. Available languages: en, ko, ja/,
    );
    assert.strictEqual(
      fs.existsSync(path.join(config.dev.postsdir, "example")),
      false,
    );
  });

  it("accepts comma-separated languages through the CLI", () => {
    fs.writeFileSync(
      path.join(tempDir, "fossbook.config.js"),
      `module.exports = {
  defaultLanguage: "en",
  languages: { en: {}, ko: {}, ja: {} },
  content: "./content",
  postsDir: "./content/posts",
  outputDir: "./public",
  staticDir: "./static",
  themesDir: "./themes",
};
`,
    );

    execFileSync(
      process.execPath,
      [path.resolve(__dirname, "../bin/fossbook.js"), "new", "cli-example", "--lang", "ko,ja"],
      { cwd: tempDir, encoding: "utf8" },
    );

    const postDir = path.join(tempDir, "content", "posts", "cli-example");
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.md")), true);
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.ko.md")), true);
    assert.strictEqual(fs.existsSync(path.join(postDir, "index.ja.md")), true);
  });
});
