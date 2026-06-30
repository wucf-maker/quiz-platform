import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { MemphisBackground } from "@/components/MemphisDecorations";
import { BookOpen, QrCode, BarChart2, Zap } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/teacher");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    {
      icon: <BookOpen size={28} />,
      color: "#D4C5F9",
      title: "四種題型",
      desc: "單選、圖片選擇、連線、填充，靈活組合",
    },
    {
      icon: <QrCode size={28} />,
      color: "#B8F0D8",
      title: "QR Code 作答",
      desc: "學生掃碼即可作答，無需帳號",
    },
    {
      icon: <BarChart2 size={28} />,
      color: "#FFF3A3",
      title: "即時分析",
      desc: "答對率、常見錯誤一目了然",
    },
    {
      icon: <Zap size={28} />,
      color: "#FFB3C6",
      title: "即時回饋",
      desc: "學生提交後立即看到每題對錯",
    },
  ];

  return (
    <div className="min-h-screen memphis-bg relative overflow-hidden">
      <MemphisBackground />

      {/* Header */}
      <header className="relative z-10 border-b-4 border-[#1A1A1A] bg-white/90 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "#D4C5F9",
                border: "3px solid #1A1A1A",
                boxShadow: "3px 3px 0 #1A1A1A",
              }}
            >
              <BookOpen size={20} />
            </div>
            <span className="memphis-heading text-2xl">QUIZ MASTER</span>
          </div>
          <a href={getLoginUrl()}>
            <button className="memphis-btn px-5 py-2.5 text-sm">
              教師登入
            </button>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container py-20 text-center">
        <div
          className="inline-block px-4 py-1.5 rounded-full mb-6 font-black text-sm"
          style={{
            background: "#FFF3A3",
            border: "2px solid #1A1A1A",
            boxShadow: "3px 3px 0 #1A1A1A",
          }}
        >
          🎓 專為課堂設計的評估平台
        </div>

        <h1
          className="memphis-heading text-5xl sm:text-7xl mb-6 leading-tight"
          style={{ textShadow: "4px 4px 0 rgba(0,0,0,0.1)" }}
        >
          讓測驗
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #D4C5F9, #B8F0D8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            更有趣！
          </span>
        </h1>

        <p className="text-xl font-bold text-[#1A1A1A]/70 mb-10 max-w-lg mx-auto">
          教師輕鬆出題，學生掃碼即答，
          <br />
          即時回饋讓學習更有效率。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={getLoginUrl()}>
            <button className="memphis-btn px-10 py-4 text-xl flex items-center gap-3">
              <BookOpen size={22} />
              教師登入 / 註冊
            </button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 container pb-20">
        <h2 className="memphis-heading text-3xl text-center mb-10">平台特色</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="memphis-card p-6 text-center hover:-translate-y-1 transition-transform"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: f.color,
                  border: "3px solid #1A1A1A",
                  boxShadow: "4px 4px 0 #1A1A1A",
                }}
              >
                {f.icon}
              </div>
              <h3 className="font-black text-lg mb-2">{f.title}</h3>
              <p className="font-semibold text-[#1A1A1A]/60 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        className="relative z-10 py-16"
        style={{ background: "white", borderTop: "4px solid #1A1A1A", borderBottom: "4px solid #1A1A1A" }}
      >
        <div className="container">
          <h2 className="memphis-heading text-3xl text-center mb-10">如何使用？</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "1", title: "教師建立測驗", desc: "登入後新增測驗，設定題目與答案", color: "#D4C5F9" },
              { step: "2", title: "分享 QR Code", desc: "一鍵生成 QR Code，投影或列印給學生", color: "#B8F0D8" },
              { step: "3", title: "學生掃碼作答", desc: "輸入姓名即可開始，提交後立即看成績", color: "#FFF3A3" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-3xl"
                  style={{
                    background: s.color,
                    border: "4px solid #1A1A1A",
                    boxShadow: "5px 5px 0 #1A1A1A",
                  }}
                >
                  {s.step}
                </div>
                <h3 className="font-black text-lg mb-2">{s.title}</h3>
                <p className="font-semibold text-[#1A1A1A]/60 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="font-bold text-[#1A1A1A]/50 text-sm">
          QUIZ MASTER · 讓每一次測驗都充滿活力 🎉
        </p>
      </footer>
    </div>
  );
}
