import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, Trophy, RotateCcw, RefreshCw, AlertCircle, History, Save } from "lucide-react";
import { MemphisBackground } from "@/components/MemphisDecorations";
import MatchingQuestion from "@/components/MatchingQuestion";
import { AccessibilityToolbar, TTSButton } from "@/components/AccessibilityToolbar";
import StudentOnboardingModal, { hasOnboarded } from "@/components/StudentOnboardingModal";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useDraftAutosave, loadDraft, clearDraft, type DraftPayload } from "@/lib/draft";

type Question = {
  id: number;
  questionType: string;
  questionText: string;
  questionImageUrl?: string | null;
  options?: unknown;
  score: number;
};

type Feedback = {
  questionId: number;
  questionText: string;
  questionType: string;
  options: any;
  correctAnswer: any;
  studentAnswer: any;
  isCorrect: boolean;
  scoreEarned: number;
  maxScore: number;
};

type SubmitResult = {
  submissionId: number;
  studentName: string;
  totalScore: number;
  maxScore: number;
  feedback: Feedback[];
};

type Phase = "name" | "quiz" | "result" | "retry-result";

/** 把時間戳轉成「剛才 / X 分鐘前」形式 */
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "剛才";
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  return new Date(ts).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

export default function QuizPage() {
  const params = useParams<{ token: string }>();
  const shareToken = params.token ?? "";
  const { simplifiedMode } = useAccessibility();

  const { data: quiz, isLoading, error } = trpc.quiz.getByToken.useQuery(
    { shareToken },
    { enabled: !!shareToken }
  );

  const submitMutation = trpc.quiz.submit.useMutation();

  const [phase, setPhase] = useState<Phase>("name");
  const [studentName, setStudentName] = useState("");

  // 學生首次進入作答頁的偏好設定彈窗（一次性，已 onboarded 則不彈）
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !hasOnboarded();
  });

  // 學生歷史提交查詢（只在結果頁展開時才查）
  const [showHistory, setShowHistory] = useState(false);
  const historyQuery = trpc.quiz.history.useQuery(
    { assessmentId: quiz?.id ?? 0, studentName: studentName.trim() },
    { enabled: false } // 手動觸發
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  // 錯題重做：保存原始全部題目，重做時只顯示錯誤的題目
  const [retryQuestionIds, setRetryQuestionIds] = useState<number[] | null>(null);
  const [retryResult, setRetryResult] = useState<SubmitResult | null>(null);
  // 草稿相關：偵測到可恢復的作答
  const [pendingDraft, setPendingDraft] = useState<DraftPayload | null>(null);

  const allQuestions = (quiz?.questions ?? []) as Question[];

  // 學生輸入姓名後，偵測是否有可恢復的草稿
  useEffect(() => {
    if (phase !== "name" || !shareToken) {
      setPendingDraft(null);
      return;
    }
    const name = studentName.trim();
    if (!name) {
      setPendingDraft(null);
      return;
    }
    // 簡單 debounce，避免每打一個字就查一次
    const t = setTimeout(() => {
      const d = loadDraft(shareToken, name);
      setPendingDraft(d);
    }, 300);
    return () => clearTimeout(t);
  }, [phase, shareToken, studentName]);

  // 自動保存：當進入 quiz phase、已有姓名與題目時，debounce 寫 localStorage
  const { lastSavedAt } = useDraftAutosave(
    shareToken,
    phase === "quiz" ? studentName.trim() : "",
    phase === "quiz" && quiz
      ? { assessmentId: quiz.id, assessmentTitle: quiz.title }
      : null,
    phase === "quiz" ? answers : {}
  );

  // 當進入重做模式時，可見題目 = 全部題目裡篩出錯誤的
  const visibleQuestions = useMemo(() => {
    if (retryQuestionIds === null) return allQuestions;
    return allQuestions.filter((q) => retryQuestionIds.includes(q.id));
  }, [allQuestions, retryQuestionIds]);

  const questions = visibleQuestions;

  // 切換 phase 時朗讀標題（如果 TTS 開啟）
  useEffect(() => {
    // 不在這裡朗讀，由各 phase 內的 TTS 按鈕控制
  }, [phase]);

  const handleStart = (options?: { resumeFromDraft?: DraftPayload }) => {
    if (!studentName.trim()) {
      toast.error("請輸入你的姓名");
      return;
    }
    if (options?.resumeFromDraft) {
      // 恢復草稿：載入之前保存的答案
      setAnswers(options.resumeFromDraft.answers);
      setCurrentQ(0);
      toast.success("已恢復上次的作答進度", {
        description: `上次保存於 ${new Date(options.resumeFromDraft.savedAt).toLocaleString("zh-TW")}`,
      });
    } else {
      setAnswers({});
      setCurrentQ(0);
    }
    setPhase("quiz");
    setRetryQuestionIds(null);
    setRetryResult(null);
  };

  const handleDiscardDraft = () => {
    if (!shareToken || !studentName.trim()) return;
    clearDraft(shareToken, studentName.trim());
    setPendingDraft(null);
    toast.info("已清除上次作答紀錄");
  };

  const handleAnswer = (questionId: number, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const gradeAnswerLocal = (
    questionType: string,
    correctAnswer: unknown,
    studentAnswer: unknown
  ): boolean => {
    if (studentAnswer === null || studentAnswer === undefined) return false;
    if (questionType === "single_choice" || questionType === "picture_choice") {
      return String(correctAnswer) === String(studentAnswer);
    }
    if (questionType === "fill_blank") {
      const correct = Array.isArray(correctAnswer)
        ? (correctAnswer as unknown[]).map((s) => String(s).trim().toLowerCase())
        : [String(correctAnswer).trim().toLowerCase()];
      return correct.includes(String(studentAnswer).trim().toLowerCase());
    }
    if (questionType === "matching") {
      if (!Array.isArray(correctAnswer) || !Array.isArray(studentAnswer)) return false;
      const correct = correctAnswer as { leftId: string; rightId: string }[];
      const student = studentAnswer as { leftId: string; rightId: string }[];
      if (correct.length !== student.length) return false;
      return correct.every((c) =>
        student.some((s) => s.leftId === c.leftId && s.rightId === c.rightId)
      );
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // 錯題重做模式：本地批改，不送後端
    if (retryQuestionIds !== null) {
      let totalScore = 0;
      let maxScore = 0;
      const feedback: Feedback[] = questions.map((q) => {
        const studentAnswer = answers[q.id] ?? null;
        const correctAnswer = (q as any).correctAnswer; // 從 quiz.getByToken 不包含，但本地重做時 options 已在
        // 注意：quiz.getByToken 已經 strip 掉 correctAnswer，所以這裡需要另一種方式
        // 解法：把正確答案在初次 submit 時保存在 retryResult 不行，因為錯題重做發生在初次結果之後
        // 改為：在初次 submit 的 result.feedback 裡就有正確答案，這時切換到重做模式時保存它們
        return { questionId: q.id, studentAnswer, isCorrect: false, scoreEarned: 0 } as any;
      });
      toast.info("錯題重做不計入正式成績，但會顯示你的表現");
      // 跳到 retry-result phase，由該 phase 根據 visibleQuestions + answers + 原始 result.feedback 計算
      setRetryResult({
        submissionId: 0,
        studentName: studentName.trim(),
        totalScore: 0,
        maxScore: 0,
        feedback: [], // 由 retry-result phase 自己計算
      });
      setPhase("retry-result");
      return;
    }

    const answerList = questions.map((q) => ({
      questionId: q.id,
      studentAnswer: answers[q.id] ?? null,
    }));
    try {
      const res = await submitMutation.mutateAsync({
        assessmentId: quiz.id,
        studentName: studentName.trim(),
        answers: answerList,
      });
      setResult(res as SubmitResult);
      setPhase("result");
      // 提交成功，清除草稿
      clearDraft(shareToken, studentName.trim());
    } catch (e: any) {
      toast.error(e.message ?? "提交失敗，請重試");
    }
  };

  // 錯題重做入口：切換到只顯示錯題的 quiz phase
  const handleRetryWrongAnswers = () => {
    if (!result) return;
    const wrongIds = result.feedback.filter((fb) => !fb.isCorrect).map((fb) => fb.questionId);
    if (wrongIds.length === 0) {
      toast.success("恭喜！全部答對，沒有錯題可練習");
      return;
    }
    setRetryQuestionIds(wrongIds);
    setPhase("quiz");
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
  };

  const handleStartOver = () => {
    setPhase("name");
    setStudentName("");
    setAnswers({});
    setResult(null);
    setRetryResult(null);
    setRetryQuestionIds(null);
    setCurrentQ(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center">
        {!simplifiedMode && <MemphisBackground />}
        <div className="relative z-10 memphis-card p-10 text-center" role="status" aria-live="polite">
          <div
            className="w-14 h-14 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="font-black text-xl">載入測驗中...</p>
        </div>
        <AccessibilityToolbar />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center p-4">
        {!simplifiedMode && <MemphisBackground />}
        <div className="relative z-10 memphis-card p-10 text-center max-w-sm" role="alert">
          <div className="text-6xl mb-4" aria-hidden="true">😕</div>
          <h2 className="memphis-heading text-2xl mb-2">找不到測驗</h2>
          <p className="font-semibold text-[#1A1A1A]/60">
            {(error as any)?.message ?? "測驗不存在或已關閉，請確認 QR Code 是否正確。"}
          </p>
        </div>
        <AccessibilityToolbar />
      </div>
    );
  }

  // ─── Name Entry Phase ─────────────────────────────────────────────
  if (phase === "name") {
    return (
      <div className="min-h-screen memphis-bg flex items-center justify-center p-4">
        {!simplifiedMode && <MemphisBackground />}
        <a href="#quiz-content" className="skip-to-main">
          跳至主要內容
        </a>
        <div className="relative z-10 w-full max-w-sm">
          <div className="memphis-card p-8 text-center" id="quiz-content">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: "#D4C5F9",
                border: "4px solid #1A1A1A",
                boxShadow: "6px 6px 0 #1A1A1A",
              }}
              aria-hidden="true"
            >
              <span className="text-4xl">📝</span>
            </div>
            <h1 className="memphis-heading text-3xl mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-sm font-semibold text-[#1A1A1A]/60 mb-6">
                {quiz.description}
              </p>
            )}
            <div
              className="flex items-center gap-2 justify-center mb-6 px-4 py-2 rounded-xl"
              style={{ background: "#FFF3A3", border: "2px solid #1A1A1A" }}
            >
              <span className="font-black text-sm">
                {retryQuestionIds ? `錯題練習 ${questions.length} 題` : `📋 ${questions.length} 道題目`}
              </span>
            </div>

            <div className="mb-6">
              <label
                htmlFor="student-name"
                className="block font-black text-sm mb-2 text-left"
              >
                你的姓名 <span className="text-[#FF8C7A]">*</span>
              </label>
              <input
                id="student-name"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="輸入你的姓名..."
                className="memphis-input w-full px-4 py-4 text-lg text-center"
                maxLength={50}
                autoFocus
                aria-required="true"
              />
            </div>

            {/* 草稿恢復提示 */}
            {pendingDraft && Object.keys(pendingDraft.answers).length > 0 && (
              <div
                className="memphis-card-yellow p-3 mb-4 text-left"
                role="status"
              >
                <div className="flex items-start gap-2">
                  <History size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-black text-sm mb-1">
                      找到上次未完成的作答
                    </p>
                    <p className="text-xs font-semibold text-[#1A1A1A]/70 mb-2">
                      上次保存於 {new Date(pendingDraft.savedAt).toLocaleString("zh-TW")}，
                      已答 {Object.keys(pendingDraft.answers).length} 題
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStart({ resumeFromDraft: pendingDraft })}
                        className="memphis-btn-mint text-sm px-3 py-1.5 font-black"
                      >
                        繼續作答
                      </button>
                      <button
                        onClick={handleDiscardDraft}
                        className="text-xs font-bold text-[#FF8C7A] hover:underline px-2"
                      >
                        重新開始
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => handleStart()}
              disabled={!studentName.trim()}
              className="w-full memphis-btn py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              aria-label={pendingDraft ? "重新開始作答" : "開始作答"}
            >
              {pendingDraft ? "重新開始作答" : "開始作答"}
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <AccessibilityToolbar />
      </div>
    );
  }

  // ─── Quiz Phase ───────────────────────────────────────────────────
  if (phase === "quiz") {
    const q = questions[currentQ];
    if (!q) return null;
    const progress = ((currentQ + 1) / questions.length) * 100;
    const isLast = currentQ === questions.length - 1;
    const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== null;
    const isRetryMode = retryQuestionIds !== null;

    return (
      <div className="min-h-screen memphis-bg relative">
        {!simplifiedMode && <MemphisBackground />}
        <a href="#quiz-content" className="skip-to-main">
          跳至題目
        </a>
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white border-b-4 border-[#1A1A1A] px-4 py-3">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-sm text-[#1A1A1A]/60">
                  {quiz.title}
                  {isRetryMode && (
                    <span
                      className="ml-2 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "#FFB3C6", border: "2px solid #1A1A1A" }}
                    >
                      錯題練習
                    </span>
                  )}
                </span>
                <span
                  className="font-black text-sm"
                  aria-label={`第 ${currentQ + 1} 題，共 ${questions.length} 題`}
                >
                  {currentQ + 1} / {questions.length}
                </span>
              </div>
              {lastSavedAt && (
                <div
                  className="flex items-center gap-1 text-[10px] text-[#1A1A1A]/50 mb-1"
                  aria-live="polite"
                >
                  <Save size={10} aria-hidden="true" />
                  <span>已自動保存 {timeAgo(lastSavedAt)}</span>
                </div>
              )}
              <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ background: "#FFE5D9", border: "2px solid #1A1A1A" }}
                role="progressbar"
                aria-valuenow={currentQ + 1}
                aria-valuemin={1}
                aria-valuemax={questions.length}
                aria-label="作答進度"
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #D4C5F9, #B8F0D8)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Question */}
          <main
            id="quiz-content"
            className="flex-1 flex items-start justify-center px-4 py-8"
          >
            <div className="w-full max-w-xl">
              <div className="memphis-card p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-lg"
                    style={{
                      background: "#FFF3A3",
                      border: "3px solid #1A1A1A",
                      boxShadow: "3px 3px 0 #1A1A1A",
                    }}
                    aria-hidden="true"
                  >
                    {currentQ + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <p className="quiz-question font-black text-xl text-[#1A1A1A] leading-snug flex-1">
                        {q.questionText}
                      </p>
                      <TTSButton text={q.questionText} label="朗讀題目" />
                    </div>
                    {(q as any).questionImageUrl && (
                      <img
                        src={(q as any).questionImageUrl}
                        alt="題目圖片"
                        className="mt-3 max-h-48 rounded-xl border-2 border-[#1A1A1A] object-contain"
                      />
                    )}
                  </div>
                </div>
              </div>

              <QuestionAnswerComponent
                question={q}
                currentAnswer={answers[q.id]}
                onAnswer={(ans) => handleAnswer(q.id, ans)}
              />
            </div>
          </main>

          {/* Navigation */}
          <div className="bg-white border-t-4 border-[#1A1A1A] px-4 py-4">
            <div className="max-w-xl mx-auto flex items-center gap-3">
              {currentQ > 0 && (
                <button
                  onClick={() => setCurrentQ((c) => c - 1)}
                  className="memphis-btn-mint flex items-center gap-2 px-5 py-3 font-black"
                  aria-label="上一題"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                  上一題
                </button>
              )}
              <div className="flex-1" />
              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="memphis-btn flex items-center gap-2 px-6 py-3 font-black disabled:opacity-50"
                  aria-label="提交答案"
                >
                  {submitMutation.isPending ? "提交中..." : "提交答案 🎯"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQ((c) => c + 1)}
                  className="memphis-btn flex items-center gap-2 px-6 py-3 font-black"
                  aria-label="下一題"
                >
                  下一題
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
        <AccessibilityToolbar />
        {showOnboarding && (
          <StudentOnboardingModal onClose={() => setShowOnboarding(false)} />
        )}
      </div>
    );
  }

  // ─── Result Phase (主作答結果) ─────────────────────────────────────
  if (phase === "result" && result) {
    const pct =
      result.maxScore > 0
        ? Math.round((result.totalScore / result.maxScore) * 100)
        : 0;
    const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "😊" : pct >= 40 ? "🤔" : "😅";
    const message =
      pct >= 80
        ? "太棒了！"
        : pct >= 60
        ? "不錯喔！"
        : pct >= 40
        ? "繼續加油！"
        : "下次會更好！";
    const wrongCount = result.feedback.filter((fb) => !fb.isCorrect).length;

    return (
      <div className="min-h-screen memphis-bg relative">
        {!simplifiedMode && <MemphisBackground />}
        <a href="#result-content" className="skip-to-main">
          跳至結果
        </a>
        <div className="relative z-10 container py-8 max-w-xl mx-auto">
          <div id="result-content" className="memphis-card p-8 text-center mb-6">
            <div className="text-7xl mb-4" aria-hidden="true">{emoji}</div>
            <h1 className="memphis-heading text-4xl mb-1">{message}</h1>
            <p className="font-bold text-[#1A1A1A]/60 mb-6">
              {result.studentName} 的作答結果
            </p>
            <div
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl mb-4"
              style={{
                background: pct >= 60 ? "#B8F0D8" : "#FFB3C6",
                border: "4px solid #1A1A1A",
                boxShadow: "6px 6px 0 #1A1A1A",
              }}
              aria-label={`得分 ${result.totalScore} 分，滿分 ${result.maxScore} 分`}
            >
              <Trophy size={28} aria-hidden="true" />
              <span className="font-black text-4xl">{result.totalScore}</span>
              <span className="font-black text-2xl text-[#1A1A1A]/60">
                / {result.maxScore}
              </span>
            </div>
            <div className="font-black text-2xl text-[#1A1A1A]/70" aria-live="polite">
              {pct}%
            </div>
            <div
              className="w-full h-4 rounded-full overflow-hidden mt-4"
              style={{ background: "#FFE5D9", border: "2px solid #1A1A1A" }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${pct}%`,
                  background: pct >= 60 ? "#7EDDB0" : "#FF8C7A",
                }}
              />
            </div>
          </div>

          {/* 錯題重做提示 */}
          {wrongCount > 0 && (
            <div
              className="memphis-card-yellow p-4 mb-6 flex items-start gap-3"
              role="note"
            >
              <AlertCircle size={24} className="shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-black text-sm mb-1">
                  你有 {wrongCount} 題答錯
                </p>
                <p className="text-xs font-semibold text-[#1A1A1A]/70 mb-2">
                  可以再練習一次錯題，加深印象（不計入正式成績）
                </p>
                <button
                  onClick={handleRetryWrongAnswers}
                  className="memphis-btn-coral text-sm px-4 py-2 font-black flex items-center gap-2"
                  aria-label="再練習錯題"
                >
                  <RefreshCw size={16} aria-hidden="true" /> 再練習錯題
                </button>
              </div>
            </div>
          )}

          <h2 className="memphis-heading text-2xl mb-4">每題回饋</h2>
          <div className="flex flex-col gap-4 mb-8">
            {result.feedback.map((fb, idx) => (
              <div
                key={fb.questionId}
                className="memphis-card p-5"
                style={{
                  borderColor: fb.isCorrect ? "#7EDDB0" : "#FF8C7A",
                  borderWidth: 3,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: fb.isCorrect ? "#B8F0D8" : "#FFB3C6",
                      border: "2px solid #1A1A1A",
                    }}
                    aria-hidden="true"
                  >
                    {fb.isCorrect ? (
                      <CheckCircle size={16} className="text-green-700" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="quiz-question font-black text-sm flex-1">
                        Q{idx + 1}. {fb.questionText}
                      </p>
                      <TTSButton
                        text={`第 ${idx + 1} 題：${fb.questionText}。${
                          fb.isCorrect ? "答對了" : "答錯了"
                        }`}
                        label="朗讀題目與結果"
                      />
                      <span className="font-black text-sm whitespace-nowrap">
                        {fb.scoreEarned}/{fb.maxScore}分
                      </span>
                    </div>
                    <FeedbackDetail feedback={fb} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (!showHistory && !historyQuery.data) {
                historyQuery.refetch();
              }
              setShowHistory(!showHistory);
            }}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 font-black border-2 border-[#1A1A1A] rounded-xl hover:bg-[#FFE5D9] transition-colors"
            aria-expanded={showHistory}
            aria-controls="student-history"
          >
            <History size={18} aria-hidden="true" />
            {showHistory ? "隱藏" : "查看"}我的歷史紀錄
          </button>

          {showHistory && (
            <div id="student-history" className="mt-4 memphis-card p-4">
              <h3 className="memphis-heading text-lg mb-3">{studentName} 的歷史提交</h3>
              {historyQuery.isLoading && (
                <p className="text-sm text-[#1A1A1A]/60 text-center py-4">載入中...</p>
              )}
              {historyQuery.data && historyQuery.data.length === 0 && (
                <p className="text-sm text-[#1A1A1A]/60 text-center py-4">
                  這是你第一次作答 🎉
                </p>
              )}
              {historyQuery.data && historyQuery.data.length > 0 && (
                <div className="flex flex-col gap-2">
                  {historyQuery.data.map((h, idx) => {
                    const pct = h.maxScore > 0
                      ? Math.round((h.totalScore / h.maxScore) * 100)
                      : 0;
                    const color = pct >= 60 ? "#B8F0D8" : "#FFB3C6";
                    const isCurrent = h.id === result.submissionId;
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2"
                        style={{
                          background: color,
                          borderColor: "#1A1A1A",
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-sm">
                            第 {historyQuery.data!.length - idx} 次
                            {isCurrent && "（剛才）"}
                          </span>
                          <span className="text-[10px] text-[#1A1A1A]/70">
                            {new Date(h.submittedAt).toLocaleString("zh-TW")}
                          </span>
                        </div>
                        <span className="font-black text-lg">
                          {h.totalScore}/{h.maxScore} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleStartOver}
            className="w-full memphis-btn-lavender flex items-center justify-center gap-2 py-4 font-black text-lg mt-3"
            aria-label="再做一次"
          >
            <RotateCcw size={20} aria-hidden="true" />
            再做一次
          </button>
        </div>
        <AccessibilityToolbar />
      </div>
    );
  }

  // ─── Retry Result Phase (錯題重做的本地結果) ─────────────────────
  if (phase === "retry-result" && result) {
    // 對每道錯題重做的題目，用原始的 correctAnswer + 這次的 answers 重新批改
    const retryFeedback: Feedback[] = questions.map((q) => {
      const originalFb = result.feedback.find((f) => f.questionId === q.id);
      const studentAnswer = answers[q.id] ?? null;
      const correctAnswer = originalFb?.correctAnswer;
      const isCorrect = gradeAnswerLocal(
        q.questionType,
        correctAnswer,
        studentAnswer
      );
      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: (q as any).options,
        correctAnswer,
        studentAnswer,
        isCorrect,
        scoreEarned: isCorrect ? q.score : 0,
        maxScore: q.score,
      };
    });
    const retryCorrectCount = retryFeedback.filter((f) => f.isCorrect).length;
    const stillWrongCount = retryFeedback.filter((f) => !f.isCorrect).length;

    return (
      <div className="min-h-screen memphis-bg relative">
        {!simplifiedMode && <MemphisBackground />}
        <a href="#retry-content" className="skip-to-main">
          跳至練習結果
        </a>
        <div className="relative z-10 container py-8 max-w-xl mx-auto">
          <div id="retry-content" className="memphis-card-yellow p-8 text-center mb-6">
            <div className="text-6xl mb-4" aria-hidden="true">
              {stillWrongCount === 0 ? "🎉" : "💪"}
            </div>
            <h1 className="memphis-heading text-3xl mb-2">
              {stillWrongCount === 0 ? "全部都答對了！" : "練習結果"}
            </h1>
            <p className="font-bold text-[#1A1A1A]/70 mb-4">
              這是練習模式，不計入正式成績
            </p>
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
              style={{
                background: "white",
                border: "3px solid #1A1A1A",
              }}
              aria-live="polite"
            >
              <span className="font-black text-2xl">
                答對 {retryCorrectCount} / {retryFeedback.length}
              </span>
            </div>
          </div>

          <h2 className="memphis-heading text-2xl mb-4">錯題練習回饋</h2>
          <div className="flex flex-col gap-4 mb-8">
            {retryFeedback.map((fb, idx) => (
              <div
                key={fb.questionId}
                className="memphis-card p-5"
                style={{
                  borderColor: fb.isCorrect ? "#7EDDB0" : "#FF8C7A",
                  borderWidth: 3,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: fb.isCorrect ? "#B8F0D8" : "#FFB3C6",
                      border: "2px solid #1A1A1A",
                    }}
                    aria-hidden="true"
                  >
                    {fb.isCorrect ? (
                      <CheckCircle size={16} className="text-green-700" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="quiz-question font-black text-sm flex-1">
                        Q{idx + 1}. {fb.questionText}
                      </p>
                      <TTSButton
                        text={`第 ${idx + 1} 題：${fb.questionText}。${
                          fb.isCorrect ? "這次答對了" : "再試試看"
                        }`}
                        label="朗讀題目與結果"
                      />
                    </div>
                    <FeedbackDetail feedback={fb} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {stillWrongCount > 0 && (
              <button
                onClick={() => {
                  // 重新練習還錯的題
                  const stillWrong = retryFeedback
                    .filter((f) => !f.isCorrect)
                    .map((f) => f.questionId);
                  setRetryQuestionIds(stillWrong);
                  setPhase("quiz");
                  setCurrentQ(0);
                  setAnswers({});
                  setRetryResult(null);
                  setResult(null);
                }}
                className="w-full memphis-btn-coral flex items-center justify-center gap-2 py-4 font-black text-lg"
              >
                <RefreshCw size={20} aria-hidden="true" />
                再練習還錯的題目
              </button>
            )}
            <button
              onClick={handleStartOver}
              className="w-full memphis-btn-lavender flex items-center justify-center gap-2 py-4 font-black text-lg"
            >
              <RotateCcw size={20} aria-hidden="true" />
              重新開始
            </button>
          </div>
        </div>
        <AccessibilityToolbar />
      </div>
    );
  }

  return null;
}

// ─── Question Answer Components ───────────────────────────────────────

function QuestionAnswerComponent({
  question,
  currentAnswer,
  onAnswer,
}: {
  question: Question;
  currentAnswer: unknown;
  onAnswer: (ans: unknown) => void;
}) {
  if (question.questionType === "single_choice") {
    const opts = (question.options as { id: string; text: string }[]) ?? [];
    return (
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="選擇題選項">
        {opts.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button
              onClick={() => onAnswer(opt.id)}
              className={`quiz-option flex-1 px-5 py-4 text-left text-base ${
                currentAnswer === opt.id ? "selected" : ""
              }`}
              role="radio"
              aria-checked={currentAnswer === opt.id}
              aria-label={`選項 ${i + 1}：${opt.text}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 ${
                    currentAnswer === opt.id ? "bg-[#D4C5F9]" : "bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {currentAnswer === opt.id && (
                    <div className="w-3 h-3 rounded-full bg-[#1A1A1A]" />
                  )}
                </div>
                <span>{opt.text}</span>
              </div>
            </button>
            <TTSButton text={`選項 ${i + 1}：${opt.text}`} label={`朗讀選項 ${i + 1}`} />
          </div>
        ))}
      </div>
    );
  }

  if (question.questionType === "picture_choice") {
    const opts =
      (question.options as { id: string; text?: string; imageUrl?: string }[]) ?? [];
    return (
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="圖片選擇題選項">
        {opts.map((opt, i) => (
          <div key={opt.id} className="relative">
            <button
              onClick={() => onAnswer(opt.id)}
              className={`quiz-option w-full overflow-hidden flex flex-col ${
                currentAnswer === opt.id ? "selected" : ""
              }`}
              role="radio"
              aria-checked={currentAnswer === opt.id}
              aria-label={`選項 ${i + 1}${opt.text ? `：${opt.text}` : "（圖片選項）"}`}
            >
              {opt.imageUrl ? (
                <img
                  src={opt.imageUrl}
                  alt={opt.text || "選項"}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-[#FFE5D9] flex items-center justify-center text-[#1A1A1A]/40 font-bold text-sm">
                  無圖片
                </div>
              )}
              {opt.text && (
                <div className="px-3 py-2 text-sm font-bold border-t-2 border-[#1A1A1A]/10">
                  {opt.text}
                </div>
              )}
              {currentAnswer === opt.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-[#D4C5F9] border-2 border-[#1A1A1A] rounded-full flex items-center justify-center">
                  <CheckCircle size={12} aria-hidden="true" />
                </div>
              )}
            </button>
            {opt.text && (
              <div className="mt-1 flex justify-end">
                <TTSButton text={`選項 ${i + 1}：${opt.text}`} label={`朗讀選項 ${i + 1}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (question.questionType === "matching") {
    return (
      <MatchingQuestion
        options={question.options as any}
        currentAnswer={currentAnswer as any}
        onAnswer={onAnswer}
      />
    );
  }

  if (question.questionType === "fill_blank") {
    return (
      <div>
        <label htmlFor="fill-blank-input" className="sr-only">
          填答輸入框
        </label>
        <input
          id="fill-blank-input"
          type="text"
          value={(currentAnswer as string) ?? ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="輸入你的答案..."
          className="memphis-input w-full px-5 py-4 text-lg text-center"
          autoFocus
          aria-label="填答輸入框"
        />
        <p className="text-center text-xs font-semibold text-[#1A1A1A]/50 mt-2">
          不區分大小寫
        </p>
      </div>
    );
  }

  return null;
}

// ─── Feedback Detail ─────────────────────────────────────────────────

function FeedbackDetail({ feedback: fb }: { feedback: Feedback }) {
  const { questionType, options, correctAnswer, studentAnswer, isCorrect } = fb;

  if (questionType === "single_choice" || questionType === "picture_choice") {
    const opts = options as { id: string; text?: string; imageUrl?: string }[] | null;
    const getLabel = (id: string) => {
      const opt = opts?.find((o) => o.id === id);
      return opt?.text || (opt?.imageUrl ? "（圖片選項）" : id);
    };
    return (
      <div className="mt-2 text-sm font-semibold space-y-1">
        {!isCorrect && (
          <div className="text-red-600">
            你的答案：{studentAnswer ? getLabel(String(studentAnswer)) : "（未作答）"}
          </div>
        )}
        <div className="text-green-700">
          正確答案：{correctAnswer != null ? getLabel(String(correctAnswer)) : "—"}
        </div>
      </div>
    );
  }

  if (questionType === "fill_blank") {
    const correct = Array.isArray(correctAnswer)
      ? correctAnswer.join(" / ")
      : String(correctAnswer ?? "");
    return (
      <div className="mt-2 text-sm font-semibold space-y-1">
        {!isCorrect && (
          <div className="text-red-600">
            你的答案：{studentAnswer ? String(studentAnswer) : "（未作答）"}
          </div>
        )}
        <div className="text-green-700">正確答案：{correct}</div>
      </div>
    );
  }

  if (questionType === "matching") {
    // 對於 matching 題，顯示「你的配對」與「正確配對」對比
    const opts = options as
      | { id: string; left: string; right: string; leftImageUrl?: string; rightImageUrl?: string }[]
      | null;
    const correctPairs = (correctAnswer as { leftId: string; rightId: string }[] | null) ?? [];
    const studentPairs = (studentAnswer as { leftId: string; rightId: string }[] | null) ?? [];
    const renderPair = (leftId: string, rightId: string) => {
      const o = opts?.find((x) => x.id === leftId);
      const o2 = opts?.find((x) => x.id === rightId);
      const leftText = o?.left || (o?.leftImageUrl ? "（圖）" : leftId);
      const rightText = o2?.right || (o2?.rightImageUrl ? "（圖）" : rightId);
      return { leftText, rightText, leftImg: o?.leftImageUrl, rightImg: o2?.rightImageUrl };
    };

    return (
      <div className="mt-2 text-sm font-semibold space-y-2">
        {!isCorrect && studentPairs.length > 0 && (
          <div>
            <p className="text-red-600 mb-1">你的配對：</p>
            <div className="flex flex-col gap-1">
              {studentPairs.map((p, i) => {
                const r = renderPair(p.leftId, p.rightId);
                return (
                  <div
                    key={i}
                    className="text-xs px-2 py-1 rounded border-2 border-red-300 bg-red-50 inline-flex items-center gap-2"
                  >
                    {r.leftImg && <img src={r.leftImg} alt="" className="w-6 h-6 object-cover rounded" />}
                    <span>{r.leftText}</span>
                    <span>→</span>
                    {r.rightImg && <img src={r.rightImg} alt="" className="w-6 h-6 object-cover rounded" />}
                    <span>{r.rightText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!isCorrect && studentPairs.length === 0 && (
          <div className="text-red-600">你的答案：（未作答）</div>
        )}
        <div>
          <p className="text-green-700 mb-1">正確配對：</p>
          <div className="flex flex-col gap-1">
            {correctPairs.map((p, i) => {
              const r = renderPair(p.leftId, p.rightId);
              return (
                <div
                  key={i}
                  className="text-xs px-2 py-1 rounded border-2 border-green-300 bg-green-50 inline-flex items-center gap-2"
                >
                  {r.leftImg && <img src={r.leftImg} alt="" className="w-6 h-6 object-cover rounded" />}
                  <span>{r.leftText}</span>
                  <span>→</span>
                  {r.rightImg && <img src={r.rightImg} alt="" className="w-6 h-6 object-cover rounded" />}
                  <span>{r.rightText}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}