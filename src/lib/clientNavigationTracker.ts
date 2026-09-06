// Module-level, not React state — this only needs to persist for the tab's
// lifetime and never needs to trigger a re-render.
//
// Neither `window.history.length` nor `document.referrer` reliably answers
// "would router.back() land somewhere inside this app?": history.length's
// baseline on a fresh tab varies by browser/tooling (a real new tab often
// starts at 1, but some environments start at 2), and document.referrer
// reflects only the tab's original top-level load, not any client-side
// route changes since — so it goes stale the moment a visitor takes a
// second in-app Link click. Tracking an actual client-side navigation
// directly (via ClientNavigationTracker, mounted once in the root layout)
// is the one signal that's actually true.
let hasNavigated = false;

export function markClientNavigation() {
  hasNavigated = true;
}

export function hasNavigatedClientSide() {
  return hasNavigated;
}
