const marked = require("marked");
const hljs = require("highlight.js");

function escapeAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parsePanelAttributes(source) {
  const attributes = {};
  const attributePattern = /([a-z][a-z-]*)="([^"]*)"/gy;
  let offset = 0;

  while (offset < source.length) {
    while (source[offset] === " " || source[offset] === "\t") offset += 1;
    if (offset === source.length) break;

    attributePattern.lastIndex = offset;
    const match = attributePattern.exec(source);
    if (!match) throw new Error(`Invalid panels attribute near: ${source.slice(offset)}`);
    if (match[1] !== "columns" && match[1] !== "label") {
      throw new Error(`Unsupported panels attribute: ${match[1]}`);
    }
    if (Object.hasOwn(attributes, match[1])) {
      throw new Error(`Duplicate panels attribute: ${match[1]}`);
    }
    attributes[match[1]] = match[2];
    offset = attributePattern.lastIndex;
  }

  const columns = attributes.columns === undefined ? 2 : Number(attributes.columns);
  if (!Number.isInteger(columns) || columns < 1 || columns > 6) {
    throw new Error("Panel columns must be an integer from 1 to 6");
  }

  return { columns, label: attributes.label };
}

const panelsExtension = {
  name: "panels",
  level: "block",
  start(source) {
    return source.match(/^:::panels(?:[ \t]|$)/m)?.index;
  },
  tokenizer(source) {
    const match = /^:::panels([^\n]*)\n([\s\S]*?)\n:::(?:\n|$)/.exec(source);
    if (!match) return undefined;

    const attributes = parsePanelAttributes(match[1].trim());
    return {
      type: "panels",
      raw: match[0],
      columns: attributes.columns,
      label: attributes.label,
      tokens: this.lexer.blockTokens(match[2]),
    };
  },
  renderer(token) {
    const label = token.label
      ? ` role="group" aria-label="${escapeAttribute(token.label)}"`
      : "";
    return `<div class="panel-group" style="--panel-columns: ${token.columns};"${label}>\n${this.parser.parse(token.tokens)}</div>\n`;
  },
};

marked.setOptions({
  renderer: new marked.Renderer(),
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

// Override function
const renderer = {
  code(code, infostring) {
    // marked >=15 passes a token object; older versions pass positional args.
    let text = code;
    let lang = infostring;
    if (code && typeof code === "object") {
      text = code.text;
      lang = code.lang;
    }
    const language = (lang || "").trim().split(/\s+/)[0];
    // Emit mermaid fenced blocks as <pre class="mermaid"> so the mermaid
    // client script can render them as diagrams instead of code.
    if (language === "mermaid") {
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre class="mermaid">${escaped}</pre>`;
    }
    // Syntax-highlight every other fenced block with highlight.js so the
    // theme (styles/highlights.css) can color the tokens.
    const valid = language && hljs.getLanguage(language);
    const { value } = valid
      ? hljs.highlight(text, { language })
      : hljs.highlightAuto(text);
    const cls = valid ? ` language-${language}` : "";
    return `<pre><code class="hljs${cls}">${value}</code></pre>`;
  },
  image(href, title, text) {
    let size = null;
    // Check if the title contains a size specification
    if (title && title.includes("size:")) {
      const sizeMatch = title.match(/size:(\d+%)/);
      if (sizeMatch && sizeMatch[1]) {
        size = sizeMatch[1];
        // Remove the size specification from the title
        title = title.replace(/size:\d+%/g, "").trim();
      }
    }
    let align = "center";
    if (title && title.includes("align:")) {
      // align: left, right, center
      const alignMatch = title.match(/align:(left|right|center)/);
      if (alignMatch && alignMatch[1]) {
        align = alignMatch[1];
        // Remove the alignment specification from the title
        title = title.replace(/align:(left|right|center)/g, "").trim();
      }
    }

    // Construct the image tag with optional size and title
    let imageTag = `<img src="${href}" alt="${text}"`;
    if (size) {
      imageTag += ` class="sized-image" style="width: ${size};"`;
    }
    imageTag += ">";

    return `
        <div class="image-container" style="text-align: ${align};">
          <figure style="text-align: ${align};">
            ${imageTag}
            ${title ? `<figcaption>${title}</figcaption>` : ""}
          </figure>
        </div>
      `;
  },
  link(href, title, text) {
    let align = null;
    if (title && title.includes("align:")) {
      // align: left, right, center
      const alignMatch = title.match(/align:(left|right|center)/);
      if (alignMatch && alignMatch[1]) {
        align = alignMatch[1];
        // Remove the alignment specification from the title
        title = title.replace(/align:(left|right|center)/g, "").trim();
      }
    }
    // if align is not null, add div with text-align style
    if (align) {
      return `
          <div style="text-align: ${align};">
            <a href="${href} "${title ? `title="${title}"` : ""}>${text}</a>
          </div>`;
    } else {
      return `<a href="${href} "${title ? `title="${title}"` : ""}>${text}</a>`;
    }
  },
  blockquote(quote) {
    return `<div class="blockquote-container"><blockquote>${quote}</blockquote></div>`;
  },
  paragraph(text) {
    // remove <p> surrounding the image
    if (text.includes('<figure style="text-align: center;">')) {
      return text;
    } else {
      return `<p>${text}</p>`;
    }
  },
};

marked.use({
  extensions: [panelsExtension],
  renderer,
  hooks: {
    postprocess(html) {
      return html.replace(
        /(<div class="image-container"[^>]*>[\s\S]*?<\/div>\s*)<div class="blockquote-container">/g,
        '$1<div class="blockquote-container image-dialogue">',
      );
    },
  },
});

module.exports = marked;
