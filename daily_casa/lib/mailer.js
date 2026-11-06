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

function buildMessage({ fromName, fromAddr, to, subject, text, html, date = new Date() }) {
  const boundary = 'dc-' + crypto.randomBytes(12).toString('hex');
  const domain = fromAddr.split('@')[1] || 'localhost';
  const headers = [
    `From: ${encWord(cleanHeader(fromName))} <${fromAddr}>`,
    `To: <${to}>`,
    `Subject: ${encWord(cleanHeader(subject))}`,
    `Date: ${date.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Auto-Submitted: auto-generated',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(b64(body))}`;
  return `${headers.join('\r\n')}\r\n\r\n${part('text/plain', text)}${html ? part('text/html', html) : ''}--${boundary}--\r\n`;
}

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
    const message = buildMessage({ fromName: c.name, fromAddr: c.user, to, subject, text, html });
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

// Email com o código de recuperação (texto simples e HTML com as cores da marca).
function resetEmail({ name, code, appUrl }) {
  const first = String(name || '').split(' ')[0] || 'Olá';
  const text = `Olá ${first},\n\nO teu código para escolher uma nova palavra-passe na Daily Casa é:\n\n${code}\n\nÉ válido durante 15 minutos.${appUrl ? `\n\nAbrir a app: ${appUrl}` : ''}\n\nSe não foste tu a pedir, ignora este email: a tua palavra-passe não muda.\n\nDaily Casa`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#F8F7F2;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#17261E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F2;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E6E2D6">
<tr><td style="background:#17261E;padding:22px 28px;color:#F8F7F2;font-size:20px;font-weight:600;letter-spacing:-0.3px">daily casa<span style="color:#C9A568">.</span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 14px;font-size:16px">Olá ${esc(first)},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3F4B43">O teu código para escolher uma nova palavra-passe:</p>
<div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#F8F7F2;border-radius:12px;padding:16px 0;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace">${esc(code)}</div>
<p style="margin:18px 0 0;font-size:14px;color:#5F6A62">É válido durante 15 minutos.</p>
${appUrl ? `<p style="margin:22px 0 0"><a href="${esc(appUrl)}" style="display:inline-block;background:#17261E;color:#F8F7F2;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:999px">Abrir a Daily Casa</a></p>` : ''}
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5F6A62">Se não foste tu a pedir, ignora este email: a tua palavra-passe não muda.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: 'Código para recuperar a palavra-passe', text, html };
}
function testEmail({ name, appUrl }) {
  const first = String(name || '').split(' ')[0] || 'Olá';
  const text = `Olá ${first},\n\nEste é um email de teste da Daily Casa. Se o recebeste, a recuperação de palavra-passe por email está a funcionar.${appUrl ? `\n\n${appUrl}` : ''}\n\nDaily Casa`;
  return { subject: 'Email de teste', text };
}
module.exports = { createMailer, buildMessage, resetEmail, testEmail, validEmail };
