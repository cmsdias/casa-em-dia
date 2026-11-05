// Aplica o tema (claro/escuro) antes de a página ser desenhada, para não haver «flash» de cor.
// Preferência por dispositivo: «auto» (segue o sistema), «light» ou «dark».
(function(){var p='auto';try{p=localStorage.getItem('casa-tema')||'auto';}catch(e){}
 var mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
 function apply(){var dark=p==='dark'||(p==='auto'&&mq&&mq.matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',dark?'#131916':'#17261E');}
 window.casaSetTheme=function(v){p=v;try{localStorage.setItem('casa-tema',v);}catch(e){}apply();};
 window.casaThemePref=function(){return p;};
 apply();if(mq&&mq.addEventListener)mq.addEventListener('change',apply);})();

// 2.3.3 · App instalada no iPhone: a página ocupa o ecrã todo (barra de estado translúcida). Se env(safe-area-inset-top) vier a 0
// — acontece em algumas versões do iOS ao abrir pelo ícone — usa a altura da barra de estado do modelo, para nada passar por baixo das horas e da bateria.
(function(){
 var standalone=window.navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
 if(!standalone||!/iPhone|iPod/.test(navigator.userAgent))return;
 function fix(){
  var d=document.createElement('div');d.style.cssText='position:fixed;top:0;left:0;width:1px;visibility:hidden;height:env(safe-area-inset-top,0px)';
  (document.body||document.documentElement).appendChild(d);var h=d.getBoundingClientRect().height;d.remove();
  var portrait=window.innerHeight>window.innerWidth,full=Math.abs(window.innerHeight-(portrait?screen.height:screen.width))<2;
  if(h>0||!portrait||!full){document.documentElement.style.removeProperty('--sat');return;}
  var sh=screen.height;document.documentElement.style.setProperty('--sat',(sh>=874?62:sh>=852?59:sh>=812?47:20)+'px');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();
 window.addEventListener('resize',fix);window.addEventListener('orientationchange',function(){setTimeout(fix,300);});
})();

// 2.3.9 · Véu da barra de estado: só aparece depois de deslizar.
(function(){var on=false;function f(){var v=(window.scrollY||document.documentElement.scrollTop)>6;if(v!==on){on=v;document.documentElement.classList.toggle('is-scrolled',v);}}
 window.addEventListener('scroll',f,{passive:true});document.addEventListener('DOMContentLoaded',f);})();
