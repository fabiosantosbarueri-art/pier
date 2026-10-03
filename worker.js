// Servidor da IA do PIER (Cloudflare Worker). A chave fica no segredo ANTHROPIC_API_KEY, nunca na página.
const PERMITIDOS = ['https://fabiosantosbarueri-art.github.io'];
const MODELO = 'claude-sonnet-5-5';

export default {
  async fetch(req, env) {
    const origem = req.headers.get('Origin') || '';
    const ok = PERMITIDOS.includes(origem);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origem : PERMITIDOS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !ok) return new Response('Não permitido', { status: 403, headers: cors });
    let b;
    try { b = await req.json(); } catch { return new Response('JSON inválido', { status: 400, headers: cors }); }
    const system = String(b.system || '').slice(0, 8000);
    const mensagem = String(b.mensagem || '').slice(0, 4000);
    if (!system || !mensagem) return new Response('Faltam dados', { status: 400, headers: cors });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELO, max_tokens: 1200, system, messages: [{ role: 'user', content: mensagem }] }),
    });
    if (!r.ok) return new Response('Erro da IA ' + r.status, { status: 502, headers: cors });
    const d = await r.json();
    const texto = (d.content || []).map(c => c.text || '').join('');
    return new Response(JSON.stringify({ texto }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
