# Custom Markdown

Fossbook supports GitHub Flavored Markdown through
[`marked`](https://marked.js.org/) and adds a few extensions for images,
comics, links, diagrams, and code blocks.

## Images

Use normal Markdown image syntax. Images are centered by default:

```markdown
![A description of the image](images/panel.png)
```

The text in square brackets becomes the image's alternative text. Paths to
post images are relative to the Markdown file and normally point into the
post's `images/` directory.

### Captions

Add a Markdown image title to display a caption:

```markdown
![A description of the image](images/panel.png "A visible caption")
```

### Size

Add `size:<percentage>` to the image title to set its width:

```markdown
![A description of the image](images/panel.png "size:60%")
```

Only integer percentages are supported. The image remains responsive and
will not grow beyond its content area.

### Alignment

Add `align:left`, `align:center`, or `align:right` to the image title:

```markdown
![Left-aligned image](images/panel.png "align:left")
![Centered image](images/panel.png "align:center")
![Right-aligned image](images/panel.png "align:right")
```

Combine size, alignment, and a caption in the same title:

```markdown
![A description of the image](images/panel.png "size:60% align:right A visible caption")
```

Directives are lowercase and must not contain a space after the colon. After
Fossbook removes the directives, any remaining title text becomes the
caption.

## Comic Dialogue

Place a blockquote immediately after an image to associate the text with that
image as comic dialogue:

```markdown
![Two characters talking](images/panel.png "size:60%")
> First line of dialogue. \
> Second line of dialogue.
```

For multiline dialogue, end each line except the last with a backslash (`\`)
to insert a visible line break. Without it, Markdown treats consecutive lines
as part of the same paragraph and the browser displays them as flowing text.

The bundled Archie theme keeps the dialogue width synchronized with a sized
image and displays a transcript visibility control on posts that contain this
pattern. A blank line between the image and blockquote is allowed. Intervening
prose breaks the association, leaving the blockquote as an ordinary quotation.

## Aligned Links

Links accept the same alignment directive in their optional title:

```markdown
[Previous chapter](previous/ "align:left")
[Contents](../ "align:center")
[Next chapter](next/ "align:right")
```

Without an `align:` directive, a link remains inline with its surrounding
text. With a directive, Fossbook places it in a block aligned to the selected
side.

## Mermaid Diagrams

Use a fenced code block tagged `mermaid`:

````markdown
```mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice
```
````

Fossbook emits a Mermaid container and loads the Mermaid browser module only
on pages that contain a diagram. Rendering therefore requires network access
to the configured CDN when the page is first loaded.

## Highlighted Code

Fenced code blocks are highlighted with highlight.js. Add a language name
after the opening fence for explicit highlighting:

````markdown
```javascript
const greeting = "Hello";
console.log(greeting);
```
````

When the language is omitted or unknown, Fossbook uses automatic language
detection.