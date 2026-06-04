'use strict';

/**
 * Servizio connessioni SSH (autenticazione a chiave).
 *
 * Flusso:
 *   1. La chiave privata (cifrata nel vault) viene scritta in un file temporaneo
 *      con ACL ristrette al solo utente corrente (OpenSSH rifiuta chiavi accessibili ad altri).
 *   2. Viene aperto un terminale che esegue `ssh -i <key> -p <port> user@host`.
 *   3. La chiave temporanea viene eliminata dopo la connessione (dal launcher e da un
 *      fallback temporizzato), così non resta su disco.
 *
 * Nessuna password sulla riga di comando: l'autenticazione avviene tramite chiave.
 */

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const HOST_RE = /^[a-zA-Z0-9._-]+$/;
const USER_RE = /^[a-zA-Z0-9._\\@-]+$/;

/** @returns {boolean} true se il client ssh di sistema è disponibile */
function isAvailable() {
  try {
    execFileSync('where', ['ssh'], { stdio: 'ignore' });
    return true;
  } catch (_e) {
    return false;
  }
}

/** Normalizza una chiave privata: line ending LF + newline finale. */
function normalizeKey(key) {
  let k = String(key || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return k + '\n';
}

function randTmp(ext) {
  return path.join(os.tmpdir(), `vaultx_${crypto.randomBytes(9).toString('hex')}${ext}`);
}

/**
 * Apre una sessione SSH in un nuovo terminale, autenticata tramite chiave.
 * @param {{host:string, port?:number|string, username:string, privateKey:string, label?:string}} opts
 * @returns {{ok:boolean}}
 */
function connect(opts) {
  const { host, username, privateKey } = opts || {};
  if (!isAvailable()) {
    throw new Error('Client OpenSSH non trovato. Abilitalo da Impostazioni Windows → App → Funzionalità facoltative → "OpenSSH Client".');
  }
  if (!host || !HOST_RE.test(String(host))) throw new Error('Host non valido.');
  if (!username || !USER_RE.test(String(username))) throw new Error('Username SSH non valido.');
  if (!privateKey || String(privateKey).trim() === '') throw new Error('Chiave privata mancante.');
  const p = parseInt(opts.port, 10);
  const port = (p >= 1 && p <= 65535) ? p : 22;

  // 1. Scrivi la chiave in un file temporaneo
  const keyPath = randTmp('.key');
  fs.writeFileSync(keyPath, normalizeKey(privateKey), { mode: 0o600 });

  // 2. Se la chiave ha una passphrase salvata, crea una copia temporanea SBLOCCATA
  //    così `ssh` non la richiede al prompt (OpenSSH non accetta la passphrase da CLI).
  const passphrase = opts.passphrase != null ? String(opts.passphrase) : '';
  if (passphrase.length > 0) {
    try {
      execFileSync('ssh-keygen', ['-p', '-f', keyPath, '-P', passphrase, '-N', '', '-q'], { stdio: 'ignore' });
    } catch (_e) {
      try { fs.unlinkSync(keyPath); } catch (_err) { /* */ }
      throw new Error('Passphrase della chiave errata (o chiave non valida).');
    }
  }

  // 3. Restringi le ACL al solo utente corrente (necessario per OpenSSH su Windows)
  try {
    execFileSync('icacls', [keyPath, '/inheritance:r'], { stdio: 'ignore' });
    const who = process.env.USERNAME || process.env.USER;
    if (who) execFileSync('icacls', [keyPath, '/grant:r', `${who}:R`], { stdio: 'ignore' });
  } catch (_e) { /* se fallisce, ssh potrebbe avvisare ma spesso procede */ }

  // 3. Launcher .cmd che esegue ssh e poi cancella la chiave
  const cmdPath = randTmp('.cmd');
  const safeTitle = String(opts.label || 'SSH').replace(/[^a-zA-Z0-9 _.-]/g, '').slice(0, 40);
  const content =
    '@echo off\r\n' +
    `title VaultX SSH - ${safeTitle}\r\n` +
    `echo Connessione a ${username}@${host}:${port} ...\r\n` +
    `ssh -i "${keyPath}" -p ${port} ${username}@${host}\r\n` +
    `del /q "${keyPath}" 2>nul\r\n` +
    'echo.\r\n' +
    'echo [Sessione SSH terminata - premi un tasto per chiudere]\r\n' +
    'pause >nul\r\n';
  fs.writeFileSync(cmdPath, content);

  // 4. Apri il launcher in una nuova finestra di console
  const child = spawn(`start "" cmd /c "${cmdPath}"`, { shell: true, detached: true, stdio: 'ignore' });
  child.unref();

  // 5. Fallback: elimina chiave e launcher dopo 60s (ssh legge la chiave all'avvio)
  setTimeout(() => {
    try { fs.unlinkSync(keyPath); } catch (_e) { /* già rimossa dal launcher */ }
    try { fs.unlinkSync(cmdPath); } catch (_e) { /* */ }
  }, 60000);

  return { ok: true };
}

module.exports = { isAvailable, connect };
