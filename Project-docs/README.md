# MKB Intelligence Project Documentation

This folder is the durable handover record for the MKB Intelligence project.

## Starting a new development conversation
Upload the latest complete project ZIP and say:

> Continue MKB Intelligence. Read `/project-docs` first, especially `PROJECT-STATE.md` and `NEXT-STEPS.md`, then inspect the actual source and migrations before making changes.

The current source, D1 migrations and these documents are authoritative. Chat history is supplementary.

## Current deployment guide
For the v1.8.2 ownership release, read `WEDPLANNED-TENANT-OWNERSHIP.md`, `WEDPLANNED-AUTH.md` and `WEDPLANNED-FOUNDATION.md` after `PROJECT-STATE.md` and `NEXT-STEPS.md`. `PRODIGI-SETUP.md` and `STRIPE-SETUP.md` remain authoritative for fulfilment and payment configuration.

## End-of-release checklist
1. Update `PROJECT-STATE.md`.
2. Add the release to `CHANGELOG.md`.
3. Update `NEXT-STEPS.md`.
4. Update `DATABASE.md` whenever the D1 schema changes.
5. Update `ARCHITECTURE.md` for architectural decisions.
6. Commit documentation with the code.
7. Keep a Git tag or stable ZIP for major milestones.

**Principle:** the project itself is the memory.
