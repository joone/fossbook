const assert = require("assert");
const fs = require("fs");
const path = require("path");

describe("Comic transcript toggle", () => {
  const template = fs.readFileSync(
    path.join(__dirname, "../themes/archie/layouts/post.html"),
    "utf8",
  );
  const styles = fs.readFileSync(
    path.join(__dirname, "../themes/archie/assets/styles/main.css"),
    "utf8",
  );

  it("renders an accessible switch only for posts with image dialogue", () => {
    assert.match(template, /page\.body\.includes\('class="blockquote-container image-dialogue"'\)/);
    assert.match(template, /type="checkbox" role="switch"/);
    assert.match(template, /aria-controls="comic-transcript"/);
  });

  it("persists the reader preference", () => {
    assert.match(template, /fossbook-comic-transcript/);
    assert.match(template, /localStorage\.setItem/);
  });

  it("keeps transcripts visible when printing", () => {
    assert.match(styles, /@media print[\s\S]*\.transcripts-hidden \.image-dialogue\s*{\s*display: flex;/);
  });
});