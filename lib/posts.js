const fs = require("fs");
const Page = require("./mod/page");

module.exports = class Posts {
  constructor(config) {
    this.config = config;
    this.posts = [];
  }

  // Read all markdown articles from content/posts and sort them by date
  createPostObjects() {
    const postPaths = fs.readdirSync(this.config.dev.postsdir);
    postPaths.forEach((postPath) => {
      const indexPath = `${this.config.dev.postsdir}/${postPath}/index.md`;
      if (!fs.existsSync(indexPath)) {
        console.warn(`Skipping "${postPath}": no index.md found`);
        return;
      }
      const post = new Page(this.config);
      post.readSource(`${this.config.dev.postsdir}/${postPath}`);
      post.url = `${this.config.blogsite}/${post.path}/`;
      post.imageURL = `${this.config.blogsite}/${post.path}/images/${post.image}`;
      this.posts.push(post);
    });
    // sort by date
    this.posts.sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    // loop through posts and add previous and next post to each post
    for (let i = 0; i < this.posts.length; i++) {
      if (i > 0) {
        this.posts[i].next = this.posts[i - 1];
      }
      if (i < this.posts.length - 1) {
        this.posts[i].previous = this.posts[i + 1];
      }
    }

    return this.posts;
  }
};
