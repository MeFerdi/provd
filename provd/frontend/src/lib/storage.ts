type BrowserStorageKind = "localStorage" | "sessionStorage";

function getBrowserStorage(kind: BrowserStorageKind): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function readStorageItem(key: string): string | null {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string): void {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {}
}

export function removeStorageItem(key: string): void {
  const storage = getBrowserStorage("localStorage");
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {}
}

export function readSessionStorageItem(key: string): string | null {
  const storage = getBrowserStorage("sessionStorage");
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionStorageItem(key: string, value: string): void {
  const storage = getBrowserStorage("sessionStorage");
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {}
}

export function removeSessionStorageItem(key: string): void {
  const storage = getBrowserStorage("sessionStorage");
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {}
}
