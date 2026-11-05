import { Router } from 'nav-router';
import dom from 'nav-router/plugins/dom';
import head from 'nav-router/plugins/head';
import preloadIntent from 'nav-router/plugins/preload-intent';
import viewTransitions from 'nav-router/plugins/view-transitions';

import { app } from './routes.js';
import { setPage } from './store.js';

Router.extend(dom, { mount: '#app' });
Router.extend(head);
Router.extend(viewTransitions);
Router.extend(preloadIntent);

// the router's own reads are plain and announced; one signal set as it announces is what the
// chrome reads for the breadcrumbs and the current link
app.subscribe(() => setPage(app.page));

window.app = app;
await app.start();
setPage(app.page);
