"use client";

import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";
import { MewurkThemeProps } from "../mewurk-logs";

export function EditorialLayout({
  data,
  stats,
  monthStats,
  userName,
  currentTime,
  isSequenceBroken,
  parseUtc,
  formatHms,
}: MewurkThemeProps) {
  // Sort logs from Oldest to Newest
  const logs = [...data.clockInDetails].sort(
    (a, b) => new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime()
  );

  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-[#F27D26] selection:text-white animate-in fade-in duration-1000 p-6 md:p-12">
      {/* Editorial Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-baseline border-b border-white/20 pb-8 mb-16">
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#F27D26]">
            Issue No. 01 • {format(currentTime, "MMMM dd, yyyy").toUpperCase()}
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">{userName}</h1>
        </div>
        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
            Status: {stats.remainingMs <= 0 ? "Overtime Session" : "Tracking Active"}
          </div>
          {isSequenceBroken && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-500/10 px-3 py-1 uppercase tracking-widest border border-red-500/20">
              <Icons.AlertTriangle className="h-3 w-3" />
              Sequence Broken
            </div>
          )}
        </div>
      </div>

      {/* 01. HERO SECTION - TIME REMAINING */}
      <div className="relative mb-32">
        {/* Background "TIME" Watermark */}
        <div className="absolute -top-12 -left-4 text-[20vw] font-black opacity-[0.03] pointer-events-none select-none leading-none uppercase">
          Time
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-px bg-[#F27D26]"></div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-[#F27D26]">
              01. Time Remaining
            </span>
          </div>

          <h2 className="text-[15vw] md:text-[11rem] font-black leading-[0.85] tracking-tighter uppercase italic break-words">
            {formatHms(stats.remainingMs).split(" ")[0]}
            <br />
            <span className="text-[#F27D26]">
              {formatHms(stats.remainingMs).split(" ").slice(1).join(" ")}
            </span>
          </h2>
        </div>
      </div>

      {/* 02, 03, 04 SECTION - PRIMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32 border-b border-white/20 pb-16">
        {/* Completes At */}
        <div className="space-y-6 group">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black italic text-[#F27D26]">02.</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-40">
              Completes At
            </span>
          </div>
          <div className="text-6xl font-black tracking-tight group-hover:translate-x-4 transition-transform duration-500 tabular-nums">
            {format(stats.estimatedEndTime, "hh:mm a")}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs italic">
            Calculated completion target based on your daily shift requirement of{" "}
            {stats.targetHours}h {stats.targetMinutes}m.
          </p>
        </div>

        {/* Total Break */}
        <div className="space-y-6 group">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black italic text-[#F27D26]">03.</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-40">
              Total Break
            </span>
          </div>
          <div className="text-6xl font-black tracking-tight group-hover:translate-x-4 transition-transform duration-500 tabular-nums">
            {formatHms(stats.totalBreakMs)}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs italic">
            Cumulative idle time detected between active punch intervals across {stats.breakCount}{" "}
            sessions.
          </p>
        </div>

        {/* Started At */}
        <div className="space-y-6 group">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black italic text-[#F27D26]">04.</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-40">
              Started At
            </span>
          </div>
          <div className="text-6xl font-black tracking-tight group-hover:translate-x-4 transition-transform duration-500 tabular-nums">
            {stats.firstPunchTime ? format(stats.firstPunchTime, "hh:mm a") : "--:--"}
          </div>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs italic">
            The initial recorded gateway punch for {data.shiftName || "Scheduled Shift"}.
          </p>
        </div>
      </div>

      {/* 05. ACTIVITY HISTORY - TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 pt-16">
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black italic text-[#F27D26]">05.</span>
            <span className="text-xs font-black uppercase tracking-widest opacity-40">
              Activity History
            </span>
          </div>
          <h3 className="text-5xl font-black tracking-tighter uppercase italic leading-none">
            The Daily <br /> Chronology.
          </h3>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] mb-2">
              Policy Engine
            </div>
            <div className="text-xl font-bold italic truncate">
              {data.policyName || "General Policy"}
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-[10px] font-black uppercase opacity-40">Progress</span>
              <span className="text-sm font-black italic text-[#F27D26]">
                {Math.round(stats.progress)}%
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="space-y-0 border-t border-white/20">
            {logs.map((item, i) => (
              <div
                key={i}
                className="group flex items-center justify-between py-10 border-b border-white/10 hover:bg-white/5 px-6 transition-all"
              >
                <div className="flex items-center gap-12">
                  <span className="text-4xl font-black italic opacity-10 group-hover:opacity-100 group-hover:text-[#F27D26] transition-all">
                    0{i + 1}
                  </span>
                  <div>
                    <div className="text-3xl font-black uppercase tracking-tighter group-hover:translate-x-4 transition-transform">
                      {item.inOutType === "IN" ? "Clock In" : "Clock Out"}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mt-2">
                      {item.officeName || "Office Gateway Record"}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-black italic opacity-40 group-hover:opacity-100 transition-opacity tabular-nums">
                  {format(parseUtc(item.clockTime), "HH:mm:ss")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER - SYSTEM STATS */}
      <div className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/20 pt-16">
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Avg Load
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter italic">
              {monthStats?.workingHours.dayAvg.toFixed(1) || "0.0"}
            </span>
            <span className="text-xs font-black uppercase opacity-20">Hrs/D</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Attendance
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter italic">
              {monthStats?.present.totalPresent || "0"}
            </span>
            <span className="text-xs font-black uppercase opacity-20">Days</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Exceptions
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter italic text-[#F27D26]">
              {(monthStats?.gracePeriod.lateIn || 0) + (monthStats?.gracePeriod.earlyOut || 0)}
            </span>
            <span className="text-xs font-black uppercase opacity-20">Total</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
            Grace Period
          </div>
          <div className="flex items-baseline gap-2 text-sm font-black italic uppercase">
            <span>{monthStats?.gracePeriod.lateIn} Late</span>
            <span className="opacity-20">/</span>
            <span>{monthStats?.gracePeriod.earlyOut} Early</span>
          </div>
        </div>
      </div>
    </div>
  );
}
