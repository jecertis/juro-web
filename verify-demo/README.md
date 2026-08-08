# verify-demo assets

Static assets for the offline-verification demo (BL-MKT-060). Engineering
provenance notes only — this file is not campaign copy.

## Files

| File | What it is |
|---|---|
| `scan-bundle.json` | A synthetic signed scan artifact. Byte-for-byte copy of `juro/packages/verify/fixtures/release-smoke/valid-key-2026-07-20.json` (sha256 `70fc6f30f293f836cff4e19124723f121d816595361a9c17c8507612e09934d9`). |
| `keyring.json` | Public-key keyring (`legacy`, `key-2026-07-20`). Public keys only — no private key material. |

The artifact is synthetic: `scan_id=scan-accept-001`, `engagement_slug=acctest`.
It contains no customer data, no customer URL content, and no real engagement
identifiers (Axiom 4).

## Verified state

Checked against the released `juro-verify` v1.2.0 binary
(`juro-verify-macos-x64`, sha256 `7f983c416c881a29e4bc3b09ed595aa99e243a6e932e22a01008c0b889494713`)
from `jecertis/juro-releases`:

```
hash: VALID (sha256:ee167b6df5a89db36a4215576b53b4f309e5beba4286d8585e8763d7893c8b20 recomputed match)
signature: VALID key_id=key-2026-07-20
verify: PASS
```

Both the embedded keyring and `VERIFY_KEYRING=./keyring.json` produce this
result. `verify: PASS` is a statement about artifact authenticity and
integrity only; it is not a statement about any organization's regulatory
posture.

Use `juro-verify` v1.2.0 or later with these assets.

## Rotation

These files are decoupled from the CI smoke-test fixture lifecycle on
purpose: the fixture gets re-signed and renamed on key rotation, these do
not. On rotation, re-copy a freshly signed synthetic artifact here and
update `keyring.json`, keeping the retired public key in the ring so this
artifact stays verifiable.
