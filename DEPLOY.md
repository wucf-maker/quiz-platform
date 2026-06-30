# 部署指南 — Quiz Assessment Platform

這個專案已經從 Manus 平台依賴（OAuth + Forge S3）改造為**完全自部署**。
只需要一個 Node.js 環境 + MySQL 資料庫，就能部署到任何地方。

---

## 🏗️ 環境變數（必填）

複製 `.env.example` 為 `.env`，然後填入：

| 變數 | 必填 | 說明 |
|---|---|---|
| `TEACHER_PASSWORD` | ✅ | 教師登入密碼 |
| `JWT_SECRET` | ✅ | JWT 簽名密鑰，用 `openssl rand -hex 32` 產生 |
| `DATABASE_URL` | ✅ | MySQL 連線字串，例如 `mysql://user:pass@host:3306/db` |
| `LOCAL_STORAGE_DIR` | ⭕ | 圖片儲存目錄，預設 `./uploads` |
| `NODE_ENV` | ⭕ | production |
| `PORT` | ⭕ | 預設 3000 |

**⚠️ 安全提醒：** 如果 `TEACHER_PASSWORD` 沒設定，所有教師登入請求都會被拒絕 —
這是故意的，避免部署後忘記設密碼導致後台裸奔。

---

## 🚀 方案 A：Render（推薦，10 分鐘搞定）

Render 免費方案就夠學生測試。

### 1. 準備資料庫
- 去 [PlanetScale](https://planetscale.com) 或 [Aiven](https://aiven.io) 申請免費 MySQL
- 拿到連線字串（`mysql://...`）

### 2. 推上 GitHub
```powershell
cd C:\Users\123\Desktop\quiz-assessment-platform
git init
git add .
git commit -m "feat: 教師密碼登入 + 本地檔案儲存"
git remote add origin https://github.com/你的帳號/quiz-platform.git
git push -u origin main
```

### 3. Render 建立服務
1. 到 https://dashboard.render.com → New → Blueprint
2. 連你的 GitHub repo（Render 會讀 `render.yaml`）
3. Render 自動建立 web service + 1GB 永久 disk（給圖片用）
4. 在 Environment 分頁設定：
   - `DATABASE_URL` = 你的 MySQL 連線字串
   - `TEACHER_PASSWORD` = 你的教師密碼
5. 等 build 完成 → Render 給你一個 `https://xxx.onrender.com` 網址

### 4. 跑 schema migration
Render 啟動時**不會自動跑** drizzle migration。在 Render Shell 跑：
```bash
npm run db:push
```

---

## 🛩️ 方案 B：Fly.io（更便宜，免費方案含 3GB disk）

```powershell
# 1. 安裝 fly CLI
iwr https://fly.io/install.ps1 -useb | iex

# 2. 登入
fly auth signup  # 或 fly auth login

# 3. 在專案目錄初始化
cd C:\Users\123\Desktop\quiz-assessment-platform
fly launch --no-deploy

# 4. 建立 3GB volume（給圖片用）
fly volumes create uploads --size 3 --region sin  # 或 hkg

# 5. 設定 secrets
fly secrets set TEACHER_PASSWORD=你的密碼
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set DATABASE_URL=mysql://...

# 6. 部署
fly deploy
```

Fly 會給你 `https://你的app.fly.dev` 網址。

---

## 💻 方案 C：自架 VPS（最便宜，$5/月 起）

任何 Linux VPS（DigitalOcean / Linode / Vultr / AWS Lightsail）都行：

```bash
# 1. 安裝 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. 安裝 MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# 3. 建立資料庫
sudo mysql -e "CREATE DATABASE quiz_platform CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER 'quiz'@'localhost' IDENTIFIED BY '密碼';"
sudo mysql -e "GRANT ALL ON quiz_platform.* TO 'quiz'@'localhost';"

# 4. 部署專案
git clone https://github.com/你的帳號/quiz-platform.git
cd quiz-platform
cp .env.example .env
nano .env  # 填入 DATABASE_URL、TEACHER_PASSWORD、JWT_SECRET

npm install --legacy-peer-deps
npm run build
npm run db:push
mkdir -p uploads

# 5. 用 pm2 背景跑
sudo npm install -g pm2
pm2 start npm --name quiz -- start
pm2 startup
pm2 save

# 6. 用 nginx 反向代理 + Let's Encrypt HTTPS
sudo apt install -y nginx certbot python3-certbot-nginx
# /etc/nginx/sites-available/quiz 設好 server_name + proxy_pass http://localhost:3000
sudo certbot --nginx -d yourdomain.com
```

---

## 🔍 健康檢查

部署後訪問 `/api/health` 確認服務正常：
```json
{
  "status": "ok",
  "timestamp": "2026-06-29T08:00:00Z",
  "storage": "local",
  "teacherAuth": true
}
```

- `storage`: `forge` / `local`
- `teacherAuth`: 是否啟用教師登入（必須為 true）

---

## 🔒 安全檢查清單

部署到公開網路前確認：

- [ ] `TEACHER_PASSWORD` 已設定（強密碼）
- [ ] `JWT_SECRET` 是隨機 32+ 字元（不要用預設值）
- [ ] `DATABASE_URL` 含強密碼
- [ ] 學生作答端點有 rate limit（待加：#2 P0 項目）
- [ ] HTTPS 已啟用（Render / Fly 自動；VPS 要用 nginx + certbot）
- [ ] `.env` 沒有 commit 到 git（已在 .gitignore）
- [ ] 圖片目錄有定期備份（Render / Fly 的 disk 不會自動備份）

---

## 📊 監控建議（選配）

部署後建議串接：

- **錯誤追蹤**：[Sentry](https://sentry.io)（Node.js SDK，5 分鐘搞定）
- **日誌聚合**：[Better Stack](https://betterstack.com) 或 [Logtail](https://logtail.com)
- **Uptime 監控**：免費 [UptimeRobot](https://uptimerobot.com) 5 分鐘 ping 一次 `/api/health`

---

## 🆘 常見問題

**Q: 學生作答後沒看到結果？**
A: 檢查 `/api/health`，確認 `storage` 跟 `teacherAuth` 都對。然後看 server log。

**Q: 圖片上傳失敗？**
A: 確認 `LOCAL_STORAGE_DIR` 目錄存在且有寫入權限。Render 用 disk mount path `/opt/render/project/src/uploads`。

**Q: 老師登入後看不到測驗？**
A: 確認 `DATABASE_URL` 連得到 DB，且有跑 `npm run db:push`。

**Q: 怎麼把 Manus 模式切回來？**
A: 設定 `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` 環境變數即可，
storage 會自動切回 Forge 模式。

---

## 📝 License

MIT（與原專案一致）