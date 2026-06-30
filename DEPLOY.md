# 部署指南 — Quiz Assessment Platform

這個專案已經從 Manus 平台依賴（OAuth + Forge S3 + MySQL）改造為**完全自部署**。
支援三種雲端平台：**Render**、**Cyclic.sh**、**Fly.io**，加上 **Cloudflare R2** 永久免費儲存。

---

## 🏗️ 環境變數

複製 `.env.example` 為 `.env`，然後填入：

| 變數 | 必填 | 說明 |
|---|---|---|
| `TEACHER_PASSWORD` | ✅ | 教師登入密碼 |
| `JWT_SECRET` | ✅ | JWT 簽名密鑰，`openssl rand -hex 32` |
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串（推薦 Neon） |
| `R2_*` (4 個) | ⭕ R2 模式 | Cloudflare R2 設定 |
| `LOCAL_STORAGE_DIR` | ⭕ 本地模式 | 預設 `./uploads` |
| `NODE_ENV` | ⭕ | production |
| `PORT` | ⭕ | 預設 3000 |

**⚠️ 安全提醒：** `TEACHER_PASSWORD` 沒設定 = 所有教師登入請求會被拒絕，避免部署後忘記設密碼導致後台裸奔。

---

## 🚀 方案 A：Render + Neon + R2（推薦，**需要信用卡**）

最簡單穩定的組合。Render free tier 雖然要信用卡驗證（不會收費），但設定最直觀。

### 1. 申請 Neon PostgreSQL（5 分鐘）
1. https://neon.tech → **Sign Up with GitHub**
2. Create project → Region: `AWS Singapore`
3. 複製 connection string

### 2. 申請 Cloudflare R2（5 分鐘）
1. https://dash.cloudflare.com → **R2** → Create bucket（命名 `quiz-platform-uploads`）
2. **Settings** → 開啟 **Public Development URL**（或綁定自訂 domain）
3. **Manage R2 API Tokens** → Create token → 權限: Object Read & Write，套用 bucket `quiz-platform-uploads`
4. 記下：
   - `R2_ACCOUNT_ID`（在 R2 dashboard URL 裡）
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET` = `quiz-platform-uploads`

### 3. 推上 GitHub（我已幫你做）

### 4. Render 建立 Blueprint
1. https://dashboard.render.com → **New +** → **Blueprint**
2. 連 `wucf-maker/quiz-platform` repo
3. Render 自動讀 `render.yaml`，建立 web service + 1GB disk
4. 點 **Apply** → 等 build 完成（3-5 分鐘）

### 5. 設定環境變數
Render web service → **Environment**：

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon 連線字串 |
| `TEACHER_PASSWORD` | 你的密碼 |
| `R2_ACCOUNT_ID` | Cloudflare 給的 |
| `R2_ACCESS_KEY_ID` | 同上 |
| `R2_SECRET_ACCESS_KEY` | 同上 |
| `R2_BUCKET` | `quiz-platform-uploads` |

`JWT_SECRET` 會自動產生。

---

## 🌐 方案 B：Cyclic.sh + Neon + R2（**免信用卡**，推薦）

[Cyclic.sh](https://cyclic.sh) 完全免費、無需信用卡，但有冷啟動（30 分鐘無人訪問會休眠）。

### 1. 申請 Neon + R2（同上）

### 2. 去 Cyclic 註冊
1. https://app.cyclic.sh → **Sign Up with GitHub**
2. 第一次會要授權 GitHub 存取 repo
3. 點 **Deploy** → 選 `wucf-maker/quiz-platform`
4. Cyclic 自動偵測 `cyclic.json` 跟 `package.json` 的 build/start

### 3. 設定環境變數
Cyclic dashboard → 你的 app → **Variables**：

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon 連線字串 |
| `TEACHER_PASSWORD` | 你的密碼 |
| `JWT_SECRET` | 用 `openssl rand -hex 32` 產生 |
| `R2_ACCOUNT_ID` | Cloudflare 給的 |
| `R2_ACCESS_KEY_ID` | 同上 |
| `R2_SECRET_ACCESS_KEY` | 同上 |
| `R2_BUCKET` | `quiz-platform-uploads` |
| `NODE_ENV` | `production` |

點 **Save** → 自動 redeploy。

### 4. 取得網址
Cyclic 給你 `https://你的app名稱.cyclic.app` 網址。

⚠️ **Cyclic 限制**：
- 30 分鐘無人訪問會休眠，下次訪問需等 10-30 秒冷啟動
- 免費方案只支援 1 個 app
- 不支援 persistent disk（這就是為什麼我們用 R2）

---

## 🛩️ 方案 C：Fly.io + Neon + R2（**要信用卡**，免費額度大方）

```powershell
# 1. 安裝 fly CLI
iwr https://fly.io/install.ps1 -useb | iex

# 2. 登入
fly auth signup

# 3. 在專案目錄初始化
cd C:\Users\123\Desktop\quiz-assessment-platform
fly launch --no-deploy

# 4. 設 secrets
fly secrets set TEACHER_PASSWORD=你的密碼
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set DATABASE_URL=postgresql://...
fly secrets set R2_ACCOUNT_ID=...
fly secrets set R2_ACCESS_KEY_ID=...
fly secrets set R2_SECRET_ACCESS_KEY=...
fly secrets set R2_BUCKET=quiz-platform-uploads

# 5. 部署
fly deploy
```

---

## 💻 方案 D：自架 VPS（最便宜，$5/月）

任何 Linux VPS（DigitalOcean / Linode / Vultr / AWS Lightsail）都行：

```bash
# 1. 安裝 Node.js 20+ 和 PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql

# 2. 建立 DB
sudo -u postgres psql -c "CREATE DATABASE quiz_platform;"
sudo -u postgres psql -c "CREATE USER quiz WITH PASSWORD '密碼';"

# 3. 部署
git clone https://github.com/wucf-maker/quiz-platform.git
cd quiz-platform
cp .env.example .env
nano .env  # 填入環境變數

npm install --legacy-peer-deps
npm run build
npm run db:push

# 4. 用 pm2 背景跑
sudo npm install -g pm2
pm2 start npm --name quiz -- start
pm2 startup && pm2 save

# 5. nginx + Let's Encrypt
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 💻 方案 E：本地 + ngrok（5 分鐘測試）

```powershell
cd C:\Users\123\Desktop\quiz-assessment-platform
npm install --legacy-peer-deps
npm run db:push  # 需要 Neon 連線（先建 .env）
npm run dev

# 另一個視窗：
ngrok http 3000
```

把 ngrok 給的網址發給學生就能用。**電腦要一直開著**。

---

## 🔍 健康檢查

部署後訪問 `/api/health`：
```json
{
  "status": "ok",
  "timestamp": "...",
  "storage": "r2",  // 或 "local" / "forge"
  "teacherAuth": true
}
```

`storage` 應顯示 `r2`（代表成功用 Cloudflare R2）。

---

## 🔒 安全檢查清單

部署到公開網路前：

- [ ] `TEACHER_PASSWORD` 已設定（強密碼，10+ 字元）
- [ ] `JWT_SECRET` 是隨機 32+ 字元
- [ ] `DATABASE_URL` 含強密碼
- [ ] Cloudflare R2 bucket 已開啟 public read（或綁定自訂 domain）
- [ ] `.env` 沒有 commit 到 git（已在 .gitignore）
- [ ] 學生作答端點有 rate limit（待加：#2 P0 項目）

---

## 🆘 常見問題

**Q: 圖片上傳後看不到？**
A: 檢查 R2 bucket 的 public access 設定，或 `R2_PUBLIC_BASE` 是否正確。

**Q: 學生作答後沒看到結果？**
A: 訪問 `/api/health`，確認 `storage: r2`、`teacherAuth: true`，然後看 server log。

**Q: db:push 報錯？**
A: 確認 `DATABASE_URL` 含 `?sslmode=require`，Neon 強制 SSL。

---

## 📊 監控建議（選配）

- **錯誤追蹤**：[Sentry](https://sentry.io)（Node.js SDK，5 分鐘）
- **Uptime 監控**：[UptimeRobot](https://uptimerobot.com)（免費，每 5 分鐘 ping `/api/health`）

---

## 📝 License

MIT