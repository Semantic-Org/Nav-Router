// the app's own state as svelte runes: the routes' data() and guards read it, so a change
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

// the members are deep state, so a rename moves one name in place: the row showing it keeps its
// element and its input keeps the focus, and only what reads that name is told
export const store = $state({ user: null, members: seed, removed: [] });

export const signIn = (role) => {
  store.user = role ? { ...people[role] } : null;
};

export const renameMember = (id, name) => {
  const member = store.members.find((candidate) => candidate.id === id);
  if (member) {
    member.name = name;
  }
};

export const removeMember = (id) => {
  const gone = store.members.find((member) => member.id === id);
  if (gone) {
    store.removed.unshift({ ...gone });
    store.members = store.members.filter((member) => member.id !== id);
  }
};

export const restoreMember = () => {
  const back = store.removed.shift();
  if (back) {
    store.members.push(back);
  }
};

export const addMember = (org) => {
  const count = store.members.length + 1;
  store.members.push({ id: `new${count}`, org, name: `New Member ${count}`, role: 'Trial', access: 'member' });
};
