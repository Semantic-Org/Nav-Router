---
title: ルートとパラメーター
lede: ルートを 1 本のツリーとして宣言し、パスの動的な部分に型を付け、名前でリンクします。こうしておけば、パスを変更してもリンクは壊れません。
source: '55cdc7addedb'
reviewed: false
---

## ツリーを宣言する

各ルートには、名前（オブジェクトのキー）とパスがあります。自身の `routes` を持つルートはセクションです。配下のページが切り替わっても、セクションのレイアウトとデータはマウントされたままになります。

```js for="core vue svelte semantic" label="routes.js" {10}
import { router } from 'nav-router';

export const app = router({
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        member: { path: '/team/:org/:userId', view: MemberPage },
      },
    },
  },
});
```

```jsx for="react preact" label="routes.jsx" {10}
import { router } from '@nav-router/react';

export const app = router({
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        member: { path: '/team/:org/:userId', view: MemberPage },
      },
    },
  },
});
```

```tsx for="solid" label="routes.tsx" {10}
import { router } from '@nav-router/solid';

export const app = router({
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        member: { path: '/team/:org/:userId', view: MemberPage },
      },
    },
  },
});
```

:::note[子ルートのパスは省略せずに書く]
子ルートは、`'/team/:org/:userId'` のように親のパスを繰り返して書きます。そのため、ツリーをさかのぼらなくても、どのルートの URL もその場で読み取れます。
:::

## パラメーターに型を付ける

パス中の `:name` はパラメーターです。`params` に宣言すると、型、既定値、または取りうる値の集合を指定できます。ビューに届くのは、検証を通過した値だけです。

| 宣言 | 意味 |
|---|---|
| `userId: String` | 任意の文字列。 |
| `org: 'acme'` | 文字列。URL で省略された場合は `'acme'`。 |
| `tab: { default: 'overview' }` | 上と同じ指定を、省略せずに書いた形。 |
| `tab: { allowed: ['overview', 'members'] }` | これらの値のときだけルートにマッチします。 |

### クエリーも同じように宣言する

`query` のキーも同じ方法で宣言します。値は既定値の型として読み取られるので、`compact: false` は文字列の `'false'` ではなく、真偽値としてビューに届きます。

```js
member: {
  path: '/team/:org/:userId',
  query: {
    compact: false,
    section: { default: 'profile', allowed: ['profile', 'commits'] },
  },
},
```

## 3 ステップでページを追加する

:::steps
1. **ルートを宣言する**

   名前とパス、そして表示するビューを指定します。

   ```js
   settings: { path: '/team/:org/settings', view: SettingsPage },
   ```

2. **名前でリンクする**

   `href()` が URL を組み立てるので、リンクはブラウザーがそのままたどれる普通のアンカーになります。

   ```js
   const link = `<a href="${href('settings', { org })}">Settings</a>`;
   ```

3. **ビューでパラメーターを読み取る**

   ビューは、マッチした `params` と `query` を型が付いた状態で受け取ります。
:::

:::tip[リンクに触れずにパスを変更する]
リンクが指しているのはパスではなく、ルートの名前です。`'/team/:org/settings'` を `'/org/:org/settings'` に変更すれば、すべての `href('settings')` がそれに追従します。
:::

## 次のステップ

- [レイアウトとスロット](/guides/layouts-and-slots/): セクションが何をマウントしたままにするか。
- [データの読み込み](/guides/loading-data/): ルートごとのデータと、戻る・進むで再利用されるもの。
- [`navigate()` リファレンス](/api/router/#navigate): すべてのオプション。
