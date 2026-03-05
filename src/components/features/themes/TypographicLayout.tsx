import { format } from "date-fns";
import { MewurkThemeProps } from "../mewurk-logs";

export function TypographicLayout({ stats, monthStats, formatHms }: MewurkThemeProps) {
  return (
    <div className="bg-white text-black p-16 space-y-32 font-sans selection:bg-black selection:text-white animate-in slide-in-from-bottom-12 duration-1000">
      <div className="flex flex-col gap-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">
          01. Time Remaining
        </div>
        <h1 className="text-[16vw] font-black leading-[0.75] tracking-tighter uppercase italic">
          {formatHms(stats.remainingMs).split(" ")[0]}
          <br />
          <span className="opacity-10 text-black">
            {formatHms(stats.remainingMs).split(" ").slice(1).join(" ")}
          </span>
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-24 border-t-4 border-black pt-12">
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">
            02. Completes At
          </div>
          <div className="text-8xl font-black">{format(stats.estimatedEndTime, "HH:mm")}</div>
        </div>
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">
            03. Total Break
          </div>
          <div className="text-8xl font-black">{formatHms(stats.totalBreakMs)}</div>
        </div>
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">
            04. Avg Hours
          </div>
          <div className="text-8xl font-black">{monthStats?.workingHours.dayAvg.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
