const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  DEPLOY_WORKFLOW,
  IMAGE_CACHE_SCHEMA,
  ensureGitignoreRule,
  shouldSaveImageCache,
} = require("../lib/init");
const { createGitHubCacheInfo } = require("../lib/mod/github_cache");

describe("Consumer site workflow template", () => {
  it("restores and conditionally saves only the image cache", () => {
    assert.match(DEPLOY_WORKFLOW, /uses: actions\/cache\/restore@v4/);
    assert.match(DEPLOY_WORKFLOW, /uses: actions\/cache\/save@v4/);
    assert.match(
      DEPLOY_WORKFLOW,
      /path: \$\{\{ steps\.image-cache-config\.outputs\.cache-path \}\}\/images/,
    );
    assert.match(
      DEPLOY_WORKFLOW,
      new RegExp(
        `runner\\.os.*runner\\.arch.*fossbook-images-${IMAGE_CACHE_SCHEMA}`,
      ),
    );
    assert.match(
      DEPLOY_WORKFLOW,
      /steps\.image-cache-config\.outputs\.input-hash/,
    );
    assert.match(DEPLOY_WORKFLOW, /github\.run_id.*github\.run_attempt/);
    assert.match(
      DEPLOY_WORKFLOW,
      /outputs\.input-hash \}\}-\n\s+\$\{\{ runner\.os/,
    );
    assert.match(
      DEPLOY_WORKFLOW,
      /cache-hit != 'true' && steps\.image-cache-status\.outputs\.new-entries == 'true'/,
    );
    assert.doesNotMatch(DEPLOY_WORKFLOW, /pull_request_target/);
  });

  it("does not save exact hits or builds without new entries", () => {
    assert.strictEqual(shouldSaveImageCache("true", true), false);
    assert.strictEqual(shouldSaveImageCache("false", false), false);
  });

  it("saves new entries restored from a partial key", () => {
    assert.strictEqual(shouldSaveImageCache("false", true), true);
  });

  it("adds the cache rule to an existing gitignore only once", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-init-"));
    const gitignorePath = path.join(tempDir, ".gitignore");
    fs.writeFileSync(gitignorePath, "node_modules/");

    try {
      assert.strictEqual(
        ensureGitignoreRule(gitignorePath, ".fossbook-cache/"),
        true,
      );
      assert.strictEqual(
        ensureGitignoreRule(gitignorePath, ".fossbook-cache/"),
        false,
      );
      assert.strictEqual(
        fs.readFileSync(gitignorePath, "utf8"),
        "node_modules/\n.fossbook-cache/\n",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves custom cache and source directories for workflow keys", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-cache-"));
    const postsDir = path.join(tempDir, "articles");
    const staticDir = path.join(tempDir, "static-assets");
    const themePath = path.join(tempDir, "custom-theme");
    const cacheDir = path.join(tempDir, "generated-cache");
    fs.mkdirSync(path.join(postsDir, "post", "images"), { recursive: true });
    fs.mkdirSync(path.join(staticDir, "images"), { recursive: true });
    fs.mkdirSync(path.join(themePath, "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(postsDir, "post", "index.md"),
      "![](images/panel.png)",
    );
    fs.writeFileSync(path.join(postsDir, "post", "images", "panel.png"), "one");

    const config = {
      imageOptimization: true,
      imageMaxWidth: 1400,
      imageMaxWidthOverride: 1200,
      imageWebP: true,
      imageResponsiveWidths: [600, 800, 1000],
      themePath,
      dev: { postsdir: postsDir, staticDir, cacheDir },
    };

    try {
      const first = createGitHubCacheInfo(config, tempDir);
      fs.appendFileSync(
        path.join(postsDir, "post", "index.md"),
        "\nNew prose.",
      );
      const proseChange = createGitHubCacheInfo(config, tempDir);
      fs.appendFileSync(
        path.join(postsDir, "post", "index.md"),
        '\n![](images/panel.png "publish-width:900")',
      );
      const metadataChange = createGitHubCacheInfo(config, tempDir);
      fs.writeFileSync(
        path.join(postsDir, "post", "images", "panel.png"),
        "two",
      );
      const imageChange = createGitHubCacheInfo(config, tempDir);

      assert.strictEqual(first.cachePath, cacheDir);
      assert.strictEqual(
        first.statusPath,
        path.join(cacheDir, "image-cache-status.json"),
      );
      assert.strictEqual(proseChange.inputHash, first.inputHash);
      assert.notStrictEqual(metadataChange.inputHash, first.inputHash);
      assert.notStrictEqual(imageChange.inputHash, metadataChange.inputHash);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
