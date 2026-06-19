import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: number | string;
  trend?: number; // percent change
  icon: React.ReactNode;
  accent: string; // hex color
  suffix?: string;
};

function formatNumber(v: number | string): string {
  if (typeof v === "string") return v;
  return new Intl.NumberFormat("ar-EG").format(v);
}

export function KpiCard({ label, value, trend, icon, accent, suffix }: KpiCardProps) {
  const hasTrend = typeof trend === "number";
  const isUp = (trend ?? 0) > 0;
  const isFlat = (trend ?? 0) === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border/60 p-5 shadow-sm transition-all hover:shadow-md group">
      <div
        className="absolute -left-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform group-hover:scale-110"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </div>
        {hasTrend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              isFlat
                ? "bg-muted text-muted-foreground"
                : isUp
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
            )}
          >
            {isFlat ? (
              <Minus className="h-3 w-3" />
            ) : isUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span dir="ltr">
              {isUp ? "+" : ""}
              {trend}%
            </span>
          </div>
        )}
      </div>
      <div className="relative mt-4">
        <div className="text-3xl font-extrabold text-foreground tracking-tight">
          {formatNumber(value)}
          {suffix && <span className="text-lg font-bold mr-1">{suffix}</span>}
        </div>
        <div className="mt-1 text-sm font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
