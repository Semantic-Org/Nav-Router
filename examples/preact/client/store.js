import { signal } from '@preact/signals';

// the app's own state as preact signals: the routes' data() and guards read them, so a change
// reaches the page through the router's reactive seams rather than through a reload
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

export const user = signal(null);
// a rename writes a new list with one new member in it. the views that read the list render
// again and preact's diff keeps every row by its key, so the input being typed in keeps the focus
export const members = signal(seed);
export const removed = signal([]);

export const signIn = (role) => {
  user.value = role ? { ...people[role] } : null;
};

export const renameMember = (id, name) => {
  members.value = members.value.map((member) => (member.id === id ? { ...member, name } : member));
};

export const removeMember = (id) => {
  const gone = members.value.find((member) => member.id === id);
  if (gone) {
    removed.value = [gone, ...removed.value];
    members.value = members.value.filter((member) => member.id !== id);
  }
};

export const restoreMember = () => {
  const [back, ...rest] = removed.value;
  if (back) {
    removed.value = rest;
    members.value = [...members.value, back];
  }
};

export const addMember = (org) => {
  const count = members.value.length + 1;
  members.value = [
    ...members.value,
    { id: `new${count}`, org, name: `New Member ${count}`, role: 'Trial', access: 'member' },
  ];
};
