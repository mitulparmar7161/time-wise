import { format } from "date-fns";
import { MewurkThemeProps } from "../mewurk-logs";

export function HardwareLayout({ stats, formatHms }: MewurkThemeProps) {
  return (
    <div className="bg-[#1a1a1a] p-1 rounded-[2.5rem] shadow-2xl border-4 border-[#2a2a2a] max-w-4xl mx-auto overflow-hidden text-white font-mono">
      <div className="bg-[#121212] rounded-[2.3rem] p-10 border border-white/5 flex flex-col items-center gap-12">
        <div className="flex justify-between w-full">
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white/40">RECORDING_SESSION</span>
          </div>
          <div className="text-indigo-400 text-[10px] font-bold">MODE: HARDWARE_SYNC</div>
        </div>
        <div className="relative w-72 h-72 flex items-center justify-center">
          <svg className="absolute w-full h-full -rotate-90">
            <circle
              cx="144"
              cy="144"
              r="130"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
            />
            <circle
              cx="144"
              cy="144"
              r="130"
              fill="none"
              stroke="#6366f1"
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 130}
              strokeDashoffset={2 * Math.PI * 130 * (1 - stats.progress / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center">
            <div className="text-[10px] text-white/20 mb-1">REMAINING</div>
            <div className="text-4xl font-bold">{formatHms(stats.remainingMs)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 w-full border-t border-white/5 pt-10">
          <div className="space-y-1">
            <span className="text-[10px] text-white/30 uppercase">Master_Comp</span>
            <div className="text-2xl text-indigo-400">
              {format(stats.estimatedEndTime, "HH:mm")}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-white/30 uppercase">Break_Cycle</span>
            <div className="text-2xl text-indigo-400">{formatHms(stats.totalBreakMs)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
