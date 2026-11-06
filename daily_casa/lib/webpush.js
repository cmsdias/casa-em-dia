'use strict';
// Notificações push próprias da app (Web Push, RFC 8030/8291/8292), sem dependências.
// - Chaves VAPID (P-256) geradas no primeiro arranque e guardadas em db.push.vapid.
// - Cada telemóvel/browser subscreve uma vez (db.push.subs); o servidor cifra cada mensagem (aes128gcm)
//   e envia-a ao serviço de push do fabricante (Apple, Google, Mozilla, Microsoft).
// - Só são aceites endereços desses serviços, para que o servidor nunca seja usado para contactar outros sítios.
const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');

const b64u = buf => Buffer.from(buf).toString('base64url');
const fromB64u = s => Buffer.from(String(s || ''), 'base64url');
const PUSH_HOSTS = [/(^|\.)push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];

function generateVapid() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const raw = Buffer.concat([Buffer.from([4]), fromB64u(jwk.x), fromB64u(jwk.y)]);
  return { publicKey: b64u(raw), privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }) };
}
function vapidJwt({ audience, subject, privateKey, now = Date.now() }) {
  const enc = o => b64u(JSON.stringify(o));
  const data = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: audience, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64u(sig)}`;
}
// Cifra a mensagem para uma subscrição (RFC 8291, «aes128gcm», um só registo).
function encrypt(payload, p256dh, auth) {
  const uaPublic = fromB64u(p256dh), authSecret = fromB64u(auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw Error('Subscrição inválida.');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}
function validEndpoint(endpoint, allowHttp = false) {
  let u; try { u = new URL(endpoint); } catch { return false; }
  if (allowHttp && u.protocol === 'http:' && u.hostname === '127.0.0.1') return true;
  return u.protocol === 'https:' && PUSH_HOSTS.some(r => r.test(u.hostname));
}

function createWebPush({ getDb, save, newId, subject = () => 'mailto:daily-casa@localhost', allowHttp = false, onError = () => {} }) {
  const store = () => { const d = getDb(); d.push ||= {}; d.push.subs ||= []; if (!d.push.vapid) { d.push.vapid = generateVapid(); save(); } return d.push; };
  const publicKey = () => store().vapid.publicKey;
  const devices = userId => store().subs.filter(s => s.userId === userId);
  const hasDevices = userId => !!getDb().push?.subs?.some(s => s.userId === userId);

  function subscribe(userId, sub, label) {
    const endpoint = String(sub?.endpoint || ''), p256dh = String(sub?.keys?.p256dh || ''), auth = String(sub?.keys?.auth || '');
    if (!validEndpoint(endpoint, allowHttp)) throw Object.assign(Error('Este browser usa um serviço de notificações desconhecido.'), { status: 400 });
    if (fromB64u(p256dh).length !== 65 || fromB64u(auth).length < 16) throw Object.assign(Error('Subscrição inválida.'), { status: 400 });
    const st = store();
    st.subs = st.subs.filter(s => s.endpoint !== endpoint);
    if (st.subs.filter(s => s.userId === userId).length >= 10) st.subs = st.subs.filter(s => s !== st.subs.find(x => x.userId === userId));
    st.subs.push({ id: newId(), userId, endpoint, p256dh, auth, label: String(label || '').slice(0, 60), createdAt: new Date().toISOString() });
    save(); return devices(userId).length;
  }
  function unsubscribe(userId, endpoint) { const st = store(); const before = st.subs.length; st.subs = st.subs.filter(s => !(s.userId === userId && s.endpoint === endpoint)); if (st.subs.length !== before) save(); return devices(userId).length; }
  function removeUser(userId) { const st = store(); st.subs = st.subs.filter(s => s.userId !== userId); }

  function post(sub, body, headers) {
    return new Promise(resolve => {
      const u = new URL(sub.endpoint); const mod = u.protocol === 'http:' ? http : https;
      const req = mod.request(u, { method: 'POST', headers: { ...headers, 'Content-Length': body.length }, timeout: 15000 }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('timeout', () => req.destroy(Error('timeout')));
      req.on('error', e => { onError('Push:', e.message); resolve(0); });
      req.end(body);
    });
  }
  // Envia {title, body, url, tag} a todos os dispositivos da pessoa. Subscrições expiradas (404/410) são apagadas.
  async function sendToUser(userId, message, { urgency = 'normal', ttl = 24 * 3600 } = {}) {
    const st = store(); const list = st.subs.filter(s => s.userId === userId); if (!list.length) return 0;
    const payload = JSON.stringify(message).slice(0, 3000);
    let ok = 0, gone = [];
    await Promise.all(list.map(async s => {
      let body; try { body = encrypt(payload, s.p256dh, s.auth); } catch { gone.push(s.endpoint); return; }
      const aud = new URL(s.endpoint).origin;
      const status = await post(s, body, { TTL: String(ttl), Urgency: urgency, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Authorization: `vapid t=${vapidJwt({ audience: aud, subject: subject(), privateKey: st.vapid.privateKey })}, k=${st.vapid.publicKey}` });
      if (status >= 200 && status < 300) { ok++; s.lastOk = new Date().toISOString(); }
      else if (status === 404 || status === 410) gone.push(s.endpoint);
      else if (status) onError('Push recusado:', status, new URL(s.endpoint).hostname);
    }));
    if (gone.length) st.subs = st.subs.filter(s => !gone.includes(s.endpoint));
    save(); return ok;
  }
  return { publicKey, devices, hasDevices, subscribe, unsubscribe, removeUser, sendToUser };
}
module.exports = { createWebPush, encrypt, vapidJwt, generateVapid, validEndpoint };
