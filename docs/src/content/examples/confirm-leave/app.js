/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import '@nav-router/plugins/confirm-leave';
import { navigate, router } from 'nav-router';

import { note, routes } from './routes.js';

const dialog = document.querySelector('#confirm');
const confirm = (message) =>
  new Promise((resolve) => {
    dialog.returnValue = '';
    dialog.querySelector('p').textContent = message;
    dialog.onclose = () => resolve(dialog.returnValue === 'leave');
    dialog.showModal();
  });

await router({ mount: '#app', confirm, ...routes }).start();

document.addEventListener('input', (e) => {
  if (e.target.id !== 'draft') { return; }
  note.draft = e.target.value;
  document.querySelector('#dirty').textContent = note.draft === note.saved ? 'Saved' : 'Unsaved changes';
});

document.addEventListener('click', (e) => {
  const choice = e.target.closest('[data-choice]');
  if (choice) { dialog.close(choice.dataset.choice); }
  if (e.target.closest('[data-save]')) {
    note.saved = note.draft;
    navigate('home');
  }
});
