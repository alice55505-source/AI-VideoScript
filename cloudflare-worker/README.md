# API Proxy（Cloudflare Worker）

把 Gemini 與 Fish Audio 的 API Key 藏在 Cloudflare，不會出現在前端程式碼或 GitHub repo 裡。
取代原本跑在自己電腦上的 n8n，不用再開電腦 + 內網穿透。

| 路徑 | 用途 |
|---|---|
| `POST /` | Gemini（AI 腳本生成；`stream:true` 時邊產生邊回傳，預設思考程度 low） |
| `POST /tts` | Fish Audio 配音（原 n8n `fish-audio-tts`） |

影片合成改在瀏覽器本機完成（素材庫「🎬 合成影片並下載」），不需要伺服器。

## 部署步驟

需要先安裝 [wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)：

```bash
npm install -g wrangler
```

在這個資料夾（`cloudflare-worker/`）底下執行：

```bash
# 1. 登入你的 Cloudflare 帳號（會開瀏覽器授權）
wrangler login

# 2. 部署 Worker
wrangler deploy

# 3. 設定 Secret（互動輸入，貼上你的 Gemini API Key，按 Enter）
#    這一步不會把 Key 寫進任何檔案，只會存在 Cloudflare 後台
wrangler secret put GEMINI_API_KEY

# 4. 設定 Fish Audio Key（fish.audio → API Keys 取得）
wrangler secret put FISH_API_KEY
```

`wrangler deploy` 完成後，終端機會印出 Worker 網址，長得像：

```
https://ai-videoscript-gemini-proxy.<你的-cloudflare-帳號>.workers.dev
```

把這個網址填進 `index.html`「API 設定」頁的「Worker URL」欄位（會自動存到瀏覽器 localStorage）。

## 更新 Key

Key 外流或想換一把時，不用重新部署，直接：

```bash
wrangler secret put GEMINI_API_KEY
```

再貼一次新的 Key 即可（Fish Audio 用 `wrangler secret put FISH_API_KEY`）。

Fish Audio 預設用 `s1` 模型；要換可在 Cloudflare 後台 Worker → Settings → Variables 加 `FISH_MODEL`。

## 本機測試（選用）

```bash
wrangler dev
```

會在本機啟動一個測試網址，一樣需要先 `wrangler secret put GEMINI_API_KEY`（或用 `.dev.vars` 檔案，注意不要提交進 git）。
