import { MewurkThemeProps } from "../mewurk-logs";
import { format } from "date-fns";

export function BrutalistLayout({
  data,
  stats,
  monthStats,
  isSequenceBroken,
  formatHms,
}: MewurkThemeProps) {
  return (
    <div className="bg-white text-black font-sans border-[6px] border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-8 space-y-12">
      <div className="flex justify-between items-start border-b-[6px] border-black pb-6">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">
          Status: {isSequenceBroken ? "BROKEN" : "LIVE"}
        </h1>
        <div className="bg-black text-white px-4 py-2 font-black">
          PROGRESS: {Math.round(stats.progress)}%
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase">Remaining Time</h2>
        <div className="text-[10vw] font-black leading-none tracking-tighter uppercase italic break-all">
          {formatHms(stats.remainingMs).replace(/\s/g, "")}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#00FF00] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-black uppercase mb-2">02. Completes At</div>
          <div className="text-4xl font-black">{format(stats.estimatedEndTime, "HH:mm")}</div>
        </div>
        <div className="bg-[#FFFF00] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-black uppercase mb-2">03. Break Time</div>
          <div className="text-4xl font-black">{formatHms(stats.totalBreakMs)}</div>
        </div>
        <div className="bg-[#00FFFF] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-black uppercase mb-2">04. Goal</div>
          <div className="text-4xl font-black">{stats.targetHours}H</div>
        </div>
      </div>
      <div className="border-t-[6px] border-black pt-8 grid grid-cols-2 md:grid-cols-4 gap-8 font-black uppercase text-sm">
        <div>Policy: {data.policyName}</div>
        <div>Shift: {data.shiftName}</div>
        <div>Avg: {monthStats?.workingHours.dayAvg}H</div>
        <div>Late: {monthStats?.gracePeriod.lateIn}</div>
      </div>
    </div>
  );
}
