"use client";

/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import {
  differenceInHours,
  differenceInMilliseconds,
  differenceInMinutes,
  format,
  isValid,
  set,
  subDays,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { AboutSheet } from "@/components/features/about-sheet";
import { MewurkLogs } from "@/components/features/mewurk-logs";
import { TimeTrackerCards } from "@/components/features/time-tracker-cards";
import { WelcomeDialog } from "@/components/features/welcome-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icons } from "@/components/ui/icons";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";

const APP_SETTINGS_KEY = "timewiseSettings";
const APP_SESSION_KEY = "timewiseSession";

import { LogEntry } from "@/hooks/use-time-tracking";

interface SessionState {
  sessionDate: string;
  startTime: string;
  totalBreakMinutes: number; // Kept for backward compatibility/reference if needed, but primary is Ms now
  totalBreakMs: number;
  isOnBreak: boolean;
  breakStartTime: string | null;
  logs: LogEntry[];
}

export default function Home() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const [settings, setSettings] = useLocalStorage(APP_SETTINGS_KEY, {
    fullDayHours: "8",
    fullDayMinutes: "0",
    apiKey: "",
  });

  const [sessionState, setSessionState] = useLocalStorage<SessionState>(APP_SESSION_KEY, {
    sessionDate: "",
    startTime: "",
    totalBreakMinutes: 0,
    totalBreakMs: 0,
    isOnBreak: false,
    breakStartTime: null,
    logs: [],
  });

  const [activeDuration, setActiveDuration] = useState({
    hours: 8,
    minutes: 0,
    mode: "full" as "full" | "half",
  });

  const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"mewurk" | "tracker">("mewurk");

  useEffect(() => {
    setIsClient(true);

    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Migration: ensure logs exists
    const newState = { ...sessionState };
    let hasChanges = false;

    if (!newState.logs) {
      newState.logs = [];
      hasChanges = true;
    }

    // Migration: ensure totalBreakMs exists
    if (newState.totalBreakMs === undefined) {
      newState.totalBreakMs = (newState.totalBreakMinutes || 0) * 60 * 1000;
      hasChanges = true;
    }

    if (hasChanges) {
      setSessionState(newState);
    }

    if (sessionState.sessionDate !== todayStr) {
      if (!sessionState.startTime) {
        startNewSession(); // Initialize
      }
    }
  }, []); // Run once on mount

  useEffect(() => {
    const fullHours = parseInt(settings.fullDayHours, 10) || 0;
    const fullMinutes = parseInt(settings.fullDayMinutes, 10) || 0;
    setActiveDuration({ hours: fullHours, minutes: fullMinutes, mode: "full" });
  }, [settings.fullDayHours, settings.fullDayMinutes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (
        sessionState.startTime &&
        differenceInHours(now, new Date(sessionState.startTime)) >= 12
      ) {
        startNewSession();
      }
    }, 1000); // Update every second to allow real-time timer
    return () => clearInterval(interval);
  }, [sessionState.startTime]);

  const startNewSession = (startTime = new Date()) => {
    const todayStr = format(startTime, "yyyy-MM-dd");
    const newLog: LogEntry = {
      type: "punch-in",
      timestamp: startTime.toISOString(),
      message: "Punched In",
    };
    setSessionState({
      sessionDate: todayStr,
      startTime: startTime.toISOString(),
      totalBreakMinutes: 0,
      totalBreakMs: 0,
      isOnBreak: false,
      breakStartTime: null,
      logs: [newLog],
    });
  };

  const handleSaveSettings = () => {
    const hours = parseInt(settings.fullDayHours, 10) || 0;
    const minutes = parseInt(settings.fullDayMinutes, 10) || 0;

    setSettings((prev) => ({
      ...prev,
      fullDayHours: String(hours),
      fullDayMinutes: String(minutes),
    }));

    if (activeDuration.mode === "full") {
      setActiveDuration({ hours, minutes, mode: "full" });
    } else {
      const totalMinutes = (hours * 60 + minutes) / 2;
      const halfHours = Math.floor(totalMinutes / 60);
      const halfMinutes = totalMinutes % 60;
      setActiveDuration({
        hours: halfHours,
        minutes: halfMinutes,
        mode: "half",
      });
    }

    toast({
      title: "Settings Saved",
      description: "Your new settings have been saved.",
    });
    return true;
  };

  const {
    arrivalTime,
    completionTime,
    timeRemaining,
    overtime,
    progress,
    isWorkDayOver,
    isValid: isDurationValid,
    currentTotalBreakMs,
    workDoneMs,
  } = useMemo(() => {
    if (!isClient || !sessionState.startTime)
      return {
        arrivalTime: null,
        completionTime: null,
        timeRemaining: 0,
        overtime: 0,
        progress: 0,
        isWorkDayOver: false,
        isValid: false,
        currentTotalBreakMs: 0,
        workDoneMs: 0,
      };

    const workingHours = activeDuration.hours;
    const workingMinutes = activeDuration.minutes;

    if (isNaN(workingHours) || isNaN(workingMinutes)) {
      return {
        arrivalTime: null,
        completionTime: null,
        timeRemaining: 0,
        overtime: 0,
        progress: 0,
        isWorkDayOver: false,
        isValid: false,
        currentTotalBreakMs: 0,
        workDoneMs: 0,
      };
    }

    const arrivalTimeDate = new Date(sessionState.startTime);
    if (!isValid(arrivalTimeDate)) {
      return {
        arrivalTime: null,
        completionTime: null,
        timeRemaining: 0,
        overtime: 0,
        progress: 0,
        isWorkDayOver: false,
        isValid: false,
        currentTotalBreakMs: 0,
        workDoneMs: 0,
      };
    }
    const workingMs = (workingHours * 60 + workingMinutes) * 60 * 1000;

    // Calculate current break duration if active
    let additionalBreakMs = 0;
    if (sessionState.isOnBreak && sessionState.breakStartTime) {
      additionalBreakMs = Math.max(
        0,
        currentTime.getTime() - new Date(sessionState.breakStartTime).getTime()
      );
    }

    const totalBreakTimeMs = (sessionState.totalBreakMs || 0) + additionalBreakMs;

    const completionTimeDate = new Date(arrivalTimeDate.getTime() + workingMs + totalBreakTimeMs);
    const timeRemainingMs = completionTimeDate.getTime() - currentTime.getTime();

    // Work done = Time elapsed since arrival - Total Break Time
    const elapsedMsSinceArrival = Math.max(0, currentTime.getTime() - arrivalTimeDate.getTime());
    const workDoneMs = elapsedMsSinceArrival - totalBreakTimeMs;

    let progressValue =
      workingMs > 0 ? Math.max(0, Math.min(100, (workDoneMs / workingMs) * 100)) : 0;
    if (timeRemainingMs <= 0) progressValue = 100;

    return {
      arrivalTime: arrivalTimeDate,
      completionTime: completionTimeDate,
      timeRemaining: Math.max(0, timeRemainingMs),
      overtime: timeRemainingMs < 0 ? Math.abs(timeRemainingMs) : 0,
      progress: progressValue,
      isWorkDayOver: timeRemainingMs <= 0,
      isValid: workingMs > 0,
      currentTotalBreakMs: totalBreakTimeMs,
      workDoneMs: Math.max(0, workDoneMs),
    };
  }, [
    activeDuration,
    currentTime,
    isClient,
    sessionState.startTime,
    sessionState.totalBreakMs,
    sessionState.isOnBreak,
    sessionState.breakStartTime,
  ]);

  const setWorkDuration = (mode: "full" | "half") => {
    const fullHours = parseInt(settings.fullDayHours, 10) || 0;
    const fullMinutes = parseInt(settings.fullDayMinutes, 10) || 0;

    if (mode === "full") {
      setActiveDuration({
        hours: fullHours,
        minutes: fullMinutes,
        mode: "full",
      });
      toast({
        title: "Work Duration Updated",
        description: `Your workday is set to Full Day (${fullHours}h ${fullMinutes}m).`,
      });
    } else {
      // half
      const totalMinutes = (fullHours * 60 + fullMinutes) / 2;
      const halfHours = Math.floor(totalMinutes / 60);
      const halfMinutes = totalMinutes % 60;
      setActiveDuration({
        hours: halfHours,
        minutes: halfMinutes,
        mode: "half",
      });
      toast({
        title: "Work Duration Updated",
        description: `Your workday is set to Half Day (${halfHours}h ${halfMinutes}m).`,
      });
    }
  };

  const handleStartTimeChange = (newTime: string) => {
    const [hours, minutes] = newTime.split(":").map(Number);
    const now = new Date();
    let potentialStartTime = set(now, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    });

    if (potentialStartTime > now) {
      potentialStartTime = subDays(potentialStartTime, 1);
    }

    setSessionState((prev) => ({
      ...prev,
      startTime: potentialStartTime.toISOString(),
      logs:
        prev.logs && prev.logs.length > 0
          ? prev.logs.map((log, index) =>
              index === 0 && log.type === "punch-in"
                ? { ...log, timestamp: potentialStartTime.toISOString() }
                : log
            )
          : [
              {
                type: "punch-in",
                timestamp: potentialStartTime.toISOString(),
                message: "Punched In",
              },
            ],
    }));
  };

  const handleToggleBreak = () => {
    const now = new Date();
    if (sessionState.isOnBreak) {
      // End Break
      const breakStart = new Date(sessionState.breakStartTime!);
      const durationMs = Math.max(0, differenceInMilliseconds(now, breakStart));
      const durationMinutes = Math.floor(durationMs / 1000 / 60);

      const newLog: LogEntry = {
        type: "break-end",
        timestamp: now.toISOString(),
        message: `Break Ended (${durationMinutes}m)`,
      };

      setSessionState((prev) => ({
        ...prev,
        isOnBreak: false,
        breakStartTime: null,
        totalBreakMinutes: prev.totalBreakMinutes + durationMinutes,
        totalBreakMs: (prev.totalBreakMs || 0) + durationMs,
        logs: [...(prev.logs || []), newLog],
      }));
    } else {
      // Start Break
      const newLog: LogEntry = {
        type: "break-start",
        timestamp: now.toISOString(),
        message: "Break Started",
      };

      setSessionState((prev) => ({
        ...prev,
        isOnBreak: true,
        breakStartTime: now.toISOString(),
        logs: [...(prev.logs || []), newLog],
      }));
    }
  };

  const handleAddManualBreak = (minutes: number) => {
    const now = new Date();
    const durationMs = minutes * 60 * 1000;
    const isReduction = minutes < 0;

    const newLog: LogEntry = {
      type: "manual-break",
      timestamp: now.toISOString(),
      message: isReduction ? `Break Adjustment (${minutes}m)` : `Manual Break (+${minutes}m)`,
      durationMs: durationMs,
    };

    setSessionState((prev) => {
      // Prevent total from going below 0
      const currentTotalMs = prev.totalBreakMs || 0;
      const currentTotalMin = prev.totalBreakMinutes || 0;

      if (isReduction && currentTotalMs + durationMs < 0) {
        toast({
          title: "Cannot Reduce Break",
          description: "Break time cannot be negative.",
          variant: "destructive",
        });
        return prev;
      }

      toast({
        title: isReduction ? "Break Reduced" : "Break Added",
        description: `${isReduction ? "Removed" : "Added"} ${Math.abs(minutes)} minutes.`,
      });

      return {
        ...prev,
        totalBreakMinutes: Math.max(0, currentTotalMin + minutes),
        totalBreakMs: Math.max(0, currentTotalMs + durationMs),
        logs: [...(prev.logs || []), newLog],
      };
    });
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans antialiased">
      <WelcomeDialog open={isWelcomeDialogOpen} onOpenChange={setIsWelcomeDialogOpen} />

      {/* Floating Glass Dock Navigation */}
      <aside className="w-[80px] h-full flex flex-col justify-between items-center py-6 px-3 flex-none relative z-20">
        <div className="glass-panel w-full h-full flex flex-col justify-between items-center py-6 rounded-3xl">
          {/* Top Branding Logo */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer hover:bg-emerald-500/30 transition-all duration-300">
              <span className="font-black text-emerald-400 text-lg tracking-tighter text-glow-emerald">
                W
              </span>
            </div>
          </div>

          {/* Nav Icons */}
          <nav className="flex flex-col gap-4 relative z-10 w-full items-center">
            <button
              onClick={() => setActiveTab("mewurk")}
              className={`relative p-3 rounded-xl flex items-center justify-center transition-all duration-300 w-12 h-12 ${
                activeTab === "mewurk"
                  ? "text-white bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              title="Mewurk Logs"
            >
              <Icons.Briefcase className="h-5 w-5" />
              {activeTab === "mewurk" && (
                <motion.div
                  layoutId="activeDockDot"
                  className="absolute -right-1 w-1 h-6 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
            </button>

            <button
              onClick={() => setActiveTab("tracker")}
              className={`relative p-3 rounded-xl flex items-center justify-center transition-all duration-300 w-12 h-12 ${
                activeTab === "tracker"
                  ? "text-white bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              title="Manual Tracker"
            >
              <Icons.Timer className="h-5 w-5" />
              {activeTab === "tracker" && (
                <motion.div
                  layoutId="activeDockDot"
                  className="absolute -right-1 w-1 h-6 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          </nav>

          {/* Bottom Utility Toggles */}
          <div className="flex flex-col gap-4 relative z-10 items-center">
            <div className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all">
              <ThemeToggle />
            </div>
            <div className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all">
              <AboutSheet />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Console Workspace Viewport */}
      <main className="flex-1 min-h-0 h-full flex flex-col relative z-10 p-6 pl-2 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "mewurk" ? (
            <motion.div
              key="mewurk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full flex flex-col overflow-hidden"
            >
              <MewurkLogs
                targetHours={Number(settings.fullDayHours) || 8}
                targetMinutes={Number(settings.fullDayMinutes) || 0}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tracker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full flex flex-col overflow-hidden"
            >
              <TimeTrackerCards
                isWorkDayOver={isWorkDayOver}
                isValid={isDurationValid}
                completionTime={completionTime}
                currentTime={currentTime}
                overtime={overtime}
                timeRemaining={timeRemaining}
                progress={progress}
                activeDurationMode={activeDuration.mode}
                onSetWorkDuration={setWorkDuration}
                arrivalTime={arrivalTime}
                onStartTimeChange={handleStartTimeChange}
                totalBreakMs={currentTotalBreakMs}
                workDoneMs={workDoneMs}
                isOnBreak={sessionState.isOnBreak}
                onToggleBreak={handleToggleBreak}
                logs={sessionState.logs || []}
                fullDayHours={settings.fullDayHours}
                fullDayMinutes={settings.fullDayMinutes}
                onDurationSettingsChange={(hours, minutes) => {
                  setSettings((prev) => ({
                    ...prev,
                    fullDayHours: hours,
                    fullDayMinutes: minutes,
                  }));
                  const h = parseInt(hours, 10) || 0;
                  const m = parseInt(minutes, 10) || 0;
                  if (activeDuration.mode === "full") {
                    setActiveDuration((prev) => ({ ...prev, hours: h, minutes: m }));
                  } else {
                    const totalMinutes = (h * 60 + m) / 2;
                    setActiveDuration((prev) => ({
                      ...prev,
                      hours: Math.floor(totalMinutes / 60),
                      minutes: totalMinutes % 60,
                    }));
                  }
                  toast({ title: "Updated", description: "Work duration settings updated." });
                }}
                onAddManualBreak={handleAddManualBreak}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
