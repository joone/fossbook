const fs = require("fs");
const path = require("path");
const PageBase = require("./mod/page_base");

module.exports = class AllPostsPage extends PageBase {
  constructor(config) {
    super(config);
  }

  // posts: array of Page objects
  generateContent(posts) {
    const pageTitle = "All posts";
    if (!fs.existsSync(`${this.config.dev.outdir}/all_posts/`))
      fs.mkdirSync(`${this.config.dev.outdir}/all_posts/`);

    const data = { posts: posts, pageTitle: pageTitle };
    this.url = `${this.config.blogsite}/posts.html`;
    this.title = `${this.config.blogName}: ${data.pageTitle}`;
    this.description = "All posts";
    this.imageURL = this.config.image;

    const templatePath = path.join(this.config.themePath, "layouts", "all_posts.html");
    fs.writeFileSync(
      `${this.config.dev.outdir}/all_posts/index.html`,
      this.generateHTML(templatePath, data),
      (e) => {
        if (e) throw e;
        console.log(`posts.html was created successfully`);
      },
    );
  }
};
