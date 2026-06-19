type PatternProps = {
  color?: string;
  opacity?: number;
  size?: number;
};

export function IslamicPatternBand({ color = "#d4a843", opacity = 0.18 }: PatternProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundImage: `radial-gradient(circle at 20px 20px, ${color} 1.5px, transparent 1.6px),
          radial-gradient(circle at 60px 60px, ${color} 1.5px, transparent 1.6px),
          linear-gradient(45deg, transparent 47%, ${color} 48%, ${color} 52%, transparent 53%)`,
        backgroundSize: "80px 80px",
        pointerEvents: "none",
      }}
    />
  );
}

export function StarRosette({ color = "#d4a843", opacity = 0.22, size = 84 }: PatternProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        opacity,
        background: `conic-gradient(from 22deg, ${color}, transparent 15deg 45deg, ${color} 45deg 60deg, transparent 60deg 90deg, ${color} 90deg 105deg, transparent 105deg 135deg, ${color} 135deg 150deg, transparent 150deg 180deg, ${color} 180deg 195deg, transparent 195deg 225deg, ${color} 225deg 240deg, transparent 240deg 270deg, ${color} 270deg 285deg, transparent 285deg 315deg, ${color} 315deg 330deg, transparent 330deg)`,
        clipPath: "polygon(50% 0%, 61% 33%, 96% 25%, 70% 50%, 96% 75%, 61% 67%, 50% 100%, 39% 67%, 4% 75%, 30% 50%, 4% 25%, 39% 33%)",
      }}
    />
  );
}

export function GoldDivider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 2,
        width: "100%",
        margin: "18px 0",
        background: "linear-gradient(90deg, transparent, #d4a843, transparent)",
      }}
    />
  );
}
