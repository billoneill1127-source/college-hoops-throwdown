# Phase 1 Smoke Test — Manual Browser Verification

Run these checks after migrating `index.html` to load data via fetch instead of inline injection.
Open DevTools before loading the page and keep it open throughout.

---

## NETWORK TESTS
_DevTools → Network tab, filter by Fetch/XHR_

- [ ] On page load, teams.json is fetched with status 200
- [ ] On page load, conferences.json is fetched with status 200
- [ ] No request is made for a file called data.json

---

## CONSOLE TESTS
_DevTools → Console_

- [ ] No errors on page load
- [ ] No "DATA is not defined" or "Cannot read properties of undefined" errors
- [ ] Typing `window.TEAMS` in the console returns an array with more than 50 items
- [ ] Typing `window.CONFERENCES` in the console returns an array

---

## UI TESTS

- [ ] The conference picker populates with at least 5 conferences
- [ ] Selecting a conference populates the team picker
- [ ] Both home and away teams can be selected from different conferences
- [ ] Clicking Play Game launches the game without errors

---

## GAME TESTS

- [ ] A full game completes without console errors
- [ ] The final box score shows stats for both teams
- [ ] Player names in the box score match the roster for the selected teams

---

## NOTES

**Browser tested:**

**Date tested:**

**Any anomalies observed:**
