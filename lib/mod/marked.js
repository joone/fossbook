const marked = require("marked");
const hljs = require("highlight.js");

function escapeAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function matchFencedContainer(source, name) {
  const opening = new RegExp(`^(:{3,})${name}(?=[ \\t]|\\n)([^\\n]*)\\n`).exec(source);
  if (!opening) return undefined;

  const contentStart = opening[0].length;
  const closing = new RegExp(`^${opening[1]}[ \\t]*(?:\\n|$)`, "m")
    .exec(source.slice(contentStart));
  if (!closing) return undefined;

  const contentEnd = contentStart + closing.index;
  const rawEnd = contentEnd + closing[0].length;
  return {
    attributes: opening[2].trim(),
    content: source.slice(contentStart, contentEnd),
    raw: source.slice(0, rawEnd),
  };
}

const panelGroupStyleProperties = new Map([
  ["gap", "--panel-gap"],
]);

const comicPanelStyleProperties = new Map([
  ["background", "--comic-panel-background"],
  ["background-color", "--comic-panel-background-color"],
  ["border", "--comic-panel-border"],
  ["border-color", "--comic-panel-border-color"],
  ["border-radius", "--comic-panel-border-radius"],
  ["border-style", "--comic-panel-border-style"],
  ["border-width", "--comic-panel-border-width"],
  ["box-shadow", "--comic-panel-shadow"],
]);

function parseStyle(source, styleProperties, context) {
  const declarations = [];
  const properties = new Set();
  const declarationPattern = /([a-z][a-z-]*)\s*:\s*([^;]+)(?:;|$)/gy;
  let offset = 0;

  while (offset < source.length) {
    while (/\s/.test(source[offset])) offset += 1;
    if (offset === source.length) break;

    declarationPattern.lastIndex = offset;
    const match = declarationPattern.exec(source);
    if (!match) throw new Error(`Invalid ${context} style near: ${source.slice(offset)}`);

    const property = match[1];
    const value = match[2].trim();
    if (!styleProperties.has(property)) {
      throw new Error(`Unsupported ${context} style property: ${property}`);
    }
    if (properties.has(property)) {
      throw new Error(`Duplicate ${context} style property: ${property}`);
    }
    if (!value || /[{}]|url\s*\(|expression\s*\(|@import|javascript\s*:/i.test(value)) {
      throw new Error(`Invalid value for ${context} style property: ${property}`);
    }

    properties.add(property);
    declarations.push(`${styleProperties.get(property)}: ${value};`);
    offset = declarationPattern.lastIndex;
  }

  return declarations;
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
    if (!["columns", "label", "style"].includes(match[1])) {
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

  return {
    columns,
    label: attributes.label,
    style: parseStyle(attributes.style || "", panelGroupStyleProperties, "panel group"),
  };
}

function parseComicPanelAttributes(source) {
  const attributes = {};
  const attributePattern = /([a-z][a-z-]*)="([^"]*)"/gy;
  let offset = 0;

  while (offset < source.length) {
    while (source[offset] === " " || source[offset] === "\t") offset += 1;
    if (offset === source.length) break;

    attributePattern.lastIndex = offset;
    const match = attributePattern.exec(source);
    if (!match) throw new Error(`Invalid panel attribute near: ${source.slice(offset)}`);
    if (!["label", "divider", "rounded", "style"].includes(match[1])) {
      throw new Error(`Unsupported panel attribute: ${match[1]}`);
    }
    if (Object.hasOwn(attributes, match[1])) {
      throw new Error(`Duplicate panel attribute: ${match[1]}`);
    }
    attributes[match[1]] = match[2];
    offset = attributePattern.lastIndex;
  }

  if (attributes.divider !== undefined && attributes.divider !== "true") {
    throw new Error('Panel divider must be "true"');
  }
  if (attributes.rounded !== undefined && attributes.rounded !== "true") {
    throw new Error('Panel rounded must be "true"');
  }

  return {
    label: attributes.label,
    divider: attributes.divider === "true",
    rounded: attributes.rounded === "true",
    style: parseStyle(attributes.style || "", comicPanelStyleProperties, "panel"),
  };
}

const panelsExtension = {
  name: "panels",
  level: "block",
  start(source) {
    return source.match(/^:{3,}panels(?:[ \t]|$)/m)?.index;
  },
  tokenizer(source) {
    const container = matchFencedContainer(source, "panels");
    if (!container) return undefined;

    const attributes = parsePanelAttributes(container.attributes);
    const tokens = this.lexer.blockTokens(container.content);
    return {
      type: "panels",
      raw: container.raw,
      columns: attributes.columns,
      label: attributes.label,
      style: attributes.style,
      nested: tokens.some((token) => token.type === "panel"),
      tokens,
    };
  },
  renderer(token) {
    const label = token.label
      ? ` role="group" aria-label="${escapeAttribute(token.label)}"`
      : "";
    const className = [
      "panel-group",
      token.nested ? "panel-group-nested" : "",
    ].filter(Boolean).join(" ");
    const style = [`--panel-columns: ${token.columns};`, ...token.style].join(" ");
    return `<div class="${className}" style="${escapeAttribute(style)}"${label}>\n${this.parser.parse(token.tokens)}</div>\n`;
  },
};

function createComicPanelExtension(name, type) {
  return {
    name: type,
    level: "block",
    start(source) {
      return source.match(new RegExp(`^:{3,}${name}(?:[ \\t]|$)`, "m"))?.index;
    },
  tokenizer(source) {
      const container = matchFencedContainer(source, name);
      if (!container) return undefined;

      const attributes = parseComicPanelAttributes(container.attributes);

      return {
        type,
        raw: container.raw,
        label: attributes.label,
        divider: attributes.divider,
        rounded: attributes.rounded,
        style: attributes.style,
        tokens: this.lexer.blockTokens(container.content),
      };
    },
    renderer(token) {
      const label = token.label
        ? ` aria-label="${escapeAttribute(token.label)}"`
        : "";
      const style = token.style.length
        ? ` style="${escapeAttribute(token.style.join(" "))}"`
        : "";
      const className = [
        "comic-panel",
        token.divider ? "comic-panel-divider" : "",
        token.rounded ? "comic-panel-rounded" : "",
      ].filter(Boolean).join(" ");
      return `<section class="${className}"${style}${label}>\n${this.parser.parse(token.tokens)}</section>\n`;
    },
  };
}

const panelExtension = createComicPanelExtension("panel", "panel");

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
  extensions: [panelsExtension, panelExtension],
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
