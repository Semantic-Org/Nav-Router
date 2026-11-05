import { Router } from 'nav-router';
import head from 'nav-router/plugins/head';
import preloadIntent from 'nav-router/plugins/preload-intent';
import viewTransitions from 'nav-router/plugins/view-transitions';

import { app } from './routes.js';

Router.extend(head);
Router.extend(viewTransitions);
Router.extend(preloadIntent);

window.app = app;
await app.start();
