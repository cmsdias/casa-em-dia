'use strict';
// Convites por email: o administrador indica o email (e opcionalmente o nome e o perfil); a pessoa recebe uma ligação
// válida durante 7 dias para escolher a sua palavra-passe e criar a conta. Guarda-se só o hash do código da ligação.
// db.invites: {id,email,name,role,tokenHash,createdBy,createdAt,expiresAt,acceptedAt,personId,cancelledAt}
const crypto = require('node:crypto');
const VALID_DAYS = 7;
const ROLES = { manager: 'Gestor da casa', resident: 'Morador', collaborator: 'Colaborador' };
const hash = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const TOKEN_RE = /^[A-Za-z0-9_-]{40,64}$/;

function createInvites({ getDb, save, newId }) {
  const list = () => { const d = getDb(); if (!Array.isArray(d.invites)) d.invites = []; return d.invites; };
  const isPending = x => !x.acceptedAt && !x.cancelledAt && Date.parse(x.expiresAt) > Date.now();
  const view = x => ({ id: x.id, email: x.email, name: x.name || '', role: x.role, roleLabel: ROLES[x.role] || 'Morador', createdBy: x.createdBy, createdAt: x.createdAt, expiresAt: x.expiresAt, sentAt: x.sentAt || x.createdAt });
  function pending() { return list().filter(isPending).map(view); }
  function issue(x) { const token = crypto.randomBytes(32).toString('base64url'); x.tokenHash = hash(token); x.sentAt = new Date().toISOString(); x.expiresAt = new Date(Date.now() + VALID_DAYS * 86400_000).toISOString(); return token; }
  function create({ email, name, role, by }) {
    // Um novo convite para o mesmo email substitui o anterior.
    for (const x of list()) if (isPending(x) && x.email === email) x.cancelledAt = new Date().toISOString();
    const x = { id: newId(), email, name: String(name || '').trim().slice(0, 80), role: ROLES[role] ? role : 'resident', createdBy: by, createdAt: new Date().toISOString() };
    const token = issue(x); list().push(x);
    if (list().length > 500) getDb().invites = list().filter(i => isPending(i)).concat(list().filter(i => !isPending(i)).slice(-300));
    save(); return { invite: view(x), token };
  }
  function resend(id) { const x = list().find(i => i.id === id && isPending(i)); if (!x) return null; const token = issue(x); save(); return { invite: view(x), token }; }
  function cancel(id) { const x = list().find(i => i.id === id && isPending(i)); if (!x) return false; x.cancelledAt = new Date().toISOString(); save(); return true; }
  function find(token) { if (!TOKEN_RE.test(String(token || ''))) return null; const h = hash(token); return list().find(i => isPending(i) && i.tokenHash && crypto.timingSafeEqual(Buffer.from(i.tokenHash), Buffer.from(h))) || null; }
  function markAccepted(x, personId) { x.acceptedAt = new Date().toISOString(); x.personId = personId; delete x.tokenHash; }
  function cancelForEmail(email) { for (const x of list()) if (isPending(x) && x.email === email) x.cancelledAt = new Date().toISOString(); }
  return { pending, create, resend, cancel, find, markAccepted, cancelForEmail, view, ROLES, TOKEN_RE };
}

// Email do convite (texto e HTML com as cores da marca).
function inviteEmail({ inviter, name, roleLabel, link }) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const who = String(inviter || 'O administrador').split(' ')[0];
  const hello = name ? `Olá ${String(name).split(' ')[0]},` : 'Olá,';
  const subject = `${who} convidou-te para a Daily Casa`;
  const text = `${hello}\n\n${who} convidou-te para a Daily Casa, a app onde a casa organiza tarefas, rotinas e compras (perfil: ${roleLabel}).\n\nPara criares a tua conta, abre esta ligação e escolhe uma palavra-passe:\n${link}\n\nA ligação é válida durante 7 dias.\n\nDepois de entrares, no iPhone toca em Partilhar › Adicionar ao ecrã principal para teres a app sempre à mão.\n\nDaily Casa`;
  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;background:#F8F7F2;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#17261E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F2;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E6E2D6">
<tr><td style="background:#17261E;padding:22px 28px;color:#F8F7F2;font-size:20px;font-weight:600;letter-spacing:-0.3px">daily casa<span style="color:#C9A568">.</span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 14px;font-size:16px">${esc(hello)}</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#3F4B43"><b>${esc(who)}</b> convidou-te para a Daily Casa, a app onde a casa organiza tarefas, rotinas e compras.</p>
<p style="margin:0 0 22px;font-size:14px;color:#5F6A62">Perfil: ${esc(roleLabel)}</p>
<p style="margin:0"><a href="${esc(link)}" style="display:inline-block;background:#17261E;color:#F8F7F2;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:999px">Criar a minha conta</a></p>
<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#5F6A62">A ligação é válida durante 7 dias. Depois de entrares, no iPhone toca em <b>Partilhar › Adicionar ao ecrã principal</b> para teres a app sempre à mão.</p>
<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#8A948D;word-break:break-all">Se o botão não funcionar, copia este endereço: ${esc(link)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
module.exports = { createInvites, inviteEmail, ROLES };
