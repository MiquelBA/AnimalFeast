// A random id for this phone, kept on it: it groups a player's scores, and says nothing about who
// they are. Without storage it lasts this visit.
const KEY = 'poker-lunch:device';
let cached: string | null = null;

export function deviceId(): string {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY);
    if (!cached) {
      cached = newId();
      localStorage.setItem(KEY, cached);
    }
  } catch {
    cached ??= newId();
  }
  return cached;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older browsers / insecure contexts: a random v4-shaped id.
    return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
  }
}
