const assert = require("assert");
const marked = require("../lib/mod/marked");

describe("Markdown rendering", () => {
  it("renders bare Wikipedia URLs as localized citations", () => {
    const korean = marked.parse("- [1] https://ko.wikipedia.org/wiki/튜링_기계");
    const english = marked.parse("- [1] https://en.wikipedia.org/wiki/Turing_machine");
    const autolink = marked.parse("- [1] <https://ko.wikipedia.org/wiki/앨런_튜링>");
    const punctuated = marked.parse("See https://en.wikipedia.org/wiki/History_of_computing.");
    const references = marked.parse(`- [1] https://ko.wikipedia.org/wiki/튜링_기계
- [2] https://ko.wikipedia.org/wiki/앨런_튜링
- [3] https://ko.wikipedia.org/wiki/컴퓨터의_역사`);

    assert.match(korean, /<a href="https:\/\/ko\.wikipedia\.org\/wiki\/튜링_기계">튜링 기계, 위키백과<\/a>/);
    assert.match(english, /<a href="https:\/\/en\.wikipedia\.org\/wiki\/Turing_machine">Turing machine, Wikipedia<\/a>/);
    assert.match(autolink, /<a href="https:\/\/ko\.wikipedia\.org\/wiki\/앨런_튜링">앨런 튜링, 위키백과<\/a>/);
    assert.match(punctuated, /<a href="https:\/\/en\.wikipedia\.org\/wiki\/History_of_computing">History of computing, Wikipedia<\/a>\.<\/p>/);
    assert.strictEqual((references.match(/<li>/g) || []).length, 3);
    assert.match(references, /\[1\] <a[^>]+>튜링 기계, 위키백과<\/a>/);
    assert.match(references, /\[2\] <a[^>]+>앨런 튜링, 위키백과<\/a>/);
    assert.match(references, /\[3\] <a[^>]+>컴퓨터의 역사, 위키백과<\/a>/);
  });

  it("preserves explicitly labeled Wikipedia links", () => {
    const html = marked.parse("[튜링의 계산 모형](https://ko.wikipedia.org/wiki/튜링_기계)");

    assert.match(html, />튜링의 계산 모형<\/a>/);
    assert.doesNotMatch(html, /위키백과/);
  });

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

  it("nests comic panels inside a longer-fenced panel grid", () => {
    const html = marked.parse(`::::panels columns="2" style="gap: 1rem;" label="Two scenes"
:::panel style="border-width: 2px;"
First scene.

![First](first.png)
:::

:::panel
Second scene.

![Second](second.png)
:::
::::`);

    assert.match(
      html,
      /class="panel-group panel-group-nested" style="--panel-columns: 2; --panel-gap: 1rem;" role="group" aria-label="Two scenes"/,
    );
    assert.strictEqual((html.match(/class="comic-panel"/g) || []).length, 2);
    assert.match(html, /style="--comic-panel-border-width: 2px;"/);
    assert.match(html, /<p>First scene\.<\/p>/);
    assert.match(html, /<p>Second scene\.<\/p>/);
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
    assert.throws(
      () => marked.parse(':::panels style="box-shadow: none;"\n![Panel](panel.png)\n:::'),
      /Unsupported panel group style property: box-shadow/,
    );
    assert.throws(
      () => marked.parse(':::panels boxed="true"\n![Panel](panel.png)\n:::'),
      /Unsupported panels attribute: boxed/,
    );
    assert.throws(
      () => marked.parse(':::panels rounded="true"\n![Panel](panel.png)\n:::'),
      /Unsupported panels attribute: rounded/,
    );
  });

  it("groups comic artwork, dialogue, and prose in one semantic panel", () => {
    const html = marked.parse(`:::panel label="Turing imagines a universal machine" style="border-width: 3px;"
![Alan Turing walking](images/turing.png)
> "I have an idea."

Turing described an abstract machine that reads symbols from a tape.
:::`);

    assert.match(
      html,
      /<section class="comic-panel" style="--comic-panel-border-width: 3px;" aria-label="Turing imagines a universal machine">/,
    );
    assert.match(html, /class="blockquote-container image-dialogue"/);
    assert.match(html, /<p>Turing described an abstract machine/);
    assert.match(html, /<\/section>/);
  });

  it("makes the dialogue divider opt-in for comic panels", () => {
    const withoutDivider = marked.parse(':::panel\n![Scene](scene.png)\n> Dialogue\n:::');
    const withDivider = marked.parse(':::panel divider="true"\n![Scene](scene.png)\n> Dialogue\n:::');

    assert.match(withoutDivider, /<section class="comic-panel">/);
    assert.doesNotMatch(withoutDivider, /comic-panel-divider/);
    assert.match(withDivider, /<section class="comic-panel comic-panel-divider">/);
    assert.throws(
      () => marked.parse(':::panel divider="false"\nText\n:::'),
      /Panel divider must be "true"/,
    );
  });

  it("adds preset rounded corners to comic panels", () => {
    const html = marked.parse(':::panel rounded="true"\nText\n:::');

    assert.match(html, /<section class="comic-panel comic-panel-rounded">/);
    assert.throws(
      () => marked.parse(':::panel rounded="false"\nText\n:::'),
      /Panel rounded must be "true"/,
    );
  });

  it("rejects unsupported comic panel attributes and styles", () => {
    assert.throws(
      () => marked.parse(':::panel boxed="true"\nText\n:::'),
      /Unsupported panel attribute: boxed/,
    );
    assert.throws(
      () => marked.parse(':::panel style="gap: 1rem;"\nText\n:::'),
      /Unsupported panel style property: gap/,
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
    assert.match(html, /<img[^>]+class="sized-image" style="width: 60%;">/);
  });

  it("marks dialogue adjacent to an unsized image", () => {
    const html = marked.parse("![](images/panel.png)\n> Dialogue");

    assert.match(html, /class="blockquote-container image-dialogue"/);
  });

  it("renders easy-to-type straight quotes as Korean dialogue quotes", () => {
    const korean = marked.parse('![](images/panel.png)\n> "첫 번째" \\\n> "두 번째"', { language: "ko" });
    const english = marked.parse('![](images/panel.png)\n> "Dialogue"', { language: "en" });
    const prose = marked.parse('Ordinary "Korean" prose', { language: "ko" });
    const unmatched = marked.parse('> "미완성', { language: "ko" });

    assert.strictEqual((korean.match(/dialogue-quote-open/g) || []).length, 2);
    assert.strictEqual((korean.match(/dialogue-quote-close/g) || []).length, 2);
    assert.match(korean, /<span class="dialogue-quote dialogue-quote-open">“<\/span>첫 번째<span class="dialogue-quote dialogue-quote-close">”<\/span>/);
    assert.match(english, /&quot;Dialogue&quot;/);
    assert.match(prose, /&quot;Korean&quot;/);
    assert.match(unmatched, /&quot;미완성/);
    assert.doesNotMatch(unmatched, /dialogue-quote/);
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