import { format } from "date-fns";
import { MewurkThemeProps } from "../mewurk-logs";

export function LuminaLayout({ stats, monthStats, userName, formatHms }: MewurkThemeProps) {
  return (
    <div className="bg-white text-[#1a1a1a] p-12 space-y-16 animate-in slide-in-from-right-8 duration-700">
      <div className="space-y-4">
        <div className="px-4 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold w-fit uppercase tracking-widest">
          Active Tracking
        </div>
        <h1 className="text-7xl font-black tracking-tighter">
          {userName?.split(" ")[0]}'s <span className="text-orange-500">Time</span>.
        </h1>
        <p className="text-xl text-gray-500 max-w-lg">
          Current daily goal is {stats.targetHours} hours. You've completed{" "}
          {Math.round(stats.progress)}% of the shift.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-[#151619] text-white p-10 rounded-[3rem] space-y-8 shadow-2xl">
          <div className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
            01. Time Remaining
          </div>
          <div className="text-6xl font-black">{formatHms(stats.remainingMs)}</div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${stats.progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Completes At
            </span>
            <div className="text-3xl font-black mt-2">
              {format(stats.estimatedEndTime, "HH:mm")}
            </div>
          </div>
          <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Avg Load
            </span>
            <div className="text-3xl font-black mt-2">
              {monthStats?.workingHours.dayAvg.toFixed(1)}h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
