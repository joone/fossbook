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
});