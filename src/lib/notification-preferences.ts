// What the notifications panel shows. A per-browser choice, kept in localStorage:
// it never changes your money rules.

export type NotificationPreferences = { needsOkay: boolean; paymentUpdates: boolean; twinLessons: boolean };

const KEY = "leash-notification-preferences";
const DEFAULTS: NotificationPreferences = { needsOkay: true, paymentUpdates: true, twinLessons: false };

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS; // private windows and blocked storage
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Nothing to do: the defaults still work.
  }
}
