// Aplica o tema (claro/escuro) antes de a página ser desenhada, para não haver «flash» de cor.
// Preferência por dispositivo: «auto» (segue o sistema), «light» ou «dark».
(function(){var p='auto';try{p=localStorage.getItem('casa-tema')||'auto';}catch(e){}
 var mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
 function apply(){var dark=p==='dark'||(p==='auto'&&mq&&mq.matches);document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',dark?'#131916':'#17261E');}
 window.casaSetTheme=function(v){p=v;try{localStorage.setItem('casa-tema',v);}catch(e){}apply();};
 window.casaThemePref=function(){return p;};
 apply();if(mq&&mq.addEventListener)mq.addEventListener('change',apply);})();
