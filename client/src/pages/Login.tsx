/**
 * 教師登入頁 — 取代 Manus OAuth
 *
 * 輸入環境變數 TEACHER_PASSWORD 設定的密碼即可登入。
 * 登入成功後 cookie 一年有效，之後 protectedProcedure 自動通過。
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { MemphisBackground } from "@/components/MemphisDecorations";

export default function LoginPage() {
  const [, navigate] = useLocation();
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

  // 已登入就直接跳轉
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (meQuery.data) navigate("/teacher");
  }, [meQuery.data, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("請輸入密碼");
      return;
    }
    loginMutation.mutate({ password: password.trim() });
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
            <Lock size={36} />
          </div>

          <h1 className="memphis-heading text-3xl mb-2">教師登入</h1>
          <p className="text-sm font-semibold text-[#1A1A1A]/60 mb-6">
            輸入管理員設定的密碼
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 relative">
              <label htmlFor="password" className="sr-only">
                密碼
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼..."
                className="memphis-input w-full px-4 py-4 text-lg text-center pr-12"
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
                "登入"
              )}
            </button>
          </form>

          <a
            href="/"
            className="block mt-4 text-sm font-bold text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:underline"
          >
            ← 返回首頁
          </a>

          <p className="text-[10px] text-[#1A1A1A]/40 mt-6">
            密碼由部署環境變數 TEACHER_PASSWORD 設定
          </p>
        </div>
      </div>
    </div>
  );
}