---
title: المسارات والمعاملات
lede: عرّف مساراتك في شجرة واحدة، وحدّد نوعًا للأجزاء المتغيرة من مسار العنوان، واربط بالاسم كي يتغير مسار العنوان دون أن ينكسر أي رابط.
source: '55cdc7addedb'
reviewed: false
---

## تعريف الشجرة

لكل مسار اسم هو مفتاحه، ومسار عنوان. والمسار الذي له `routes` خاصة به قسم: يبقى تخطيطه وبياناته مركَّبين بينما تتبدل الصفحات تحته.

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

:::note[مسارات عناوين الأبناء تُكتب كاملة]
يكرر المسار الابن مسار عنوان أبيه، كما في `'/team/:org/:userId'`. بذلك تقرأ عنوان URL لأي مسار دون أن تصعد في الشجرة.
:::

## تحديد أنواع المعاملات

كل `:name` في مسار العنوان معامل. عرّفه تحت `params` لتحدد له نوعًا أو قيمة افتراضية أو مجموعة ثابتة من القيم. ولا تصل إلى واجهاتك إلا القيم التي اجتازت الفحص.

| التعريف | المعنى |
|---|---|
| `userId: String` | أي سلسلة نصية. |
| `org: 'acme'` | سلسلة نصية، قيمتها `'acme'` إذا خلا منها العنوان. |
| `tab: { default: 'overview' }` | المعنى نفسه، مكتوبًا بصيغته الكاملة. |
| `tab: { allowed: ['overview', 'members'] }` | لا يطابق المسار إلا هذه القيم. |

### الاستعلام يعمل بالطريقة نفسها

عرّف مفاتيح `query` بالطريقة نفسها. تُقرأ كل قيمة بنوع قيمتها الافتراضية، فتصل `compact: false` إلى واجهتك قيمة منطقية، لا السلسلة النصية `'false'`.

```js
member: {
  path: '/team/:org/:userId',
  query: {
    compact: false,
    section: { default: 'profile', allowed: ['profile', 'commits'] },
  },
},
```

## إضافة صفحة في ثلاث خطوات

:::steps
1. **عرّف المسار**

   حدّد له اسمًا ومسار عنوان، والواجهة التي يعرضها.

   ```js
   settings: { path: '/team/:org/settings', view: SettingsPage },
   ```

2. **أنشئ رابطًا إليه بالاسم**

   تبني `href()` عنوان URL، فيكون الرابط عنصر ربط عاديًا يعرف المتصفح أصلًا كيف يتبعه.

   ```js
   const link = `<a href="${href('settings', { org })}">Settings</a>`;
   ```

3. **اقرأ معاملاته في الواجهة**

   تتلقى الواجهة `params` و`query` المطابقة، وقد حُددت أنواعها.
:::

:::tip[غيّر مسار العنوان دون أن تمس أي رابط]
الروابط تسمّي المسار لا مسار عنوانه. غيّر `'/team/:org/settings'` إلى `'/org/:org/settings'` فتتبعه كل استدعاءات `href('settings')`.
:::

## التالي

- [التخطيطات والفتحات](/guides/layouts-and-slots/): ما يُبقيه القسم مركَّبًا.
- [تحميل البيانات](/guides/loading-data/): بيانات كل مسار، وما يُعاد استخدامه عند الرجوع والتقدم.
- [مرجع `navigate()`](/api/router/#navigate): كل الخيارات.
