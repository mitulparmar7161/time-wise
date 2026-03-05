import { format } from "date-fns";
import { MewurkThemeProps } from "../mewurk-logs";

export function MonitorLayout({ data, stats, monthStats, formatHms, parseUtc }: MewurkThemeProps) {
  return (
    <div className="bg-black text-[#00FF41] font-mono p-8 border-4 border-[#333] rounded-sm relative overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,1)]">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      <div className="flex justify-between border-b border-[#00FF41]/30 pb-4 mb-8 text-xs">
        <div>USER_ID: {data.shiftName?.toUpperCase()}</div>
        <div>ACTIVE_SESSION</div>
      </div>
      <div className="space-y-12 relative z-10">
        <div className="text-center space-y-2">
          <div className="text-xs opacity-60">REMAINING_TIME_VAL</div>
          <div className="text-7xl font-bold tracking-widest">{formatHms(stats.remainingMs)}</div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="border border-[#00FF41]/30 p-6">
            <div className="text-[10px] opacity-60 mb-2">EST_COMPLETION</div>
            <div className="text-3xl">{format(stats.estimatedEndTime, "HH:mm:ss")}</div>
          </div>
          <div className="border border-[#00FF41]/30 p-6">
            <div className="text-[10px] opacity-60 mb-2">TOTAL_BREAK_MS</div>
            <div className="text-3xl">{formatHms(stats.totalBreakMs)}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="text-[10px] opacity-60">LOG_HISTORY_FETCHED</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
            {data.clockInDetails.slice(-8).map((l: any, i: number) => (
              <div key={i} className="flex gap-2">
                <span className="opacity-40">{format(parseUtc(l.clockTime), "HH:mm")}</span>
                <span className="font-bold">{l.inOutType}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-8 border-t border-[#00FF41]/20 flex justify-between text-[10px] opacity-60">
          <span>AVG_LOAD: {monthStats?.workingHours.dayAvg}H</span>
          <span>ERR_LATE: {monthStats?.gracePeriod.lateIn}</span>
          <span>SYS_STABLE</span>
        </div>
      </div>
    </div>
  );
}
