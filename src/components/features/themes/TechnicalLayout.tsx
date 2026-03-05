import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MewurkThemeProps } from "../mewurk-logs";

export function TechnicalLayout({
  data,
  stats,
  monthStats,
  isSequenceBroken,
  formatHms,
  parseUtc,
}: MewurkThemeProps) {
  return (
    <div className="font-mono bg-[#0a0a0a] text-indigo-400 p-6 border border-indigo-500/20 rounded-lg space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4">
        <div className="flex gap-2 items-center">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> SYSTEM.MONITOR
        </div>
        <div className="text-xs">POLICY: {data.policyName?.toUpperCase()}</div>
      </div>
      {isSequenceBroken && (
        <div className="p-2 border border-red-500 text-red-500 text-xs">
          CRITICAL_ERROR: SEQUENCE_BROKEN
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-3 space-y-6 divide-y divide-indigo-500/10">
          <div>
            <div className="text-[10px] opacity-40">AVG_LOAD</div>
            <div className="text-3xl text-white">{monthStats?.workingHours.dayAvg.toFixed(1)}h</div>
          </div>
          <div className="pt-4">
            <div className="text-[10px] opacity-40">LATE_EXCEPT</div>
            <div className="text-3xl text-orange-400">{monthStats?.gracePeriod.lateIn}</div>
          </div>
          <div className="pt-4">
            <div className="text-[10px] opacity-40">PROGRESS</div>
            <div className="text-3xl text-emerald-400">{Math.round(stats.progress)}%</div>
          </div>
        </div>
        <div className="md:col-span-6 text-center py-10 border-x border-indigo-500/20 px-4">
          <div className="text-xs opacity-40 mb-4">01. TIME_REMAINING</div>
          <div className="text-7xl font-light text-white tracking-tighter tabular-nums mb-10">
            {formatHms(stats.remainingMs)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-500/5 p-4 border border-indigo-500/20">
              <div className="text-[10px] opacity-40">02. COMP_AT</div>
              <div className="text-xl text-white">{format(stats.estimatedEndTime, "HH:mm")}</div>
            </div>
            <div className="bg-indigo-500/5 p-4 border border-indigo-500/20">
              <div className="text-[10px] opacity-40">03. BREAK</div>
              <div className="text-xl text-white">{formatHms(stats.totalBreakMs)}</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 space-y-4">
          <div className="text-xs opacity-40 border-b border-indigo-500/20 pb-2">05. EVENT_LOG</div>
          <div className="space-y-4 max-h-[300px] overflow-auto">
            {data.clockInDetails.map((l: any, i: number) => (
              <div key={i} className="border-l border-indigo-500/30 pl-3">
                <div className="text-[10px] opacity-40">
                  {format(parseUtc(l.clockTime), "HH:mm:ss")}
                </div>
                <div className="text-xs font-bold text-white uppercase">{l.inOutType}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
