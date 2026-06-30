import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { TTSButton } from "@/components/AccessibilityToolbar";

interface MatchPair {
  id: string;
  left: string;
  right: string;
  leftImageUrl?: string;
  rightImageUrl?: string;
}

interface MatchAnswer {
  leftId: string;
  rightId: string;
}

interface Props {
  options: MatchPair[];
  currentAnswer: MatchAnswer[] | null | undefined;
  onAnswer: (ans: MatchAnswer[]) => void;
}

interface ConnectionPoint {
  leftId: string;
  rightId: string;
  // SVG 座標（相對於 overlay 的 container）
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export default function MatchingQuestion({ options, currentAnswer, onAnswer }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<MatchAnswer[]>(currentAnswer ?? []);
  const [connections, setConnections] = useState<ConnectionPoint[]>([]);

  const leftRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rightRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Shuffle right side for display
  const [shuffledRight] = useState(() => {
    const rights = options.map((o) => ({
      id: o.id,
      text: o.right,
      imageUrl: o.rightImageUrl,
    }));
    for (let i = rights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rights[i], rights[j]] = [rights[j], rights[i]];
    }
    return rights;
  });

  useEffect(() => {
    if (currentAnswer) setPairs(currentAnswer);
  }, []);

  const pairColors = [
    "#D4C5F9",
    "#B8F0D8",
    "#FFF3A3",
    "#FFB3C6",
    "#A8D8EA",
    "#FF8C7A",
    "#FFE5D9",
    "#B8F0D8",
  ];

  const getPairColor = (leftId: string) => {
    const idx = options.findIndex((o) => o.id === leftId);
    return pairColors[idx % pairColors.length];
  };

  const getMatchedRight = (leftId: string) =>
    pairs.find((p) => p.leftId === leftId)?.rightId ?? null;

  const getMatchedLeft = (rightId: string) =>
    pairs.find((p) => p.rightId === rightId)?.leftId ?? null;

  // 計算所有連線的座標。在 layout 完成後 + pairs 變更後執行。
  const recomputeConnections = () => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const newConns: ConnectionPoint[] = [];

    for (const p of pairs) {
      const leftBtn = leftRefs.current.get(p.leftId);
      const rightBtn = rightRefs.current.get(p.rightId);
      if (!leftBtn || !rightBtn) continue;

      const lr = leftBtn.getBoundingClientRect();
      const rr = rightBtn.getBoundingClientRect();

      // 取左右 button 各自的右邊/左邊中點
      const x1 = lr.right - containerRect.left;
      const y1 = lr.top + lr.height / 2 - containerRect.top;
      const x2 = rr.left - containerRect.left;
      const y2 = rr.top + rr.height / 2 - containerRect.top;

      newConns.push({
        leftId: p.leftId,
        rightId: p.rightId,
        x1,
        y1,
        x2,
        y2,
        color: getPairColor(p.leftId),
      });
    }
    setConnections(newConns);
  };

  useLayoutEffect(() => {
    recomputeConnections();
    // 監聽 window resize
    const onResize = () => recomputeConnections();
    window.addEventListener("resize", onResize);
    // ResizeObserver 監聽容器尺寸變化（簡化模式下裝飾消失可能改變佈局）
    const ro = new ResizeObserver(() => recomputeConnections());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs, options]);

  const handleLeftClick = (leftId: string) => {
    if (selectedLeft === leftId) {
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(leftId);
  };

  const handleRightClick = (rightId: string) => {
    if (!selectedLeft) {
      // 取消已配對
      const existingLeft = getMatchedLeft(rightId);
      if (existingLeft) {
        const newPairs = pairs.filter((p) => p.rightId !== rightId);
        setPairs(newPairs);
        onAnswer(newPairs);
      }
      return;
    }

    const newPairs = pairs.filter(
      (p) => p.leftId !== selectedLeft && p.rightId !== rightId
    );
    newPairs.push({ leftId: selectedLeft, rightId });
    setPairs(newPairs);
    onAnswer(newPairs);
    setSelectedLeft(null);
  };

  const clearAll = () => {
    setPairs([]);
    onAnswer([]);
    setSelectedLeft(null);
  };

  // 計算 SVG 的 viewBox
  const containerSize = (() => {
    const c = containerRef.current;
    if (!c) return { width: 0, height: 0 };
    return { width: c.offsetWidth, height: c.offsetHeight };
  })();

  return (
    <div className="memphis-card p-4" role="group" aria-label="連線題作答區">
      <p className="text-xs font-bold text-[#1A1A1A]/60 mb-4 text-center">
        點選左側項目，再點選右側對應項目完成配對
      </p>

      <div role="status" aria-live="polite" className="sr-only">
        {selectedLeft
          ? `已選左側項目 ${
              options.find((o) => o.id === selectedLeft)?.left ?? ""
            }，請點選右側對應項目`
          : "未選任何左側項目"}
        {pairs.length > 0 && `。已配對 ${pairs.length} 個，共 ${options.length} 個`}
      </div>

      <div ref={containerRef} className="relative">
        {/* SVG 連線 overlay */}
        {connections.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={containerSize.width}
            height={containerSize.height}
            style={{ zIndex: 1 }}
            aria-hidden="true"
          >
            <defs>
              <marker
                id="match-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-fill" />
              </marker>
            </defs>
            {connections.map((c) => {
              const midX = (c.x1 + c.x2) / 2;
              const path = `M ${c.x1} ${c.y1} C ${midX} ${c.y1}, ${midX} ${c.y2}, ${c.x2} ${c.y2}`;
              return (
                <g key={`${c.leftId}-${c.rightId}`}>
                  <path
                    d={path}
                    stroke={c.color}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    style={{ color: c.color }}
                  />
                  {/* 右端的小圓點 */}
                  <circle
                    cx={c.x2}
                    cy={c.y2}
                    r={5}
                    fill={c.color}
                    stroke="#1A1A1A"
                    strokeWidth={2}
                  />
                  {/* 左端的小圓點 */}
                  <circle
                    cx={c.x1}
                    cy={c.y1}
                    r={5}
                    fill={c.color}
                    stroke="#1A1A1A"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>
        )}

        <div className="grid grid-cols-2 gap-4 relative" style={{ zIndex: 2 }}>
          {/* Left column */}
          <div className="flex flex-col gap-2" role="list" aria-label="左側項目">
            <div className="text-xs font-black text-center text-[#1A1A1A]/50 mb-1">左側</div>
            {options.map((opt) => {
              const matchedRightId = getMatchedRight(opt.id);
              const isSelected = selectedLeft === opt.id;
              const isMatched = !!matchedRightId;
              const color = isMatched
                ? getPairColor(opt.id)
                : isSelected
                ? "#FFF3A3"
                : "white";

              return (
                <div key={opt.id} className="flex items-center gap-1" role="listitem">
                  <button
                    ref={(el) => {
                      if (el) leftRefs.current.set(opt.id, el);
                      else leftRefs.current.delete(opt.id);
                    }}
                    onClick={() => handleLeftClick(opt.id)}
                    className={`flex-1 px-3 py-3 text-sm font-bold rounded-xl border-2 border-[#1A1A1A] text-center transition-all ${
                      isSelected
                        ? "shadow-[3px_3px_0_#1A1A1A] -translate-x-0.5 -translate-y-0.5"
                        : isMatched
                        ? "shadow-[3px_3px_0_#1A1A1A]"
                        : "hover:shadow-[2px_2px_0_#1A1A1A] hover:-translate-x-0.5 hover:-translate-y-0.5"
                    }`}
                    style={{ background: color }}
                    aria-pressed={isSelected}
                    aria-label={`左側項目 ${opt.left || "(圖片)"}${
                      isSelected ? "，已選" : isMatched ? "，已配對" : ""
                    }`}
                  >
                    {opt.leftImageUrl ? (
                      <img
                        src={opt.leftImageUrl}
                        alt={opt.left || "左側項目"}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ) : null}
                    {opt.left && (
                      <div className="px-1 py-1 text-sm font-bold">{opt.left}</div>
                    )}
                  </button>
                  <TTSButton
                    text={`左側項目：${opt.left || (opt.leftImageUrl ? "圖片" : "")}`}
                    label={`朗讀左側 ${opt.left || "圖片"}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-2" role="list" aria-label="右側項目">
            <div className="text-xs font-black text-center text-[#1A1A1A]/50 mb-1">右側</div>
            {shuffledRight.map((right) => {
              const matchedLeftId = getMatchedLeft(right.id);
              const isMatched = !!matchedLeftId;
              const color = isMatched ? getPairColor(matchedLeftId!) : "white";
              const isHighlighted = selectedLeft !== null && !isMatched;

              return (
                <div key={right.id} className="flex items-center gap-1" role="listitem">
                  <button
                    ref={(el) => {
                      if (el) rightRefs.current.set(right.id, el);
                      else rightRefs.current.delete(right.id);
                    }}
                    onClick={() => handleRightClick(right.id)}
                    className={`flex-1 px-3 py-3 text-sm font-bold rounded-xl border-2 border-[#1A1A1A] text-center transition-all ${
                      isMatched
                        ? "shadow-[3px_3px_0_#1A1A1A]"
                        : isHighlighted
                        ? "border-dashed animate-pulse"
                        : "hover:shadow-[2px_2px_0_#1A1A1A] hover:-translate-x-0.5 hover:-translate-y-0.5"
                    }`}
                    style={{ background: color }}
                    disabled={!selectedLeft && !isMatched}
                    aria-disabled={!selectedLeft && !isMatched}
                    aria-label={`右側項目 ${right.text || (right.imageUrl ? "(圖片)" : "")}${
                      isMatched ? "，已配對（點擊可取消）" : ""
                    }`}
                  >
                    {right.imageUrl ? (
                      <img
                        src={right.imageUrl}
                        alt={right.text || "右側項目"}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ) : null}
                    {right.text && (
                      <div className="px-1 py-1 text-sm font-bold">{right.text}</div>
                    )}
                  </button>
                  <TTSButton
                    text={`右側項目：${right.text || (right.imageUrl ? "圖片" : "")}`}
                    label={`朗讀右側 ${right.text || "圖片"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {pairs.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-[#1A1A1A]/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-[#1A1A1A]/60">
              已配對 {pairs.length}/{options.length}
            </span>
            <button
              onClick={clearAll}
              className="text-xs font-bold text-[#FF8C7A] hover:underline"
            >
              清除全部
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {pairs.map((p) => {
              const leftOpt = options.find((o) => o.id === p.leftId);
              const rightOpt = options.find((o) => o.id === p.rightId);
              if (!leftOpt || !rightOpt) return null;
              return (
                <div
                  key={p.leftId}
                  className="flex items-center gap-2 text-xs font-semibold"
                >
                  <span
                    className="px-2 py-1 rounded-lg border border-[#1A1A1A] flex-1 text-center truncate"
                    style={{ background: getPairColor(p.leftId) }}
                  >
                    {leftOpt.left}
                  </span>
                  <span className="text-[#1A1A1A]/50 font-black">→</span>
                  <span
                    className="px-2 py-1 rounded-lg border border-[#1A1A1A] flex-1 text-center truncate"
                    style={{ background: getPairColor(p.leftId) }}
                  >
                    {rightOpt.right}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}