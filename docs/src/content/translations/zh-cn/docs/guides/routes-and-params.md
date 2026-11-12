---
title: 路由与参数
lede: 把所有路由声明成一棵树，为路径中的动态部分指定类型，并按名称生成链接，这样路径改了链接也不会失效。
source: '55cdc7addedb'
reviewed: false
---

## 声明路由树

每条路由都有一个名称（也就是它的键）和一个路径。自身带有 `routes` 的路由是一个分区：它下面的页面切换时，它的布局和数据保持挂载。

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

:::note[子路由的路径要写完整]
子路由会重复写出父路由的路径，就像 `'/team/:org/:userId'` 这样。任何一条路由的 URL 都可以直接读出来，不必沿着树向上查找。
:::

## 为参数指定类型

路径中的 `:name` 是一个参数。在 `params` 下声明它，就可以为它指定类型、默认值或一组固定的可选值。视图拿到的永远是通过校验的值。

| 声明 | 含义 |
|---|---|
| `userId: String` | 任意字符串。 |
| `org: 'acme'` | 字符串，URL 中省略时为 `'acme'`。 |
| `tab: { default: 'overview' }` | 同上，完整写法。 |
| `tab: { allowed: ['overview', 'members'] }` | 只有这些值才能匹配该路由。 |

### 查询参数也是一样

`query` 的键用同样的方式声明。值会按其默认值的类型读取，所以 `compact: false` 传到视图里是布尔值，而不是字符串 `'false'`。

```js
member: {
  path: '/team/:org/:userId',
  query: {
    compact: false,
    section: { default: 'profile', allowed: ['profile', 'commits'] },
  },
},
```

## 三步添加一个页面

:::steps
1. **声明路由**

   给它一个名称和一个路径，以及要显示的视图。

   ```js
   settings: { path: '/team/:org/settings', view: SettingsPage },
   ```

2. **按名称链接到它**

   `href()` 负责生成 URL，所以链接就是一个普通的锚点，浏览器本来就知道怎么处理。

   ```js
   const link = `<a href="${href('settings', { org })}">Settings</a>`;
   ```

3. **在视图中读取参数**

   视图会收到匹配到的 `params` 和 `query`，并且已经转换为声明的类型。
:::

:::tip[修改路径，不用动任何链接]
链接指向的是路由名称，而不是路径。把 `'/team/:org/settings'` 改成 `'/org/:org/settings'`，所有 `href('settings')` 都会自动跟着变。
:::

## 接下来

- [布局与插槽](/guides/layouts-and-slots/)：分区会让哪些内容保持挂载。
- [加载数据](/guides/loading-data/)：每条路由的数据，以及前进和后退时会复用什么。
- [`navigate()` 参考](/api/router/#navigate)：全部选项。
