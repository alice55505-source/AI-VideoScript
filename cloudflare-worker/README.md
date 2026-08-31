# Gemini API Proxy（Cloudflare Worker）

把 Gemini API Key 藏在 Cloudflare，不會出現在前端程式碼或 GitHub repo 裡。
「AI 腳本製作」頁改成呼叫這個 Worker，Worker 才用真正的 Key 去打 Gemini。

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
```

`wrangler deploy` 完成後，終端機會印出 Worker 網址，長得像：

```
https://ai-videoscript-gemini-proxy.<你的-cloudflare-帳號>.workers.dev
```

把這個網址填進 `index.html`「API 設定」頁的「AI 腳本生成 Worker URL」欄位（會自動存到瀏覽器 localStorage）。

## 更新 Key

Key 外流或想換一把時，不用重新部署，直接：

```bash
wrangler secret put GEMINI_API_KEY
```

再貼一次新的 Key 即可。

## 本機測試（選用）

```bash
wrangler dev
```

會在本機啟動一個測試網址，一樣需要先 `wrangler secret put GEMINI_API_KEY`（或用 `.dev.vars` 檔案，注意不要提交進 git）。
