import { format } from "date-fns";
import { MewurkThemeProps } from "../mewurk-logs";

export function OrganicLayout({ stats, formatHms }: MewurkThemeProps) {
  return (
    <div className="bg-[#f5f5f0] text-[#5A5A40] p-16 rounded-[4rem] font-serif space-y-20 animate-in zoom-in-95 duration-1000">
      <div className="text-center space-y-6">
        <div className="uppercase text-[10px] font-bold tracking-[0.4em] opacity-40">
          Journey Today
        </div>
        <h1 className="text-9xl italic font-medium tracking-tighter">
          {formatHms(stats.remainingMs)}
        </h1>
        <div className="text-sm opacity-60">
          Your estimated completion is {format(stats.estimatedEndTime, "hh:mm a")}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-12">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-sm text-center space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">
            Total Break
          </div>
          <div className="text-4xl italic">{formatHms(stats.totalBreakMs)}</div>
        </div>
        <div className="bg-white p-12 rounded-[3.5rem] shadow-sm text-center space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">
            Shift Progress
          </div>
          <div className="text-4xl italic">{Math.round(stats.progress)}%</div>
        </div>
        <div className="bg-white p-12 rounded-[3.5rem] shadow-sm text-center space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-40">Target</div>
          <div className="text-4xl italic">{stats.targetHours}H</div>
        </div>
      </div>
    </div>
  );
}
