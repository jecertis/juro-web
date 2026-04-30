<!-- juro:agent-preamble:v1 -->
## AI Agent Instructions — READ BEFORE ANY TOOL USE

You are working in a Juro sub-repo. You MUST orient yourself before making any changes.

### Step 1 — Your first tool calls must read the strategic layer

All four documents live in the workspace repo (`jecertis/juro-workspace` on GitHub):

- **VISION.md** — *"Compliance you can prove"* — the north star
- **AXIOMS.md** — invariants; if your change violates one, stop and ask
- **PRINCIPLES.md** — operating heuristics
- **GOALS.md** — 12-month measurable outcomes

If the workspace repo is cloned alongside this sub-repo, read `../juro-workspace/*.md`. If not, fetch from `https://github.com/jecertis/juro-workspace`.

### Step 2 — Invariants that apply to every change

If your proposed change conflicts with any of these, STOP and ask the user before proceeding:

- **Non-custodial.** No customer scan content or infrastructure state (IAM, Lambda configs, data flow, resource ARNs) leaves the customer's perimeter. Evidence pipelines never call external services in any tier.
- **No unsupportable compliance claims.** Banned phrases include: "SOC 2 compliant", "enterprise-grade", "AI-powered compliance", "trust center", "GRC platform". Banned as product coverage: MiCA, AI Act, HIPAA, ISO 27001, OWASP Top 10, PCI DSS, NIS2. Supported regulation scope is GDPR, DORA, DPDP.
- **Signed evidence is deterministic, reproducible, cited.** The evidence pipeline produces artifacts that hash stably, cite a regulatory source, and are signed. LLM outputs never affect the signed finding set.
- **Tier is a config flag, not a code fork.** Tier 1 (SaaS surface scan) and Tier 3 (Private Deploy agent) share one codebase. Tier 2 (Hybrid) is explicitly out of scope.
- **Agent-based detection is the product.** The real product is an in-VPC agent that reads cloud state under a read-only IAM role. The surface scanner is the acquisition funnel.

### Step 3 — If unsure, ask

If you are not sure whether your proposed change aligns with the vision or axioms, STOP and ask the user. Do not guess and do not proceed. The strategic layer is not optional context — it is the definition of the product.
<!-- /juro:agent-preamble:v1 -->

## Current state

GitHub Pages site at `jurocompliant.com`. Deployed by `.github/workflows/pages.yml` on every `main` push.

### Key files

| File | Purpose |
|---|---|
| `install.sh` | `curl \| bash` installer for `juro-deploy` CLI. Downloads binary from `jecertis/juro-releases` (public). Auto-installs Docker Compose v2 plugin on Linux if missing. |
| `deploy-evergent.html` | Private Tier 3 onboarding guide for Evergent. `noindex`. Covers IAM setup, all 6 `juro-deploy` commands, artifact locations, 8-item FAQ. |

### juro-deploy binary names (must match `@yao-pkg/pkg` output)

| Platform | Binary |
|---|---|
| Linux x86_64 | `juro-deploy-linux-x64` |
| macOS Apple Silicon | `juro-deploy-macos-arm64` |
| macOS Intel | `juro-deploy-macos-x64` |

### Open loops

- **juro-web#17 open** — `install.sh`: point to `jecertis/juro-releases` + fix `darwin` → `macos` binary names. Merge after juro#32.
- **Generic public Tier 3 page** — non-Evergent version of the deploy guide; not started.
