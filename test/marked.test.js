const assert = require("assert");
const marked = require("../lib/mod/marked");

describe("Markdown rendering", () => {
  it("marks dialogue adjacent to a sized image for width synchronization", () => {
    const html = marked.parse('![](images/panel.png "size:60%")\n> Dialogue');

    assert.match(
      html,
      /class="blockquote-container image-dialogue"/,
    );
    assert.match(
      html,
      /class="image-container" style="text-align: center;"/,
    );
    assert.match(html, /<img[^>]+style="width: 60%;">/);
  });

  it("marks dialogue adjacent to an unsized image", () => {
    const html = marked.parse("![](images/panel.png)\n> Dialogue");

    assert.match(html, /class="blockquote-container image-dialogue"/);
  });

  it("does not constrain standalone blockquotes", () => {
    const html = marked.parse("> Standalone quote");

    assert.match(html, /class="blockquote-container"/);
    assert.doesNotMatch(html, /class="blockquote-container image-dialogue"/);
  });

  it("does not constrain dialogue separated from an image by prose", () => {
    const html = marked.parse(
      '![](images/panel.png "size:60%")\n\nIntervening prose.\n\n> Quote',
    );

    assert.doesNotMatch(html, /class="blockquote-container image-dialogue"/);
  });
});