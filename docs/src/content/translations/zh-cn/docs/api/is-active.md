---
title: isActive()
lede: 判断某条路由是否在当前页面的路径上。只要分区下有任意页面正在显示，该分区就保持激活，菜单标记当前位置时需要的正是这一点。
source: '9378bba88fd6'
reviewed: false
---

## 签名

```js signature
isActive(target, args?): boolean
```

<p class="entry-label">参数</p>

```params
- name: target
  type: string | Route
  required: true
  description: 路由名称或 `Route`。分区的名称指的是分区本身，而不是它的索引页。
- name: args
  type: object
  default: 'null'
  description: 页面还必须具备的路径参数和查询参数。只比较你传入的键。
```

<p class="entry-label">返回值</p>

```returns
type: boolean
description: '当该路由位于已提交页面的路径上，且 `args` 中的每个键都匹配时，返回 `true`。'
```

## 与 `isCurrent()` 的比较

`isCurrent()` 判断的是某条路由是否就是当前页面本身。以 `/team/acme/members` 为例：

:::truth
| 调用 | `isActive` | `isCurrent` |
|---|---|---|
| `('team')` | true | false |
| `('members')` | true | true |
| `('team', { org: 'acme' })` | true | false |
| `('team', { org: 'globex' })` | false | false |
| `('settings')` | false | false |
:::

## 标记当前链接

用它来设置 `aria-current`，这样激活状态会被辅助技术播报，也可以直接用 CSS 设置样式。

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

:::note[它读取的是已提交的页面]
在一次尚未提交的导航过程中，`isActive()` 仍然按屏幕上的页面作答。如果要高亮正在打开的链接，请读取 `router.pending`。
:::

## 相关内容

- [`isCurrent()`](/api/is-active/#iscurrent)：页面本身，不包括它所在的分区。
- [`canAccess()`](/api/can-access/)：用户是否有权打开某条路由，可用于隐藏链接。
- [`href()`](/api/router/#href)：某条路由对应的 URL。
