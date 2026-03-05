"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MewurkThemeProps } from "../mewurk-logs";


export function OriginalLayout({
  data,
  stats,
  monthStats,
  isSequenceBroken,
  formatHms,
  parseUtc,
}: MewurkThemeProps) {
  // Sort logs by time (Oldest -> Newest)
  const logs = [...data.clockInDetails].sort(
    (a, b) => new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime()
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 0. Error Warning */}
      {isSequenceBroken && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold flex items-center gap-3 shadow-sm">
          <div className="bg-red-500 text-white p-1 rounded-full">
            <Icons.AlertTriangle className="h-4 w-4" />
          </div>
          <span className="text-sm tracking-tight">Sequence Broken: Duplicate clock-in/out detected.</span>
        </div>
      )}

      {/* 1. Main Hero Card (Consolidated Stats) */}
      <Card className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-card via-card to-primary/5 border-border/40 shadow-2xl overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-2">
            {stats.remainingMs > 0 ? "Time Remaining" : "Overtime Accrued"}
          </span>
          <div
            className={cn(
              "text-7xl sm:text-8xl font-black font-mono tracking-tighter tabular-nums leading-none mb-10 drop-shadow-sm",
              stats.remainingMs <= 0 ? "text-orange-500" : "text-foreground dark:text-white"
            )}
          >
            {formatHms(stats.remainingMs)}
          </div>

          {/* 4-Column Grid Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <StatBlock 
              label="Started At" 
              value={stats.firstPunchTime ? format(stats.firstPunchTime, "hh:mm a") : "--:--"} 
              icon={<Icons.Timer className="h-3 w-3 text-emerald-500" />}
            />
            <StatBlock 
              label="Completes At" 
              value={format(stats.estimatedEndTime, "hh:mm a")} 
              icon={<Icons.CheckCircle className="h-3 w-3 text-blue-500" />}
            />
            <StatBlock 
              label="Total Break" 
              value={formatHms(stats.totalBreakMs)} 
              icon={<Icons.Coffee className="h-3 w-3 text-orange-500" />}
            />
            <StatBlock 
              label="Daily Goal" 
              value={`${stats.targetHours}h ${stats.targetMinutes}m`} 
              icon={<Icons.Target className="h-3 w-3 text-pink-500" />}
            />
          </div>
          
          {/* Progress Bar */}
          <div className="w-full mt-8 space-y-2">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Shift Progress</span>
                <span className="text-xs font-black text-primary">{Math.round(stats.progress)}%</span>
             </div>
             <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden p-0.5 border border-border/20">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", stats.remainingMs <= 0 ? "bg-orange-500" : "bg-primary")} 
                  style={{ width: `${stats.progress}%` }} 
                />
             </div>
          </div>
        </div>
      </Card>

      {/* 2. Activity History (Horizontal Timeline) */}
      <Card className="p-6 rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden relative group">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-500/10 rounded-xl">
               <Icons.Activity className="h-5 w-5 text-pink-500" />
            </div>
            <h3 className="text-sm font-bold tracking-tight">Activity History</h3>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 bg-muted rounded-full text-muted-foreground uppercase tracking-widest">
            {logs.length} Entries
          </span>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-start gap-10 pb-6 px-4">
            {logs.map((l, i) => {
              const isPunchIn = l.inOutType === "IN";
              const isLast = i === logs.length - 1;
              return (
                <div key={i} className="relative flex flex-col items-center group/node">
                  {/* Connector Line */}
                  {!isLast && (
                    <div className="absolute left-[50%] top-12 w-[calc(100%+2.5rem)] h-[2px] bg-muted group-hover/node:bg-primary/20 transition-colors z-0" />
                  )}
                  
                  {/* Time Label (12h format, Bigger) */}
                  <span className="text-sm font-bold text-foreground mb-4 tabular-nums">
                    {format(parseUtc(l.clockTime), "hh:mm a")}
                  </span>

                  {/* Icon Node */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300 shadow-md bg-background",
                      isPunchIn
                        ? "border-emerald-500/40 ring-4 ring-emerald-500/5 group-hover/node:scale-110"
                        : "border-orange-500/40 ring-4 ring-orange-500/5 group-hover/node:scale-110"
                    )}
                  >
                    <Icons.RefreshCcw
                      className={cn(
                        "w-5 h-5",
                        isPunchIn ? "text-emerald-500" : "text-orange-500 rotate-180"
                      )}
                    />
                  </div>

                  {/* Status Label */}
                  <div className="mt-4 px-3 py-1 bg-muted/50 rounded-lg border border-border/40">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                      {isPunchIn ? "Clock In" : "Clock Out"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      {/* 3. Footer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <FooterMetric label="Policy" value={data.policyName} />
        <FooterMetric label="Shift" value={data.shiftName} />
        <FooterMetric label="Monthly Avg" value={`${monthStats?.workingHours.dayAvg.toFixed(1)}h`} />
        <FooterMetric 
          label="Late / Early" 
          value={`${monthStats?.gracePeriod.lateIn} / ${monthStats?.gracePeriod.earlyOut}`} 
        />
      </div>
    </div>
  );
}

/* Internal Sub-components for cleaner UI */

function StatBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-muted/40 dark:bg-white/5 border border-border/20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors hover:bg-muted/60">
      <div className="flex items-center gap-1.5 opacity-40">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function FooterMetric({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
        {label}
      </span>
      <div className="text-xs font-bold text-muted-foreground truncate max-w-full">
        {value || "N/A"}
      </div>
    </div>
  );
}