// Calendário de manutenção sazonal (clima do litoral norte de Portugal).
// Lista inicial editável: cada casa pode desativar, alterar ou acrescentar trabalhos.
// Usado pelo servidor (require) e pela demonstração (window.__CASA_SEASONAL__).
(function(root){
'use strict';
const DEFAULTS=[
  {key:'podar-fruteiras',title:'Podar árvores de fruto e roseiras',months:[1,2],room:'Jardim',category:'Manutenção',minutes:120,notes:'Poda de inverno, com tempo seco e fora dos períodos de geada.'},
  {key:'tratamento-inverno',title:'Tratamento de inverno das fruteiras (calda bordalesa)',months:[2],room:'Jardim',category:'Manutenção',minutes:45,notes:'Antes do abrolhamento; repetir após chuvas fortes se necessário.'},
  {key:'seguranca',title:'Testar detetores de fumo e verificar o extintor',months:[1,7],room:'Geral',category:'Manutenção',minutes:20,notes:'Trocar pilhas dos detetores e confirmar a validade do extintor.'},
  {key:'relvado-primavera',title:'Escarificar, arejar e adubar o relvado',months:[3],room:'Jardim',category:'Manutenção',minutes:120,notes:'Adubo de libertação lenta; ressementar as falhas.'},
  {key:'rega-revisao',title:'Rever o sistema de rega (programador, gotejadores e aspersores)',months:[3],room:'Jardim',category:'Manutenção',minutes:60,notes:'Limpar filtros, trocar a pilha do programador e acertar horários.'},
  {key:'filtros-maquinas',title:'Limpar filtros da máquina de lavar roupa e da loiça',months:[3,9],room:'Lavandaria',category:'Limpeza',minutes:30,notes:''},
  {key:'mobiliario-exterior',title:'Limpar e tratar o mobiliário do alpendre',months:[4],room:'Alpendre',category:'Limpeza',minutes:60,notes:'Lavar almofadas e guarda-sol antes da época de uso.'},
  {key:'vidros-exteriores',title:'Lavar vidros e caixilharias exteriores',months:[4,10],room:'Geral',category:'Limpeza',minutes:150,notes:'Verificar vedantes e calhas de escoamento das janelas.'},
  {key:'ralos-terraco',title:'Limpar ralos e verificar o escoamento do terraço',months:[4,10],room:'Terraço',category:'Manutenção',minutes:30,notes:''},
  {key:'madeiras-exteriores',title:'Tratar madeiras exteriores (óleo ou verniz)',months:[5],room:'Alpendre',category:'Manutenção',minutes:180,notes:'Com tempo seco e sem sol direto forte.'},
  {key:'ar-condicionado',title:'Limpar filtros do ar condicionado e ventoinhas',months:[5],room:'Geral',category:'Limpeza',minutes:45,notes:''},
  {key:'mosquiteiras',title:'Verificar e limpar redes mosquiteiras',months:[5],room:'Geral',category:'Manutenção',minutes:30,notes:''},
  {key:'cobertura-solo',title:'Renovar a cobertura do solo (casca de pinheiro ou mulch)',months:[6],room:'Jardim',category:'Manutenção',minutes:90,notes:'Reduz a rega e as infestantes durante o verão.'},
  {key:'rega-verao',title:'Ajustar a rega ao calor e verificar fugas',months:[7],room:'Jardim',category:'Manutenção',minutes:20,notes:'Regar ao fim do dia ou de madrugada.'},
  {key:'cozinha-profunda',title:'Limpeza profunda da cozinha (forno, frigorífico, exaustor)',months:[8],room:'Cozinha',category:'Limpeza',minutes:150,notes:'Lavar ou trocar os filtros do exaustor.'},
  {key:'relvado-outono',title:'Adubação de outono do relvado',months:[9],room:'Jardim',category:'Manutenção',minutes:60,notes:'Adubo rico em potássio para preparar o inverno.'},
  {key:'caldeira',title:'Revisão da caldeira ou do esquentador',months:[9],room:'Geral',category:'Manutenção',minutes:60,notes:'Marcar com o técnico antes do frio.'},
  {key:'caleiras',title:'Limpar caleiras e tubos de queda',months:[10,11],room:'Terraço',category:'Manutenção',minutes:90,notes:'Depois da queda das folhas e antes das chuvas fortes.'},
  {key:'guardar-exterior',title:'Guardar almofadas e proteger o mobiliário exterior',months:[10],room:'Alpendre',category:'Arrumação',minutes:45,notes:''},
  {key:'radiadores',title:'Purgar os radiadores',months:[10],room:'Geral',category:'Manutenção',minutes:30,notes:''},
  {key:'plantacao',title:'Plantar árvores, arbustos e bolbos de primavera',months:[11],room:'Jardim',category:'Manutenção',minutes:120,notes:'Época de plantação: o solo húmido favorece o enraizamento.'},
  {key:'impermeabilizacao',title:'Verificar impermeabilização e juntas do terraço',months:[11],room:'Terraço',category:'Manutenção',minutes:45,notes:'Procurar fissuras, juntas soltas e sinais de infiltração por baixo.'},
  {key:'humidades',title:'Verificar humidades e bolores (cantos, roupeiros, WC)',months:[12],room:'Geral',category:'Manutenção',minutes:45,notes:'Arejar e usar desumidificador onde necessário.'},
];
if(typeof module!=='undefined'&&module.exports)module.exports={DEFAULTS};
else root.__CASA_SEASONAL__=DEFAULTS.map(x=>({id:'s-'+x.key,...x,active:true}));
})(typeof window!=='undefined'?window:globalThis);
