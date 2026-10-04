/* ===== Fotos para a IA: borrão de rostos (no aparelho) + "Preencher pelas fotos" ===== */
(function(){
const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELO='https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
let detector=null,detectorErro=null,objetos=null,objetosErro=null;
async function carregarDetector(){
 if(detector||detectorErro)return detector;
 try{
  const m=await import(MP+'/vision_bundle.mjs');
  const fs=await m.FilesetResolver.forVisionTasks(MP+'/wasm');
  detector=await m.FaceDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:MODELO,delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:0.3});
 }catch(e){detectorErro=e}
 return detector;
}
async function carregarObjetos(){
 if(objetos||objetosErro)return objetos;
 try{
  const m=await import(MP+'/vision_bundle.mjs');
  const fs=await m.FilesetResolver.forVisionTasks(MP+'/wasm');
  objetos=await m.ObjectDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',delegate:'CPU'},runningMode:'IMAGE',scoreThreshold:0.3,maxResults:40,categoryAllowlist:['person']});
 }catch(e){objetosErro=e}
 return objetos;
}
const carregarImg=src=>new Promise((ok,err)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>err(new Error('foto ilegível'));i.src=src});
const iou=(a,b)=>{const x1=Math.max(a.x,b.x),y1=Math.max(a.y,b.y),x2=Math.min(a.x+a.w,b.x+b.w),y2=Math.min(a.y+a.h,b.y+b.h);
 const i=Math.max(0,x2-x1)*Math.max(0,y2-y1);return i/(a.w*a.h+b.w*b.h-i||1)};
function unir(caixas){
 const out=[];
 for(const c of caixas){
  const j=out.findIndex(o=>iou(o,c)>0.2);
  if(j<0)out.push({...c});
  else{const o=out[j],x=Math.min(o.x,c.x),y=Math.min(o.y,c.y),x2=Math.max(o.x+o.w,c.x+c.w),y2=Math.max(o.y+o.h,c.y+c.h);out[j]={x,y,w:x2-x,h:y2-y}}
 }
 return out;
}
/* procura rostos E pessoas (cabeça de quem está de lado ou olhando para baixo) */
async function detectar(img){
 const det=await carregarDetector(),od=await carregarObjetos();
 if(!det&&!od)return null;
 const W=img.naturalWidth||img.width,Hh=img.naturalHeight||img.height;
 const regioes=[[0,0,1,1],[0,0,.6,.6],[.4,0,.6,.6],[0,.4,.6,.6],[.4,.4,.6,.6],[.2,.2,.6,.6]];
 const recorte=(rx,ry,rw,rh)=>{const sx=rx*W,sy=ry*Hh,sw=rw*W,sh=rh*Hh,esc=Math.min(1024/Math.max(sw,sh),3);
  const c=document.createElement('canvas');c.width=Math.max(8,Math.round(sw*esc));c.height=Math.max(8,Math.round(sh*esc));
  c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);return{c,sx,sy,esc}};
 const norm=(r,b)=>({x:(r.sx+b.originX/r.esc)/W,y:(r.sy+b.originY/r.esc)/Hh,w:b.width/r.esc/W,h:b.height/r.esc/Hh});
 const rostos=[];
 if(det)for(const g of regioes){const r=recorte(...g);let res;try{res=det.detect(r.c)}catch(e){continue}
  for(const d of res.detections||[])rostos.push(norm(r,d.boundingBox))}
 const cabecas=[];
 if(od)for(const g of regioes.slice(0,5)){const r=recorte(...g);let res;try{res=od.detect(r.c)}catch(e){continue}
  for(const d of res.detections||[]){const b=norm(r,d.boundingBox);const c={x:b.x,y:b.y,w:b.w,h:b.h*0.4,auto:true};
   if(!cabecas.some(o=>iou(o,c)>0.3))cabecas.push(c)}}
 const faces=unir(rostos).map(b=>{ // aumenta para cobrir a cabeça inteira com folga
  const cx=b.x+b.w/2,cy=b.y+b.h/2-b.h*0.08,w=b.w*1.8,h=b.h*2.0;
  return{x:Math.max(0,cx-w/2),y:Math.max(0,cy-h/2),w:Math.min(1,w),h:Math.min(1,h),auto:true}});
 return [...faces,...cabecas];
}
function pixelar(ctx,x,y,w,h){
 x=Math.max(0,Math.floor(x));y=Math.max(0,Math.floor(y));w=Math.min(ctx.canvas.width-x,Math.ceil(w));h=Math.min(ctx.canvas.height-y,Math.ceil(h));
 if(w<2||h<2)return;
 const blk=Math.max(6,Math.round(ctx.canvas.width*0.045)),bw=Math.min(blk,Math.max(2,Math.round(w/3))),bh=Math.min(blk,Math.max(2,Math.round(h/3)));
 const t=document.createElement('canvas');t.width=Math.max(1,Math.round(w/bw));t.height=Math.max(1,Math.round(h/bh));
 t.getContext('2d').drawImage(ctx.canvas,x,y,w,h,0,0,t.width,t.height);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(t,0,0,t.width,t.height,x,y,w,h);ctx.imageSmoothingEnabled=true;
}
function pintar(est){
 const c=est.canvas,ctx=c.getContext('2d');
 ctx.drawImage(est.img,0,0,c.width,c.height);
 for(const r of est.rects)pixelar(ctx,r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height);
 // moldura vermelha leve só na prévia para mostrar onde há borrão
 ctx.strokeStyle='rgba(217,48,44,.9)';ctx.lineWidth=2;
 for(const r of est.rects)ctx.strokeRect(r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height);
}
function exportar(est){
 const c=document.createElement('canvas');c.width=est.canvas.width;c.height=est.canvas.height;
 const ctx=c.getContext('2d');ctx.drawImage(est.img,0,0,c.width,c.height);
 for(const r of est.rects)pixelar(ctx,r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height);
 return c.toDataURL('image/jpeg',0.75).split(',')[1];
}

/* tela de conferência: mostra as fotos já borradas; você pode borrar mais com um toque */
async function preparar(srcs){
 const ov=document.createElement('div');
 ov.style.cssText='position:fixed;inset:0;background:#fff;z-index:99999;overflow:auto;padding:12px;font-family:Arial,Helvetica,sans-serif';
 ov.innerHTML='<h2 style="font-size:17px;margin:6px 0">Proteção de rostos</h2><div id="fiaMsg" style="font-size:14px">Carregando o detector de rostos (na primeira vez demora um pouco)...</div>';
 document.body.appendChild(ov);
 const ests=[];
 try{
  for(const s of srcs){
   const img=await carregarImg(s),W=img.naturalWidth,Hh=img.naturalHeight,k=Math.min(1,640/Math.max(W,Hh));
   const canvas=document.createElement('canvas');canvas.width=Math.round(W*k);canvas.height=Math.round(Hh*k);
   ests.push({img,canvas,rects:[],aviso:''});
  }
  let semDetector=false;
  for(const e of ests){const r=await detectar(e.img);if(r===null){semDetector=true}else e.rects=r}
  const fim=await new Promise(resolve=>{
   ov.innerHTML=`<h2 style="font-size:17px;margin:6px 0">Proteção de rostos</h2>
   <div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;padding:8px;font-size:14px;margin-bottom:8px">
   <b>Confira cada foto.</b> Só as cópias <b>borradas</b> abaixo vão para a IA (Gemini, versão gratuita). A sua foto original não é alterada.
   <b>Se qualquer rosto estiver visível, toque nele para borrar.</b> Toque em um quadrado vermelho para tirar o borrão.
   ${semDetector?'<br><span style="color:#8a1c18"><b>Não consegui carregar o detector automático.</b> Borre todos os rostos manualmente.</span>':''}</div>
   <label style="font-size:13px;display:block;margin:6px 0">Tamanho do borrão ao tocar: <input type="range" id="fiaTam" min="8" max="45" value="22" style="vertical-align:middle"></label>
   <div id="fiaFotos"></div>
   <div style="position:sticky;bottom:0;background:#fff;padding:10px 0;display:flex;gap:8px;flex-wrap:wrap">
    <button id="fiaOk" style="padding:12px 16px;border:0;border-radius:6px;background:#2e9e4f;color:#fff;font-size:16px">Confirmo: nenhum rosto aparece. Enviar para a IA</button>
    <button id="fiaCancela" style="padding:12px 16px;border:0;border-radius:6px;background:#888;color:#fff;font-size:16px">Cancelar</button></div>`;
   const box=ov.querySelector('#fiaFotos');
   ests.forEach((e,idx)=>{
    const d=document.createElement('div');d.style.cssText='margin:10px 0;border:1px solid #ccc;border-radius:6px;padding:6px';
    const t=document.createElement('div');t.style.cssText='font-size:13px;margin-bottom:4px';
    e.canvas.style.cssText='width:100%;display:block;cursor:crosshair';
    const atualiza=()=>{pintar(e);const a=e.rects.filter(r=>r.auto).length,m=e.rects.length-a;t.textContent='Foto '+(idx+1)+': '+a+' região(ões) de rosto/cabeça borrada(s) automaticamente'+(m?' + '+m+' borrão(ões) seu(s)':'')+(e.rects.length?'':'  ⚠ nenhum borrão: confira se não há rostos')};
    e.canvas.onclick=ev=>{
     const b=e.canvas.getBoundingClientRect(),nx=(ev.clientX-b.left)/b.width,ny=(ev.clientY-b.top)/b.height;
     const j=e.rects.findIndex(r=>nx>=r.x&&nx<=r.x+r.w&&ny>=r.y&&ny<=r.y+r.h);
     if(j>=0)e.rects.splice(j,1);
     else{const tam=(+ov.querySelector('#fiaTam').value)/100,w=tam,h=tam*(e.canvas.width/e.canvas.height);
      e.rects.push({x:Math.max(0,Math.min(1-w,nx-w/2)),y:Math.max(0,Math.min(1-h,ny-h/2)),w,h,auto:false})}
     atualiza();
    };
    d.appendChild(t);d.appendChild(e.canvas);box.appendChild(d);atualiza();
   });
   ov.querySelector('#fiaOk').onclick=()=>resolve(true);
   ov.querySelector('#fiaCancela').onclick=()=>resolve(false);
  });
  if(!fim)return null;
  return ests.map(exportar);
 }catch(e){
  alert('Não consegui preparar as fotos: '+e.message);return null;
 }finally{ov.remove()}
}

/* ---------- botão "Preencher pelas fotos" ---------- */
function exemplos(){
 const meus=acoesDe(aluno.id).slice(0,3);
 const outros=acoes.filter(a=>!a.apagado&&a.alunoId!==aluno.id).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,2);
 return [...meus,...outros].filter(a=>a.descricao).map((a,i)=>`Exemplo ${i+1}: ambiente: ${a.ambiente}; intervenção: ${a.intervencao}; habilidades: ${(a.habilidades||[]).join(' | ')}; texto: ${a.descricao.replace(/\n+/g,' ')}`).join('\n');
}
function sistema(){
 return `Você escreve registros de aula de um professor de inclusão escolar (PIE) da educação infantil, olhando as FOTOS da atividade.
REGRAS OBRIGATÓRIAS:
1. "descricao": lista com 1 ou 2 parágrafos; cada parágrafo com entre 250 e 300 letras (caracteres, contando espaços).
2. Descreva o que as fotos mostram (atividade, materiais, ambiente). Os rostos estão borrados de propósito: nunca comente isso e nunca tente identificar ninguém. Se o professor deixou um resumo, use-o também. Pode completar lacunas de forma plausível.
3. Fale dos benefícios da atividade no desenvolvimento do aluno. Vá direto ao assunto; nunca comece com "Compreendo...".
4. Escolha exatamente 3 habilidades pertinentes, da lista abaixo, escritas exatamente como na lista.
5. Texto natural e humano, em português do Brasil. ZERO travessões (— ou –). Sem negrito, emojis ou listas. Imite o estilo dos exemplos do professor, sem copiar frases.
6. "ambiente": lugar da atividade (ex.: Sala de aula, Parquinho, Pátio). "intervencao": "Sim" ou "Não".
7. "fotos": uma entrada por foto, na ordem, com "nome" (título curto) e "desc" (descrição curta).
Responda SOMENTE com JSON: {"ambiente":"...","descricao":["..."],"intervencao":"Não","habilidades":["AP10 - Montar quebra-cabeças","...","..."],"fotos":[{"nome":"...","desc":"..."}]}

LISTA DE HABILIDADES:
${HABILIDADES.join('\n')}`;
}
async function preencher(f,ler,depois){
 ler();
 const st=document.getElementById('iaStatus'),av=document.getElementById('aviso');
 if(!f.fotos.length){av.innerHTML='<div class="msg erro">Anexe pelo menos uma foto primeiro (Escolher ficheiro ou Tire foto).</div>';return}
 if(!cfg('codigo')){const c0=prompt('Digite o código de acesso para usar a IA e a nuvem:');if(!c0)return;cfg('codigo',c0.trim());sincronizar()}
 const imgs=await preparar(f.fotos.map(p=>p.src));
 if(!imgs)return;
 const bt=document.getElementById('fotoIA');bt.disabled=true;
 const pedido=`Aluno: ${aluno.nome}. Ambiente informado: ${f.ambiente||'não informado'}. Resumo do professor: ${f.descricao||'não escreveu nada'}. Há ${imgs.length} foto(s), na ordem abaixo.\n\n${exemplos()?'EXEMPLOS DO ESTILO DO PROFESSOR (não copie, só imite o jeito):\n'+exemplos():''}`;
 let erro=null;
 try{
  for(let t=1;t<=3;t++){
   st.textContent=`A IA está olhando as fotos (tentativa ${t} de 3)...`;
   const parts=[{text:pedido+(erro?`\n\nSua resposta anterior foi recusada: ${erro}. Corrija e responda só o JSON.`:'')}];
   imgs.forEach((b,i)=>{parts.push({text:'Foto '+(i+1)+':'});parts.push({inlineData:{mimeType:'image/jpeg',data:b}})});
   const r=await fetch(BASE(),{method:'POST',headers:H({'Content-Type':'application/json'}),body:JSON.stringify({system:sistema(),contents:[{role:'user',parts}],json:true,max:2500})});
   if(r.status===401){const c1=prompt('Código de acesso incorreto. Digite de novo (deixe em branco para cancelar):');if(!c1)throw new Error('Código de acesso incorreto.');cfg('codigo',c1.trim());t--;continue}
   if(!r.ok)throw new Error('Servidor da IA respondeu '+r.status);
   const d=await r.json();const txt=(d.texto||'').trim();const m=txt.match(/\{[\s\S]*\}/);let j=null;try{j=JSON.parse(m?m[0]:txt)}catch(e){}
   if(!j){erro='a resposta não veio em JSON';continue}
   const par=(Array.isArray(j.descricao)?j.descricao:[String(j.descricao||'')]).map(limpar);
   erro=validar({paragrafos:par,habilidades:j.habilidades});
   if(!erro&&(!j.ambiente||(j.intervencao!=='Sim'&&j.intervencao!=='Não')))erro='faltou ambiente ou intervencao (Sim/Não)';
   if(!erro){
    f.descricao=par.join('\n\n');f.habilidades=j.habilidades;f.intervencao=j.intervencao;
    if(!f.ambiente.trim())f.ambiente=limpar(j.ambiente);
    (j.fotos||[]).forEach((x,i)=>{const p=f.fotos[i];if(p){if(!p.nome)p.nome=String(x.nome||'').slice(0,80);if(!p.desc)p.desc=String(x.desc||'').slice(0,200)}});
    depois();av.innerHTML='<div class="msg ok">Campos preenchidos pelas fotos. Confira, ajuste o que quiser e salve.</div>';st.textContent='';bt.disabled=false;return;
   }
  }
  throw new Error('A IA não acertou o formato em 3 tentativas ('+erro+'). Tente de novo.');
 }catch(e){av.innerHTML=`<div class="msg erro">${esc(e.message)}</div>`;st.textContent=''}
 bt.disabled=false;
}
window.FotosIA={preparar,preencher,_detectarSrc:async s=>{const i=await carregarImg(s);return await detectar(i)}};
})();
