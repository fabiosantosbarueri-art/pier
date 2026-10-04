/* ===== Fotos: borrão manual com o dedo (pincel que você liga e desliga) + "Preencher pelas fotos" ===== */
(function(){
const carregarImg=src=>new Promise((ok,err)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>err(new Error('foto ilegível'));i.src=src});

/* junta a foto com o borrão: onde a "máscara" estiver pintada, a foto fica em quadradinhos */
function compor(img,mask,W,H,forca){
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 ctx.drawImage(img,0,0,W,H);
 const bl=Math.max(4,Math.round(W*forca));
 const t=document.createElement('canvas');t.width=Math.max(1,Math.round(W/bl));t.height=Math.max(1,Math.round(H/bl));
 t.getContext('2d').drawImage(c,0,0,t.width,t.height);
 const p=document.createElement('canvas');p.width=W;p.height=H;const pc=p.getContext('2d');
 pc.imageSmoothingEnabled=false;pc.drawImage(t,0,0,t.width,t.height,0,0,W,H);
 pc.globalCompositeOperation='destination-in';pc.drawImage(mask,0,0,W,H);
 ctx.drawImage(p,0,0);
 return c;
}
const maskVazia=m=>{const d=m.getContext('2d').getImageData(0,0,m.width,m.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>20)return false;return true};

/* tela de edição: borrar com o dedo / apagar borrão / rolar a tela */
async function editor(srcs,op){
 const ov=document.createElement('div');
 ov.style.cssText='position:fixed;inset:0;background:#fff;z-index:99999;overflow:auto;padding:10px;font-family:Arial,Helvetica,sans-serif';
 ov.innerHTML='<h2 style="font-size:17px;margin:6px 0">Borrar rostos</h2><div style="font-size:14px">Carregando as fotos...</div>';
 document.body.appendChild(ov);
 try{
  const ests=[];
  for(const s of srcs){
   const img=await carregarImg(s),W0=img.naturalWidth,H0=img.naturalHeight,k=Math.min(1,640/Math.max(W0,H0));
   const canvas=document.createElement('canvas');canvas.width=Math.round(W0*k);canvas.height=Math.round(H0*k);
   const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;
   ests.push({img,W0,H0,canvas,mask});
  }

  return await new Promise(resolve=>{
   let modo='rolar',forca=0.035,pincel=8;
   const btn='padding:9px 12px;border:1px solid #5bc0de;border-radius:6px;font-size:14px;';
   ov.innerHTML=`<div style="position:sticky;top:0;background:#fff;z-index:3;padding:6px 0;border-bottom:1px solid #ddd">
    <div style="display:flex;gap:6px;flex-wrap:wrap">
     <button data-m="borrar" style="${btn}">🖌 Pincel LIGADO</button><button data-m="apagar" style="${btn}">🧽 Apagar borrão</button><button data-m="rolar" style="${btn}">✋ Pincel DESLIGADO (rolar)</button>
     <button id="fLimpa" style="${btn}">Limpar tudo</button></div>
    <label style="font-size:13px;display:block;margin:6px 0 0">Tamanho do pincel <input type="range" id="fTam" min="2" max="25" value="8" style="vertical-align:middle;width:55%"></label>
    <label style="font-size:13px;display:block">Força do borrão (menor = mais suave) <input type="range" id="fFor" min="2" max="8" step="0.5" value="3.5" style="vertical-align:middle;width:40%"></label>
    <div style="font-size:12px;color:#444;margin-top:2px" id="fDica"></div></div>
   ${op.ia?`<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;padding:8px;font-size:14px;margin:8px 0">
    <b>Confira cada foto.</b> Só as cópias <b>borradas</b> vão para a IA (Gemini, versão gratuita). A sua foto original não muda, a menos que você marque a opção lá embaixo.
    <b>Ligue o pincel e passe o dedo sobre todo rosto que aparecer</b> para borrar. Nada é borrado sozinho: a conferência é toda sua.</div>`:`<div style="font-size:14px;margin:8px 0">Ligue o pincel e passe o dedo sobre os rostos para borrar. Use <b>Apagar borrão</b> para desfazer onde errou. A foto guardada no aplicativo será substituída pela borrada.</div>`}
   <div id="fFotos"></div>
   <div style="position:sticky;bottom:0;background:#fff;padding:10px 0;border-top:1px solid #ddd">
    ${op.ia?'<label style="font-size:13px;display:block;margin-bottom:6px"><input type="checkbox" id="fGuardar"> Guardar também a foto <b>borrada</b> no aplicativo (substitui a original)</label>':''}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="fOk" style="padding:12px 16px;border:0;border-radius:6px;background:#2e9e4f;color:#fff;font-size:16px">${op.ia?'Confirmo: nenhum rosto aparece. Enviar para a IA':'Aplicar borrão na foto'}</button>
    <button id="fCancela" style="padding:12px 16px;border:0;border-radius:6px;background:#888;color:#fff;font-size:16px">Cancelar</button></div></div>`;
   const q=s=>ov.querySelector(s);
   const redesenha=e=>e.canvas.getContext('2d').drawImage(compor(e.img,e.mask,e.canvas.width,e.canvas.height,forca),0,0);
   const marcaModo=()=>{ov.querySelectorAll('[data-m]').forEach(b=>{const on=b.dataset.m===modo;b.style.background=on?'#2e7d9e':'#fff';b.style.color=on?'#fff':'#0b7aa8'});
    ests.forEach(e=>e.canvas.style.touchAction=modo==='rolar'?'auto':'none');
    q('#fDica').textContent=modo==='rolar'?'Pincel desligado: arraste para subir e descer a tela. Toque em "Pincel LIGADO" para borrar.':modo==='borrar'?'Pincel ligado: arraste o dedo sobre os rostos para borrar.':'Arraste o dedo sobre o borrão para apagar.'};
   ov.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{modo=b.dataset.m;marcaModo()});
   q('#fTam').oninput=ev=>{pincel=+ev.target.value};
   q('#fFor').oninput=ev=>{forca=(+ev.target.value)/100;ests.forEach(redesenha)};
   q('#fLimpa').onclick=()=>{ests.forEach(e=>{e.mask.getContext('2d').clearRect(0,0,e.mask.width,e.mask.height);redesenha(e)})};
   const box=q('#fFotos');
   ests.forEach((e,idx)=>{
    const d=document.createElement('div');d.style.cssText='margin:10px 0;border:1px solid #ccc;border-radius:6px;padding:6px';
    const t=document.createElement('div');t.style.cssText='font-size:13px;margin-bottom:4px';t.textContent='Foto '+(idx+1);
    e.canvas.style.cssText='width:100%;display:block;touch-action:none;cursor:crosshair';
    let ultimo=null;
    const ponto=ev=>{const b=e.canvas.getBoundingClientRect();return{x:(ev.clientX-b.left)/b.width*e.canvas.width,y:(ev.clientY-b.top)/b.height*e.canvas.height}};
    const traco=(a,b)=>{const mc=e.mask.getContext('2d'),dia=pincel/100*e.canvas.width;
     mc.globalCompositeOperation=modo==='borrar'?'source-over':'destination-out';
     mc.strokeStyle='#fff';mc.fillStyle='#fff';mc.lineWidth=dia;mc.lineCap='round';mc.lineJoin='round';
     mc.beginPath();mc.moveTo(a.x,a.y);mc.lineTo(b.x,b.y);mc.stroke();
     mc.beginPath();mc.arc(b.x,b.y,dia/2,0,Math.PI*2);mc.fill();redesenha(e)};
    e.canvas.onpointerdown=ev=>{if(modo==='rolar')return;ev.preventDefault();e.canvas.setPointerCapture(ev.pointerId);ultimo=ponto(ev);traco(ultimo,ultimo)};
    e.canvas.onpointermove=ev=>{if(!ultimo)return;const p=ponto(ev);traco(ultimo,p);ultimo=p};
    const fim=()=>{ultimo=null};e.canvas.onpointerup=fim;e.canvas.onpointercancel=fim;
    d.appendChild(t);d.appendChild(e.canvas);box.appendChild(d);redesenha(e);
   });
   marcaModo();
   q('#fOk').onclick=()=>{
    if(op.ia){const sem=ests.map((e,i)=>maskVazia(e.mask)?i+1:0).filter(Boolean);
     if(sem.length&&!confirm('A(s) foto(s) '+sem.join(', ')+' está(ão) SEM nenhum borrão. Tem certeza de que não aparece nenhum rosto nelas?'))return}
    resolve({ests,forca,guardar:op.ia?q('#fGuardar').checked:true});
   };
   q('#fCancela').onclick=()=>resolve(null);
  });
 }catch(e){alert('Não consegui preparar as fotos: '+e.message);return null}
 finally{ov.remove()}
}
async function preparar(srcs){
 const r=await editor(srcs,{ia:true});if(!r)return null;
 const ai=r.ests.map(e=>compor(e.img,e.mask,e.canvas.width,e.canvas.height,r.forca).toDataURL('image/jpeg',0.75).split(',')[1]);
 const full=r.guardar?r.ests.map(e=>compor(e.img,e.mask,e.W0,e.H0,r.forca).toDataURL('image/jpeg',0.85)):null;
 return{ai,full,guardar:r.guardar};
}
async function copiaIA(src){
 const img=await carregarImg(src),k=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));
 const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);
 c.getContext('2d').drawImage(img,0,0,c.width,c.height);
 return c.toDataURL('image/jpeg',0.75).split(',')[1];
}
async function editar(src){
 const r=await editor([src],{ia:false});if(!r)return null;
 const e=r.ests[0];return compor(e.img,e.mask,e.W0,e.H0,r.forca).toDataURL('image/jpeg',0.85);
}

/* ---------- câmera do PIE: a foto NÃO passa pela galeria do celular ---------- */
function camera(){
 return new Promise(resolve=>{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Este navegador não permite usar a câmera dentro do PIE. Use o botão "Tire foto".');resolve([]);return}
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif';
  ov.innerHTML=`<div id="cMsg" style="color:#fff;font-size:13px;padding:8px;text-align:center">Aponte a câmera e toque em <b>Tirar foto</b>. Pode tirar várias; depois toque em <b>Concluir</b>.</div>
   <video id="cVid" playsinline autoplay muted style="flex:1;min-height:0;width:100%;object-fit:contain;background:#000"></video>
   <div style="padding:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;background:#111">
    <button id="cTira" style="padding:14px 18px;border:0;border-radius:30px;background:#fff;color:#000;font-size:16px;font-weight:bold">📸 Tirar foto</button>
    <button id="cTroca" style="padding:12px 14px;border:0;border-radius:6px;background:#444;color:#fff;font-size:14px">🔄 Trocar câmera</button>
    <button id="cOk" style="padding:12px 14px;border:0;border-radius:6px;background:#2e9e4f;color:#fff;font-size:14px">✔ Concluir (0)</button>
    <button id="cCancela" style="padding:12px 14px;border:0;border-radius:6px;background:#888;color:#fff;font-size:14px">Cancelar</button></div>`;
  document.body.appendChild(ov);
  const q=s=>ov.querySelector(s),video=q('#cVid'),fotos=[];let stream=null,facing='environment';
  const parar=()=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}};
  const iniciar=async()=>{parar();
   try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}},audio:false});video.srcObject=stream;await video.play()}
   catch(e){q('#cMsg').innerHTML='<span style="color:#ffb4ab">Não consegui abrir a câmera ('+(e.message||e.name)+'). Permita o uso da câmera no navegador e tente de novo.</span>'}};
  q('#cTira').onclick=()=>{
   const vw=video.videoWidth,vh=video.videoHeight;if(!vw)return;
   const k=Math.min(1,1280/Math.max(vw,vh)),c=document.createElement('canvas');c.width=Math.round(vw*k);c.height=Math.round(vh*k);
   c.getContext('2d').drawImage(video,0,0,c.width,c.height);
   fotos.push(c.toDataURL('image/jpeg',0.85));q('#cOk').textContent='✔ Concluir ('+fotos.length+')';
   video.style.opacity='.3';setTimeout(()=>video.style.opacity='1',120);
  };
  q('#cTroca').onclick=()=>{facing=facing==='environment'?'user':'environment';iniciar()};
  q('#cOk').onclick=()=>{parar();ov.remove();resolve(fotos)};
  q('#cCancela').onclick=()=>{if(fotos.length&&!confirm('Descartar as '+fotos.length+' foto(s) tiradas agora?'))return;parar();ov.remove();resolve([])};
  iniciar();
 });
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
 if(!confirm('As '+f.fotos.length+' foto(s) anexada(s) serão enviadas para a IA (Gemini, versão gratuita), do jeito que estão agora.\n\nVocê já borrou TODOS os rostos com o botão "✋ Borrar" de cada foto?\n\nOK = enviar para a IA.\nCancelar = voltar para borrar.'))return;
 let imgs;
 try{imgs=[];for(const p of f.fotos)imgs.push(await copiaIA(p.src))}catch(e){av.innerHTML='<div class="msg erro">Não consegui preparar as fotos: '+esc(e.message)+'</div>';return}
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
window.FotosIA={preparar,editar,preencher,camera};
})();
