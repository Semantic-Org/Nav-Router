import '@nav-router/plugins/head';
import '@nav-router/plugins/preload-intent';
import '@nav-router/plugins/view-transitions';

import { app } from './routes.js';

window.app = app;
await app.start();
