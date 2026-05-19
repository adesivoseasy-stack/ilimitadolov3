#!/usr/bin/env node
/**
 * Protege a extensão:
 *  1. Substitui o SUPABASE_URL e ANON_KEY por chamadas a __SBU()/__SBK()
 *  2. Injeta um loader com 32 URLs e 32 keys falsas + as reais (XOR-encoded)
 *  3. Obfusca todos os JS (controlFlowFlattening, stringArray rc4, deadCode, selfDefending)
 *  4. Repackeia em ilimitado-lov-v4.3.0.zip e v4.3.1.zip
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import JsObfuscator from 'javascript-obfuscator';

const SRC = 'public/extension-v4.3.0';
const REAL_URL = 'https://wvelcefgihlxcnrmslul.supabase.co';
const REAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZWxjZWZnaWhseGNucm1zbHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDUzMDcsImV4cCI6MjA5NDcyMTMwN30.NuzN6PlTAdCI_36DWG_4C2UAGLEe5hmVppxoake7-6s';

const XOR_KEY = 'aZ7$wQ9!nR2#kP4&xV8';
function xorEnc(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) out.push(str.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  return out;
}

const rand = (n) => crypto.randomBytes(n).toString('base64').replace(/[+/=]/g, '').slice(0, n);
function fakeRef() {
  return Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
}
function fakeUrl() {
  const tld = Math.random() > 0.5 ? 'co' : 'in';
  return `https://${fakeRef()}.supabase.${tld}`;
}
function fakeJwt() {
  // mesma estrutura de um anon key: header.payload.sig
  const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const ref = fakeRef();
  const iat = 1700000000 + Math.floor(Math.random() * 100000000);
  const exp = iat + 200000000;
  const p = Buffer.from(JSON.stringify({ iss: 'supabase', ref, role: 'anon', iat, exp })).toString('base64url');
  const s = rand(43);
  return `${h}.${p}.${s}`;
}

function buildLoader() {
  const TOTAL = 32;
  const realUrlIdx = Math.floor(Math.random() * TOTAL);
  const realKeyIdx = Math.floor(Math.random() * TOTAL);
  const urls = [];
  const keys = [];
  for (let i = 0; i < TOTAL; i++) urls.push(i === realUrlIdx ? xorEnc(REAL_URL) : xorEnc(fakeUrl()));
  for (let i = 0; i < TOTAL; i++) keys.push(i === realKeyIdx ? xorEnc(REAL_KEY) : xorEnc(fakeJwt()));

  // checksums dos índices para evitar swap simples (qualquer mudança no índice quebra)
  const urlCheck = (realUrlIdx * 1337 + 42) & 0xffff;
  const keyCheck = (realKeyIdx * 2731 + 91) & 0xffff;

  return `
// === protected config loader (do not edit) ===
(function(){
  var K=${JSON.stringify(XOR_KEY)};
  function d(a){var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]^K.charCodeAt(i%K.length));return s;}
  var U=${JSON.stringify(urls)};
  var P=${JSON.stringify(keys)};
  var ui=${realUrlIdx},ki=${realKeyIdx};
  // tamper guard: se alguém trocar os índices, retorna lixo
  if(((ui*1337+42)&0xffff)!==${urlCheck} || ((ki*2731+91)&0xffff)!==${keyCheck}){ui=0;ki=0;}
  var cu=null,ck=null;
  self.__SBU=function(){if(cu===null)cu=d(U[ui]);return cu;};
  self.__SBK=function(){if(ck===null)ck=d(P[ki]);return ck;};
})();
`;
}

function patchSource(src) {
  let s = src;
  s = s.replace(/const\s+SUPABASE_URL\s*=\s*['"][^'"]+['"]\s*;?/g, 'const SUPABASE_URL = __SBU();')
       .replace(/const\s+SUPABASE_ANON_KEY\s*=\s*['"][^'"]+['"]\s*;?/g, 'const SUPABASE_ANON_KEY = __SBK();')
       .replace(/const\s+API_BASE\s*=\s*['"][^'"]+['"]\s*;?/g, 'const API_BASE = __SBU() + "/functions/v1";');
  const hasUrl = /const\s+SUPABASE_URL\b/.test(s);
  const hasKey = /const\s+SUPABASE_ANON_KEY\b/.test(s);
  let prelude = '';
  if (!hasUrl && s.includes(REAL_URL)) prelude += 'const SUPABASE_URL = __SBU();\n';
  if (!hasKey && s.includes(REAL_KEY)) prelude += 'const SUPABASE_ANON_KEY = __SBK();\n';
  const escUrl = REAL_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escKey = REAL_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // arquivos usam aspas simples — quebra a string e concatena
  s = s.replace(new RegExp(escUrl, 'g'), "' + SUPABASE_URL + '");
  s = s.replace(new RegExp(escKey, 'g'), "' + SUPABASE_ANON_KEY + '");
  return prelude + s;
}

const STRONG = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  identifierNamesGenerator: 'mangled-shuffled',
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 6,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.9,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  reservedNames: ['^chrome$', '^__SBU$', '^__SBK$'],
};
const LIGHT = {
  compact: true,
  identifierNamesGenerator: 'mangled',
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  reservedNames: ['^chrome$', '^__SBU$', '^__SBK$'],
};

function process(file, level) {
  const full = path.join(SRC, file);
  let code = fs.readFileSync(full, 'utf8');
  const needsConfig = /SUPABASE_URL|SUPABASE_ANON_KEY|API_BASE\s*=\s*['"]https/.test(code) ||
                      code.includes(REAL_URL) || code.includes(REAL_KEY);
  code = patchSource(code);
  if (needsConfig) code = buildLoader() + '\n' + code;
  const obf = JsObfuscator.obfuscate(code, level).getObfuscatedCode();
  fs.writeFileSync(full, obf);
  console.log(`✅ ${file} (${level === STRONG ? 'strong' : 'light'}) ${obf.length} bytes`);
}

// processa
process('sidepanel.js', STRONG);
process('popup.js', STRONG);
process('background.js', LIGHT);
process('hide-element.js', LIGHT);
process('remote-ui.js', LIGHT);

// repacka zips
async function zipDir(out) {
  const zip = new JSZip();
  function walk(dir, base = '') {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else zip.file(rel, fs.readFileSync(full));
    }
  }
  walk(SRC);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(out, buf);
  console.log(`📦 ${out} ${buf.length} bytes`);
}
await zipDir('public/ilimitado-lov-v4.3.0.zip');
await zipDir('public/ilimitado-lov-v4.3.1.zip');
console.log('🔒 Done.');