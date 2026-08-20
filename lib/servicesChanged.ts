const EVENT = "downdata:services-changed";

export function notifyServicesChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function onServicesChanged(handler: () => void) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
