# VaultX — Password Manager locale

**VaultX** è un password manager desktop per Windows costruito con **Electron**.
Tutti i dati rimangono sul tuo computer, cifrati con **AES-256-GCM**, con chiave
derivata dalla master password tramite **Argon2id**.

## Sicurezza

- Master password mai salvata: solo il `verification_hash = SHA-256(key)`
- Vault key derivata con **Argon2id** (64 MB, 3 iterazioni, parallelism 4)
- Cifratura per campo: **AES-256-GCM** (IV 12B, tag 16B)
- Auto-lock configurabile + lock su blocco schermo Windows / screensaver / suspend
- Clipboard auto-clear (default 30 sec)
- Screenshot protection attiva sulla finestra
- CSP stretta, `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Rilevamento DevTools → lock automatico (se disabilitate in produzione)
- Blocco 30 min dopo 5 tentativi falliti

## Requisiti

- Node.js 18+ e npm
- Windows 10/11 (x64)
- Python e Build Tools per Windows per compilare moduli nativi (`better-sqlite3`, `argon2`, `robotjs`)

## Installazione

```bash
npm install
npm run rebuild        # opzionale: ricompila moduli nativi
npm start              # esegui in dev
npm run build          # genera .exe NSIS in dist/
```

## Funzionalità

- Setup primo avvio con indicatore forza password
- Schermata sblocco con shake animato su errore
- Sidebar con categorie, preferiti, recenti, password deboli/vecchie
- CRUD completo con cifratura per-campo e history delle password
- Generatore password (lunghezza, charset, passphrase)
- TOTP (RFC 6238) con countdown
- Auto-type via `robotjs` + shortcut globale `Ctrl+Shift+A`
- System tray con menu
- Import: Bitwarden CSV, LastPass CSV, 1Password CSV, KeePass XML
- Export `.vaultx` cifrato con password di backup

## Struttura

```
vaultx/
├── main/
│   ├── main.js              entry point
│   ├── preload.js           contextBridge API
│   ├── ipc/                 handler IPC
│   ├── services/            crypto, DB, vault, generator, TOTP, lock, autotype
│   └── utils/               clipboard, security
├── renderer/
│   ├── index.html
│   ├── css/                 main, components, animations
│   └── js/
│       ├── app.js           router SPA
│       ├── api.js           wrapper IPC
│       ├── pages/           setup, unlock, vault, entry, generator, settings
│       └── components/      toast, strength, search
├── package.json
└── electron-builder.yml
```

## Note

- `robotjs` è **optional dependency**: se non compila, l'app funziona comunque ma l'auto-type è disabilitato.
- I dati applicativi risiedono in `%APPDATA%/VaultX/vaultx.db` (SQLite WAL).
