const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Posts = require("../lib/posts");

function writePost(postsDir, slug, fileName, title) {
  const postDir = path.join(postsDir, slug);
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(
    path.join(postDir, fileName),
    `---\ntitle: ${title}\ndate: 2026-08-23\ndescription: ${title}\n---\n\n${title}\n`,
  );
}

function createConfig(postsDir, language) {
  return {
    language,
    defaultLanguage: "en",
    blogsite: language === "en"
      ? "https://example.com"
      : `https://example.com/${language}`,
    postsPath: "posts",
    image: "",
    blogDescription: "",
    theme: "archie",
    dev: { postsdir: postsDir, content: path.dirname(postsDir) },
  };
}

describe("Multilingual post discovery", () => {
  let tempDir;
  let postsDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-i18n-"));
    postsDir = path.join(tempDir, "content", "posts");
    writePost(postsDir, "translated", "index.md", "English title");
    writePost(postsDir, "translated", "index.ko.md", "한국어 제목");
    writePost(postsDir, "english-only", "index.md", "English only");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads legacy index.md files for the default language", () => {
    const posts = new Posts(createConfig(postsDir, "en")).createPostObjects();

    assert.strictEqual(posts.length, 2);
    assert.deepStrictEqual(
      posts.map((post) => post.title).sort(),
      ["English only", "English title"],
    );
  });

  it("loads only available language-suffixed translations", () => {
    const posts = new Posts(createConfig(postsDir, "ko")).createPostObjects();

    assert.strictEqual(posts.length, 1);
    assert.strictEqual(posts[0].title, "한국어 제목");
    assert.strictEqual(posts[0].slug, "translated");
    assert.strictEqual(posts[0].path, "posts/translated");
    assert.strictEqual(posts[0].url, "https://example.com/ko/posts/translated/");
  });
});
