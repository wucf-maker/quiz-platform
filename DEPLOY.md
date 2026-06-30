# 部署指南 — Quiz Assessment Platform

這個專案已經從 Manus 平台依賴（OAuth + Forge S3 + MySQL）改造為**完全自部署**。
只需要一個 Node.js 環境 + PostgreSQL 資料庫，就能部署到任何地方。

---

## 🏗️ 環境變數（必填）

複製 `.env.example` 為 `.env`，然後填入：

| 變數 | 必填 | 說明 |
|---|---|---|
| `TEACHER_PASSWORD` | ✅ | 教師登入密碼 |
| `JWT_SECRET` | ✅ | JWT 簽名密鑰，用 `openssl rand -hex 32` 產生 |
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `LOCAL_STORAGE_DIR` | ⭕ | 圖片儲存目錄，預設 `/opt/render/project/src/uploads`（Render） |
| `NODE_ENV` | ⭕ | production |
| `PORT` | ⭕ | 預設 3000 |

**⚠️ 安全提醒：** 如果 `TEACHER_PASSWORD` 沒設定，所有教師登入請求都會被拒絕 —
這是故意的，避免部署後忘記設密碼導致後台裸奔。

---

## 🚀 方案 A：Render + Neon（推薦，15 分鐘搞定）

免費方案就夠學生測試。

### 1. 申請 Neon PostgreSQL（5 分鐘）
1. 開 https://neon.tech → **Sign Up** → 用 GitHub 一鍵登入
2. 點 **"Create a project"**
3. 選 Region：`AWS Singapore (ap-southeast-1)` ← 離香港最近
4. 點 **"Create Project"**
5. 進到 Dashboard，左邊點 **"Connection Details"**
6. 選 **"Connection string"** 標籤，會看到：
   ```
   postgresql://neondb_owner:xxxxxxxx@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
7. **複製這條**，待會填到 Render

**Neon 免費方案：** 0.5GB 儲存、191.9 小時 compute/月（永久免費）

### 2. 推上 GitHub
```powershell
cd C:\Users\123\Desktop\quiz-assessment-platform
git remote add origin https://github.com/你的帳號/quiz-platform.git
git push -u origin main
```

### 3. Render 建立服務（5 分鐘）
1. 到 https://dashboard.render.com → **New +** → **Blueprint**
2. 選你的 GitHub repo
3. Render 自動讀 `render.yaml`，會建立：
   - 1 個 Web Service（Node.js）
   - 1 個 1GB 永久 Disk（給圖片用）
4. 點 **"Apply"**
5. **等 build 完成**（3-5 分鐘，黃色 → 綠色）

### 4. 設定環境變數
進到你的 web service → 左邊 **"Environment"**：
| Key | Value |
|---|---|
| `DATABASE_URL` | 貼 Step 1 拿到的 Neon 連線字串 |
| `TEACHER_PASSWORD` | 你的教師密碼 |

點 **"Save Changes"** → Render 自動重新部署。

### 5. 跑 schema migration（1 分鐘）
進到 web service 頁面 → 左邊 **"Shell"** 標籤 → **"Open Shell"**：
```bash
cd /opt/render/project/src
npm run db:push
```
看到 drizzle-kit 跑完、沒錯誤就 exit。

---

## 🎉 完成！

部署完成後：
- Render 給你 `https://quiz-platform-xxxx.onrender.com`
- 訪問 → 看到首頁
- 點「教師登入」→ 輸入 `TEACHER_PASSWORD` → 進入後台

第一次訪問可能要等 30-60 秒（Render free tier 冷啟動）。

---

## 🛩️ 方案 B：Fly.io（更便宜，3GB disk + 3 apps 永久免費）

```powershell
# 1. 安裝 fly CLI
iwr https://fly.io/install.ps1 -useb | iex

# 2. 登入
fly auth signup

# 3. 在專案目錄初始化
cd C:\Users\123\Desktop\quiz-assessment-platform
fly launch --no-deploy

# 4. 建立 3GB volume（給圖片用）
fly volumes create uploads --size 3 --region sin

# 5. 設 secrets
fly secrets set TEACHER_PASSWORD=你的密碼
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set DATABASE_URL=postgresql://...

# 6. 部署
fly deploy
```

Fly 給你 `https://你的app.fly.dev` 網址。

---

## 💻 方案 C：自架 VPS（最便宜，$5/月 起）

任何 Linux VPS（DigitalOcean / Linode / Vultr / AWS Lightsail）都行：

```bash
# 1. 安裝 Node.js 20+ 和 PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql

# 2. 建立 DB
sudo -u postgres psql -c "CREATE DATABASE quiz_platform;"
sudo -u postgres psql -c "CREATE USER quiz WITH PASSWORD '密碼';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE quiz_platform TO quiz;"

# 3. 部署專案
git clone https://github.com/你的帳號/quiz-platform.git
cd quiz-platform
cp .env.example .env
nano .env  # 填入所有環境變數

npm install --legacy-peer-deps
npm run build
npm run db:push
mkdir -p uploads

# 4. 用 pm2 背景跑
sudo npm install -g pm2
pm2 start npm --name quiz -- start
pm2 startup
pm2 save

# 5. nginx + Let's Encrypt HTTPS
sudo apt install -y nginx certbot python3-certbot-nginx
# /etc/nginx/sites-available/quiz 設好 server_name + proxy_pass http://localhost:3000
sudo certbot --nginx -d yourdomain.com
```

---

## 🔍 健康檢查

部署後訪問 `/api/health`：
```json
{
  "status": "ok",
  "timestamp": "2026-06-30T08:00:00Z",
  "storage": "local",
  "teacherAuth": true
}
```

- `storage`: `forge` / `local`
- `teacherAuth`: 是否啟用教師登入（必須為 `true`）

---

## 🔒 安全檢查清單

部署到公開網路前：

- [ ] `TEACHER_PASSWORD` 已設定（強密碼，10+ 字元）
- [ ] `JWT_SECRET` 是隨機 32+ 字元（用 `openssl rand -hex 32` 產生）
- [ ] `DATABASE_URL` 含強密碼
- [ ] 學生作答端點有 rate limit（待加：#2 P0 項目）
- [ ] HTTPS 已啟用（Render / Fly 自動；VPS 要用 nginx + certbot）
- [ ] `.env` 沒有 commit 到 git（已在 .gitignore）
- [ ] Render Disk 已掛載到 `LOCAL_STORAGE_DIR` 路徑

---

## 📊 監控建議（選配）

- **錯誤追蹤**：[Sentry](https://sentry.io)（Node.js SDK，5 分鐘搞定）
- **Uptime 監控**：[UptimeRobot](https://uptimerobot.com)（免費，每 5 分鐘 ping 一次 `/api/health`）

---

## 🆘 常見問題

**Q: 學生作答後沒看到結果？**
A: 檢查 `/api/health`，確認 `storage` 和 `teacherAuth` 都對，然後看 Render Shell 的 server log。

**Q: Render Shell 跑 `db:push` 報「permission denied」？**
A: 確認 `DATABASE_URL` 包含 `?sslmode=require`，Neon 強制 SSL。

**Q: 圖片上傳後 404？**
A: 確認 Render Disk 已掛到 `/opt/render/project/src/uploads`，且 `LOCAL_STORAGE_DIR` 環境變數指向同路徑。

**Q: 老師登入後看不到測驗？**
A: 確認 `db:push` 有跑成功，且 `DATABASE_URL` 連得到 Neon。

**Q: 怎麼把 Neon 換成自架 MySQL？**
A: 改用 mysql2 + 改 schema 回到 MySQL 寫法。drizzle 兩邊都支援。

---

## 📝 License

MIT（與原專案一致）