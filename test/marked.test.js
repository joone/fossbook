const assert = require("assert");
const marked = require("../lib/mod/marked");

describe("Markdown rendering", () => {
  it("renders a responsive group of captioned panels", () => {
    const html = marked.parse(`:::panels columns="2" label="Computing pioneers"
![Alan Turing](images/turing.png "Alan Turing, 1912-1954")
![John von Neumann](images/von-neumann.png "John von Neumann, 1903-1957")
:::`);

    assert.match(
      html,
      /class="panel-group" style="--panel-columns: 2;" role="group" aria-label="Computing pioneers"/,
    );
    assert.match(html, /<figcaption>Alan Turing, 1912-1954<\/figcaption>/);
    assert.match(html, /<figcaption>John von Neumann, 1903-1957<\/figcaption>/);
    assert.strictEqual((html.match(/class="image-container"/g) || []).length, 2);
  });

  it("rejects invalid panel group attributes", () => {
    assert.throws(
      () => marked.parse(':::panels columns="0"\n![Panel](panel.png)\n:::'),
      /Panel columns must be an integer from 1 to 6/,
    );
    assert.throws(
      () => marked.parse(':::panels width="wide"\n![Panel](panel.png)\n:::'),
      /Unsupported panels attribute: width/,
    );
    assert.throws(
      () => marked.parse(':::panels columns="2" columns="3"\n![Panel](panel.png)\n:::'),
      /Duplicate panels attribute: columns/,
    );
  });

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