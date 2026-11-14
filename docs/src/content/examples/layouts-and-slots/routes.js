import { href } from 'nav-router';

const PEOPLE = {
  ada: { name: 'Ada Park', role: 'Systems lead' },
  mo: { name: 'Mo Reyes', role: 'Design engineer' },
};

const AppLayout = () => `
  <header>
    <a href="${href('home')}" data-current="home">Home</a>
    <a href="${href('team')}" data-active="team">Team</a>
    <input placeholder="Type a note, then navigate…">
  </header>
  <div class="shell">
    <section><slot></slot></section>
    <aside><slot name="aside"><p class="muted">No member open.</p></slot></aside>
  </div>`;

const TeamLayout = () => `
  <nav>
    <a href="${href('team')}" data-current="team">Overview</a>
    <a href="${href('member', { userId: 'ada' })}" data-current="member" data-user="ada">Ada</a>
    <a href="${href('member', { userId: 'mo' })}" data-current="member" data-user="mo">Mo</a>
  </nav>
  <slot></slot>`;

export const routes = {
  name: 'home',
  layout: AppLayout,
  index: {
    path: '/',
    view: () => '<h1>Home</h1><p>Open Team to mount a second layout inside this one.</p>',
  },
  routes: {
    team: {
      path: '/team',
      layout: TeamLayout,
      index: {
        view: () => '<h1>Team</h1><p>Pick Ada or Mo to fill the aside slot in the outer layout.</p>',
      },
      routes: {
        member: {
          path: '/team/:userId',
          view: ({ params }) => `<h1>${PEOPLE[params.userId].name}</h1><p>Member profile.</p>`,
          slots: {
            aside: ({ params }) => `<p><strong>Role</strong><br>${PEOPLE[params.userId].role}</p>`,
          },
        },
      },
    },
  },
};
