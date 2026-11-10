import { createSignal } from '@nav-router/react';

// the app's own state as the integration's signals: the routes' data() and guards read them, so a
// change reaches the page through the router's reactive seams rather than through a reload, and a
// component reads one through useLive
export const orgs = {
  acme: { name: 'Acme Corporation', region: 'us-east' },
  globex: { name: 'Globex', region: 'eu-west' },
};

const seed = [
  { id: 'ada', org: 'acme', name: 'Ada Lovelace', role: 'Engineer', access: 'admin' },
  { id: 'grace', org: 'acme', name: 'Grace Hopper', role: 'Compiler Lead', access: 'member' },
  { id: 'linus', org: 'acme', name: 'Linus Torvalds', role: 'Kernel', access: 'member' },
  { id: 'margaret', org: 'globex', name: 'Margaret Hamilton', role: 'Flight Software', access: 'admin' },
  { id: 'ken', org: 'globex', name: 'Ken Thompson', role: 'Unix', access: 'member' },
];

const people = {
  member: { id: 'bob', name: 'Bob Chen', role: 'member' },
  admin: { id: 'alice', name: 'Alice Rivera', role: 'admin' },
};

export const user = createSignal(null);
const team = createSignal(seed);
export const members = () => team.get();
export const removed = createSignal([]);

export const signIn = (role) => user.set(role ? { ...people[role] } : null);

// a rename is a new list with one new member, and react's diff keeps every row's element, so the
// input being typed in keeps the focus
export const renameMember = (id, name) =>
  team.set(members().map((member) => (member.id === id ? { ...member, name } : member)));

export const removeMember = (id) => {
  const gone = members().find((member) => member.id === id);
  if (gone) {
    removed.set([gone, ...removed.get()]);
    team.set(members().filter((member) => member.id !== id));
  }
};

export const restoreMember = () => {
  const [back, ...rest] = removed.get();
  if (back) {
    removed.set(rest);
    team.set([...members(), back]);
  }
};

export const addMember = (org) => {
  const count = members().length + 1;
  team.set([...members(), { id: `new${count}`, org, name: `New Member ${count}`, role: 'Trial', access: 'member' }]);
};
