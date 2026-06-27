const fm = require("front-matter");
const fs = require("fs");
const path = require("path");
const marked = require("./marked");
const PageBase = require("./page_base");

module.exports = class Page extends PageBase {
  constructor(config) {
    super(config);
    this.srcFilePath = "";
    this.markdownFilePath = ""; // markdown file path
    this.contentPath = config.dev.content;
  }

  readSource(filePath) {
    if (filePath.indexOf(".md") === -1)
      this.srcFilePath = filePath + "/index.md";
    else this.srcFilePath = filePath;

    const mdContent = fs.readFileSync(this.srcFilePath, "utf8");

    if (path.extname(filePath) === ".md") {
      // If the file has a .md extension, extract the file name without the extension
      this.path = path.basename(filePath, ".md");
    } else {
      // If there's no .md extension, just get the last part of the path
      this.path = path.basename(filePath);
    }
    // The source folder name, used to locate the post's images on disk.
    // this.path may later be prefixed (e.g. "posts/<slug>") for output/URLs.
    this.slug = this.path;
    // parsed content by fields and body
    const content = fm(mdContent);

    this.title = `${content.attributes.title}`;
    this.date = content.attributes.date;
    this.url = `${this.config.blogsite}/${this.path}/`;
    this.image = content.attributes.image;
    this.description = content.attributes.description;
    // default image if no imageURL is specified
    this.imageURL = this.config.image;

    if (content.attributes.tags && content.attributes.tags.length > 0) {
      const tagArray = content.attributes.tags.split(",");
      this.tags = tagArray
        .map((tag) => tag.trim())
        .sort((a, b) => a.localeCompare(b));
    }

    // generated HTML from markdown
    this.body = marked.parse(content.body);
    // remove <p></p> and <p> </p> from the beginning and end of the content.body
    this.body = this.body.replace(/<p><\/p>/g, "").replace(/<p> <\/p>/g, "");

    // for generating the navigation link in the post.html template
    this.next = null;
    this.previous = null;
  }

  // about/index.html or about/hello.html
  generateContent(templateFile, outputPath) {
    // For a series of posts
    if (outputPath === undefined) outputPath = path.join(this.path, "index.html");
    // if file name is not included in the path
    if (outputPath.indexOf(".htm") === -1) {
      outputPath = path.join(outputPath, "index.html");
    }

    const outputDir = path.dirname(outputPath);
    // if a directory path is included in the path
    if (outputDir !== ".") {
      if (this.path === "")
        this.path = outputDir;

      const outPath = path.join(this.config.dev.outdir, this.path);
      if (fs.existsSync(outPath))
        fs.rmSync(outPath, {
          recursive: true,
        });

      fs.mkdirSync(outPath, { recursive: true });
    } else {
      // remove the outputPath file if it exists
      const outPath = path.join(this.config.dev.outdir, this.path);
      if (fs.existsSync(outPath))
        fs.unlinkSync(outPath);
    }

    const layoutsPath = path.join(this.config.themePath, "layouts", templateFile);
    const postHTML = this.generateHTML(layoutsPath);

    fs.writeFileSync(
      path.join(this.config.dev.outdir, outputPath),
      postHTML,
      (e) => {
        if (e) throw e;
        console.log(`${outputPath}/index.html was created successfully`);
      },
    );

    // if there is the images folder in the output directory.
    const srcImagesDir = path.join(this.config.dev.postsdir, this.slug, "images");
    if (
      fs.existsSync(srcImagesDir) &&
      this.path !== ""
    ) {
      // Copy images folder from postsdir to outdir
      const destImagesDir = path.join(this.config.dev.outdir, this.path, "images");
      if (!fs.existsSync(destImagesDir))
        fs.mkdirSync(destImagesDir, { recursive: true });

      fs.readdirSync(srcImagesDir).forEach(
        (image) => {
          fs.copyFileSync(
            path.join(srcImagesDir, image),
            path.join(destImagesDir, image),
          );
        },
      );
    }
  }
};
