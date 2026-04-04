const fs = require("fs");
const path = require("path");
const PageBase = require("../mod/page_base");

module.exports = class TagPage extends PageBase {
  createPages(tag, posts) {
    let tagPath = tag.replace(/\s+/g, "_"); // Replace spaces with underscores
    const tagDir = path.join(this.config.dev.outdir, "tags", tagPath);
    if (!fs.existsSync(tagDir))
      fs.mkdirSync(tagDir);

    // FIXME: imageURL should refer to the image related to the tag
    this.imageURL = this.config.image;

    const data = { tag: tag, posts: posts, url: "tags/" + tagPath };
    this.url = `${this.config.blogsite}/${data.url}`;
    this.title = `${this.config.blogName}: Entries tagged - ${data.tag}`;
    this.description = `List up all posts including '${data.tag}' tag.`;

    const templatePath = path.join(this.config.themePath, "layouts", "tag.html");
    fs.writeFile(
      path.join(tagDir, "index.html"),
      this.generateHTML(templatePath, data),
      (e) => {
        if (e) throw e;
        console.log(`/tags/${tagPath}/index.html was created successfully`);
      },
    );
  }
};
