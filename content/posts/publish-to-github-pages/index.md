---
title: "Episode 3: Publish to GitHub Pages"
date: 2026-09-10
description: "Build a portable static site and let GitHub Actions publish it to GitHub Pages."
tags: "Publishing, GitHub Pages, Workflow"
draft: false
---

When the comic is ready, Fossbook turns its Markdown, artwork, theme assets, and
metadata into a static site.

:::panel divider="true" rounded="true"
![A cartoonist assembles colorful blocks into a larger structure.](/fossbook/images/fossbook-comic-authoring.png "size:70% Build once, then publish the generated static files.")

> “Where does the finished comic go?” \
> “Anywhere static files can be hosted.”

For this demo, GitHub Actions runs `npm ci` and `npm run build`, then publishes
the `public/` directory to GitHub Pages at
[joone.github.io/fossbook](https://joone.github.io/fossbook).
:::

## Make your own

Run `fossbook init`, add your artwork and Markdown, and use the generated
`.github/workflows/deploy.yml` as the starting point for deployment. You can
inspect every source file in this repository, adapt the included Archie theme,
and retain ownership of your work.
