const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OPTIMIZER_VERSION = 2;
const activeCachePaths = new Set();

function beginImageBuild() {
  activeCachePaths.clear();
}

async function pruneImageCache(config) {
  const cacheRoot =
    config.dev.cacheDir ||
    path.join(path.dirname(config.dev.outdir), ".fossbook-cache");
  const cacheDir = path.join(cacheRoot, "images");
  if (!fs.existsSync(cacheDir)) return;

  await Promise.all(
    fs.readdirSync(cacheDir).map((fileName) => {
      const cachePath = path.join(cacheDir, fileName);
      if (activeCachePaths.has(cachePath)) return Promise.resolve();
      return fs.promises.rm(cachePath, { force: true });
    }),
  );
}

async function publishImage(
  sourcePath,
  destinationPath,
  config,
  requestedMaxWidth,
) {
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  if (
    config.imageOptimization === false ||
    path.extname(sourcePath).toLowerCase() !== ".png"
  ) {
    await fs.promises.copyFile(sourcePath, destinationPath);
    return;
  }

  const configuredMaxWidth =
    Number.isInteger(config.imageMaxWidth) && config.imageMaxWidth > 0
      ? config.imageMaxWidth
      : 1400;
  const maximumOverride =
    Number.isInteger(config.imageMaxWidthOverride) &&
    config.imageMaxWidthOverride > 0
      ? config.imageMaxWidthOverride
      : 1200;
  const validRequestedWidth =
    Number.isInteger(requestedMaxWidth) && requestedMaxWidth > 0;
  const maxWidth = validRequestedWidth
    ? Math.min(requestedMaxWidth, maximumOverride)
    : configuredMaxWidth;
  const source = await fs.promises.readFile(sourcePath);
  const cacheRoot =
    config.dev.cacheDir ||
    path.join(path.dirname(config.dev.outdir), ".fossbook-cache");
  const cacheDir = path.join(cacheRoot, "images");
  const cacheKey = crypto
    .createHash("sha256")
    .update(source)
    .update(`png:${OPTIMIZER_VERSION}:${maxWidth}`)
    .digest("hex");
  const cachePath = path.join(cacheDir, `${cacheKey}.png`);
  activeCachePaths.add(cachePath);

  if (!fs.existsSync(cachePath)) {
    await fs.promises.mkdir(cacheDir, { recursive: true });
    const temporaryPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;

    try {
      await sharp(source)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(temporaryPath);

      const sourceMetadata = await sharp(source).metadata();
      const optimizedSize = (await fs.promises.stat(temporaryPath)).size;
      if (sourceMetadata.width > maxWidth || optimizedSize < source.length) {
        await fs.promises.rename(temporaryPath, cachePath);
      } else {
        await fs.promises.unlink(temporaryPath);
        await fs.promises.writeFile(cachePath, source);
      }
    } catch {
      await fs.promises.rm(temporaryPath, { force: true });
      await fs.promises.writeFile(cachePath, source);
    }
  }

  await fs.promises.copyFile(cachePath, destinationPath);
}

module.exports = { beginImageBuild, pruneImageCache, publishImage };
