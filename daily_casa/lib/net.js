'use strict';
// Reconhecer o proxy (Cloudflare Tunnel através do add-on Cloudflared).
// Os cabeçalhos X-Forwarded-Proto e CF-Connecting-IP só são aceites quando a ligação vem de um proxy de confiança
// (por omissão, a rede interna dos add-ons do Home Assistant, 172.30.33.0/24). De qualquer outra origem são ignorados,
// para que ninguém na rede de casa ou na Internet consiga fingir outro IP ou HTTPS.
const net = require('node:net');

function parseCidr(cidr) {
  const [addr, bitsRaw] = String(cidr).trim().split('/');
  if (!net.isIPv4(addr)) return null;
  const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  return { base: toInt(addr), mask: bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0 };
}
function toInt(ip) { return ip.split('.').reduce((n, x) => ((n << 8) + Number(x)) >>> 0, 0); }
function plainIp(ip) { const s = String(ip || ''); return s.startsWith('::ffff:') && net.isIPv4(s.slice(7)) ? s.slice(7) : s; }

function createNet({ trusted = ['172.30.33.0/24'] } = {}) {
  const ranges = trusted.map(parseCidr).filter(Boolean);
  const isTrusted = ip => { const v = plainIp(ip); if (!net.isIPv4(v)) return false; const n = toInt(v); return ranges.some(r => ((n & r.mask) >>> 0) === ((r.base & r.mask) >>> 0)); };
  function info(req) {
    if (req._net) return req._net;
    const remote = plainIp(req.socket?.remoteAddress);
    const viaProxy = isTrusted(remote);
    let client = remote;
    if (viaProxy) {
      const cf = String(req.headers['cf-connecting-ip'] || '').trim();
      const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
      const cand = net.isIP(cf) ? cf : xff.length && net.isIP(xff[xff.length - 1]) ? xff[xff.length - 1] : '';
      if (cand) client = plainIp(cand);
    }
    const https = !!req.socket?.encrypted || (viaProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
    // Endereço público (só quando chega pelo proxy, em HTTPS e com um nome de domínio válido).
    const origin = viaProxy && https && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host) ? `https://${host}` : '';
    return (req._net = { remote, client, viaProxy, https, origin });
  }
  return { info, isTrusted };
}
module.exports = { createNet, parseCidr };
