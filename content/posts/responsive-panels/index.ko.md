---
title: "2화: 반응형 패널 배치하기"
date: 2026-09-10
description: "데스크톱 그리드부터 모바일 화면까지 적응하는 패널 그룹으로 만화 장면을 구성하세요."
tags: "레이아웃, 반응형 디자인, 만화"
draft: false
---

`panels` 컨테이너로 장면의 흐름을 만드세요. 데스크톱 열 수를 선택하면
기본 Archie 테마가 좁은 화면에서 패널을 세로로 쌓습니다.

::::panels columns="2" style="gap: 1rem;" label="반응형 Fossbook 만화 장면"
:::panel rounded="true"
**데스크톱:** 서로 연관된 장면을 나란히 배치할 수 있습니다.

![만화가가 알록달록한 블록을 조립해 더 큰 구조물을 만듭니다.](/images/fossbook-comic-authoring.png "패널에는 그림과 내레이션을 담을 수 있습니다.")
:::

:::panel divider="true" rounded="true"
**모바일:** 같은 소스가 읽기 편한 세로 흐름으로 바뀝니다.

![만화가가 알록달록한 블록을 조립해 더 큰 구조물을 만듭니다.](/images/fossbook-comic-authoring.png "작은 화면에서도 읽기 쉬운 레이아웃을 유지합니다.")

> “하나의 소스로 모든 화면에서.”
:::
::::

`label`은 보조 기술이 그룹을 이해할 수 있게 하며, 캡션과 대화 내용은
이미지에 포함되지 않고 마크다운에 남습니다.

다음: [사이트 출판하기](../publish-to-github-pages/ "align:right").
