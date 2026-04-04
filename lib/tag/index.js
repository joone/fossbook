const fs = require("fs");
const path = require("path");

const PageBase = require("../mod/page_base");
const TagPage = require("./tag");

module.exports = class TagList extends PageBase {
  constructor(config) {
    super(config);
  }

  gatherTags(posts) {
    const tags = new Map();
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        if (!tags.has(tag)) {
          tags.set(tag, []);
        }
        tags.get(tag).push({
          path: post.path,
          title: post.title,
          date: post.date,
          description: post.description,
        });
      });
    });

    return tags;
  }

  generateContent(articles) {
    const tagMap = this.gatherTags(articles);

    let tagArray = [];
    for (let [tag, posts] of tagMap) {
      tagArray.push({
        name: tag,
        path: tag.replace(/\s+/g, "_"),
        count: posts.length,
      });
    }

    tagArray.sort((a, b) => a.name.localeCompare(b.name));

    const tagsDir = path.join(this.config.dev.outdir, "tags");
    if (!fs.existsSync(tagsDir))
      fs.mkdirSync(tagsDir);

    this.imageURL = this.config.image;
    this.description = "Tag List";
    const data = { tags: tagArray, pageTitle: "All tags" };
    this.url = `${this.config.blogsite}/tag_list.html`;
    this.title = `${this.config.blogName}: ${data.pageTitle}`;

    const templatePath = path.join(this.config.themePath, "layouts", "tag_list.html");
    fs.writeFile(
      path.join(tagsDir, "index.html"),
      this.generateHTML(templatePath, data),
      (e) => {
        if (e) throw e;
        console.log(`tags/index.html for tags was created successfully`);
      },
    );

    const tagPage = new TagPage(this.config);
    for (let [tag, posts] of tagMap) {
      tagPage.createPages(tag, posts);
    }
  }
};
