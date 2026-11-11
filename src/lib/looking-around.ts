// "Look around first": browse Leash without signing in, for this browser tab only.

const KEY = "leash-looking-around";

export function startLookingAround() {
  try {
    sessionStorage.setItem(KEY, "yes");
  } catch {
    // Storage is blocked: the welcome screen will simply show again.
  }
}

export function isLookingAround(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}
