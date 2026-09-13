const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const {
  beginImageBuild,
  createCacheKey,
  finishImageBuild,
  getImageCacheStats,
  pruneImageCache,
  publishImage,
} = require("../lib/mod/image");

describe("Image publishing", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-images-"));
  });

  afterEach(async function () {
    this.timeout(10000);
    await fs.promises.rm(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 50,
    });
  });

  it("resizes PNGs, preserves the source, and reuses the cached artifact", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "image.png");
    const secondOutputPath = path.join(tempDir, "public", "image-2.png");
    const cacheDir = path.join(tempDir, "cache");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 100,
      imageWebP: false,
      dev: { cacheDir, outdir: path.join(tempDir, "public") },
    };

    await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 4,
        background: "#1478dc",
      },
    })
      .png()
      .toFile(sourcePath);
    const original = fs.readFileSync(sourcePath);

    await publishImage(sourcePath, outputPath, config);

    const metadata = await sharp(outputPath).metadata();
    assert.strictEqual(metadata.width, 100);
    assert.strictEqual(metadata.height, 50);
    assert.deepStrictEqual(fs.readFileSync(sourcePath), original);

    const [cacheFile] = fs
      .readdirSync(path.join(cacheDir, "images"))
      .filter((fileName) => fileName.endsWith(".png"));
    const cachePath = path.join(cacheDir, "images", cacheFile);
    const cachedModifiedAt = fs.statSync(cachePath).mtimeMs;

    await publishImage(sourcePath, secondOutputPath, config);

    assert.deepStrictEqual(
      fs.readFileSync(secondOutputPath),
      fs.readFileSync(outputPath),
    );
    assert.strictEqual(fs.statSync(cachePath).mtimeMs, cachedModifiedAt);
  });

  it("enforces an override for an already compact source PNG", async () => {
    const sourcePath = path.join(tempDir, "compact-source.png");
    const outputPath = path.join(tempDir, "public", "compact-output.png");
    const width = 400;
    const height = 200;
    const pixels = Buffer.alloc(width * height * 3);

    for (let offset = 0; offset < pixels.length; offset += 3) {
      const pixel = offset / 3;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      pixels[offset] = (x % 8) * 32;
      pixels[offset + 1] = (y % 8) * 32;
      pixels[offset + 2] = ((x + y) % 8) * 32;
    }

    await sharp(pixels, { raw: { width, height, channels: 3 } })
      .png({ palette: true, colours: 64, compressionLevel: 9 })
      .toFile(sourcePath);
    const original = fs.readFileSync(sourcePath);

    await publishImage(
      sourcePath,
      outputPath,
      {
        imageOptimization: true,
        imageMaxWidth: 100,
        imageMaxWidthOverride: 120,
        imageWebP: false,
        dev: {
          cacheDir: path.join(tempDir, "cache"),
          outdir: path.join(tempDir, "public"),
        },
      },
      120,
    );

    const metadata = await sharp(outputPath).metadata();
    assert.strictEqual(metadata.width, 120);
    assert.strictEqual(metadata.height, 60);
    assert.deepStrictEqual(fs.readFileSync(sourcePath), original);
  });

  it("removes stale cache entries while retaining current artifacts", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "image.png");
    const cacheDir = path.join(tempDir, "cache");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 100,
      imageWebP: false,
      dev: { cacheDir, outdir: path.join(tempDir, "public") },
    };

    await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: "#ffffff",
      },
    })
      .png()
      .toFile(sourcePath);
    fs.mkdirSync(path.join(cacheDir, "images"), { recursive: true });
    const stalePath = path.join(cacheDir, "images", "stale.png");
    fs.writeFileSync(stalePath, "stale");

    beginImageBuild();
    await publishImage(sourcePath, outputPath, config);
    await pruneImageCache(config);

    const cacheFiles = fs.readdirSync(path.join(cacheDir, "images"));
    assert.strictEqual(cacheFiles.length, 2);
    assert.strictEqual(fs.existsSync(stalePath), false);
  });

  it("publishes deduplicated lossless WebP candidates without upscaling", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "panel.png");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 1000,
      imageResponsiveWidths: [600, 800, 1000, 1200, 1000],
      dev: {
        cacheDir: path.join(tempDir, "cache"),
        outdir: path.join(tempDir, "public"),
      },
    };

    await sharp({
      create: {
        width: 900,
        height: 450,
        channels: 4,
        background: "#1478dc",
      },
    })
      .png()
      .toFile(sourcePath);
    const original = fs.readFileSync(sourcePath);

    const result = await publishImage(sourcePath, outputPath, config);

    assert.deepStrictEqual(result.webp, [
      { fileName: "panel-600.webp", width: 600 },
      { fileName: "panel-800.webp", width: 800 },
      { fileName: "panel.webp", width: 900 },
    ]);
    for (const candidate of result.webp) {
      const candidatePath = path.join(tempDir, "public", candidate.fileName);
      const metadata = await sharp(fs.readFileSync(candidatePath)).metadata();
      assert.strictEqual(metadata.format, "webp");
      assert.strictEqual(metadata.width, candidate.width);
    }
    const fallbackPixels = await sharp(fs.readFileSync(outputPath))
      .ensureAlpha()
      .raw()
      .toBuffer();
    const webpPixels = await sharp(
      fs.readFileSync(path.join(tempDir, "public", "panel.webp")),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();
    assert.strictEqual(
      crypto.createHash("sha256").update(webpPixels).digest("hex"),
      crypto.createHash("sha256").update(fallbackPixels).digest("hex"),
    );
    assert.strictEqual(
      fs.existsSync(path.join(tempDir, "public", "panel-1000.webp")),
      false,
    );
    assert.strictEqual(
      fs.existsSync(path.join(tempDir, "public", "panel-1200.webp")),
      false,
    );
    assert.deepStrictEqual(fs.readFileSync(sourcePath), original);
  });

  it("preserves a mislabeled PNG without attempting WebP conversion", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "source.png");
    fs.writeFileSync(sourcePath, "not an image");

    const result = await publishImage(sourcePath, outputPath, {
      imageOptimization: true,
      imageMaxWidth: 1000,
      dev: {
        cacheDir: path.join(tempDir, "cache"),
        outdir: path.join(tempDir, "public"),
      },
    });

    assert.strictEqual(result, null);
    assert.strictEqual(fs.readFileSync(outputPath, "utf8"), "not an image");
  });

  it("reports cold misses and warm hits without changing publication output", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "panel.png");
    const cacheDir = path.join(tempDir, "cache");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 100,
      dev: { cacheDir, outdir: path.join(tempDir, "public") },
    };
    await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: "#842bd7",
      },
    })
      .png()
      .toFile(sourcePath);
    const sourceBytes = fs.readFileSync(sourcePath);

    beginImageBuild();
    await publishImage(sourcePath, outputPath, config);
    assert.deepStrictEqual(getImageCacheStats(), {
      hits: 0,
      misses: 2,
      writes: 2,
      regeneratedImages: 1,
    });
    const coldOutput = new Map(
      ["panel.png", "panel.webp"].map((fileName) => [
        fileName,
        fs.readFileSync(path.join(tempDir, "public", fileName)),
      ]),
    );

    fs.rmSync(path.join(tempDir, "public"), { recursive: true });
    beginImageBuild();
    await publishImage(sourcePath, outputPath, config);
    const warmStats = await finishImageBuild(config);

    assert.deepStrictEqual(warmStats, {
      hits: 2,
      misses: 0,
      writes: 0,
      regeneratedImages: 0,
    });
    for (const [fileName, expected] of coldOutput) {
      assert.deepStrictEqual(
        fs.readFileSync(path.join(tempDir, "public", fileName)),
        expected,
      );
    }
    assert.deepStrictEqual(fs.readFileSync(sourcePath), sourceBytes);
    assert.strictEqual(
      fs.existsSync(path.join(tempDir, "public", ".fossbook-cache")),
      false,
    );
    assert.deepStrictEqual(
      JSON.parse(
        fs.readFileSync(path.join(cacheDir, "image-cache-status.json"), "utf8"),
      ),
      warmStats,
    );
  });

  it("regenerates only outputs affected by a source or setting change", async () => {
    const cacheDir = path.join(tempDir, "cache");
    const outputDir = path.join(tempDir, "public");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 100,
      imageWebP: false,
      dev: { cacheDir, outdir: outputDir },
    };
    const firstSource = path.join(tempDir, "first.png");
    const secondSource = path.join(tempDir, "second.png");
    for (const [sourcePath, background] of [
      [firstSource, "#111111"],
      [secondSource, "#222222"],
    ]) {
      await sharp({
        create: { width: 200, height: 100, channels: 3, background },
      })
        .png()
        .toFile(sourcePath);
    }

    beginImageBuild();
    await publishImage(firstSource, path.join(outputDir, "first.png"), config);
    await publishImage(
      secondSource,
      path.join(outputDir, "second.png"),
      config,
    );

    await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: "#333333",
      },
    })
      .png()
      .toFile(secondSource);
    beginImageBuild();
    await publishImage(firstSource, path.join(outputDir, "first.png"), config);
    await publishImage(
      secondSource,
      path.join(outputDir, "second.png"),
      config,
    );

    assert.deepStrictEqual(getImageCacheStats(), {
      hits: 1,
      misses: 1,
      writes: 1,
      regeneratedImages: 1,
    });

    beginImageBuild();
    await publishImage(firstSource, path.join(outputDir, "first.png"), {
      ...config,
      imageMaxWidth: 80,
    });
    assert.deepStrictEqual(getImageCacheStats(), {
      hits: 0,
      misses: 1,
      writes: 1,
      regeneratedImages: 1,
    });
  });

  it("treats corrupt cache entries as misses and replaces them", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "panel.png");
    const cacheDir = path.join(tempDir, "cache");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 100,
      imageWebP: false,
      dev: { cacheDir, outdir: path.join(tempDir, "public") },
    };
    await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: "#ffffff",
      },
    })
      .png()
      .toFile(sourcePath);

    beginImageBuild();
    await publishImage(sourcePath, outputPath, config);
    const [cacheFile] = fs
      .readdirSync(path.join(cacheDir, "images"))
      .filter((fileName) => fileName.endsWith(".png"));
    const cachePath = path.join(cacheDir, "images", cacheFile);
    const cachedBytes = fs.readFileSync(cachePath);
    fs.writeFileSync(cachePath, cachedBytes.subarray(0, 64));

    beginImageBuild();
    await publishImage(sourcePath, outputPath, config);

    assert.deepStrictEqual(getImageCacheStats(), {
      hits: 0,
      misses: 1,
      writes: 1,
      regeneratedImages: 1,
    });
    const metadata = await sharp(fs.readFileSync(outputPath)).metadata();
    assert.strictEqual(metadata.format, "png");
    assert.strictEqual(metadata.width, 100);

    fs.rmSync(`${cachePath}.json`);
    beginImageBuild();
    await publishImage(sourcePath, outputPath, config);
    assert.deepStrictEqual(getImageCacheStats(), {
      hits: 0,
      misses: 1,
      writes: 1,
      regeneratedImages: 1,
    });
  });

  it("uses auto-oriented dimensions for output widths and warm validation", async () => {
    const sourcePath = path.join(tempDir, "oriented.png");
    const outputPath = path.join(tempDir, "public", "oriented.png");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 150,
      imageWebP: false,
      dev: {
        cacheDir: path.join(tempDir, "cache"),
        outdir: path.join(tempDir, "public"),
      },
    };
    await sharp({
      create: {
        width: 100,
        height: 200,
        channels: 3,
        background: "#ffffff",
      },
    })
      .withMetadata({ orientation: 6 })
      .png()
      .toFile(sourcePath);

    beginImageBuild();
    const coldResult = await publishImage(sourcePath, outputPath, config);
    const coldMetadata = await sharp(fs.readFileSync(outputPath)).metadata();
    beginImageBuild();
    const warmResult = await publishImage(sourcePath, outputPath, config);

    assert.strictEqual(coldMetadata.width, 150);
    assert.strictEqual(coldResult.fallback.width, 150);
    assert.strictEqual(warmResult.fallback.width, 150);
    assert.deepStrictEqual(getImageCacheStats(), {
      hits: 1,
      misses: 0,
      writes: 0,
      regeneratedImages: 0,
    });
  });

  it("changes cache keys when transformation or encoder versions change", () => {
    const baseVersions = { sharp: "1", vips: "2", webp: "3" };
    const base = createCacheKey(
      "source",
      "webp",
      600,
      { lossless: true, effort: 4 },
      baseVersions,
    );

    assert.notStrictEqual(
      createCacheKey(
        "source",
        "webp",
        800,
        { lossless: true, effort: 4 },
        baseVersions,
      ),
      base,
    );
    assert.notStrictEqual(
      createCacheKey(
        "source",
        "webp",
        600,
        { lossless: true, effort: 5 },
        baseVersions,
      ),
      base,
    );
    assert.notStrictEqual(
      createCacheKey(
        "source",
        "webp",
        600,
        { lossless: true, effort: 4 },
        { ...baseVersions, webp: "4" },
      ),
      base,
    );
  });

  it("publishes from source when the cache directory is unavailable", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "panel.png");
    const cacheDir = path.join(tempDir, "unavailable-cache");
    fs.writeFileSync(cacheDir, "not a directory");
    await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: "#ffffff",
      },
    })
      .png()
      .toFile(sourcePath);
    const sourceBytes = fs.readFileSync(sourcePath);
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);

    try {
      beginImageBuild();
      const result = await publishImage(sourcePath, outputPath, {
        imageOptimization: true,
        imageMaxWidth: 100,
        dev: { cacheDir, outdir: path.join(tempDir, "public") },
      });
      await finishImageBuild({
        dev: { cacheDir, outdir: path.join(tempDir, "public") },
      });

      assert.deepStrictEqual(fs.readFileSync(outputPath), sourceBytes);
      assert.strictEqual(result.fallback.width, 200);
      assert.deepStrictEqual(result.webp, []);
      assert.deepStrictEqual(getImageCacheStats(), {
        hits: 0,
        misses: 2,
        writes: 0,
        regeneratedImages: 1,
      });
      assert.strictEqual(warnings.length, 3);
    } finally {
      console.warn = originalWarn;
    }
  });
});
