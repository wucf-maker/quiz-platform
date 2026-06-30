import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { MemphisBackground } from "./MemphisDecorations";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { loading, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated, location]);

  if (loading) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center">
        <MemphisBackground />
        <div className="relative z-10 memphis-card p-10 text-center">
          <div className="w-12 h-12 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-black text-xl">驗證身份中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
