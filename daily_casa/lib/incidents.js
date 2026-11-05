'use strict';
// Ocorrências (2.3): algo partiu, avariou, verteu ou falta. Qualquer pessoa pode reportar (incluindo colaboradores).
// db.incidents: {id,title,description,room,type,severity,status,reportedBy,at,photos[],equipmentId,taskId,resolution,resolvedBy,resolvedAt,updatedAt}
// Ver: administrador, gestor e moradores veem todas; colaboradores só as que reportaram.
// Gerir (estado, resolução, criar tarefa, eliminar): administrador e gestor. Quem reportou pode editar enquanto está aberta.
const fs = require('node:fs'), path = require('node:path');
const TYPES = { dano: 'Dano ou quebra', avaria: 'Avaria', agua: 'Fuga ou infiltração', seguranca: 'Segurança', falta: 'Falta de material', outro: 'Outro' };
const SEVERITY = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const STATUS = { open: 'Aberta', progress: 'Em resolução', resolved: 'Resolvida' };
const PRIORITY_BY_SEVERITY = { alta: 'P1', media: 'P2', baixa: 'P3' };
const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function httpError(status, msg) { const e = Error(msg); e.status = status; return e; }
const str = (v, max) => String(v ?? '').trim().slice(0, max);

function createIncidents({ getDb, save, newId, photoDir, roleOf, notify, pushHa = () => {}, makeTask }) {
  const list = () => { const d = getDb(); if (!Array.isArray(d.incidents)) d.incidents = []; return d.incidents; };
  const elevated = u => ['admin', 'manager'].includes(roleOf(u));
  const canSee = (u, x) => roleOf(u) !== 'collaborator' || x.reportedBy === u.id;
  const viewFor = u => list().filter(x => canSee(u, x));
  const first = id => (getDb().people.find(p => p.id === id)?.name || 'Alguém').split(' ')[0];
  const managers = (except) => getDb().people.filter(p => p.active !== false && elevated(p) && p.id !== except);
  const link = x => ({ page: 'incidents', incidentId: x.id });

  function clean(b, x) {
    const out = { ...x };
    if ('title' in b) { out.title = str(b.title, 140); if (!out.title) throw httpError(400, 'Descreve em poucas palavras o que aconteceu.'); }
    if ('description' in b) out.description = str(b.description, 2000);
    if ('room' in b) out.room = str(b.room, 70) || 'Geral';
    if ('type' in b) out.type = TYPES[b.type] ? b.type : 'outro';
    if ('severity' in b) out.severity = SEVERITY[b.severity] ? b.severity : 'media';
    if ('equipmentId' in b) { const id = str(b.equipmentId, 80); out.equipmentId = id && (getDb().equipment || []).some(e => e.id === id) ? id : ''; }
    out.updatedAt = new Date().toISOString();
    return out;
  }
  function removePhotos(x) { for (const ph of x.photos || []) if (PHOTO_ID.test(ph.id)) try { fs.unlinkSync(path.join(photoDir, ph.id + '.jpg')); } catch {} }

  // Quando a tarefa de reparação é concluída, a ocorrência fica resolvida.
  function onTaskCompleted(task, user) {
    const x = list().find(i => i.taskId === task.id && i.status !== 'resolved'); if (!x) return false;
    x.status = 'resolved'; x.resolution = x.resolution || `Resolvida com a tarefa «${task.title}».`; x.resolvedBy = user.id; x.resolvedAt = new Date().toISOString(); x.updatedAt = x.resolvedAt;
    if (x.reportedBy !== user.id) notify(x.reportedBy, 'incident', 'Ocorrência resolvida', x.title, link(x));
    return true;
  }

  function handle(user, method, p, b) {
    if (!(p === '/api/incidents' || p.startsWith('/api/incidents/'))) return undefined;
    const parts = p.split('/').slice(3);
    if (!parts.length) {
      if (method === 'GET') return { incidents: viewFor(user) };
      if (method === 'POST') {
        const x = clean({ type: 'dano', severity: 'media', room: 'Geral', ...b }, { id: newId(), title: '', description: '', status: 'open', reportedBy: user.id, at: new Date().toISOString(), photos: [], equipmentId: '', taskId: '' });
        if (!x.title) throw httpError(400, 'Descreve em poucas palavras o que aconteceu.');
        if (list().length > 2000) getDb().incidents = list().filter(i => i.status !== 'resolved').concat(list().filter(i => i.status === 'resolved').slice(-1500));
        list().push(x);
        for (const m of managers(user.id)) notify(m.id, 'incident', `${first(user.id)} reportou: ${x.title}`, `${TYPES[x.type]} · ${x.room} · gravidade ${SEVERITY[x.severity].toLowerCase()}`, link(x));
        if (x.severity === 'alta') for (const m of managers(user.id)) pushHa(m.id, 'Ocorrência urgente', `${x.title} · ${x.room}\nReportada por ${first(user.id)}`);
        save(); return { incident: x, incidents: viewFor(user) };
      }
      return undefined;
    }
    const x = list().find(i => i.id === parts[0]); if (!x || !canSee(user, x)) throw httpError(404, 'Ocorrência não encontrada.');
    const mine = x.reportedBy === user.id;
    if (parts.length === 1) {
      if (method === 'GET') return { incident: x };
      if (method === 'PATCH') {
        const manage = elevated(user);
        if (!manage && !(mine && x.status === 'open')) throw httpError(403, 'Só podes alterar ocorrências tuas enquanto estão abertas.');
        let next = clean(b, x);
        if (manage && 'status' in b) {
          if (!STATUS[b.status]) throw httpError(400, 'Estado inválido.');
          next.status = b.status;
          if (b.status === 'resolved' && x.status !== 'resolved') { next.resolvedBy = user.id; next.resolvedAt = new Date().toISOString(); if (x.reportedBy !== user.id) notify(x.reportedBy, 'incident', 'Ocorrência resolvida', x.title + (b.resolution ? ` · ${str(b.resolution, 300)}` : ''), link(x)); }
          if (b.status !== 'resolved') { delete next.resolvedBy; delete next.resolvedAt; }
        }
        if (manage && 'resolution' in b) next.resolution = str(b.resolution, 1000);
        Object.assign(x, next); save(); return { incident: x, incidents: viewFor(user) };
      }
      if (method === 'DELETE') {
        if (roleOf(user) !== 'admin' && !(mine && x.status === 'open')) throw httpError(403, 'Só o administrador pode eliminar ocorrências.');
        removePhotos(x); getDb().incidents = list().filter(i => i.id !== x.id); save(); return { ok: true, incidents: viewFor(user) };
      }
      return undefined;
    }
    if (parts[1] === 'task' && parts.length === 2 && method === 'POST') {
      if (!elevated(user)) throw httpError(403, 'Só o administrador ou o gestor podem criar a tarefa de reparação.');
      if (x.taskId && getDb().tasks.some(t => t.id === x.taskId && t.status !== 'done')) throw httpError(409, 'Esta ocorrência já tem uma tarefa aberta.');
      const t = makeTask({ title: str(b.title, 180) || `Reparar: ${x.title}`, room: x.room, priority: PRIORITY_BY_SEVERITY[x.severity] || 'P2', category: 'Manutenção', notes: [x.description, `Ocorrência reportada por ${first(x.reportedBy)} em ${x.at.slice(0, 10).split('-').reverse().join('/')}.`].filter(Boolean).join('\n'), assignedTo: b.assignedTo || null, dueDate: b.dueDate || '' }, user);
      x.taskId = t.id; x.status = 'progress'; x.updatedAt = new Date().toISOString(); save();
      return { incident: x, task: t, incidents: viewFor(user) };
    }
    if (parts[1] === 'photos') {
      if (parts.length === 2 && method === 'POST') {
        if (!mine && !elevated(user)) throw httpError(403, 'Sem permissão para acrescentar fotografias.');
        if ((x.photos || []).length >= 6) throw httpError(409, 'Cada ocorrência pode ter no máximo 6 fotografias.');
        const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+=*)$/.exec(typeof b.data === 'string' ? b.data : ''); if (!m) throw httpError(400, 'Fotografia inválida.');
        const buf = Buffer.from(m[1], 'base64'); if (buf.length > 2_200_000 || buf[0] !== 0xFF || buf[1] !== 0xD8) throw httpError(400, 'Fotografia inválida ou demasiado grande.');
        const pid = newId(); fs.writeFileSync(path.join(photoDir, pid + '.jpg'), buf, { mode: 0o600 });
        (x.photos ||= []).push({ id: pid, by: user.id, at: new Date().toISOString() }); x.updatedAt = new Date().toISOString(); save();
        return { incident: x, incidents: viewFor(user) };
      }
      const ph = (x.photos || []).find(f => f.id === parts[2]); if (!ph || !PHOTO_ID.test(ph.id)) throw httpError(404, 'Fotografia não encontrada.');
      if (parts.length === 3 && method === 'GET') return { file: { path: path.join(photoDir, ph.id + '.jpg'), mime: 'image/jpeg' } };
      if (parts.length === 3 && method === 'DELETE') {
        if (ph.by !== user.id && !elevated(user)) throw httpError(403, 'Só quem a acrescentou pode remover esta fotografia.');
        removePhotos({ photos: [ph] }); x.photos = x.photos.filter(f => f.id !== ph.id); save(); return { incident: x, incidents: viewFor(user) };
      }
    }
    return undefined;
  }
  return { TYPES, SEVERITY, STATUS, viewFor, handle, onTaskCompleted };
}
module.exports = { createIncidents };
