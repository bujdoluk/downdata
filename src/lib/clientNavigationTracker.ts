// history.length and document.referrer can't tell if router.back() stays in-app, so track client navigations directly.
let hasNavigated = false;

export function markClientNavigation() {
  hasNavigated = true;
}

export function hasNavigatedClientSide() {
  return hasNavigated;
}
