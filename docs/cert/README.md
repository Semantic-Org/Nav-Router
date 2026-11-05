# Local-dev SSL certs

`npm run dev` serves `https://local.navrouter.dev` on :443 when the cert is here: one dev site up at
a time, always at the same origin. HTTPS is needed off localhost, and by the playground's service
worker.

`npm run cert` signs one with the dev CA this machine already trusts (`next/docs/cert`, or set
`DEV_CA_DIR`), so there is nothing new to trust. The CA's key is read in place, never copied here.

Then point the name at the machine: `<vm ip> local.navrouter.dev` in the hosts file of the machine
you browse from (or a DNS record, since the domain is ours), and `127.0.0.1 local.navrouter.dev` here.

Without a cert, dev falls back to plain http on :4321. Certs are git-ignored; only this README is kept.
