const fs = require("fs");
const path = require("path");
const Page = require("./mod/page");

module.exports = class Posts {
  constructor(config) {
    this.config = config;
    this.posts = [];
  }

  // Read all markdown articles from content/posts and sort them by date
  createPostObjects() {
    if (!fs.existsSync(this.config.dev.postsdir)) {
      console.warn(`No posts directory found at "${this.config.dev.postsdir}", skipping posts.`);
      return;
    }
    const postPaths = fs.readdirSync(this.config.dev.postsdir);
    postPaths.forEach((postPath) => {
      const indexPath = path.join(this.config.dev.postsdir, postPath, "index.md");
      if (!fs.existsSync(indexPath)) {
        console.warn(`Skipping "${postPath}": no index.md found`);
        return;
      }
      const post = new Page(this.config);
      post.readSource(path.join(this.config.dev.postsdir, postPath));
      // Optionally nest posts under a URL prefix (e.g. "posts" -> /posts/<slug>/).
      // post.slug stays the source folder name so image lookups remain correct.
      const prefix = this.config.postsPath ? `${this.config.postsPath}/` : "";
      post.path = `${prefix}${post.slug}`;
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
