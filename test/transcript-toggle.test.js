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
    assert.match(template, /page\.config\.transcriptLabel \|\| "Display dialogue text"/);
    assert.doesNotMatch(template, />Comic transcript</);
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

  it("uses Korean fonts for body text and dialogue", () => {
    assert.match(styles, /url\('\.\.\/fonts\/NanumSquareNeoTTF-bRg\.woff'\) format\('woff'\)/);
    assert.match(styles, /url\('\.\.\/fonts\/NanumHimNaeRaNeunMarBoDan\.woff'\) format\('woff'\)/);
    assert.doesNotMatch(styles, /hangeul\.pstatic\.net/);
    assert.strictEqual(
      fs.existsSync(path.join(__dirname, "../themes/archie/assets/fonts/NanumSquareNeoTTF-bRg.woff")),
      true,
    );
    assert.strictEqual(
      fs.existsSync(path.join(__dirname, "../themes/archie/assets/fonts/NanumHimNaeRaNeunMarBoDan.woff")),
      true,
    );
    assert.match(styles, /html:lang\(ko\)\s*{\s*font-family: 'NanumSquareNeo', sans-serif;/);
    assert.match(styles, /html:lang\(ko\) header,\s*html:lang\(ko\) nav\s*{\s*font-family: 'NanumSquareNeo', sans-serif;/);
    assert.match(styles, /html:lang\(ko\) blockquote\s*{\s*font-family: 'NanumHimNaeRaNeunMarBoDan', 'NanumSquareNeo', sans-serif;\s*font-size: 1\.3rem;\s*line-height: 1\.2;/);
    assert.match(styles, /html:lang\(ko\) blockquote p\s*{\s*line-height: inherit;/);
  });

  it("uses font size instead of Markdown prefixes for heading hierarchy", () => {
    assert.match(styles, /h1\s*{\s*font-size: 1\.4rem;\s*}/);
    assert.match(styles, /h2\s*{\s*font-size: 1\.2rem;\s*}/);
    assert.match(styles, /h3\s*{\s*font-size: 1\.1rem;\s*}/);
    assert.match(styles, /h4\s*{\s*font-size: 1rem;\s*font-weight: 700;/);
    assert.match(styles, /\.title h1\s*{\s*font-size: 1\.7rem;/);
    assert.doesNotMatch(styles, /(?:^|\n)\s*h[1-6]::before/);
  });

  it("uses a restrained underline thickness for links", () => {
    assert.match(styles, /(?:^|\n)\s*a\s*{\s*border-bottom: 2px solid var\(--maincolor\);/);
    assert.match(styles, /\.callout a\s*{\s*border-bottom: 2px solid #fff;/);
    assert.match(styles, /\.tags a\s*{\s*border-bottom: 2px solid var\(--maincolor\);/);
  });

  it("aligns ordered reference list markers", () => {
    assert.match(styles, /ol > li::marker\s*{\s*font-family: 'Roboto Mono', monospace;/);
    assert.match(styles, /html:lang\(ko\) ol > li::marker\s*{\s*font-family: sans-serif;\s*font-variant-numeric: tabular-nums;/);
  });

  it("lays out panel groups responsively", () => {
    assert.match(styles, /\.panel-group\s*{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(var\(--panel-columns\), minmax\(0, 1fr\)\);/);
    assert.match(styles, /@media screen and \(max-width: 599px\)[\s\S]*?\.panel-group\s*{\s*grid-template-columns: 1fr;/);
    assert.match(styles, /@media screen and \(max-width: 599px\)[\s\S]*?\.sized-image\s*{\s*width: 100% !important;/);
    assert.match(styles, /\.panel-group figure\s*{[\s\S]*?padding: 0;/);
  });

  it("stretches nested comic panels without styling their images as cards", () => {
    assert.match(styles, /\.panel-group-nested\s*{\s*align-items: stretch;\s*grid-auto-rows: 1fr;/);
    assert.match(styles, /\.panel-group-nested > \.comic-panel\s*{[\s\S]*?height: 100%;[\s\S]*?margin: 0;/);
    assert.doesNotMatch(styles, /\.panel-group-boxed/);
  });

  it("frames related comic artwork and prose as one panel", () => {
    assert.match(styles, /\.comic-panel\s*{[\s\S]*?border: 1\.5px solid #575752;[\s\S]*?background: var\(--comic-panel-background, #fff\);[\s\S]*?box-shadow: var\(--comic-panel-shadow, 2px 2px 0 rgba\(70, 70, 66, 0\.14\)\);/);
    assert.match(styles, /\.comic-panel-rounded\s*{\s*--comic-panel-border-radius: 4px 7px 5px 8px \/ 7px 4px 8px 5px;/);
    assert.doesNotMatch(styles, /border: var\(--comic-panel-border,/);
    assert.match(styles, /\.comic-panel\[style\*="--comic-panel-border:"\]\s*{\s*border: var\(--comic-panel-border\);/);
    assert.match(styles, /\.comic-panel\[style\*="--comic-panel-border-width:"\]\s*{\s*border-width: var\(--comic-panel-border-width\);/);
    assert.match(styles, /\.comic-panel \.image-dialogue\s*{\s*margin-bottom: 1rem;\s*}/);
    assert.match(styles, /\.comic-panel-divider \.image-dialogue\s*{\s*padding-bottom: 1rem;\s*border-bottom: 1px solid #575752;/);
    assert.match(styles, /@media screen and \(max-width: 599px\)[\s\S]*?\.comic-panel\s*{[\s\S]*?border-width: 1px;\s*box-shadow: 1px 1px 0 rgba\(70, 70, 66, 0\.14\);/);
  });
});