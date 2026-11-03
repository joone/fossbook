---
title: Fossbook 만화 소개
---

Fossbook 만화는 만화, 그림이 있는 이야기, 글을 위한 Markdown 기반 출판 도구인
[Fossbook](https://github.com/joone/fossbook)의 실제 동작을 보여 주는 데모입니다.

이 데모에 사용된 그림은 Fossbook이 처음 사용된 프로젝트인
[F/OSS Comics](https://fosscomics.com)에서 가져왔습니다.
출처를 표시한 데모용 그림으로만 사용하고 있습니다. 자신의 작품을 게시할 때는
직접 그렸거나 게시할 권한을 가진 그림을 사용하세요.

## Fossbook 사용해 보기

1. `npx fossbook init`으로 새 출판 프로젝트를 만드세요.
2. 새 프로젝트에서 `npm install`을 실행하세요.
3. `content/posts/`에 글을 작성하고, 그림은 해당 글의 `images/` 디렉터리에
   보관하세요.
4. `npm run start`로 미리 본 뒤, `npm run build`로 정적 사이트를 생성하세요.

[이 데모의 Markdown 소스](https://github.com/joone/fossbook/tree/main/content)와
[Fossbook Markdown 전체 가이드](https://github.com/joone/fossbook/blob/main/fossbook_markdown.md)를
살펴보세요.
