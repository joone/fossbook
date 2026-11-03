const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createFeedTranslations,
  feedContent,
  generateFeed,
  renderFeed,
} = require("../lib/feed");
const PageBase = require("../lib/mod/page_base");

function samplePost(overrides = {}) {
  return {
    title: "1. Babbage & Lovelace",
    date: "2026-08-22",
    url: "https://example.com/posts/1. Babbage/",
    image: "feature.webp",
    imageURL: "https://example.com/posts/1. Babbage/images/feature.webp",
    description: "Engines <and> poetry",
    tags: ["History", "Ada"],
    translations: [
      {
        language: "en",
        languageName: "English",
        url: "https://example.com/posts/1. Babbage/",
      },
      {
        language: "ko",
        languageName: "한국어",
        url: "https://example.com/ko/posts/1. Babbage/",
      },
    ],
    body:
      '<picture><source type="image/webp" srcset="images/panel-600.webp 600w, images/panel-800.webp 800w" sizes="100vw">' +
      '<img src="images/panel.png" alt="Ada"></picture>' +
      '<img src="/images/logo.png" alt="logo">' +
      '<a href="https://en.wikipedia.org/wiki/Ada ">Ada</a> <a href="#notes">notes</a>' +
      "<script>alert(1)</script>" +
      '<pre class="mermaid">flowchart TB\nA --&gt; B</pre>',
    ...overrides,
  };
}

const config = {
  blogName: "Comics & Co",
  blogDescription: "Stories",
  blogsite: "https://example.com",
  basePath: "/",
  authorName: "Jane",
  language: "en",
  defaultLanguage: "en",
  image: "https://example.com/images/home.png",
  version: "1.0.0",
  feedTranslations: [
    {
      language: "en",
      languageName: "English",
      url: "https://example.com/feed.xml",
    },
    {
      language: "ko",
      languageName: "한국어",
      url: "https://example.com/ko/feed.xml",
    },
  ],
};

describe("Atom feed", () => {
  it("makes post HTML self-contained for feed readers", () => {
    const html = feedContent(samplePost());
    assert.match(
      html,
      /<img src="https:\/\/example\.com\/posts\/1\.%20Babbage\/images\/panel\.png"/,
    );
    assert.match(
      html,
      /srcset="https:\/\/example\.com\/posts\/1\.%20Babbage\/images\/panel-600\.webp 600w, https:\/\/example\.com\/posts\/1\.%20Babbage\/images\/panel-800\.webp 800w"/,
    );
    assert.match(html, /<img src="https:\/\/example\.com\/images\/logo\.png"/);
    assert.match(html, /href="https:\/\/en\.wikipedia\.org\/wiki\/Ada"/);
    assert.match(html, /href="#notes"/);
    assert.doesNotMatch(html, /<script/);
    assert.doesNotMatch(html, /flowchart/);
    assert.match(html, /View this diagram on the website/);
  });

  it("renders an escaped Atom document with entries, translations, and media", () => {
    const xml = renderFeed(config, [samplePost()]);
    assert.match(xml, /^<\?xml version="1\.0" encoding="utf-8"\?>/);
    assert.match(
      xml,
      /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom"[^>]*xml:lang="en">/,
    );
    assert.match(xml, /<title>Comics &amp; Co<\/title>/);
    assert.match(
      xml,
      /<link rel="self" type="application\/atom\+xml" href="https:\/\/example\.com\/feed\.xml"\/>/,
    );
    assert.match(
      xml,
      /hreflang="ko" title="한국어" href="https:\/\/example\.com\/ko\/feed\.xml"/,
    );
    assert.match(xml, /<updated>2026-08-22T00:00:00\.000Z<\/updated>/);
    assert.match(
      xml,
      /<id>https:\/\/example\.com\/posts\/1\.%20Babbage\/<\/id>/,
    );
    assert.match(
      xml,
      /hreflang="ko" title="한국어" href="https:\/\/example\.com\/ko\/posts\/1\.%20Babbage\/"/,
    );
    assert.doesNotMatch(
      xml,
      /hreflang="en" title="English" href="https:\/\/example\.com\/posts/,
    );
    assert.match(xml, /<category term="Ada"\/>/);
    assert.match(xml, /<summary>Engines &lt;and&gt; poetry<\/summary>/);
    assert.match(
      xml,
      /<media:thumbnail url="https:\/\/example\.com\/posts\/1\.%20Babbage\/images\/feature\.webp"\/>/,
    );
    assert.doesNotMatch(xml, /<content\b/);
    assert.doesNotMatch(xml, /&lt;(?:picture|img|script|pre)\b/);
    assert.doesNotMatch(xml, /images\/panel|flowchart|alert\(1\)/);
  });

  it("renders summaries without requiring or reading a post body", () => {
    const post = samplePost();
    Object.defineProperty(post, "body", {
      get() {
        throw new Error("Summary feeds must not read the post body");
      },
    });
    const xml = renderFeed(config, [post]);
    assert.match(xml, /<summary>Engines &lt;and&gt; poetry<\/summary>/);
    assert.match(xml, /<media:thumbnail\b/);
    assert.doesNotMatch(xml, /<content\b/);
  });

  it("includes the required summary even when the description is empty", () => {
    for (const description of ["", undefined, null]) {
      const xml = renderFeed(config, [
        samplePost({ description, body: undefined, image: undefined }),
      ]);
      assert.match(xml, /<summary><\/summary>/);
      assert.doesNotMatch(xml, /<content\b|<media:thumbnail\b/);
      assert.match(xml, /<link rel="alternate" type="text\/html"/);
    }
  });

  it("absolutizes raw HTML URLs with every attribute quoting form", () => {
    for (const quote of ['"', "'", ""]) {
      const html = feedContent(
        samplePost({
          body:
            `<img src = ${quote}images/panel.png${quote}>` +
            `<a href = ${quote}next/${quote}>Next</a>` +
            `<source srcset = ${quote}images/panel.webp${quote}>`,
        }),
      );
      assert.ok(
        html.includes(
          'src = "https://example.com/posts/1.%20Babbage/images/panel.png"',
        ),
      );
      assert.ok(
        html.includes('href = "https://example.com/posts/1.%20Babbage/next/"'),
      );
      assert.ok(
        html.includes(
          'srcset = "https://example.com/posts/1.%20Babbage/images/panel.webp"',
        ),
      );
    }
  });

  it("preserves srcset descriptors and unrelated quoted attribute text", () => {
    const html = feedContent(
      samplePost({
        body:
          '<IMG title="Example > src=\'not-a-url.png\'" SRC=\'images/panel.png\'>' +
          "<source srcset='images/small.webp 600w, images/large.webp 1200w'>",
      }),
    );
    assert.ok(html.includes('title="Example > src=\'not-a-url.png\'"'));
    assert.ok(
      html.includes(
        'SRC="https://example.com/posts/1.%20Babbage/images/panel.png"',
      ),
    );
    assert.ok(
      html.includes(
        'srcset="https://example.com/posts/1.%20Babbage/images/small.webp 600w, https://example.com/posts/1.%20Babbage/images/large.webp 1200w"',
      ),
    );
  });

  it("escapes double quotes when normalizing single-quoted URL attributes", () => {
    const html = feedContent(
      samplePost({
        body: "<a href='https://example.com/?q=\"Ada\"'>Ada</a>",
      }),
    );
    assert.ok(html.includes('href="https://example.com/?q=&quot;Ada&quot;"'));
  });

  it("limits entries to the newest posts", () => {
    const posts = [3, 2, 1].map((n) =>
      samplePost({
        title: `Post ${n}`,
        url: `https://example.com/posts/${n}/`,
        date: `2026-0${n}-01`,
      }),
    );
    const xml = renderFeed({ ...config, feedLimit: 2 }, posts);
    assert.strictEqual((xml.match(/<entry>/g) || []).length, 2);
    assert.match(xml, /Post 3/);
    assert.doesNotMatch(xml, /Post 1/);
    assert.match(
      xml,
      /<feed[^>]*>[\s\S]*?<updated>2026-03-01T00:00:00\.000Z<\/updated>/,
    );
  });

  it("uses the blog name with a warning when the author is empty", () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);
    try {
      for (const authorName of ["", " \t ", undefined]) {
        for (const posts of [[], [samplePost()]]) {
          const xml = renderFeed({ ...config, authorName }, posts);
          const authors = xml.match(
            /<author><name>Comics &amp; Co<\/name><\/author>/g,
          );
          assert.strictEqual(authors.length, posts.length + 1);
        }
      }
      assert.strictEqual(warnings.length, 6);
      for (const warning of warnings) {
        assert.match(warning, /authorName is empty; using blogName/);
      }
    } finally {
      console.warn = originalWarn;
    }
  });

  it("preserves the configured author without a fallback warning", () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);
    try {
      const xml = renderFeed(config, [samplePost()]);
      assert.strictEqual(
        (xml.match(/<author><name>Jane<\/name><\/author>/g) || []).length,
        2,
      );
      assert.deepStrictEqual(warnings, []);
    } finally {
      console.warn = originalWarn;
    }
  });

  it("rejects feeds without an author name or blog name", () => {
    assert.throws(
      () => renderFeed({ ...config, authorName: "", blogName: " " }, []),
      /Atom feeds require a non-empty authorName or blogName/,
    );
  });

  it("can be disabled", () => {
    const outdir = fs.mkdtempSync(path.join(os.tmpdir(), "fossbook-feed-"));
    try {
      assert.strictEqual(
        generateFeed({ ...config, feed: false, dev: { outdir } }, []),
        null,
      );
      assert.ok(!fs.existsSync(path.join(outdir, "feed.xml")));
      assert.ok(generateFeed({ ...config, dev: { outdir } }, [samplePost()]));
      assert.ok(fs.existsSync(path.join(outdir, "feed.xml")));
    } finally {
      fs.rmSync(outdir, { recursive: true, force: true });
    }
  });

  it("builds per-language feed locations", () => {
    assert.deepStrictEqual(
      createFeedTranslations([
        {
          language: "en",
          languageName: "English",
          defaultLanguage: "en",
          basePath: "/blog/",
          blogsite: "https://example.com/blog",
        },
        {
          language: "ko",
          languageName: "한국어",
          defaultLanguage: "en",
          basePath: "/blog/ko/",
          blogsite: "https://example.com/blog/ko",
        },
      ]),
      [
        {
          language: "en",
          languageName: "English",
          path: "/blog/feed.xml",
          url: "https://example.com/blog/feed.xml",
          isDefault: true,
        },
        {
          language: "ko",
          languageName: "한국어",
          path: "/blog/ko/feed.xml",
          url: "https://example.com/blog/ko/feed.xml",
          isDefault: false,
        },
      ],
    );
  });

  it("advertises the current language's feed first for autodiscovery", () => {
    const page = new PageBase({
      ...config,
      language: "ko",
      blogName: "블로그",
    });
    const links = page
      .feedLinks()
      .split("\n")
      .map((line) => line.trim());
    assert.strictEqual(links.length, 2);
    assert.match(
      links[0],
      /hreflang="ko" href="https:\/\/example\.com\/ko\/feed\.xml"/,
    );
    assert.match(links[1], /title="블로그 \(English\)" hreflang="en"/);
    assert.strictEqual(
      new PageBase({ ...config, feed: false }).feedLinks(),
      "",
    );
  });

  it("excludes disabled language feeds without excluding post translations", () => {
    const languageConfigs = [
      { ...config, feed: true },
      {
        ...config,
        language: "ko",
        basePath: "/ko/",
        blogsite: "https://example.com/ko",
        feed: false,
      },
    ];
    const feedTranslations = createFeedTranslations(languageConfigs);
    assert.deepStrictEqual(
      feedTranslations.map((feed) => feed.language),
      ["en"],
    );

    const enabledConfig = { ...config, feedTranslations };
    const links = new PageBase(enabledConfig).feedLinks();
    assert.match(links, /href="https:\/\/example\.com\/feed\.xml"/);
    assert.doesNotMatch(links, /\/ko\/feed\.xml/);
    const xml = renderFeed(enabledConfig, [samplePost()]);
    assert.doesNotMatch(xml, /\/ko\/feed\.xml/);
    assert.match(
      xml,
      /type="text\/html" hreflang="ko"[^>]*href="https:\/\/example\.com\/ko\/posts\//,
    );
    assert.strictEqual(
      new PageBase({ ...languageConfigs[1], feedTranslations }).feedLinks(),
      "",
    );
    assert.deepStrictEqual(
      createFeedTranslations(languageConfigs.map((c) => ({ ...c, feed: false }))),
      [],
    );
  });
});
