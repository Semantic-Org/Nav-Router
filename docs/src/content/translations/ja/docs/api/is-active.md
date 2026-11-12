---
title: isActive()
lede: ルートが現在のページのパス上にあるかどうかを返します。セクションは配下のどのページを表示している間もアクティブなままなので、メニューで現在地を示すのにそのまま使えます。
source: '9378bba88fd6'
reviewed: false
---

## シグネチャ

```js signature
isActive(target, args?): boolean
```

<p class="entry-label">引数</p>

```params
- name: target
  type: string | Route
  required: true
  description: ルート名、または `Route`。セクションの名前はセクション全体を指し、そのインデックスページを指すわけではありません。
- name: args
  type: object
  default: 'null'
  description: ページがあわせて満たすべきパラメーターとクエリー。渡したキーだけが比較されます。
```

<p class="entry-label">返値</p>

```returns
type: boolean
description: 'ルートがコミット済みのページのパス上にあり、`args` のすべてのキーが一致するときに `true`。'
```

## `isCurrent()` との違い

`isCurrent()` は、ルートがページそのものかどうかを調べます。`/team/acme/members` を表示している場合は次のようになります。

:::truth
| 呼び出し | `isActive` | `isCurrent` |
|---|---|---|
| `('team')` | true | false |
| `('members')` | true | true |
| `('team', { org: 'acme' })` | true | false |
| `('team', { org: 'globex' })` | false | false |
| `('settings')` | false | false |
:::

## 現在のリンクを示す

結果をもとに `aria-current` を設定します。こうするとアクティブな状態が支援技術に伝わり、CSS からスタイルを当てることもできます。

```js for="core vue svelte semantic" label="nav.js"
import { href, isActive } from 'nav-router';

const link = (name, label) => `
  <a href="${href(name)}" ${isActive(name) ? 'aria-current="page"' : ''}>
    ${label}
  </a>`;
```

```jsx for="react preact" label="Nav.jsx"
import { href, isActive } from 'nav-router';

const NavLink = ({ name, children }) => (
  <a
    href={href(name)}
    aria-current={isActive(name) ? 'page' : undefined}
  >
    {children}
  </a>
);
```

```tsx for="solid" label="Nav.tsx"
import { href, isActive } from 'nav-router';

const NavLink = (props) => (
  <a
    href={href(props.name)}
    aria-current={isActive(props.name) ? 'page' : undefined}
  >
    {props.children}
  </a>
);
```

:::note[参照するのはコミット済みのページ]
まだコミットされていないナビゲーションの途中では、`isActive()` は画面に表示されているページについて答えます。これから開くリンクを強調したい場合は、`router.pending` を参照してください。
:::

## 関連項目

- [`isCurrent()`](/api/is-current/): セクションではなく、ページそのものかどうか。
- [`canAccess()`](/api/can-access/): ユーザーがルートを開けるかどうか。リンクを隠すときに使います。
- [`href()`](/api/router/#href): ルートの URL。
