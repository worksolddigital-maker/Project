const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage();
  const r = await p.evaluate(()=>{const c=document.createElement('canvas');const g=c.getContext('webgl2');if(!g)return 'no webgl2';const d=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(d?d.UNMASKED_RENDERER_WEBGL:g.RENDERER)+' | maxtex '+g.getParameter(g.MAX_TEXTURE_SIZE)+' | floatRT '+!!g.getExtension('EXT_color_buffer_float');});
  console.log(r); await b.close();
})();
