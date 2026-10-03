// Servidor da IA do PIER (Cloudflare Worker). A chave fica no segredo GEMINI_API_KEY, nunca na página.
const PERMITIDOS = ['https://fabiosantosbarueri-art.github.io'];
const MODELO = 'gemini-2.5-flash';

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
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: mensagem }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 1500 },
      }),
    });
    if (!r.ok) return new Response('Erro da IA ' + r.status, { status: 502, headers: cors });
    const d = await r.json();
    const texto = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    return new Response(JSON.stringify({ texto }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
