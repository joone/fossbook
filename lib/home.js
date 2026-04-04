const fs = require("fs");
const path = require("path");
const PageBase = require("./mod/page_base");

module.exports = class Pagination extends PageBase {
  constructor(config) {
    super(config);
  }

  generateContent(posts) {
    const postsPerPage = 5;
    const numPages = Math.ceil(posts.length / postsPerPage);

    const pageDir = path.join(this.config.dev.outdir, "page");
    if (fs.existsSync(pageDir))
      fs.rmSync(pageDir, { recursive: true });

    fs.mkdirSync(pageDir);

    // copy content/page/1.html to outdir/page/1.html
    const contentPagePath = path.join(this.config.dev.content, "page", "1.html");
    if (fs.existsSync(contentPagePath))
      fs.copyFileSync(
        contentPagePath,
        path.join(pageDir, "1.html"),
      );

    for (let i = 0; i < numPages; i++) {
      const pagePosts = posts.slice(i * postsPerPage, (i + 1) * postsPerPage);

      let filePath;
      let url;
      if (i === 0) {
        filePath = path.join(this.config.dev.outdir, "index.html");
        url = this.config.blogsite;
      } else {
        filePath = path.join(pageDir, `${i + 1}.html`);
        url = `${this.config.blogsite}/page/${i + 1}.html`;
      }
      const prev = i - 1 >= 0 ? i : null;
      const next = i + 1 < numPages ? i + 2 : null;

      console.log("prev", prev, "next", next);
      this.url = url;
      this.title = `${this.config.blogName}`;
      this.imageURL = this.config.image;
      const data = { posts: pagePosts, prev: prev, next: next };

      const templatePath = path.join(this.config.themePath, "layouts", "home.html");
      fs.writeFile(
        `${filePath}`,
        this.generateHTML(templatePath, data),
        (e) => {
          if (e) throw e;
          console.log(`page/${i + 1}.html was created successfully`);
        },
      );
    }
  }
};
