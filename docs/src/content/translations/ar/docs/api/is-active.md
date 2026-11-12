---
title: isActive()
lede: تخبرك هل يقع المسار ضمن سلسلة مسارات الصفحة الحالية. يبقى القسم نشطًا ما دامت أي صفحة تحته معروضة، وهذا ما تحتاجه القائمة لتُعلِّم موضعك.
source: '9378bba88fd6'
reviewed: false
---

## التوقيع

```js signature
isActive(target, args?): boolean
```

<p class="entry-label">المعاملات</p>

```params
- name: target
  type: string | Route
  required: true
  description: اسم مسار أو كائن `Route`. اسم القسم يعني القسم نفسه، لا صفحة فهرسه.
- name: args
  type: object
  default: 'null'
  description: المعاملات وقيم الاستعلام التي يجب أن تحملها الصفحة أيضًا. لا تُقارَن إلا المفاتيح التي تمررها.
```

<p class="entry-label">القيمة المعادة</p>

```returns
type: boolean
description: 'تعيد `true` حين يقع المسار ضمن سلسلة مسارات الصفحة المعتمدة ويطابق كل مفتاح في `args`.'
```

## مقارنة مع `isCurrent()`

تسأل `isCurrent()` هل المسار هو الصفحة نفسها. في الصفحة `/team/acme/members`:

:::truth
| الاستدعاء | `isActive` | `isCurrent` |
|---|---|---|
| `('team')` | true | false |
| `('members')` | true | true |
| `('team', { org: 'acme' })` | true | false |
| `('team', { org: 'globex' })` | false | false |
| `('settings')` | false | false |
:::

## تعليم الرابط الحالي

اضبط `aria-current` بناءً عليها، فتُعلَن الحالة النشطة لقارئات الشاشة وتستطيع تنسيقها من CSS مباشرة.

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

:::note[تقرأ الصفحة المعتمدة]
أثناء تنقّل لم يُعتمد بعد، تظل `isActive()` تجيب عن الصفحة المعروضة على الشاشة. ولإضاءة الرابط الذي يُفتح الآن، اقرأ `router.pending`.
:::

## صفحات ذات صلة

- [`isCurrent()`](/api/is-current/): الصفحة نفسها، لا أقسامها.
- [`canAccess()`](/api/can-access/): هل يحق للمستخدم فتح المسار، لإخفاء الروابط.
- [`href()`](/api/router/#href): عنوان URL لمسار ما.
