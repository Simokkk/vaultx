'use strict';

/**
 * Import da formati esterni: Bitwarden CSV, LastPass CSV, 1Password CSV, KeePass XML.
 * Ritorna oggetti { entries: [...] } normalizzati per VaultService.importPlain.
 */

/**
 * Parser CSV semplice, gestisce virgolette e virgole embedded.
 * @param {string} text
 * @returns {string[][]}
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = false;
        }
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        // skip
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ''));
}

/**
 * @param {string} text
 * @param {'bitwarden'|'lastpass'|'onepassword'} kind
 * @returns {{entries:Array, categories:Array}}
 */
function fromCsv(text, kind) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { entries: [], categories: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const entries = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    let e = null;
    if (kind === 'bitwarden') {
      e = {
        title: r[idx('name')] || '',
        username: r[idx('login_username')] || '',
        password: r[idx('login_password')] || '',
        url: r[idx('login_uri')] || '',
        notes: r[idx('notes')] || '',
        totpSecret: r[idx('login_totp')] || ''
      };
    } else if (kind === 'lastpass') {
      e = {
        title: r[idx('name')] || '',
        username: r[idx('username')] || '',
        password: r[idx('password')] || '',
        url: r[idx('url')] || '',
        notes: r[idx('extra')] || r[idx('notes')] || ''
      };
    } else if (kind === 'onepassword') {
      e = {
        title: r[idx('title')] || '',
        username: r[idx('username')] || '',
        password: r[idx('password')] || '',
        url: r[idx('url')] || r[idx('website')] || '',
        notes: r[idx('notes')] || ''
      };
    }
    if (e && (e.title || e.username || e.password)) entries.push(e);
  }
  return { entries, categories: [] };
}

/**
 * Parser KeePass 2 XML (format standard export).
 * Estrae Entry -> String[] (Title, UserName, Password, URL, Notes).
 * @param {string} xml
 */
function fromKeePassXml(xml) {
  const entries = [];
  // Estrae tutti i blocchi <Entry>...</Entry>
  const entryRx = /<Entry\b[\s\S]*?<\/Entry>/g;
  const strRx = /<String>\s*<Key>([^<]+)<\/Key>\s*<Value[^>]*>([\s\S]*?)<\/Value>\s*<\/String>/g;
  const matches = xml.match(entryRx) || [];
  for (const block of matches) {
    const fields = {};
    let m;
    strRx.lastIndex = 0;
    while ((m = strRx.exec(block))) {
      fields[m[1]] = decodeXmlEntities(m[2]);
    }
    const e = {
      title: fields.Title || '',
      username: fields.UserName || '',
      password: fields.Password || '',
      url: fields.URL || '',
      notes: fields.Notes || ''
    };
    if (e.title || e.password) entries.push(e);
  }
  return { entries, categories: [] };
}

function decodeXmlEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

module.exports = { parseCsv, fromCsv, fromKeePassXml };
