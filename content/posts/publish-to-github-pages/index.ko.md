---
title: "3화: GitHub Pages에 출판하기"
date: 2026-09-10
description: "어디서나 사용할 수 있는 정적 사이트를 빌드하고 GitHub Actions로 GitHub Pages에 게시하세요."
tags: "출판, GitHub Pages, 워크플로"
draft: false
---

만화가 준비되면 Fossbook이 마크다운, 그림, 테마 자산, 메타데이터를
정적 사이트로 변환합니다.

:::panel divider="true" rounded="true"
![만화가가 알록달록한 블록을 조립해 더 큰 구조물을 만듭니다.](/images/fossbook-comic-authoring.png "size:70% 한 번 빌드한 다음 생성된 정적 파일을 게시하세요.")

> “완성된 만화는 어디에 올리나요?” \
> “정적 파일을 호스팅할 수 있는 곳이라면 어디든 좋아요.”

이 데모에서는 GitHub Actions가 `npm ci`와 `npm run build`를 실행한 다음
`public/` 디렉터리를
[joone.github.io/fossbook](https://joone.github.io/fossbook)의
GitHub Pages에 게시합니다.
:::

## 나만의 작품 만들기

`fossbook init`을 실행하고 그림과 마크다운을 추가한 뒤, 생성된
`.github/workflows/deploy.yml`을 배포의 출발점으로 사용하세요. 이 저장소의
모든 소스 파일을 살펴보고, 포함된 Archie 테마를 수정하며, 자신의 작품에
대한 권리를 계속 보유할 수 있습니다.
