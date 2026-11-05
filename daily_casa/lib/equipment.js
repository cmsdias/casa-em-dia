'use strict';
// Equipamentos e documentos da casa (caldeira, ar condicionado, eletrodomésticos, rega…).
// Guardados em db.equipment; os documentos (PDF ou imagem) ficam em /data/docs/<id>.<ext>, fora do JSON.
// Ver: administrador, gestor e moradores. Alterar: administrador e gestor. Colaboradores não têm acesso.
// Revisões periódicas: 30 dias antes da próxima revisão é criada uma tarefa ligada ao equipamento;
// ao concluir essa tarefa (ou ao marcar «Revisão feita») a data seguinte é calculada automaticamente.
const fs = require('node:fs'), path = require('node:path');

const CATEGORIES = ['Aquecimento e águas quentes', 'Climatização', 'Eletrodomésticos', 'Canalização', 'Eletricidade', 'Jardim e rega', 'Segurança', 'Cobertura e fachada', 'Outros'];
const DOC_KINDS = { manual: 'Manual', fatura: 'Fatura', garantia: 'Garantia', contrato: 'Contrato', foto: 'Fotografia', outro: 'Outro' };
const MIME = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const DOC_MAX = 8 * 1024 * 1024, DOCS_PER_ITEM = 20, ITEMS_MAX = 300, LEAD_DAYS = 30;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function httpError(status, msg) { const e = Error(msg); e.status = status; return e; }
const str = (v, max) => String(v ?? '').trim().slice(0, max);
function isoDate(v) { const d = str(v, 10); if (!d) return ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) !== d) throw httpError(400, 'Data inválida.'); return d; }
function addMonths(iso, n) { const d = new Date(iso + 'T12:00:00Z'); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0, 10); }
const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
function sniff(buf) {
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return '';
}

function createEquipment({ getDb, save, newId, todayISO, dataDir, roleOf, notify, onError = console.error }) {
  const DOC_DIR = path.join(dataDir, 'docs'); fs.mkdirSync(DOC_DIR, { recursive: true });
  const list = () => { const d = getDb(); if (!Array.isArray(d.equipment)) d.equipment = []; return d.equipment; };
  const canView = u => ['admin', 'manager', 'resident'].includes(roleOf(u));
  const canEdit = u => ['admin', 'manager'].includes(roleOf(u));
  const docPath = doc => path.join(DOC_DIR, doc.id + '.' + (MIME[doc.mime] || 'bin'));

  function clean(b, item) {
    const out = { ...item };
    if ('name' in b) { out.name = str(b.name, 80); if (!out.name) throw httpError(400, 'Indica o nome do equipamento.'); }
    for (const [k, max] of [['room', 70], ['brand', 60], ['model', 80], ['serial', 80], ['supplier', 80], ['techName', 80], ['notes', 1500]]) if (k in b) out[k] = str(b[k], max);
    if ('category' in b) { const c = str(b.category, 60); out.category = CATEGORIES.includes(c) ? c : 'Outros'; }
    if ('techPhone' in b) { const t = str(b.techPhone, 30); if (t && !/^\+?[\d\s().-]{6,20}$/.test(t)) throw httpError(400, 'Telefone do técnico inválido.'); out.techPhone = t; }
    if ('techEmail' in b) { const e = str(b.techEmail, 120).toLowerCase(); if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw httpError(400, 'Email do técnico inválido.'); out.techEmail = e; }
    for (const k of ['purchaseDate', 'warrantyUntil', 'lastService', 'nextService']) if (k in b) out[k] = isoDate(b[k]);
    if ('serviceEveryMonths' in b) { const n = Number(b.serviceEveryMonths || 0); if (!Number.isInteger(n) || n < 0 || n > 120) throw httpError(400, 'Periodicidade da revisão inválida (0 a 120 meses).'); out.serviceEveryMonths = n; }
    // Sem data marcada mas com periodicidade e última revisão: calcula a próxima.
    if (out.serviceEveryMonths && !out.nextService && out.lastService) out.nextService = addMonths(out.lastService, out.serviceEveryMonths);
    if (!out.serviceEveryMonths && !('nextService' in b)) out.nextService = out.nextService || '';
    out.updatedAt = new Date().toISOString();
    return out;
  }
  const view = () => list().map(x => ({ ...x, docs: (x.docs || []).map(({ id, name, mime, size, kind, at, by }) => ({ id, name, mime, size, kind, at, by })) }));

  function openTaskFor(eqId) { return getDb().tasks.find(t => t.equipmentId === eqId && t.status !== 'done'); }
  // Marca a revisão como feita: guarda a data, calcula a próxima e conclui a tarefa ligada, se houver.
  function serviceDone(item, date, user) {
    item.lastService = date; item.nextService = item.serviceEveryMonths ? addMonths(date, item.serviceEveryMonths) : '';
    (item.serviceLog ||= []).push({ date, by: user?.id || null }); if (item.serviceLog.length > 50) item.serviceLog = item.serviceLog.slice(-50);
    item.updatedAt = new Date().toISOString();
  }
  // Chamado quando uma tarefa é concluída.
  function onTaskCompleted(task, user) {
    if (!task.equipmentId) return false; const item = list().find(x => x.id === task.equipmentId); if (!item) return false;
    serviceDone(item, todayISO(), user); return true;
  }

  // Uma vez por dia: tarefas de revisão a 30 dias e aviso de garantias a terminar.
  function tick() {
    const d = getDb(); const st = (d.notifState ||= {}); const today = todayISO(); if (st.lastEquipment === today) return false;
    st.lastEquipment = today; let changed = true;
    const admin = d.people.find(p => roleOf(p) === 'admin' && p.active !== false);
    const managers = d.people.filter(p => ['admin', 'manager'].includes(roleOf(p)) && p.active !== false);
    for (const it of list()) {
      if (it.nextService && it.nextService <= addDays(today, LEAD_DAYS) && !openTaskFor(it.id)) {
        const notes = ['Revisão periódica' + (it.serviceEveryMonths ? ` (de ${it.serviceEveryMonths} em ${it.serviceEveryMonths} meses)` : ''), [it.brand, it.model].filter(Boolean).join(' '), it.techName ? `Técnico: ${it.techName}${it.techPhone ? ' · ' + it.techPhone : ''}` : ''].filter(Boolean).join('\n');
        d.tasks.push({ id: newId(), title: `Revisão: ${it.name}`, room: it.room || 'Geral', notes, kind: 'project', priority: 'P2', estimatedMinutes: 60, category: 'Manutenção', thisWeek: false, subtasks: [], status: 'todo', repeat: 'none', dueDate: it.nextService, assignedTo: null, suggested: false, createdAt: new Date().toISOString(), createdBy: admin?.id || null, visibility: 'shared', equipmentId: it.id });
        for (const p of managers) notify(p.id, 'equipment', `Revisão: ${it.name}`, `Marcada para ${it.nextService.split('-').reverse().join('/')}. A tarefa já está na lista.`, { page: 'equipment', equipmentId: it.id }, `svc:${it.id}:${it.nextService}`);
      }
      if (it.warrantyUntil && it.warrantyUntil >= today && it.warrantyUntil <= addDays(today, LEAD_DAYS))
        for (const p of managers) notify(p.id, 'equipment', `Garantia a terminar: ${it.name}`, `Válida até ${it.warrantyUntil.split('-').reverse().join('/')}. Se houver alguma avaria, é a altura de a reportar.`, { page: 'equipment', equipmentId: it.id }, `war:${it.id}:${it.warrantyUntil}`);
    }
    if (changed) save(); return changed;
  }

  // Rotas /api/equipment… Devolve undefined se a rota não for desta área.
  // Para os ficheiros devolve {file:{path,mime,name}}.
  function handle(user, method, p, b) {
    if (!(p === '/api/equipment' || p.startsWith('/api/equipment/'))) return undefined;
    if (!canView(user)) throw httpError(403, 'Sem acesso aos equipamentos da casa.');
    const parts = p.split('/').slice(3); // [id, 'docs', docId] | [id, 'service']
    if (!parts.length) {
      if (method === 'GET') return { equipment: view() };
      if (method === 'POST') {
        if (!canEdit(user)) throw httpError(403, 'Só o administrador e o gestor podem acrescentar equipamentos.');
        if (list().length >= ITEMS_MAX) throw httpError(400, 'Atingiste o número máximo de equipamentos.');
        const item = clean({ category: 'Outros', ...b }, { id: newId(), name: '', docs: [], serviceEveryMonths: 0, createdBy: user.id, createdAt: new Date().toISOString() });
        if (!item.name) throw httpError(400, 'Indica o nome do equipamento.');
        list().push(item); save(); return { item, equipment: view() };
      }
      return undefined;
    }
    const item = list().find(x => x.id === parts[0]); if (!item) throw httpError(404, 'Equipamento não encontrado.');
    if (parts.length === 1) {
      if (method === 'GET') return { item: view().find(x => x.id === item.id) };
      if (!canEdit(user)) throw httpError(403, 'Só o administrador e o gestor podem alterar equipamentos.');
      if (method === 'PATCH') { Object.assign(item, clean(b, item)); const t = openTaskFor(item.id); if (t && item.nextService && t.dueDate !== item.nextService) t.dueDate = item.nextService; save(); return { item, equipment: view() }; }
      if (method === 'DELETE') {
        for (const doc of item.docs || []) try { fs.unlinkSync(docPath(doc)); } catch {}
        getDb().equipment = list().filter(x => x.id !== item.id);
        for (const t of getDb().tasks) if (t.equipmentId === item.id) delete t.equipmentId;
        save(); return { ok: true, equipment: view() };
      }
      return undefined;
    }
    if (parts[1] === 'service' && parts.length === 2 && method === 'POST') {
      if (!canEdit(user)) throw httpError(403, 'Sem permissão.');
      const date = isoDate(b.date) || todayISO(); if (date > todayISO()) throw httpError(400, 'A data da revisão não pode ser no futuro.');
      serviceDone(item, date, user);
      const t = openTaskFor(item.id); if (t) { t.status = 'done'; t.updatedAt = new Date().toISOString(); getDb().history.push({ id: newId(), taskId: t.id, title: t.title, kind: t.kind, assignedTo: t.assignedTo, by: user.id, at: new Date().toISOString() }); }
      save(); return { item, equipment: view() };
    }
    if (parts[1] === 'docs') {
      if (parts.length === 2 && method === 'POST') {
        if (!canEdit(user)) throw httpError(403, 'Só o administrador e o gestor podem acrescentar documentos.');
        if ((item.docs || []).length >= DOCS_PER_ITEM) throw httpError(400, `No máximo ${DOCS_PER_ITEM} documentos por equipamento.`);
        if (typeof b.data !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(b.data)) throw httpError(400, 'Ficheiro inválido.');
        const buf = Buffer.from(b.data, 'base64'); if (!buf.length) throw httpError(400, 'Ficheiro vazio.'); if (buf.length > DOC_MAX) throw httpError(400, 'O ficheiro tem mais de 8 MB.');
        const mime = sniff(buf); if (!mime) throw httpError(400, 'Só são aceites PDF, JPEG, PNG ou WebP.');
        const doc = { id: newId(), name: str(b.name, 120) || 'Documento', mime, size: buf.length, kind: DOC_KINDS[b.kind] ? b.kind : 'outro', at: new Date().toISOString(), by: user.id };
        fs.writeFileSync(docPath(doc), buf, { mode: 0o600 }); (item.docs ||= []).push(doc); item.updatedAt = doc.at; save();
        return { doc, item, equipment: view() };
      }
      const doc = (item.docs || []).find(x => x.id === parts[2]); if (!doc || !ID.test(doc.id)) throw httpError(404, 'Documento não encontrado.');
      if (parts.length === 3 && method === 'GET') return { file: { path: docPath(doc), mime: doc.mime, name: doc.name } };
      if (parts.length === 3 && method === 'DELETE') {
        if (!canEdit(user)) throw httpError(403, 'Sem permissão.');
        try { fs.unlinkSync(docPath(doc)); } catch {}
        item.docs = item.docs.filter(x => x.id !== doc.id); save(); return { item, equipment: view() };
      }
    }
    return undefined;
  }
  return { CATEGORIES, DOC_KINDS, canView, canEdit, view, handle, tick, onTaskCompleted, addMonths };
}
module.exports = { createEquipment, CATEGORIES, DOC_KINDS };
