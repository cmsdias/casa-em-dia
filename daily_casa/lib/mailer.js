'use strict';
// Envio de email por SMTP (Gmail por omissão), sem dependências: TLS implícito na porta 465 e AUTH PLAIN.
// A conta e a palavra-passe de aplicação vêm das opções do add-on (campo de palavra-passe, nunca guardado em casa.json
// nem mostrado na app). Para testes, host/port/secure podem ser substituídos.
const tls = require('node:tls');
const netm = require('node:net');
const crypto = require('node:crypto');

const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const wrap = s => s.replace(/.{1,76}/g, m => m + '\r\n');
const encWord = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
const cleanHeader = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();
const validEmail = s => /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/.test(String(s || ''));

function buildMessage({ fromName, fromAddr, to, subject, text, html, inline = [], date = new Date() }) {
  const bound = () => 'dc-' + crypto.randomBytes(12).toString('hex');
  const domain = fromAddr.split('@')[1] || 'localhost';
  const headers = [
    `From: ${encWord(cleanHeader(fromName))} <${fromAddr}>`,
    `To: <${to}>`,
    `Subject: ${encWord(cleanHeader(subject))}`,
    `Date: ${date.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Auto-Submitted: auto-generated',
  ];
  const part = (type, body) => `Content-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(b64(body))}`;
  const alt = bound();
  let htmlPart = html ? part('text/html', html) : '';
  // Imagens incorporadas (logótipo): multipart/related, para aparecerem sem «mostrar imagens».
  if (html && inline.length) {
    const rel = bound();
    htmlPart = `Content-Type: multipart/related; boundary="${rel}"\r\n\r\n--${rel}\r\n${part('text/html', html)}` +
      inline.map(img => `--${rel}\r\nContent-Type: ${img.type}\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <${img.cid}>\r\nContent-Disposition: inline; filename="${img.name}"\r\n\r\n${wrap(Buffer.from(img.data).toString('base64'))}`).join('') + `--${rel}--\r\n`;
  }
  const body = `--${alt}\r\n${part('text/plain', text)}${htmlPart ? `--${alt}\r\n${htmlPart}` : ''}--${alt}--\r\n`;
  return `${headers.join('\r\n')}\r\nContent-Type: multipart/alternative; boundary="${alt}"\r\n\r\n${body}`;
}

const fs = require('node:fs'); const path = require('node:path');
let logoCache = null;
function logoInline() { try { logoCache ||= fs.readFileSync(path.join(__dirname, '..', 'public', 'email-logo.png')); return [{ cid: 'logo@dailycasa', type: 'image/png', name: 'daily-casa.png', data: logoCache }]; } catch { return []; } }

function createMailer({ getOptions, host = 'smtp.gmail.com', port = 465, secure = true, rejectUnauthorized = true, timeoutMs = 20000 } = {}) {
  function config() {
    const o = getOptions() || {};
    const user = String(o.email_remetente || '').trim();
    const pass = String(o.email_palavra_passe || '').replace(/\s+/g, '');
    const name = cleanHeader(o.email_nome || 'Daily Casa').slice(0, 60) || 'Daily Casa';
    return { user, pass, name, ready: validEmail(user) && pass.length >= 8 };
  }
  function status() { const c = config(); return { configured: c.ready, from: c.ready ? c.user : '', name: c.name }; }

  function send({ to, subject, text, html }) {
    const c = config();
    if (!c.ready) return Promise.reject(Object.assign(Error('O envio de email não está configurado.'), { code: 'NOT_CONFIGURED' }));
    if (!validEmail(to)) return Promise.reject(Error('Endereço de email inválido.'));
    const message = buildMessage({ fromName: c.name, fromAddr: c.user, to, subject, text, html, inline: html ? logoInline() : [] });
    return new Promise((resolve, reject) => {
      const sock = secure ? tls.connect({ host, port, servername: host, rejectUnauthorized }) : netm.connect({ host, port });
      let buf = '', done = false, waiter = null;
      const finish = err => { if (done) return; done = true; clearTimeout(timer); try { sock.end(); } catch {} err ? reject(err) : resolve(); };
      const timer = setTimeout(() => finish(Error('O servidor de email não respondeu a tempo.')), timeoutMs);
      sock.setEncoding('utf8');
      sock.on('error', e => finish(Error('Não foi possível ligar ao servidor de email: ' + e.message)));
      sock.on('data', d => { buf += d; pump(); });
      // Lê uma resposta completa (linhas «250-…» continuam; «250 …» termina).
      function pump() {
        if (!waiter) return;
        const lines = buf.split('\r\n'); const end = lines.findIndex(l => /^\d{3} /.test(l));
        if (end === -1) return;
        const resp = lines.slice(0, end + 1); buf = lines.slice(end + 1).join('\r\n');
        const w = waiter; waiter = null; w({ code: Number(resp[end].slice(0, 3)), text: resp.join('\n') });
      }
      const read = () => new Promise(r => { waiter = r; pump(); });
      async function step(cmd, ok) {
        if (cmd !== null) sock.write(cmd + '\r\n');
        const r = await read();
        if (!ok.includes(r.code)) {
          const hint = r.code === 535 ? ' (confirma o email e a palavra-passe de aplicação nas opções do add-on)' : '';
          throw Error(`O servidor de email recusou o pedido: ${r.text.split('\n').pop().slice(4, 160)}${hint}`);
        }
        return r;
      }
      (async () => {
        await step(null, [220]);
        await step('EHLO daily-casa.local', [250]);
        await step('AUTH PLAIN ' + Buffer.from(`\0${c.user}\0${c.pass}`).toString('base64'), [235]);
        await step(`MAIL FROM:<${c.user}>`, [250]);
        await step(`RCPT TO:<${to}>`, [250, 251]);
        await step('DATA', [354]);
        await step(message.replace(/\r\n\./g, '\r\n..') + '.', [250]);
        sock.write('QUIT\r\n');
        finish();
      })().catch(finish);
    });
  }
  return { send, status, config };
}

// Modelo de email da marca (estilo «verde imersivo»): fundo verde-escuro, logótipo, cartão claro com título
// (última palavra em dourado), texto, bloco opcional (ex.: código), botão dourado centrado e nota final.
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function brandHtml({ title, lead, block = '', cta = null, foot = '', preheader = '' }) {
  const t = escH(title).replace(/(\S+[.!?])$/, '<span style="color:#A9843F">$1</span>');
  const F = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escH(title)}</title></head>
<body style="margin:0;padding:0;background:#17261E">${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escH(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17261E;font-family:${F}"><tr><td align="center" style="padding:32px 14px">
<img src="cid:logo@dailycasa" width="190" height="60" alt="daily casa" style="display:block;margin:0 auto;border:0;color:#F8F7F2;font-size:22px;font-weight:600">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin-top:24px;background:#F8F7F2;border-radius:22px"><tr><td style="padding:28px 24px;color:#17261E">
<div style="font-size:28px;font-weight:700;letter-spacing:-1px;line-height:1.1">${t}</div>
<p style="margin:12px 0 22px;font-size:15px;line-height:1.55;color:#3F4B43">${lead}</p>${block}
${cta ? `<p style="margin:24px 0 0;text-align:center"><a href="${escH(cta.url)}" style="display:inline-block;background:#C9A568;color:#17261E;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px">${escH(cta.label)}</a></p>` : ''}
${foot ? `<p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#5F6A62">${foot}</p>` : ''}
</td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#A9B8AC">A casa em dia, todos os dias.</p>
</td></tr></table></body></html>`;
}
const codeBlock = code => `<div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#17261E;color:#F8F7F2;border-radius:14px;padding:16px 0">${escH(String(code).replace(/^(\d{3})(\d{3})$/, '$1 $2'))}</div>`;

// Email com o código de recuperação.
function resetEmail({ name, code, appUrl }) {
  const first = String(name || '').split(' ')[0] || 'Olá';
  const text = `Olá ${first},\n\nO teu código para escolher uma nova palavra-passe na Daily Casa é:\n\n${code}\n\nÉ válido durante 15 minutos.${appUrl ? `\n\nAbrir a app: ${appUrl}` : ''}\n\nSe não foste tu a pedir, ignora este email: a tua palavra-passe não muda.\n\nDaily Casa`;
  const html = brandHtml({ title: 'Recupera o acesso.', preheader: `O teu código é ${code}`, lead: `Olá ${escH(first)}, usa este código para escolher uma nova palavra-passe. É válido durante 15 minutos.`, block: codeBlock(code), cta: appUrl ? { label: 'Abrir a Daily Casa', url: appUrl } : null, foot: 'Se não foste tu a pedir, ignora este email: a tua palavra-passe não muda.' });
  return { subject: 'Código para recuperar a palavra-passe', text, html };
}
function testEmail({ name, appUrl }) {
  const first = String(name || '').split(' ')[0] || 'Olá';
  const text = `Olá ${first},\n\nEste é um email de teste da Daily Casa. Se o recebeste, a recuperação de palavra-passe por email está a funcionar.${appUrl ? `\n\n${appUrl}` : ''}\n\nDaily Casa`;
  const html = brandHtml({ title: 'Está tudo a funcionar.', lead: `Olá ${escH(first)}, este é um email de teste. A partir de agora, os códigos de recuperação e os convites chegam por aqui.` });
  return { subject: 'Email de teste', text, html };
}
module.exports = { createMailer, buildMessage, resetEmail, testEmail, validEmail, brandHtml, escH };
