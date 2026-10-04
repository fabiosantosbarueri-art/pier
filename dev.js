/* ===== Modo Desenvolvedor: conversa com a IA para preencher registros antigos ===== */
(function(){
const hdr=document.querySelector('header'),cfgBtn=document.getElementById('cfgBtn');
const devBtn=document.createElement('button');devBtn.className='b sec';devBtn.textContent='Desenvolvedor';devBtn.style.cssText='padding:6px 10px;font-size:13px';
const box=document.createElement('div');box.className='linha';hdr.appendChild(box);box.appendChild(devBtn);box.appendChild(cfgBtn);

let dAluno=null,hist=[],fotosDev=[],pend=[],ocupado=false,usadas=new Set();
const chaveHist=()=>'dev_hist_'+(dAluno?dAluno.id:'x');
const lerHist=()=>{try{return JSON.parse(cfg(chaveHist())||'[]')}catch(e){return[]}};
const gravarHist=()=>{try{cfg(chaveHist(),JSON.stringify(hist.slice(-60)))}catch(e){}};
const ymd=d=>d.toISOString().slice(0,10);
function diasUteis(de,ate){const out=[];if(!de||!ate)return out;let d=new Date(de+'T12:00:00Z');const f=new Date(ate+'T12:00:00Z');
 while(d<=f){const w=d.getUTCDay();if(w>=1&&w<=5)out.push(ymd(d));d=new Date(d.getTime()+86400000)}return out}
const dormir=ms=>new Promise(r=>setTimeout(r,ms));

devBtn.onclick=async()=>{
 const s=prompt('Senha do modo desenvolvedor:');if(!s)return;
 try{const r=await fetch(BASE()+'/list',{headers:{'X-Codigo':s.trim()}});if(r.status!==200){alert('Senha incorreta.');return}}
 catch(e){alert('Não consegui falar com a nuvem. Verifique a internet.');return}
 cfg('codigo',s.trim());
 dAluno=dAluno||alunos[0];hist=lerHist();telaDev();
};

function telaDev(){
 aluno=null;aba='alunos';
 const app=document.getElementById('app');
 const de=cfg('dev_de')||'',ate=cfg('dev_ate')||'';
 app.innerHTML=`<h2>Modo Desenvolvedor</h2>
 <div class="msg erro" style="font-size:13px">Use só para registros <b>antigos</b>. A IA pode <b>inventar detalhes</b> nas lacunas. Nada aqui é conferido com a realidade.</div>
 <label>Aluno</label><select id="dAl">${alunos.map(a=>`<option value="${a.id}" ${a.id===dAluno.id?'selected':''}>${esc(a.nome)}</option>`).join('')}</select>
 <div class="linha"><div style="flex:1"><label>De</label><input type="date" id="dDe" value="${de}"></div><div style="flex:1"><label>Até</label><input type="date" id="dAte" value="${ate}"></div></div>
 <div id="dLog" style="border:1px solid #cfd8dc;border-radius:6px;padding:8px;margin-top:12px;height:300px;overflow:auto;background:#fafcfd;font-size:14px"></div>
 <label>Sua mensagem para a IA (cole textos, anotações, o que lembrar)</label>
 <textarea id="dTxt" style="min-height:110px" placeholder="Ex.: Em março, o aluno fez pintura, quebra-cabeça e massinha. Faltou nos dias 12 e 13..."></textarea>
 <div class="linha" style="margin-top:6px"><label class="b verde" style="margin:0;display:inline-block">📷 Anexar fotos<input type="file" id="dFotos" accept="image/*" multiple hidden></label>
  <button class="b" id="dEnv">Enviar</button><span id="dPend" style="font-size:13px"></span></div>
 <div class="linha" style="margin-top:14px"><button class="b" id="dGerar" style="background:#6a4fc3">⚙ Gerar registros do período</button>
  <button class="b sec" id="dNova">Nova conversa</button><button class="b cinza" id="dSair">Sair</button></div>
 <div id="dStatus" class="msg info" style="margin-top:10px">Converse com a IA, escolha as datas e depois clique em Gerar.</div>`;
 const $$=s=>document.querySelector(s);
 $$('#dAl').onchange=e=>{dAluno=alunos.find(a=>a.id===e.target.value);hist=lerHist();desenharLog()};
 $$('#dDe').onchange=e=>cfg('dev_de',e.target.value);$$('#dAte').onchange=e=>cfg('dev_ate',e.target.value);
 $$('#dFotos').onchange=async e=>{
  $$('#dPend').textContent='Preparando fotos...';
  const novas=[];
  for(const f of e.target.files){try{novas.push({id:'f'+Date.now()+Math.random().toString(36).slice(2,7),src:await reduzirFoto(f,1280)})}catch(x){}}
  e.target.value='';
  if(novas.length){const ai=await FotosIA.preparar(novas.map(n=>n.src));if(ai)novas.forEach((n,i)=>pend.push({id:n.id,src:n.src,ai:ai[i]}))}
  $$('#dPend').textContent=pend.length?pend.length+' foto(s) prontas para enviar':'';
 };
 $$('#dEnv').onclick=enviar;
 $$('#dGerar').onclick=gerar;
 $$('#dNova').onclick=()=>{if(!confirm('Apagar a memória da conversa deste aluno?'))return;hist=[];gravarHist();fotosDev=[];pend=[];usadas=new Set();desenharLog();$$('#dPend').textContent=''};
 $$('#dSair').onclick=()=>{aluno=null;aba='alunos';desenhar()};
 desenharLog();
}
function desenharLog(){
 const el=document.getElementById('dLog');if(!el)return;
 el.innerHTML=hist.length?hist.map(m=>`<div style="margin:6px 0;padding:8px;border-radius:8px;background:${m.role==='user'?'#e8f6fc':'#f1ecfb'}"><b>${m.role==='user'?'Você':'IA'}:</b> ${esc(m.text||'').replace(/\n/g,'<br>')}${(m.imgs||[]).length?`<div style="font-size:12px;color:#555;margin-top:4px">📷 fotos ${(m.imgs||[]).join(', ')}</div>`:''}</div>`).join(''):'<div style="color:#777">Ainda sem conversa. Escreva o que você tem guardado e anexe as fotos.</div>';
 el.scrollTop=el.scrollHeight;
}
const setStatus=(t,cls)=>{const e=document.getElementById('dStatus');if(e){e.textContent=t;e.className='msg '+(cls||'info')}};

async function chamar(corpo){
 let ultimo='';
 for(let t=0;t<3;t++){
  const r=await fetch(BASE(),{method:'POST',headers:H({'Content-Type':'application/json'}),body:JSON.stringify(corpo)});
  if(r.status===401)throw new Error('Senha/código incorreto.');
  if(r.ok){const d=await r.json();return d.texto||''}
  ultimo=(await r.text()).slice(0,200);
  if(r.status===502||r.status===429){await dormir(7000);continue}
  break;
 }
 throw new Error('A IA não respondeu ('+ultimo+')');
}
function conteudoHist(){
 const out=[];
 for(const m of hist){
  const parts=[];
  if(m.text)parts.push({text:m.text});
  for(const i of (m.imgs||[])){const f=fotosDev[i];if(f){parts.push({text:'Foto '+i+':'});parts.push({inlineData:{mimeType:'image/jpeg',data:f.ai}})}else parts.push({text:'(Foto '+i+' não está mais carregada)'})}
  if(parts.length)out.push({role:m.role==='user'?'user':'model',parts});
 }
 return out;
}
function sistemaChat(){
 const de=cfg('dev_de')||'?',ate=cfg('dev_ate')||'?';
 return `Você é uma assistente que ajuda um professor de inclusão escolar (PIE) da educação infantil de Barueri a preencher REGISTROS ANTIGOS de aulas do aluno "${dAluno.nome}", período de ${de} até ${ate}.
O professor vai mandar anotações, textos e fotos numeradas ("Foto 0", "Foto 1"...). Descreva brevemente o que entendeu e, se faltar algo realmente importante, faça no máximo 2 perguntas curtas. Se ele disser que pode inventar as lacunas, não pergunte. Quando as fotos chegarem, diga em uma linha o que cada uma parece mostrar (para você lembrar depois). Responda em português simples, curto, sem formatação especial.`;
}
async function enviar(){
 if(ocupado)return;
 const txt=document.getElementById('dTxt').value.trim();
 if(!txt&&!pend.length)return;
 const idxs=[];for(const p of pend){fotosDev.push(p);idxs.push(fotosDev.length-1)}pend=[];document.getElementById('dPend').textContent='';
 hist.push({role:'user',text:txt,imgs:idxs});document.getElementById('dTxt').value='';gravarHist();desenharLog();
 ocupado=true;setStatus('A IA está lendo...');
 try{
  const resp=await chamar({system:sistemaChat(),contents:conteudoHist(),json:false,max:1200});
  hist.push({role:'model',text:resp.trim(),imgs:[]});gravarHist();desenharLog();setStatus('Pode continuar conversando ou clicar em Gerar registros.');
 }catch(e){setStatus('Erro: '+e.message,'erro')}
 ocupado=false;
}

function sistemaGerar(){
 return `Você preenche REGISTROS PASSADOS de aula de um professor de inclusão escolar (PIE) da educação infantil, usando o material enviado na conversa (textos e fotos numeradas). Pode inventar detalhes plausíveis nas lacunas. Aluno: "${dAluno.nome}".
REGRAS DE CADA REGISTRO:
1. "descricao": lista com 1 ou 2 parágrafos; cada parágrafo com entre 250 e 300 letras (caracteres, contando espaços).
2. Fale dos benefícios da atividade no desenvolvimento do aluno. Vá direto ao assunto, sem abrir com "Compreendo...".
3. Escolha exatamente 3 habilidades pertinentes, da lista abaixo, escritas exatamente como na lista.
4. Texto natural e humano em português do Brasil. ZERO travessões (— ou –). Sem negrito, emojis ou listas. Varie atividades, ambientes e palavras entre os dias; nunca repita o mesmo texto.
5. "ambiente": lugar da atividade (ex.: Sala de aula, Parquinho, Pátio). "intervencao": "Sim" ou "Não".
6. "fotos": lista de {"i":número da foto,"nome":"título curto","desc":"descrição curta"}; use só fotos que existem, cada foto no máximo uma vez em todo o período, nos dias mais coerentes. Pode ser lista vazia.
7. Se o material indicar que o aluno faltou ou não houve aula em uma data, coloque essa data em "sem_aula" e não crie registro.
Responda SOMENTE com JSON: {"registros":[{"data":"AAAA-MM-DD","ambiente":"...","descricao":["..."],"intervencao":"Sim","habilidades":["AP10 - Montar quebra-cabeças","...","..."],"fotos":[]}],"sem_aula":[]}

LISTA DE HABILIDADES:
${HABILIDADES.join('\n')}`;
}
function validarReg(r,pendentes){
 if(!r||!pendentes.includes(r.data))return 'data inválida';
 if(!r.ambiente||typeof r.ambiente!=='string')return 'falta ambiente';
 if(r.intervencao!=='Sim'&&r.intervencao!=='Não')return 'intervencao deve ser Sim ou Não';
 const par=Array.isArray(r.descricao)?r.descricao:[String(r.descricao||'')];
 return validar({paragrafos:par.map(limpar),habilidades:r.habilidades});
}
async function gerar(){
 if(ocupado)return;
 const de=document.getElementById('dDe').value,ate=document.getElementById('dAte').value;
 cfg('dev_de',de);cfg('dev_ate',ate);
 if(!hist.length){setStatus('Converse primeiro com a IA: mande o material e envie.','erro');return}
 const jaTem=new Set(acoes.filter(a=>a.alunoId===dAluno.id&&!a.apagado).map(a=>a.data));
 const dias=diasUteis(de,ate).filter(d=>!jaTem.has(d));
 if(!dias.length){setStatus('Escolha De e Até (dias úteis sem registro já feito).','erro');return}
 if(!confirm('Gerar registros de '+dias.length+' dia(s) útil(eis) para '+dAluno.nome+'? Isto pode levar alguns minutos.'))return;
 ocupado=true;let feitos=0,sem=0,falhas=[];
 try{
  for(let i=0;i<dias.length;i+=4){
   let pend2=dias.slice(i,i+4);
   for(let t=1;t<=3&&pend2.length;t++){
    setStatus(`Gerando... ${feitos+sem}/${dias.length} prontos (tentativa ${t})`);
    const msgFinal={role:'user',parts:[{text:`Gere agora os registros para estas datas (dias úteis): ${pend2.join(', ')}. Fotos disponíveis: ${fotosDev.map((f,k)=>usadas.has(k)?null:k).filter(k=>k!==null).join(', ')||'nenhuma'}. Responda só o JSON.`}]};
    let j=null;
    try{const txt=await chamar({system:sistemaGerar(),contents:[...conteudoHist(),msgFinal],json:true,max:7000});
     const m=txt.match(/\{[\s\S]*\}/);j=JSON.parse(m?m[0]:txt)}catch(e){if(/incorreto/.test(e.message))throw e;continue}
    const faltam=new Set(pend2);
    for(const d of (j.sem_aula||[]))if(faltam.has(d)){faltam.delete(d);sem++}
    for(const r of (j.registros||[])){
     if(!faltam.has(r.data))continue;
     if(validarReg(r,pend2))continue;
     const fotos=[];
     for(const f of (r.fotos||[])){const k=f.i;if(fotosDev[k]&&!usadas.has(k)){usadas.add(k);fotos.push({id:fotosDev[k].id,src:fotosDev[k].src,nome:String(f.nome||'').slice(0,80),desc:String(f.desc||'').slice(0,200)})}}
     const par=(Array.isArray(r.descricao)?r.descricao:[String(r.descricao)]).map(limpar);
     await salvar('acoes',{id:'x'+Date.now()+Math.random().toString(36).slice(2,6),alunoId:dAluno.id,data:r.data,ambiente:limpar(r.ambiente),descricao:par.join('\n\n'),intervencao:r.intervencao,habilidades:r.habilidades,fotos,criado:Date.now(),u:Date.now()});
     faltam.delete(r.data);feitos++;
    }
    pend2=[...faltam];
   }
   for(const d of pend2)falhas.push(d);
  }
 }catch(e){setStatus('Parou: '+e.message,'erro')}
 acoes=await todos('acoes');
 const resumo=`Pronto: ${feitos} registro(s) criado(s)${sem?`, ${sem} dia(s) sem aula`:''}${falhas.length?`. Não consegui: ${falhas.join(', ')} (clique em Gerar de novo para tentar só esses)`:''}.`;
 hist.push({role:'model',text:resumo,imgs:[]});gravarHist();desenharLog();
 setStatus(resumo,falhas.length?'erro':'ok');
 ocupado=false;sincronizar();
}
})();
