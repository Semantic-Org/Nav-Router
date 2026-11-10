import '@nav-router/plugins/head';
import '@nav-router/plugins/preload-intent';
import '@nav-router/plugins/view-transitions';

import { createApp } from 'vue';

import { app } from './routes.js';

// an app that mounts nothing of its own: what it installs and provides reaches every view
createApp({}).use(app).provide('brand', 'Acme Console');

window.app = app;
await app.start();
