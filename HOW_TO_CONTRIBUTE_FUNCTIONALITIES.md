# How to Contribute Functionalities in `juro-web`

This guide defines how to contribute frontend/web functionality in `juro-web`.

Platform abstraction source:
- `/Users/arshdeep/git/juro-platform/contracts/how-to-contribute-functionalities.md`

## Repository scope

Use this repo for:
- `jurocompliant.com` web UX and pages
- frontend integrations with API and MCP services
- web-side telemetry and user journey improvements

## Feature intake checklist

Before coding:
- write a functionality brief with user journey impact
- identify backend dependencies (`api` and/or `mcp`)
- confirm domain impact:
  - `jurocompliant.com`

## Implementation pattern

1. Implement UI/UX feature with clear acceptance criteria.
2. Keep API integration boundaries explicit and typed.
3. Add/update tests for critical user flows.
4. Update docs/readme for changed setup or behavior.

## Required validation

- App builds and runs in target runtime.
- Core pages and flows load successfully.
- API base URLs map to canonical subdomains.
- No breaking changes to primary user journey.

## Cross-repo obligations

If integration behavior changes:
- coordinate with `juro` and/or `juro-mcp-server`
- update platform service contracts if endpoints/assumptions changed
- update cutover/runbook docs where operational impact exists
