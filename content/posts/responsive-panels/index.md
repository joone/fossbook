---
title: "Episode 2: Arrange responsive panels"
date: 2026-09-10
description: "Compose a comic sequence with panel groups that adapt from desktop grids to mobile screens."
tags: "Layouts, Responsive design, Comics"
draft: false
---

Use a `panels` container to build a sequence. Choose a desktop column count; the
bundled Archie theme stacks the panels on narrow screens.

::::panels columns="2" style="gap: 1rem;" label="A responsive Fossbook comic sequence"
:::panel rounded="true"
**Desktop:** related moments can sit side by side.

![A cartoonist assembles colorful blocks into a larger structure.](/images/fossbook-comic-authoring.png "A panel can hold art and narration.")
:::

:::panel divider="true" rounded="true"
**Mobile:** the same source becomes a focused vertical reading flow.

![A cartoonist assembles colorful blocks into a larger structure.](/images/fossbook-comic-authoring.png "The layout remains readable on small screens.")

> “One source, every screen.”
:::
::::

The `label` makes the group understandable to assistive technology, while
captions and transcript text stay in the Markdown rather than being baked into
an image.

Next: [publish the site](../publish-to-github-pages/ "align:right").
