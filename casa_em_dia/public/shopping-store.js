/* Daily Casa — Compras: modo «na loja» (2.0)
 * Lista em letra grande, ordenada pela ordem habitual dos corredores, com o ecrã sempre ligado.
 * Tocar num produto põe-no no carrinho (e tira-o da lista de quem está em casa, em poucos segundos).
 */
'use strict';
let wakeLock=null;
async function keepAwake(on){try{if(on&&'wakeLock'in navigator&&document.visibilityState==='visible'){wakeLock=await navigator.wakeLock.request('screen');}else if(!on&&wakeLock){await wakeLock.release();wakeLock=null;}}catch{wakeLock=null;}}
document.addEventListener('visibilitychange',()=>{if(modal?.type==='store-mode'&&document.visibilityState==='visible')keepAwake(true);});
const aisleRank=c=>{const i=SHOP_CATEGORIES.indexOf(c||'Outros');return i<0?SHOP_CATEGORIES.length:i;};
modalRenderers['store-mode']=holder=>{
 const all=shopping();const open=all.filter(x=>!x.purchased).sort((a,b)=>aisleRank(a.category)-aisleRank(b.category)||a.title.localeCompare(b.title,'pt-PT'));
 const inCart=all.filter(x=>x.purchased&&modal.session.includes(x.id));
 const groups={};open.forEach(x=>(groups[x.category||'Outros']??=[]).push(x));
 const row=(x,done)=>`<button type="button" class="store-item ${done?'done':''}" data-action="store-toggle" data-id="${esc(x.id)}" aria-pressed="${done}"><span class="store-check">${done?ico('check'):''}</span><span class="store-name">${esc(x.title)}</span><span class="store-qty">${esc(CasaUnits.format(x.quantity,x.unit))}</span></button>`;
 holder.innerHTML=`<div class="store-mode" role="dialog" aria-modal="true" aria-label="Modo loja"><header class="store-head"><div><span class="eyebrow">NA LOJA</span><h2>${open.length?`Faltam ${open.length}`:'Está tudo no carrinho'}</h2></div><button type="button" class="button" data-action="store-close">${ico('check')} Terminar</button></header>
 <div class="store-body">${Object.entries(groups).map(([c,items])=>`<h3>${esc(c)}</h3>${items.map(x=>row(x,false)).join('')}`).join('')||'<p class="store-empty">Nada por comprar. Bom trabalho.</p>'}
 ${inCart.length?`<h3>No carrinho · ${inCart.length}</h3>${inCart.map(x=>row(x,true)).join('')}`:''}</div>
 <p class="store-foot">${'wakeLock'in navigator?'O ecrã fica ligado enquanto estiveres neste modo.':'Neste dispositivo o ecrã pode desligar-se sozinho.'}</p></div>`;
};
actionHandlers.push(async(name,el)=>{
 switch(name){
  case 'store-open':modal={type:'store-mode',session:[]};renderModal();keepAwake(true);return true;
  case 'store-toggle':{const it=shopping().find(x=>x.id===el.dataset.id);if(!it)return true;const v=!it.purchased;it.purchased=v;if(v&&!modal.session.includes(it.id))modal.session.push(it.id);renderModal();
   try{await api('/api/shopping/'+it.id,'PATCH',{purchased:v});}catch(e){it.purchased=!v;renderModal();toast(e.message);}return true;}
  case 'store-close':{const n=modal?.session?.length||0;modal=null;keepAwake(false);await reload();if(n)toast(`${plural(n,'produto comprado','produtos comprados')}. Os comprados ficam em «Todas» até os limpares.`);return true;}
 }
 return false;
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.type==='store-mode'){keepAwake(false);}});
