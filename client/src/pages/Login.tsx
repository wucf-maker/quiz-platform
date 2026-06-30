/**
 * 教師登入 / 註冊頁 — 取代 Manus OAuth
 *
 * 模式：
 *   1. 老用戶：用 username + password 登入（查 DB、scrypt 比對）
 *   2. 環境變數後門：username 留空、只輸入密碼（比對 TEACHER_PASSWORD）
 *   3. 第一次使用：可在此頁建立新教師帳號
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  User,
  KeyRound,
  UserPlus,
  LogIn,
  ArrowLeft,
} from "lucide-react";
import { MemphisBackground } from "@/components/MemphisDecorations";

type Mode = "login" | "register";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("登入成功！");
      navigate("/teacher");
    },
    onError: (e) => {
      toast.error(e.message || "登入失敗");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("註冊成功！請登入");
      setMode("login");
      setPassword("");
    },
    onError: (e) => {
      toast.error(e.message || "註冊失敗");
    },
  });

  // 已登入就直接跳轉
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (meQuery.data) navigate("/teacher");
  }, [meQuery.data, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("請輸入密碼");
      return;
    }
    loginMutation.mutate({
      username: username.trim() || undefined,
      password: password.trim(),
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim() || !password.trim()) {
      toast.error("請填寫所有欄位");
      return;
    }
    registerMutation.mutate({
      username: username.trim(),
      displayName: displayName.trim(),
      password: password.trim(),
    });
  };

  return (
    <div className="min-h-screen memphis-bg flex items-center justify-center p-4">
      <MemphisBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="memphis-card p-8 text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "#D4C5F9",
              border: "4px solid #1A1A1A",
              boxShadow: "6px 6px 0 #1A1A1A",
            }}
            aria-hidden="true"
          >
            {mode === "login" ? <Lock size={36} /> : <UserPlus size={36} />}
          </div>

          <h1 className="memphis-heading text-3xl mb-2">
            {mode === "login" ? "教師登入" : "教師註冊"}
          </h1>
          <p className="text-sm font-semibold text-[#1A1A1A]/60 mb-6">
            {mode === "login"
              ? "輸入你的帳號密碼"
              : "建立新教師帳號（首次使用）"}
          </p>

          {mode === "login" ? (
            <form onSubmit={handleLogin}>
              <div className="mb-3 relative">
                <label htmlFor="username" className="sr-only">
                  帳號
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"
                    aria-hidden="true"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="帳號（環境變數後門可留空）"
                    className="memphis-input w-full pl-10 pr-4 py-3 text-base"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="mb-4 relative">
                <label htmlFor="password" className="sr-only">
                  密碼
                </label>
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密碼"
                    className="memphis-input w-full pl-10 pr-12 py-3 text-base"
                    autoFocus
                    autoComplete="current-password"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending || !password.trim()}
                className="w-full memphis-btn py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                    登入中...
                  </>
                ) : (
                  <>
                    <LogIn size={20} aria-hidden="true" />
                    登入
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="mb-3 relative">
                <label htmlFor="reg-username" className="sr-only">
                  帳號
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="帳號（3-64 字元，英數 _ -）"
                    className="memphis-input w-full pl-10 pr-4 py-3 text-base"
                    autoComplete="username"
                    pattern="[a-zA-Z0-9_-]+"
                    minLength={3}
                    maxLength={64}
                    required
                  />
                </div>
              </div>

              <div className="mb-3 relative">
                <label htmlFor="reg-display" className="sr-only">
                  顯示名稱
                </label>
                <input
                  id="reg-display"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="顯示名稱（給學生看）"
                  className="memphis-input w-full px-4 py-3 text-base"
                  autoComplete="name"
                  maxLength={64}
                  required
                />
              </div>

              <div className="mb-4 relative">
                <label htmlFor="reg-password" className="sr-only">
                  密碼
                </label>
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密碼（至少 6 字）"
                    className="memphis-input w-full pl-10 pr-12 py-3 text-base"
                    autoFocus
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={256}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
                    aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  registerMutation.isPending ||
                  !username.trim() ||
                  !displayName.trim() ||
                  !password.trim()
                }
                className="w-full memphis-btn py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                    建立中...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} aria-hidden="true" />
                    建立帳號
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-4 flex items-center justify-center gap-3 text-sm font-bold">
            {mode === "login" ? (
              <>
                <span className="text-[#1A1A1A]/60">還沒有帳號？</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setPassword("");
                  }}
                  className="text-[#7B5BFF] hover:underline"
                >
                  立即註冊
                </button>
              </>
            ) : (
              <>
                <span className="text-[#1A1A1A]/60">已有帳號？</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setPassword("");
                  }}
                  className="text-[#7B5BFF] hover:underline"
                >
                  切換登入
                </button>
              </>
            )}
          </div>

          <a
            href="/"
            className="flex items-center justify-center gap-1 mt-4 text-sm font-bold text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            返回首頁
          </a>

          <p className="text-[10px] text-[#1A1A1A]/40 mt-6 leading-relaxed">
            帳號留空 + 輸入 TEACHER_PASSWORD 環境變數密碼 → 環境後門登入
            <br />
            帳號 + 密碼 → DB 帳號登入（需先註冊）
          </p>
        </div>
      </div>
    </div>
  );
}
