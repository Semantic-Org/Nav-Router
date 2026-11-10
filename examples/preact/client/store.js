import { navigate, reload } from '@nav-router/preact';

// the app's own state, plain: the routes' data() and guards read it when they run. a write is
// followed by reload(), which runs them again and leaves the scroll and the focus where they were
export const orgs = {
  acme: { name: 'Acme Corporation', region: 'us-east' },
  globex: { name: 'Globex', region: 'eu-west' },
};

const people = {
  member: { id: 'bob', name: 'Bob Chen', role: 'member' },
  admin: { id: 'alice', name: 'Alice Rivera', role: 'admin' },
};

export const store = {
  user: null,
  members: [
    { id: 'ada', org: 'acme', name: 'Ada Lovelace', role: 'Engineer', access: 'admin' },
    { id: 'grace', org: 'acme', name: 'Grace Hopper', role: 'Compiler Lead', access: 'member' },
    { id: 'linus', org: 'acme', name: 'Linus Torvalds', role: 'Kernel', access: 'member' },
    { id: 'margaret', org: 'globex', name: 'Margaret Hamilton', role: 'Flight Software', access: 'admin' },
    { id: 'ken', org: 'globex', name: 'Ken Thompson', role: 'Unix', access: 'member' },
  ],
  removed: [],
};

// signed in on the way somewhere, the navigation reads the new user itself
export const signIn = (role, returnTo) => {
  store.user = role ? { ...people[role] } : null;
  return returnTo ? navigate(returnTo) : reload();
};

export const renameMember = (id, name) => {
  store.members = store.members.map((member) => (member.id === id ? { ...member, name } : member));
  return reload();
};

export const removeMember = (id) => {
  const gone = store.members.find((member) => member.id === id);
  if (gone) {
    store.removed = [gone, ...store.removed];
    store.members = store.members.filter((member) => member.id !== id);
  }
  return reload();
};

export const restoreMember = () => {
  const [back, ...rest] = store.removed;
  if (back) {
    store.removed = rest;
    store.members = [...store.members, back];
  }
  return reload();
};

export const addMember = (org) => {
  const count = store.members.length + store.removed.length + 1;
  store.members = [
    ...store.members,
    { id: `new${count}`, org, name: `New Member ${count}`, role: 'Trial', access: 'member' },
  ];
  return reload();
};
