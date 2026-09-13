const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const {
  beginImageBuild,
  pruneImageCache,
  publishImage,
} = require("../lib/mod/image");

describe("Image publishing", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-images-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("resizes PNGs, preserves the source, and reuses the cached artifact", async () => {
    const sourcePath = path.join(tempDir, "source.png");
    const outputPath = path.join(tempDir, "public", "image.png");
    const secondOutputPath = path.join(tempDir, "public", "image-2.png");
    const cacheDir = path.join(tempDir, "cache");
    const config = {
      imageOptimization: true,
      imageMaxWidth: 100,
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

    const [cacheFile] = fs.readdirSync(path.join(cacheDir, "images"));
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
    assert.strictEqual(cacheFiles.length, 1);
    assert.strictEqual(fs.existsSync(stalePath), false);
  });
});
