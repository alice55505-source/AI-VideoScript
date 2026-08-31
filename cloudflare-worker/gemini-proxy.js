// Cloudflare Worker：代理 Gemini API 呼叫，讓 API Key 只存在 Cloudflare Secret，
// 不會出現在前端程式碼或 GitHub repo 裡。
//
// 部署方式見同目錄 README.md。

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, 405);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY 尚未設定（wrangler secret put GEMINI_API_KEY）' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: '請求 body 必須是 JSON' }, 400);
    }

    const prompt = body.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return json({ error: '缺少 prompt 欄位' }, 400);
    }
    const model = (body.model && String(body.model)) || 'gemini-3.6-flash';

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
      + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
    } catch (e) {
      return json({ error: '呼叫 Gemini API 失敗：' + e.message }, 502);
    }

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
