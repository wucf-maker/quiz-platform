// Memphis-style geometric decorations
export function MemphisBackground({ className = "" }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      style={{ zIndex: 0 }}
    >
      {/* Large circle - top left */}
      <div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          top: -60,
          left: -60,
          background: "#B8F0D8",
          border: "4px solid #1A1A1A",
          opacity: 0.7,
        }}
      />
      {/* Small circle - top right */}
      <div
        className="absolute rounded-full"
        style={{
          width: 80,
          height: 80,
          top: 40,
          right: 120,
          background: "#FFF3A3",
          border: "3px solid #1A1A1A",
          opacity: 0.8,
        }}
      />
      {/* Triangle - top right */}
      <svg
        className="absolute"
        style={{ top: 20, right: 40, opacity: 0.7 }}
        width="70"
        height="70"
        viewBox="0 0 70 70"
      >
        <polygon
          points="35,5 65,60 5,60"
          fill="#D4C5F9"
          stroke="#1A1A1A"
          strokeWidth="3"
        />
      </svg>
      {/* Rectangle - bottom left */}
      <div
        className="absolute"
        style={{
          width: 100,
          height: 60,
          bottom: 120,
          left: 40,
          background: "#FFB3C6",
          border: "3px solid #1A1A1A",
          borderRadius: 8,
          transform: "rotate(-15deg)",
          opacity: 0.6,
        }}
      />
      {/* Diamond - bottom right */}
      <svg
        className="absolute"
        style={{ bottom: 80, right: 60, opacity: 0.7 }}
        width="60"
        height="60"
        viewBox="0 0 60 60"
      >
        <rect
          x="10"
          y="10"
          width="40"
          height="40"
          fill="#FF8C7A"
          stroke="#1A1A1A"
          strokeWidth="3"
          transform="rotate(45 30 30)"
        />
      </svg>
      {/* Dots cluster - middle right */}
      <svg
        className="absolute"
        style={{ top: "40%", right: 20, opacity: 0.5 }}
        width="80"
        height="80"
        viewBox="0 0 80 80"
      >
        {[10, 30, 50, 70].map((x) =>
          [10, 30, 50, 70].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#1A1A1A" />
          ))
        )}
      </svg>
      {/* Wavy line - bottom */}
      <svg
        className="absolute"
        style={{ bottom: 30, left: "20%", opacity: 0.4 }}
        width="200"
        height="40"
        viewBox="0 0 200 40"
      >
        <path
          d="M0,20 Q25,5 50,20 Q75,35 100,20 Q125,5 150,20 Q175,35 200,20"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="3"
        />
      </svg>
      {/* Small circle cluster - left middle */}
      <div
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          top: "55%",
          left: 30,
          background: "#A8D8EA",
          border: "3px solid #1A1A1A",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 20,
          height: 20,
          top: "60%",
          left: 80,
          background: "#FFF3A3",
          border: "2px solid #1A1A1A",
          opacity: 0.7,
        }}
      />
      {/* Large rectangle - bottom center */}
      <div
        className="absolute"
        style={{
          width: 140,
          height: 30,
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%) rotate(5deg)",
          background: "#B8F0D8",
          border: "3px solid #1A1A1A",
          borderRadius: 6,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

export function MemphisSmallDecos() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Dots */}
      <svg className="absolute top-4 right-8 opacity-30" width="60" height="60" viewBox="0 0 60 60">
        {[10, 25, 40, 55].map((x) =>
          [10, 25, 40, 55].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#1A1A1A" />
          ))
        )}
      </svg>
      {/* Small triangle */}
      <svg className="absolute bottom-4 left-8 opacity-40" width="40" height="40" viewBox="0 0 40 40">
        <polygon points="20,3 37,35 3,35" fill="#D4C5F9" stroke="#1A1A1A" strokeWidth="2" />
      </svg>
    </div>
  );
}
