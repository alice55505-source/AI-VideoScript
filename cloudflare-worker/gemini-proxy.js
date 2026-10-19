// Cloudflare Worker：代理 Gemini 與 Fish Audio API 呼叫，讓 API Key 只存在 Cloudflare Secret，
// 不會出現在前端程式碼或 GitHub repo 裡。
//
// 路由：
//   POST /      → Gemini（AI 腳本生成）
//   POST /tts   → Fish Audio TTS（取代原本的 n8n fish-audio-tts webhook）
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

async function handleTts(request, env) {
  const apiKey = (env.FISH_API_KEY || '').trim();
  if (!apiKey) {
    return json({ error: 'FISH_API_KEY 尚未設定（wrangler secret put FISH_API_KEY）' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: '請求 body 必須是 JSON' }, 400);
  }

  const text = body.text;
  if (!text || typeof text !== 'string') {
    return json({ error: '缺少 text 欄位' }, 400);
  }
  const payload = { text: text, format: 'mp3' };
  if (body.reference_id) payload.reference_id = String(body.reference_id);
  if (body.speed) payload.prosody = { speed: Number(body.speed) };

  let res;
  try {
    res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'model': (env.FISH_MODEL || 's1').trim(),
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({ error: '呼叫 Fish Audio API 失敗：' + e.message }, 502);
  }

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: 'Fish Audio 回傳錯誤 HTTP ' + res.status + '：' + errText.substring(0, 300) }, res.status);
  }
  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg', ...CORS_HEADERS },
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
    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (path === '/tts') {
      return handleTts(request, env);
    }
    const apiKey = (env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
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
      + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);

    // 模型忙碌（503）時自動重試，間隔 2、4、8 秒
    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
      } catch (e) {
        return json({ error: '呼叫 Gemini API 失敗：' + e.message }, 502);
      }
      if (res.status !== 503 || attempt >= 3) break;
      await new Promise(function (r) { setTimeout(r, 2000 * Math.pow(2, attempt)); });
    }

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
