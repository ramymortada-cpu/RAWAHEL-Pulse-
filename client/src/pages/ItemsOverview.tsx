import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Gauge,
  Search,
  Target,
  Users,
} from "lucide-react";
import * as Icons from "lucide-react";

type SortKey = "impact" | "name" | "type" | "goals";
type SortDir = "asc" | "desc";

const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(Math.round(n || 0));

function EntityIcon({ name, color }: { name?: string | null; color?: string | null }) {
  const Cmp = (Icons as any)[name || "Building2"] ?? Building2;
  return <Cmp className="h-4 w-4" style={{ color: color || "#1b2a5e" }} />;
}

export default function ItemsOverview() {
  const [, setLocation] = useLocation();
  const { data: reports, isLoading: loadingReports } = trpc.reports.list.useQuery();
  const { data: master, isLoading: loadingMaster } = trpc.pulse.masterData.useQuery();
  const [reportId, setReportId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("impact");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const effectiveReportId = useMemo(() => {
    if (reportId !== null) return reportId;
    return reports && reports.length > 0 ? reports[0].id : null;
  }, [reportId, reports]);

  const { data: values, isLoading: loadingValues } = trpc.pulse.reportValues.useQuery(
    { reportId: effectiveReportId ?? 0 },
    { enabled: effectiveReportId !== null }
  );

  const rows = useMemo(() => {
    if (!master) return [];
    const valueRows = values ?? [];
    return master.entities
      .filter((entity) => entity.isActive)
      .map((entity) => {
        const entityValues = valueRows.filter((value: any) => value.entityId === entity.id);
        const impact = entityValues.reduce(
          (sum: number, value: any) => sum + (Number(value.valueNumber ?? 0) || 0),
          0
        );
        const metricsCount = entityValues.length;
        const goalIds = master.entityGoalLinks
          .filter((link) => link.entityId === entity.id)
          .map((link) => link.goalId);
        const trackIds = master.entityTrackLinks
          .filter((link) => link.entityId === entity.id)
          .map((link) => link.trackId);
        return {
          entity,
          impact,
          metricsCount,
          goals: master.goals.filter((goal) => goalIds.includes(goal.id)),
          tracks: master.tracks.filter((track) => trackIds.includes(track.id)),
        };
      });
  }, [master, values]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const list = q
      ? rows.filter((row) => {
          const haystack = [
            row.entity.nameAr,
            row.entity.key,
            row.entity.type,
            row.entity.ownerName ?? "",
            ...row.goals.map((goal) => goal.nameAr),
            ...row.tracks.map((track) => track.nameAr),
          ].join(" ");
          return haystack.includes(q);
        })
      : rows;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "impact") cmp = a.impact - b.impact;
      else if (sortKey === "goals") cmp = a.goals.length - b.goals.length;
      else if (sortKey === "type") cmp = a.entity.type.localeCompare(b.entity.type);
      else cmp = a.entity.nameAr.localeCompare(b.entity.nameAr, "ar");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, sortDir, sortKey]);

  const totalImpact = rows.reduce((sum, row) => sum + row.impact, 0);
  const activeGoals = new Set(rows.flatMap((row) => row.goals.map((goal) => goal.id))).size;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "type" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="islamic-pattern min-h-screen px-6 py-8 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b2a5e]">
              الكيانات والمؤشرات
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              كل مكاتب ومشاريع ومبادرات RAWAHEL Pulse مع مؤشرات التقرير الحالي
            </p>
          </div>
          <div className="w-full md:w-72">
            {loadingReports ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <Select
                value={effectiveReportId ? String(effectiveReportId) : undefined}
                onValueChange={(value) => setReportId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التقرير" />
                </SelectTrigger>
                <SelectContent>
                  {(reports ?? []).map((report) => (
                    <SelectItem key={report.id} value={String(report.id)}>
                      {report.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building2 className="h-4 w-4" />
              الكيانات النشطة
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#1b2a5e]">{fmt(rows.length)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Gauge className="h-4 w-4" />
              مجموع القيم المدخلة
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#2e7d6b]">{fmt(totalImpact)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="h-4 w-4" />
              أهداف مرتبطة
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#d4a843]">{fmt(activeGoals)}</div>
          </div>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الكيان أو الهدف..."
            className="pr-9"
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {loadingMaster || loadingValues ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              لا توجد كيانات مطابقة. أضف الكيانات من صفحة نبض رواحل.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1.5 text-xs font-bold text-[#1b2a5e]">
                        الكيان <SortIcon col="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => toggleSort("type")} className="flex items-center gap-1.5 text-xs font-bold text-[#1b2a5e]">
                        النوع <SortIcon col="type" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => toggleSort("goals")} className="flex items-center gap-1.5 text-xs font-bold text-[#1b2a5e]">
                        الأهداف <SortIcon col="goals" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => toggleSort("impact")} className="flex items-center gap-1.5 text-xs font-bold text-[#1b2a5e] mr-auto">
                        قيم التقرير <SortIcon col="impact" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, index) => (
                    <tr
                      key={row.entity.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/entities/${row.entity.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${row.entity.color}1a` }}>
                            <EntityIcon name={row.entity.icon} color={row.entity.color} />
                          </span>
                          <span>{row.entity.nameAr}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px]">{row.entity.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.goals.slice(0, 2).map((goal) => (
                            <Badge key={goal.id} variant="secondary" className="text-[11px]">
                              {goal.nameAr}
                            </Badge>
                          ))}
                          {row.goals.length > 2 && <Badge variant="outline">+{row.goals.length - 2}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-[#2e7d6b] tabular-nums">{fmt(row.impact)}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {fmt(row.metricsCount)} مؤشرات مدخلة
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
