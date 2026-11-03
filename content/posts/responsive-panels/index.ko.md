---
title: "2화: 반응형 패널 구성하기"
date: 2026-09-10
description: "데스크톱의 격자 배치부터 모바일 화면까지 대응하는 패널 그룹으로 만화를 구성해 보세요."
tags: "Layouts, Responsive design, Comics"
draft: false
---

`panels`로 여러 장면을 묶고 데스크톱에서 표시할 열 수를 정하세요.
기본으로 제공되는 Archie 테마는 좁은 화면에서 패널을 세로로 쌓아 보여 줍니다.

::::panels columns="2" style="gap: 1rem;" label="Fossbook의 반응형 만화 장면 모음"
:::panel rounded="true"
**데스크톱:** 서로 이어지는 장면을 나란히 배치할 수 있습니다.

![만화가가 알록달록한 블록을 쌓아 하나의 구조물을 만들고 있습니다.](/images/fossbook-comic-authoring.png "패널에는 그림과 설명을 함께 담을 수 있습니다.")
:::

:::panel divider="true" rounded="true"
**모바일:** 같은 소스로 세로로 읽기 편한 흐름을 만듭니다.

![만화가가 알록달록한 블록을 쌓아 하나의 구조물을 만들고 있습니다.](/images/fossbook-comic-authoring.png "작은 화면에서도 읽기 편한 배치를 유지합니다.")

> "하나의 소스로 모든 화면에."
:::
::::

`label`은 보조 기술이 패널 그룹을 이해하도록 돕습니다.
캡션과 대화 텍스트는 그림에 직접 넣는 대신 Markdown에 그대로 보관합니다.

다음: [사이트 게시하기](../publish-to-github-pages/ "align:right").
