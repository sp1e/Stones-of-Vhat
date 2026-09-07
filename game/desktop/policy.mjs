import { join } from 'node:path';

export function isGameUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'app:' && url.hostname === 'game' && url.port === '' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export function assetPath(root, value) {
  if (!isGameUrl(value)) return null;
  try {
    const path = decodeURIComponent(new URL(value).pathname);
    if (path === '/' || path === '/index.html') return join(root, 'index.html');
    if (!/^\/assets\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(js|css|wasm|png|jpg|webp|svg|woff2)$/.test(path)) return null;
    return join(root, 'assets', path.slice('/assets/'.length));
  } catch {
    return null;
  }
}

export function permitsPointerLock(permission, url, isMainFrame) {
  return permission === 'pointerLock' && isMainFrame === true && isGameUrl(url);
}
