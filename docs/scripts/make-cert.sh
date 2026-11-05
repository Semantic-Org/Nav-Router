#!/usr/bin/env bash
# a local-dev cert for https://local.navrouter.dev, signed by the dev CA this machine already trusts
# (next/docs/cert), so there is nothing new to trust. run from site/ via `npm run cert`.
# the CA's key is read where it lives and never copied here.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=local.navrouter.dev
CA_DIR="${DEV_CA_DIR:-../../next/docs/cert}"
mkdir -p cert

if [[ ! -f "$CA_DIR/ca.pem" || ! -f "$CA_DIR/ca-key.pem" ]]; then
  echo "No dev CA in $CA_DIR. Set DEV_CA_DIR, or run 'npm run cert' in next/docs first." >&2
  exit 1
fi
if [[ -f "cert/$HOST-key.pem" ]]; then
  echo "cert/$HOST-key.pem exists. Delete it first to regenerate." >&2
  exit 1
fi

openssl genrsa -out "cert/$HOST-key.pem" 2048
openssl req -new -key "cert/$HOST-key.pem" -out cert/temp.csr -subj "/CN=$HOST/O=nav-router"
printf 'subjectAltName=DNS:%s,DNS:localhost\nextendedKeyUsage=serverAuth\n' "$HOST" > cert/san.ext
openssl x509 -req -in cert/temp.csr -CA "$CA_DIR/ca.pem" -CAkey "$CA_DIR/ca-key.pem" -CAcreateserial \
  -CAserial cert/ca.srl -out "cert/$HOST.pem" -days 3650 -sha256 -extfile cert/san.ext
rm cert/temp.csr cert/san.ext cert/ca.srl

echo
echo "cert/$HOST.pem signed by $CA_DIR/ca.pem."
echo "Point $HOST at this machine: '<vm ip> $HOST' in the hosts file of the machine you browse from"
echo "(and '127.0.0.1 $HOST' here)."
