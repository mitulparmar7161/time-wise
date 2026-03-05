"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MewurkThemeProps } from "../mewurk-logs";

export function OriginalLayout({
  data,
  stats,
  monthStats,
  isSequenceBroken,
  formatHms,
  parseUtc,
}: MewurkThemeProps) {
  const logs = [...data.clockInDetails].sort(
    (a, b) => new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime()
  );

  return (
    /* 
       Mobile: flex-col (stack), auto height
       Desktop: grid-12, fixed height (calc)
    */
    <div className="h-full flex flex-col lg:grid lg:grid-cols-12 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 lg:max-h-[calc(100vh-140px)]">
      
      {/* LEFT COLUMN: Main Stats & Timer (8/12 on desktop) */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full order-1">
        
        {/* 1. Main Hero Card */}
        <Card className="relative p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] bg-[#09090b] border-white/5 shadow-2xl overflow-hidden flex flex-col justify-center min-h-[350px] lg:min-h-0 lg:flex-1">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 lg:w-96 lg:h-96 bg-primary/10 rounded-full blur-[80px] lg:blur-[120px] pointer-events-none opacity-40" />
          
          <div className="relative z-10 flex flex-col items-center">
            {isSequenceBroken && (
              <div className="mb-4 px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-full text-[10px] font-bold flex items-center gap-2 animate-pulse">
                <Icons.AlertTriangle className="h-3 w-3" /> Sequence broken
              </div>
            )}

            <span className="text-xs lg:text-sm font-medium text-white/40 mb-2 tracking-wide">
              {stats.remainingMs > 0 ? "Time remaining today" : "Overtime accrued"}
            </span>
            
            {/* Timer: Responsive text sizing */}
            <div className={cn(
              "text-5xl md:text-7xl lg:text-8xl font-black font-mono tracking-tighter tabular-nums leading-none mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] text-center",
              stats.remainingMs <= 0 ? "text-rose-500" : "text-white"
            )}>
              {formatHms(stats.remainingMs)}
            </div>

            {/* 4-Column Grid Stats (2x2 on mobile, 4x1 on desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
              <StatBlock 
                label="Started" 
                value={stats.firstPunchTime ? format(stats.firstPunchTime, "hh:mm a") : "--:--"} 
                className="bg-teal-950/40 border-teal-500/20 text-teal-100"
                icon={<Icons.Timer className="h-4 w-4 text-teal-400" />}
              />
              <StatBlock 
                label="Completes" 
                value={format(stats.estimatedEndTime, "hh:mm a")} 
                className="bg-cyan-950/40 border-cyan-500/20 text-cyan-100"
                icon={<Icons.CheckCircle className="h-4 w-4 text-cyan-400" />}
              />
              <StatBlock 
                label="Break" 
                value={formatHms(stats.totalBreakMs)} 
                className="bg-purple-950/40 border-purple-500/20 text-purple-100"
                icon={<Icons.Coffee className="h-4 w-4 text-purple-400" />}
              />
              <StatBlock 
                label="Goal" 
                value={`${stats.targetHours}h ${stats.targetMinutes}m`} 
                className="bg-rose-950/40 border-rose-500/20 text-rose-100"
                icon={<Icons.Target className="h-4 w-4 text-rose-400" />}
              />
            </div>
            
            {/* Progress Bar */}
            <div className="w-full mt-8 space-y-2">
               <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-semibold text-white/30 tracking-tight">Shift progress</span>
                  <span className="text-xs font-black text-primary">{Math.round(stats.progress)}%</span>
               </div>
               <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000", stats.remainingMs <= 0 ? "bg-rose-500" : "bg-primary")} 
                    style={{ width: `${stats.progress}%` }} 
                  />
               </div>
            </div>
          </div>
        </Card>

        {/* Footer Metrics (2x2 on mobile, 4x1 on desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 order-3 lg:order-2">
          <FooterMetric label="Policy" value={data.policyName} />
          <FooterMetric label="Shift" value={data.shiftName} />
          <FooterMetric label="Avg" value={`${monthStats?.workingHours.dayAvg.toFixed(1)}h/d`} />
          <FooterMetric label="Excep" value={`${monthStats?.gracePeriod.lateIn}In • ${monthStats?.gracePeriod.earlyOut}Out`} />
        </div>
      </div>

      {/* RIGHT COLUMN: Activity History (4/12 on desktop) */}
      <Card className="lg:col-span-4 p-5 lg:p-6 rounded-[2rem] lg:rounded-[2.5rem] bg-card border-white/5 shadow-xl flex flex-col overflow-hidden h-[400px] lg:h-auto lg:max-h-full order-2 lg:order-3">
        <div className="flex items-center justify-between mb-6 flex-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
               <Icons.Activity className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <h3 className="text-sm lg:text-md font-bold tracking-tight">Activity history</h3>
          </div>
          <span className="text-[9px] lg:text-[10px] font-bold px-2 py-1 bg-white/5 rounded-full text-white/40 uppercase tracking-widest">
            {logs.length} Logged
          </span>
        </div>

        {/* 
           On Desktop: ScrollArea handles internal scroll 
           On Mobile: ScrollArea height is fixed so it doesn't expand infinitely
        */}
        <ScrollArea className="flex-1 pr-4">
          <div className="relative pl-8 space-y-6 lg:space-y-8 py-2">
            {/* Vertical Line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/10" />

            {logs.map((l, i) => {
              const isPunchIn = l.inOutType === "IN";
              return (
                <div key={i} className="relative flex items-center justify-between group">
                  {/* Timeline Dot */}
                  <div className={cn(
                    "absolute -left-[24px] w-3.5 h-3.5 rounded-full border-2 bg-[#09090b] z-10 transition-transform group-hover:scale-125",
                    isPunchIn ? "border-emerald-500" : "border-orange-500"
                  )} />
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/30 mb-0.5 uppercase tracking-tighter">
                      {isPunchIn ? "Clock in" : "Clock out"}
                    </span>
                    <span className="text-lg lg:text-xl font-black text-foreground tabular-nums leading-none">
                      {format(parseUtc(l.clockTime), "hh:mm a")}
                    </span>
                  </div>

                  <div className={cn(
                    "p-1.5 rounded-lg border border-white/5",
                    isPunchIn ? "bg-emerald-500/5" : "bg-orange-500/5"
                  )}>
                    <Icons.RefreshCcw className={cn(
                      "w-3.5 h-3.5 lg:w-4 lg:h-4",
                      isPunchIn ? "text-emerald-500" : "text-orange-500 rotate-180"
                    )} />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

    </div>
  );
}

/* Sub-components */

function StatBlock({ label, value, icon, className }: { label: string; value: string; icon: React.ReactNode; className: string }) {
  return (
    <div className={cn("p-3 lg:p-4 border rounded-[1.2rem] lg:rounded-[1.5rem] flex flex-col gap-1 transition-all shadow-lg group", className)}>
      <div className="flex items-center gap-2 opacity-60">
        {icon}
        <span className="text-[8px] lg:text-[10px] font-medium tracking-wide uppercase">{label}</span>
      </div>
      <div className="text-lg lg:text-2xl font-black tracking-tight tabular-nums truncate">{value}</div>
    </div>
  );
}

function FooterMetric({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="bg-white/5 p-2.5 lg:p-3 rounded-xl lg:rounded-2xl border border-white/5">
      <span className="text-[8px] lg:text-[9px] font-bold text-white/20 tracking-wide uppercase block mb-0.5 lg:mb-1">
        {label}
      </span>
      <div className="text-[10px] lg:text-[11px] font-bold text-white/60 truncate">
        {value || "N/A"}
      </div>
    </div>
  );
}