import { app, BrowserWindow, protocol, session, dialog } from 'electron';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetPath, isGameUrl, permitsPointerLock } from './policy.mjs';

const rendererRoot = join(dirname(fileURLToPath(import.meta.url)), 'renderer');
const csp = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'";
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

app.setName('Vadstena');
app.setAppUserModelId('se.sp1e.vadstena');
const profileOverride = app.commandLine.getSwitchValue('user-data-dir');
const profile = profileOverride || join(app.getPath('appData'), 'Vadstena');
mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
app.setPath('sessionData', profile);
protocol.registerSchemesAsPrivileged([{
  scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}]);

let window;
app.whenReady().then(async () => {
  protocol.handle('app', async request => {
    const file = assetPath(rendererRoot, request.url);
    if (!file || !['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 404 });
    try {
      const bytes = await readFile(file);
      return new Response(request.method === 'HEAD' ? null : bytes, {
        headers: {
          'Content-Type': mime[extname(file)] || 'application/octet-stream',
          'Content-Security-Policy': csp,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
  const gameSession = session.defaultSession;
  gameSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !isGameUrl(details.url) }));
  const ownContents = contents => !!window && !window.isDestroyed() && contents === window.webContents;
  gameSession.setPermissionCheckHandler((contents, permission, origin, details) =>
    ownContents(contents) && permitsPointerLock(permission, details.requestingUrl ?? origin, details.isMainFrame));
  gameSession.setPermissionRequestHandler((contents, permission, callback, details) =>
    callback(ownContents(contents) && permitsPointerLock(permission, details.requestingUrl, details.isMainFrame)));
  window = new BrowserWindow({
    title: 'Vadstena: Den åttonde klangen', width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    backgroundColor: '#15231f', show: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true,
      webviewTag: false, spellcheck: false,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!isGameUrl(url)) event.preventDefault(); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.once('ready-to-show', () => window?.show());
  await window.loadURL('app://game/');
}).catch(error => {
  console.error('Vadstena desktop startup failed:', error);
  dialog.showErrorBox('Vadstena kunde inte starta', 'Programfilerna kunde inte läsas. Packa upp eller hämta programmet igen.');
  app.exit(1);
});
app.on('window-all-closed', () => app.quit());
