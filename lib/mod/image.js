const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const CACHE_SCHEMA_VERSION = 4;
const PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true };
const WEBP_OPTIONS = { lossless: true, effort: 4 };
const activeCachePaths = new Set();
let cacheStats;

function beginImageBuild() {
  activeCachePaths.clear();
  cacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    regeneratedImages: new Set(),
  };
}

async function pruneImageCache(config) {
  const cacheDir = getImageCacheDir(config);
  if (!fs.existsSync(cacheDir)) return;

  await Promise.all(
    fs.readdirSync(cacheDir).map((fileName) => {
      const cachePath = path.join(cacheDir, fileName);
      if (activeCachePaths.has(cachePath)) return Promise.resolve();
      return fs.promises.rm(cachePath, { recursive: true, force: true });
    }),
  );
}

async function finishImageBuild(config) {
  const stats = getImageCacheStats();
  try {
    await pruneImageCache(config);
    const cacheRoot = getCacheRoot(config);
    await fs.promises.mkdir(cacheRoot, { recursive: true });
    await writeFileAtomically(
      path.join(cacheRoot, "image-cache-status.json"),
      JSON.stringify(stats, null, 2) + "\n",
    );
  } catch (error) {
    console.warn(`Warning: Image cache finalization failed. ${error.message}`);
  }
  console.log(
    `Image cache: ${stats.hits} hits, ${stats.misses} misses, ` +
      `${stats.regeneratedImages} images regenerated.`,
  );
  return stats;
}

function getImageCacheStats() {
  ensureCacheStats();
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    writes: cacheStats.writes,
    regeneratedImages: cacheStats.regeneratedImages.size,
  };
}

async function publishImage(
  sourcePath,
  destinationPath,
  config,
  requestedMaxWidth,
  generateWebP = true,
) {
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  if (
    config.imageOptimization === false ||
    path.extname(sourcePath).toLowerCase() !== ".png"
  ) {
    await fs.promises.copyFile(sourcePath, destinationPath);
    return null;
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
  let sourceMetadata;
  try {
    sourceMetadata = await sharp(source).metadata();
  } catch {
    await fs.promises.copyFile(sourcePath, destinationPath);
    return null;
  }
  const cacheDir = getImageCacheDir(config);
  const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
  const sourceWidth = sourceMetadata.autoOrient?.width ?? sourceMetadata.width;
  const fallback = await publishPng(
    sourcePath,
    source,
    sourceWidth,
    sourceHash,
    destinationPath,
    cacheDir,
    maxWidth,
  );

  if (!generateWebP || config.imageWebP === false) {
    return { fallback, webp: [] };
  }

  const responsiveWidths = Array.isArray(config.imageResponsiveWidths)
    ? config.imageResponsiveWidths
    : [600, 800, 1000];
  const effectiveMaxWidth = Math.min(sourceWidth, maxWidth);
  const widths = [...new Set([...responsiveWidths, effectiveMaxWidth])]
    .filter((width) => Number.isInteger(width) && width > 0)
    .filter((width) => width <= effectiveMaxWidth)
    .sort((left, right) => left - right);
  const parsedDestination = path.parse(destinationPath);
  const webp = [];

  for (const width of widths) {
    const suffix = width === effectiveMaxWidth ? "" : `-${width}`;
    const fileName = `${parsedDestination.name}${suffix}.webp`;
    const outputPath = path.join(parsedDestination.dir, fileName);
    const published = await publishWebP(
      sourcePath,
      source,
      sourceHash,
      outputPath,
      cacheDir,
      width,
    );
    if (published) webp.push({ fileName, width });
  }

  return { fallback, webp };
}

async function publishPng(
  sourcePath,
  source,
  sourceWidth,
  sourceHash,
  destinationPath,
  cacheDir,
  maxWidth,
) {
  const outputWidth = Math.min(sourceWidth, maxWidth);
  const cachePath = getCachePath(
    cacheDir,
    sourceHash,
    "png",
    maxWidth,
    PNG_OPTIONS,
  );
  activeCachePaths.add(cachePath);
  activeCachePaths.add(getManifestPath(cachePath));

  if (await useCachedEntry(cachePath, "png", outputWidth)) {
    await fs.promises.copyFile(cachePath, destinationPath);
    return {
      fileName: path.basename(destinationPath),
      width: outputWidth,
    };
  }

  recordCacheMiss(sourcePath);
  let temporaryPath;

  try {
    await fs.promises.mkdir(cacheDir, { recursive: true });
    temporaryPath = createTemporaryPath(cachePath);
    await sharp(source)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png(PNG_OPTIONS)
      .toFile(temporaryPath);

    const optimizedSize = (await fs.promises.stat(temporaryPath)).size;
    if (sourceWidth <= maxWidth && optimizedSize >= source.length) {
      await fs.promises.rm(temporaryPath, { force: true });
      await writeFileAtomically(cachePath, source);
    } else {
      await fs.promises.rename(temporaryPath, cachePath);
    }
    await writeCacheManifest(cachePath, "png", outputWidth);
    cacheStats.writes += 1;
  } catch (error) {
    if (temporaryPath) await fs.promises.rm(temporaryPath, { force: true });
    console.warn(
      `Warning: PNG cache processing failed for ${sourcePath}; publishing the source image. ${error.message}`,
    );
    await fs.promises.copyFile(sourcePath, destinationPath);
    return {
      fileName: path.basename(destinationPath),
      width: sourceWidth,
    };
  }

  await fs.promises.copyFile(cachePath, destinationPath);
  return {
    fileName: path.basename(destinationPath),
    width: outputWidth,
  };
}

async function publishWebP(
  sourcePath,
  source,
  sourceHash,
  destinationPath,
  cacheDir,
  width,
) {
  const cachePath = getCachePath(
    cacheDir,
    sourceHash,
    "webp",
    width,
    WEBP_OPTIONS,
  );
  activeCachePaths.add(cachePath);
  activeCachePaths.add(getManifestPath(cachePath));

  if (!(await useCachedEntry(cachePath, "webp", width))) {
    recordCacheMiss(sourcePath);
    let temporaryPath;
    try {
      await fs.promises.mkdir(cacheDir, { recursive: true });
      temporaryPath = createTemporaryPath(cachePath);
      await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp(WEBP_OPTIONS)
        .toFile(temporaryPath);
      await fs.promises.rename(temporaryPath, cachePath);
      await writeCacheManifest(cachePath, "webp", width);
      cacheStats.writes += 1;
    } catch (error) {
      if (temporaryPath) await fs.promises.rm(temporaryPath, { force: true });
      console.warn(
        `Warning: WebP cache processing failed for ${sourcePath}; publishing only the PNG fallback. ${error.message}`,
      );
      return false;
    }
  }

  await fs.promises.copyFile(cachePath, destinationPath);
  return true;
}

async function useCachedEntry(cachePath, format, width) {
  ensureCacheStats();
  const manifestPath = getManifestPath(cachePath);
  if (!fs.existsSync(cachePath) || !fs.existsSync(manifestPath)) {
    await Promise.all([
      removeCacheEntry(cachePath),
      removeCacheEntry(manifestPath),
    ]);
    return false;
  }

  try {
    const [contents, manifestContents] = await Promise.all([
      fs.promises.readFile(cachePath),
      fs.promises.readFile(manifestPath, "utf8"),
    ]);
    const manifest = JSON.parse(manifestContents);
    const digest = crypto.createHash("sha256").update(contents).digest("hex");
    if (
      manifest.schema === CACHE_SCHEMA_VERSION &&
      manifest.format === format &&
      manifest.width === width &&
      manifest.size === contents.length &&
      manifest.sha256 === digest
    ) {
      cacheStats.hits += 1;
      return true;
    }
  } catch {
    // Invalid cache entries are removed and regenerated below.
  }

  await removeCacheEntry(cachePath);
  await removeCacheEntry(manifestPath);
  return false;
}

async function removeCacheEntry(cachePath) {
  try {
    await fs.promises.rm(cachePath, { recursive: true, force: true });
  } catch {
    // An unusable cache location is ignored so publishing can fall back
    // to the source image.
  }
}

async function writeCacheManifest(cachePath, format, width) {
  const contents = await fs.promises.readFile(cachePath);
  await writeFileAtomically(
    getManifestPath(cachePath),
    JSON.stringify({
      schema: CACHE_SCHEMA_VERSION,
      format,
      width,
      size: contents.length,
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
    }),
  );
}

function getManifestPath(cachePath) {
  return `${cachePath}.json`;
}

function getCachePath(cacheDir, sourceHash, format, width, options) {
  const cacheKey = createCacheKey(sourceHash, format, width, options);
  return path.join(cacheDir, `${cacheKey}.${format}`);
}

function createCacheKey(
  sourceHash,
  format,
  width,
  options,
  encoderVersions = getEncoderVersions(format),
) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        schema: CACHE_SCHEMA_VERSION,
        sourceHash,
        format,
        width,
        rotate: true,
        withoutEnlargement: true,
        options,
        encoderVersions,
      }),
    )
    .digest("hex");
}

function getEncoderVersions(format) {
  return format === "webp"
    ? {
        sharp: sharp.versions.sharp,
        vips: sharp.versions.vips,
        webp: sharp.versions.webp,
      }
    : {
        sharp: sharp.versions.sharp,
        vips: sharp.versions.vips,
        png: sharp.versions.png,
      };
}

function createTemporaryPath(cachePath) {
  return `${cachePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
}

async function writeFileAtomically(destinationPath, contents) {
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  const temporaryPath = createTemporaryPath(destinationPath);
  try {
    await fs.promises.writeFile(temporaryPath, contents);
    try {
      await fs.promises.rename(temporaryPath, destinationPath);
    } catch (error) {
      if (error.code !== "EEXIST" && error.code !== "EPERM") throw error;
      await fs.promises.rm(destinationPath, { force: true });
      await fs.promises.rename(temporaryPath, destinationPath);
    }
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true });
    throw error;
  }
}

function recordCacheMiss(sourcePath) {
  ensureCacheStats();
  cacheStats.misses += 1;
  cacheStats.regeneratedImages.add(sourcePath);
}

function ensureCacheStats() {
  if (!cacheStats) beginImageBuild();
}

function getCacheRoot(config) {
  return (
    config.dev.cacheDir || path.resolve(config.cacheDir || ".fossbook-cache")
  );
}

function getImageCacheDir(config) {
  return path.join(getCacheRoot(config), "images");
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  beginImageBuild,
  createCacheKey,
  finishImageBuild,
  getImageCacheStats,
  pruneImageCache,
  publishImage,
};
