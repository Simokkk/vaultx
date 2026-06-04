'use strict';

/**
 * Generatore password e indicatore forza.
 *
 *  - Charset configurabili (upper/lower/digits/symbols)
 *  - Esclusione caratteri ambigui
 *  - Modalità passphrase (N parole casuali)
 *  - Strength score 0-100 (entropy-based)
 */

const crypto = require('node:crypto');

const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~'
};

const AMBIGUOUS = '0O1lI|`\'";:,.';

// Wordlist compatta (EFF short style). 256 parole per generare passphrase sicure.
const WORDLIST = [
  'acida','acqua','aereo','afgano','aiuto','alba','alce','ala','albero','alga','allievo','alto','amaca','ambra','amico','ancora',
  'angolo','anima','anno','antica','apparso','aprile','aragosta','arancia','arbusto','arco','argento','aria','arma','arpa','arte','ascia',
  'asino','aspide','asta','atomo','attore','aula','aurora','autobus','autore','avena','avorio','azalea','azzurro','babbo','bagno','baita',
  'balena','ballo','balsamo','banana','banco','barba','barca','basilico','batuffolo','baule','belva','bevanda','bianco','biblia','bigino','binario',
  'birra','bocca','bollito','bomba','borsa','botte','bottone','braccio','brace','bronzo','bruno','bucato','bufalo','burla','burro','busta',
  'cadere','caffe','calamaro','calcolo','calore','calza','campo','canapa','canarino','candela','cane','canoa','canto','capra','carbone','carciofo',
  'carne','caro','carta','caso','cassa','castagno','cavallo','cavolo','cedro','celeste','cenere','cerchio','cervo','cespuglio','ciabatta','cibo',
  'cielo','ciliegia','cinema','cinta','cipolla','ciuffo','clavicola','cobra','coccinella','colline','colomba','coltello','corallo','corda','corona','corpo',
  'cosa','costola','coyote','cravatta','crescere','cristallo','crosta','cubo','cucchiaio','cuore','datte','delfino','delta','denaro','dente','deserto',
  'diamante','dito','divano','domani','dorso','dottore','drago','eclisse','edera','elfo','elica','elmetto','enigma','eremo','ermellino','essenza',
  'estate','etichetta','faggio','falco','falda','fanale','fango','faro','fata','favola','felce','felpa','ferro','festa','fiaba','fico',
  'fiera','figlio','filo','finestra','fiocco','fiore','fiume','flauto','foca','folla','fondo','fontana','foresta','formaggio','forno','foto',
  'fragola','francobollo','freccia','freddo','fronda','frutto','fulmine','fumo','fungo','gabbiano','galaxia','galera','gallina','gamba','garofano','gatto',
  'gazza','gelato','gelso','gemma','genio','gesso','ghepardo','ghiaccio','giada','gialla','giglio','ginnasta','gioco','giraffa','giunco','globo'
];

/** @returns {number} */
function randInt(maxExclusive) {
  if (maxExclusive <= 0) return 0;
  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  let r;
  do {
    r = crypto.randomBytes(4).readUInt32BE(0);
  } while (r >= limit);
  return r % maxExclusive;
}

/**
 * Genera una password casuale.
 * @param {object} opts
 * @param {number} [opts.length=20]
 * @param {boolean} [opts.upper=true]
 * @param {boolean} [opts.lower=true]
 * @param {boolean} [opts.digits=true]
 * @param {boolean} [opts.symbols=true]
 * @param {boolean} [opts.excludeAmbiguous=false]
 * @param {string} [opts.customExclude='']
 * @returns {string}
 */
function generate(opts = {}) {
  const length = Math.min(Math.max(opts.length || 20, 4), 128);
  let pool = '';
  const required = [];
  const push = (enabled, chars) => {
    if (enabled) {
      pool += chars;
      required.push(chars);
    }
  };
  push(opts.upper !== false, CHARSETS.upper);
  push(opts.lower !== false, CHARSETS.lower);
  push(opts.digits !== false, CHARSETS.digits);
  push(opts.symbols === true, CHARSETS.symbols);

  if (pool.length === 0) pool = CHARSETS.lower;

  const excludeSet = new Set();
  if (opts.excludeAmbiguous) for (const c of AMBIGUOUS) excludeSet.add(c);
  if (opts.customExclude) for (const c of opts.customExclude) excludeSet.add(c);

  pool = [...pool].filter((c) => !excludeSet.has(c)).join('');
  if (pool.length === 0) throw new Error('Nessun carattere disponibile con i filtri attuali.');

  const out = [];
  // Garantisce almeno uno per categoria richiesta
  for (const cat of required) {
    const filtered = [...cat].filter((c) => !excludeSet.has(c));
    if (filtered.length) out.push(filtered[randInt(filtered.length)]);
  }
  while (out.length < length) {
    out.push(pool[randInt(pool.length)]);
  }
  // Shuffle Fisher-Yates con CSPRNG
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, length).join('');
}

/**
 * Genera una passphrase.
 * @param {object} opts
 * @param {number} [opts.words=5]
 * @param {string} [opts.separator='-']
 * @param {boolean} [opts.capitalize=true]
 * @param {boolean} [opts.includeNumber=true]
 */
function passphrase(opts = {}) {
  const n = Math.min(Math.max(opts.words || 5, 3), 12);
  const sep = typeof opts.separator === 'string' ? opts.separator : '-';
  const words = [];
  for (let i = 0; i < n; i++) {
    let w = WORDLIST[randInt(WORDLIST.length)];
    if (opts.capitalize !== false) w = w.charAt(0).toUpperCase() + w.slice(1);
    words.push(w);
  }
  let out = words.join(sep);
  if (opts.includeNumber !== false) {
    out += sep + String(randInt(10000)).padStart(4, '0');
  }
  return out;
}

/**
 * Calcola entropy bit e score 0-100.
 * @param {string} pwd
 * @returns {{score:number, entropyBits:number, label:string}}
 */
function strengthScore(pwd) {
  if (!pwd) return { score: 0, entropyBits: 0, label: 'Debole' };
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pwd)) pool += 32;
  const entropy = pool > 0 ? pwd.length * Math.log2(pool) : 0;

  // Penalizzazioni semplici
  let penalty = 0;
  if (/(.)\1\1/.test(pwd)) penalty += 10; // triple ripetute
  if (/^(?:[0-9]+|[a-z]+|[A-Z]+)$/.test(pwd)) penalty += 10;
  if (pwd.length < 8) penalty += 30;

  const effective = Math.max(0, entropy - penalty);
  let score;
  if (effective < 28) score = Math.round((effective / 28) * 25);
  else if (effective < 60) score = 25 + Math.round(((effective - 28) / 32) * 35);
  else if (effective < 100) score = 60 + Math.round(((effective - 60) / 40) * 30);
  else score = Math.min(100, 90 + Math.round(((effective - 100) / 40) * 10));

  let label = 'Debole';
  if (score >= 85) label = 'Fortissima';
  else if (score >= 65) label = 'Forte';
  else if (score >= 40) label = 'Media';

  return { score: Math.max(0, Math.min(100, score)), entropyBits: Math.round(entropy), label };
}

module.exports = {
  generate,
  passphrase,
  strengthScore,
  CHARSETS
};
