# Build 1009 (2026-11-18)

PR #12 (Home Earth) and the What's new list (branch `ui/whats-new`). The tag goes on the commit where `main` reaches this state.

## What changed (user-visible)
- The Earth on the home page keeps turning after the collision scene plays once. It used to rest on the last frame after about 5 seconds and looked stuck. The collision does not repeat; the calm part draws at about 30 frames a second; with reduced motion it is still a single frame.
- What's new, as in Tarang: a "What's new" item in the menu (Help), with the newest build number beside it. It opens a list of every build, newest first, with its date and what changed in plain words; the newest is marked as the one in use.

## Why
The owner saw the Earth freeze ("after few rotation it is getting stuck") and asked for Tarang's What's new in ORCA.

## How it works
- `frontend/src/lib/builds.ts` holds the list. `MD/builds/README.md` stays the source of truth: `lib/builds.test.ts` reads it and fails if a `build-N` row is missing from the list or its date differs (shown failing before this build's row was added). Internal InBul changes are not listed.
- `organisms/WhatsNew` lays the list out in the existing `Modal` (Esc closes it, focus returns to the menu). App shortcuts are paused while it is open, as for Keyboard shortcuts.

## Verified how
- Frontend 249/249 tests, type check, production build.
- Earth: screenshots of the canvas 9 s and 12 s after load differ (the planet turned, the satellites moved); a temporary log showed the loop alive at 3 to 13 s (removed). Vercel deployed PR #12.
- What's new: opened from the menu on the local app at 1440 px; 10 builds listed; focus inside the dialog; Esc closes it.

## Not verified
- What's new on a phone, in the light theme and with a screen reader.

## Next
- When adding a build: add its row to `MD/builds/README.md` and its entry to `frontend/src/lib/builds.ts` in the same commit.

## Files
- `frontend/src/lib/builds.ts`, `frontend/src/lib/builds.test.ts`, `frontend/package.json` (test list)
- `frontend/src/components/organisms/WhatsNew/WhatsNew.tsx`, `WhatsNew.css`
- `frontend/src/components/organisms/AppMenu/AppMenu.tsx`, `frontend/src/Workspace.tsx`
- `frontend/src/lib/orbitAnimation.ts` (PR #12)
- `MD/builds/README.md`, `MD/builds/build-1009.md`, `MD/version_control.md`
