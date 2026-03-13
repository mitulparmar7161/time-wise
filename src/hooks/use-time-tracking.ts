
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  differenceInHours,
  subDays,
  set,
  isValid,
  format,
  differenceInMilliseconds,
} from "date-fns";
import { useLocalStorage } from "@/hooks/use-local-storage";

const APP_SETTINGS_KEY = "timewiseSettings";
const APP_SESSION_KEY = "timewiseSession";

export type LogEntry = {
  type: "punch-in" | "break-start" | "break-end" | "reset" | "manual-break";
  timestamp: string;
  message: string;
  durationMs?: number;
};

interface SessionState {
  sessionDate: string;
  startTime: string;
  totalBreakMinutes: number; // Kept for backward compatibility
  totalBreakMs: number;
  isOnBreak: boolean;
  breakStartTime: string | null;
  logs: LogEntry[];
}

export function useTimeTracking() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const [settings, setSettings] = useLocalStorage(APP_SETTINGS_KEY, {
    fullDayHours: "8",
    fullDayMinutes: "0",
    apiKey: "",
  });

  const [sessionState, setSessionState] = useLocalStorage<SessionState>(
    APP_SESSION_KEY,
    {
      sessionDate: "",
      startTime: "",
      totalBreakMinutes: 0,
      totalBreakMs: 0,
      isOnBreak: false,
      breakStartTime: null,
      logs: [],
    }
  );

  const [activeDuration, setActiveDuration] = useState({
    hours: 8,
    minutes: 0,
    mode: "full" as "full" | "half",
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setIsClient(true);

    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Migration: ensure logs and totalBreakMs exist
    let newState = { ...sessionState };
    let hasChanges = false;

    if (!newState.logs) {
      newState.logs = [];
      hasChanges = true;
    }

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
  }, []);

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
    }, 1000); // Update every second
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
      message: isReduction
        ? `Break Adjustment (${minutes}m)`
        : `Manual Break (+${minutes}m)`,
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
        description: `${isReduction ? "Removed" : "Added"} ${Math.abs(
          minutes
        )} minutes.`,
      });

      return {
        ...prev,
        totalBreakMinutes: Math.max(0, currentTotalMin + minutes),
        totalBreakMs: Math.max(0, currentTotalMs + durationMs),
        logs: [...(prev.logs || []), newLog],
      };
    });
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

      const completionTimeDate = new Date(
          arrivalTimeDate.getTime() + workingMs + totalBreakTimeMs
      );
      const timeRemainingMs =
          completionTimeDate.getTime() - currentTime.getTime();

      // Work done = Time elapsed since arrival - Total Break Time
      const elapsedMsSinceArrival = Math.max(
          0,
          currentTime.getTime() - arrivalTimeDate.getTime()
      );
      const workDoneMs = elapsedMsSinceArrival - totalBreakTimeMs;

      let progressValue =
          workingMs > 0
              ? Math.max(0, Math.min(100, (workDoneMs / workingMs) * 100))
              : 0;
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
  
  return {
    isClient,
    settings,
    setSettings,
    sessionState,
    setSessionState,
    activeDuration,
    setActiveDuration,
    currentTime,
    isWorkDayOver,
    isDurationValid,
    completionTime,
    overtime,
    timeRemaining,
    progress,
    activeDurationMode: activeDuration.mode,
    setWorkDuration,
    arrivalTime,
    handleStartTimeChange,
    currentTotalBreakMs,
    handleToggleBreak,
    handleAddManualBreak,
  };
}
