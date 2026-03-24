# AGENTS

## Purpose

Defines agent responsibilities for the `juro-web` repository.

## Scope

- Primary web UX for `jurocompliant.com`
- Frontend integration with API and MCP services
- User flow stability and web delivery behavior

## Agent Rules

- Follow platform abstraction: `/Users/arshdeep/git/juro-platform/contracts/how-to-contribute-functionalities.md`
- Follow naming standard: `/Users/arshdeep/git/juro-platform/contracts/nomenclature.md`
- Keep primary user journey stable unless a controlled rollout is planned
- Use canonical service domains in integration settings

## Required Checks

- App build and runtime validation
- Core user flow checks
- Integration assumptions documented

## PR Acceptance Checklist

- [ ] Scope is clearly documented and aligned with repository purpose.
- [ ] Naming and domain references follow platform nomenclature rules.
- [ ] Tests or validation evidence are included for behavior changes.
- [ ] Required docs/contracts are updated when assumptions changed.
- [ ] Rollback or mitigation path is stated for risky changes.
