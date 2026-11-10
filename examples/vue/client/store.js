import { ref, shallowRef } from 'vue';

// the app's own state as vue refs: the routes' data() and guards read them, so a change reaches
// the page through the router's reactive seams rather than through a reload
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

export const user = shallowRef(null);
// the members are a deep ref, so a rename moves one name in place: the row showing it keeps its
// element and its input keeps the focus, and only what reads that name is told
export const members = ref(seed);
export const removed = shallowRef([]);

export const signIn = (role) => {
  user.value = role ? { ...people[role] } : null;
};

export const renameMember = (id, name) => {
  const member = members.value.find((candidate) => candidate.id === id);
  if (member) {
    member.name = name;
  }
};

export const removeMember = (id) => {
  const gone = members.value.find((member) => member.id === id);
  if (gone) {
    removed.value = [{ ...gone }, ...removed.value];
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
