---
title: "3화: GitHub Pages에 게시하기"
date: 2026-09-10
description: "어디서든 호스팅할 수 있는 정적 사이트를 만들고 GitHub Actions로 GitHub Pages에 게시합니다."
tags: "Publishing, GitHub Pages, Workflow"
draft: false
---

만화가 완성되면 Fossbook은 Markdown, 그림, 테마 파일, 메타데이터를
정적 사이트로 만듭니다.

:::panel divider="true" rounded="true"
![만화가가 알록달록한 블록을 쌓아 하나의 구조물을 만들고 있습니다.](/images/fossbook-comic-authoring.png "size:70% 한 번 빌드한 뒤, 생성된 정적 파일을 게시하세요.")

> "완성된 만화는 어디에 올리죠?" \
> "정적 파일을 호스팅할 수 있는 곳이면 어디든요."

이 데모에서는 GitHub Actions가 `npm ci`와 `npm run build`를 실행한 뒤,
`public/` 디렉터리를 GitHub Pages의
[joone.github.io/fossbook](https://joone.github.io/fossbook)에 게시합니다.
:::

## 나만의 사이트 만들기

`fossbook init`을 실행하고 그림과 Markdown을 추가하세요. 생성된
`.github/workflows/deploy.yml`을 배포 설정의 출발점으로 사용할 수 있습니다.
이 저장소의 모든 소스 파일을 살펴보고, 포함된 Archie 테마를 수정하면서
작품의 소유권도 그대로 유지할 수 있습니다.
