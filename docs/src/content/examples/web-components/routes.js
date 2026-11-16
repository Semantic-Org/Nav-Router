import './elements.js';

const PEOPLE = {
  ada: { name: 'Ada Park', role: 'Systems lead', handle: 'ada' },
  mo: { name: 'Mo Reyes', role: 'Design engineer', handle: 'mo' },
};

export const routes = {
  name: 'home',
  layout: () => '<team-shell></team-shell>',
  index: {
    path: '/',
    view: () => '<h1>Team</h1><p>Pick someone above. The header lives inside an open shadow root.</p>',
  },
  routes: {
    member: {
      path: '/people/:userId',
      data: ({ params }) => ({ member: PEOPLE[params.userId] }),
      view({ data }) {
        const card = document.createElement('member-card');
        card.member = data.member;
        return card;
      },
      slots: {
        role: ({ data }) => `<span>${data.member.role}</span>`,
      },
    },
  },
};
