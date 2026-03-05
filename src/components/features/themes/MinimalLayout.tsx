import { format } from "date-fns";
import { MewurkThemeProps } from "../mewurk-logs";

export function MinimalLayout({ stats, monthStats, formatHms }: MewurkThemeProps) {
  return (
    <div className="bg-white text-gray-900 p-12 rounded-[3rem] shadow-sm border border-gray-100 space-y-16 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
            Time Remaining
          </span>
          <h1 className="text-8xl font-light tracking-tighter">{formatHms(stats.remainingMs)}</h1>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Progress
          </span>
          <div className="text-4xl font-medium">{Math.round(stats.progress)}%</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-12">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Completes At
          </span>
          <div className="text-3xl font-light">{format(stats.estimatedEndTime, "hh:mm a")}</div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Breaks
          </span>
          <div className="text-3xl font-light">{formatHms(stats.totalBreakMs)}</div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Avg Load
          </span>
          <div className="text-3xl font-light">{monthStats?.workingHours.dayAvg.toFixed(1)}h</div>
        </div>
      </div>
      <div className="h-px bg-gray-100 w-full" />
    </div>
  );
}
