"use client";

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { differenceInMilliseconds, format, isSameDay, isValid } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAttendanceLogsAction,
  getCardDetailsAction,
  getInitialAuthStateAction,
  loginAction,
  logoutAction,
  refreshSessionAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AttendanceData, CardDetailsResponse } from "@/services/mewurk";

interface MewurkLogsProps {
  targetHours: number;
  targetMinutes: number;
}

export function MewurkLogs({ targetHours, targetMinutes }: MewurkLogsProps) {
  const { toast } = useToast();

  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Settings State - temp variables removed as they were not used in the template anymore

  // Login Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data State
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<AttendanceData | null>(null);
  const [monthStats, setMonthStats] = useState<CardDetailsResponse["data"]["cardDetails"] | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time State (for live updates)
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Load auth from cookies on mount
  useEffect(() => {
    const initAuth = async () => {
      const state = await getInitialAuthStateAction();
      if (state.token && state.employeeCode) {
        setToken(state.token);
        setEmployeeCode(state.employeeCode);
        setUserName(state.userName);
      }
    };
    initAuth();

    // Timer for live calculation
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); // every second
    return () => clearInterval(timer);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await refreshSessionAction();
      if (res.isSuccess && res.token) {
        setToken(res.token);
        return true;
      }
    } catch (e) {
      console.error("Auto-login failed:", e);
    }
    return false;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      const loginRes = await loginAction(email, password);
      if (!loginRes.isSuccess || !loginRes.data) {
        throw new Error(loginRes.message || "Login failed.");
      }

      setToken(loginRes.data.token);
      setEmployeeCode(loginRes.data.employeeCode);
      setUserName(loginRes.data.userName);
      setEmail("");
      setPassword("");

      toast({ title: "Success", description: "Logged in to Mewurk successfully." });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please check credentials.";
      setError(message);
      toast({ title: "Login Failed", description: message, variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = useCallback(async () => {
    await logoutAction();
    setToken(null);
    setEmployeeCode(null);
    setUserName(null);
    setData(null);
    setMonthStats(null); // Clear month stats on logout
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!token || !employeeCode) return;

    setLoading(true);
    setError(null);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-indexed for API

      const [logsRes, statsRes] = await Promise.all([
        getAttendanceLogsAction(formattedDate),
        getCardDetailsAction(year, month),
      ]);

      if (logsRes.isSuccess && "data" in logsRes) {
        setData(logsRes.data);
      } else {
        if (logsRes.statusCode === 401) {
          // Try to refresh token
          const refreshed = await refreshSession();
          if (refreshed) {
            // Retry fetch (will happen automatically due to token dependency in useEffect)
            return;
          }

          handleLogout();
          toast({
            title: "Session Expired",
            description: "Please login again.",
            variant: "destructive",
          });
          return;
        }
        setError(logsRes.message || "Failed to fetch logs");
      }

      if (statsRes.isSuccess && "data" in statsRes) {
        setMonthStats(statsRes.data.cardDetails);
      } else {
        console.error("Failed to fetch month stats:", statsRes.message);
        if (statsRes.statusCode === 401) {
          handleLogout();
          toast({
            title: "Session Expired",
            description: "Please login again.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (err: unknown) {
      console.error("Fetch error:", err);
      const message = err instanceof Error ? err.message : "";
      if (message.includes("401")) {
        handleLogout();
        toast({
          title: "Session Expired",
          description: "Please login again.",
          variant: "destructive",
        });
      } else {
        setError(message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, [date, token, employeeCode, refreshSession, handleLogout, toast]);

  useEffect(() => {
    if (token && employeeCode) {
      fetchLogs();
    }
  }, [date, token, employeeCode, fetchLogs]);

  // --- CALCULATIONS ---
  const parseUtc = (dateStr: string) => {
    if (!dateStr) return new Date();
    // If ISO format (e.g. 2026-02-06T04:16:00), force UTC by adding Z if missing
    if (dateStr.includes("T") && !dateStr.toLowerCase().includes("z")) {
      return new Date(dateStr + "Z");
    }
    // If custom format "MM/dd/yyyy HH:mm:ss", parse manually as UTC
    // e.g. "02/06/2026 10:31:00"
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
      const [datePart, timePart] = dateStr.split(" ");
      const [month, day, year] = datePart.split("/");
      const [hour, minute, second] = timePart.split(":");
      return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
    }
    return new Date(dateStr);
  };

  const isPunchIn = (type: string) => type === "IN";

  const isPunchOut = (type: string) =>
    type === "OUT" || type === "AUTO" || type === "AUTO_OUT" || type === "AUTO-OUT";

  const getStatusLabel = (type: string) => {
    if (type === "IN") return "Walk In";
    if (type === "OUT") return "Walk Out";
    if (type === "AUTO" || type === "AUTO_OUT" || type === "AUTO-OUT") return "Auto Out";
    return type;
  };

  const stats = useMemo(() => {
    if (!data || !data.clockInDetails.length) return null;

    // Sort logs by time (Oldest -> Newest) to ensure accurate sequence
    const rawLogs = [...data.clockInDetails].sort((a, b) => {
      return new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime();
    });

    // Create a copy where we keep original inOutType for display and resolve inOutType to IN / OUT
    const logs = rawLogs.map((log) => ({
      ...log,
      originalInOutType: log.inOutType,
    }));

    for (let i = 0; i < logs.length; i++) {
      const type = logs[i].inOutType;
      if (type === "AUTO" || type === "AUTO_OUT" || type === "AUTO-OUT") {
        const prev = i > 0 ? logs[i - 1].inOutType : null;
        const next = i < logs.length - 1 ? logs[i + 1].inOutType : null;

        const prevIsOut =
          i > 0 &&
          (logs[i - 1].inOutType === "OUT" ||
            logs[i - 1].inOutType === "AUTO" ||
            logs[i - 1].inOutType === "AUTO_OUT" ||
            logs[i - 1].inOutType === "AUTO-OUT");
        const nextIsOut =
          i < logs.length - 1 &&
          (logs[i + 1].inOutType === "OUT" ||
            logs[i + 1].inOutType === "AUTO" ||
            logs[i + 1].inOutType === "AUTO_OUT" ||
            logs[i + 1].inOutType === "AUTO-OUT");

        const prevIsIn = i > 0 && logs[i - 1].inOutType === "IN";
        const nextIsIn = i < logs.length - 1 && logs[i + 1].inOutType === "IN";

        // 1. "if last and next is out than the auto status is probabbly in"
        if (prevIsOut && nextIsOut) {
          logs[i].inOutType = "IN";
        }
        // 2. if prev and next are both IN, this AUTO is OUT
        else if (prevIsIn && nextIsIn) {
          logs[i].inOutType = "OUT";
        }
        // 3. if first entry and next is OUT, it is IN
        else if (prev === null && nextIsOut) {
          logs[i].inOutType = "IN";
        }
        // 4. if last entry and prev is OUT, it is IN
        else if (prevIsOut && next === null) {
          logs[i].inOutType = "IN";
        }
        // 5. if last entry and prev is IN, it is OUT
        else if (prevIsIn && next === null) {
          logs[i].inOutType = "OUT";
        }
        // Fallbacks
        else if (prevIsIn) {
          logs[i].inOutType = "OUT";
        } else {
          logs[i].inOutType = "IN";
        }
      }
    }

    const firstPunch = logs.find((l) => isPunchIn(l.inOutType));
    const lastPunch = logs[logs.length - 1];

    let actualCompletionTime: Date | null = null;
    let accumulatedWorkMs = 0;
    let targetMet = false;

    // Variables for break calculation
    let totalWorkMs = 0;
    let totalBreakMs = 0;
    let breakCount = 0;

    // Calculate Shift Duration
    // Priority 1: Calculate from API provided shift times
    // Priority 2: Default to 8 hours 15 minutes (29700000 ms)
    let shiftTotalMs = 29700000; // Default 8h 15m
    let usedShiftTimes = false;

    if (data.shiftStartTime && data.shiftEndTime) {
      try {
        const shiftStart = parseUtc(data.shiftStartTime);
        const shiftEnd = parseUtc(data.shiftEndTime);

        if (isValid(shiftStart) && isValid(shiftEnd)) {
          const diff = differenceInMilliseconds(shiftEnd, shiftStart);
          if (diff > 0) {
            shiftTotalMs = diff;
            usedShiftTimes = true;
          }
        }
      } catch (e) {
        console.error("Failed to parse shift times for duration calculation", e);
      }
    }

    // First pass: Calculate accurate completion time based on logs
    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      const next = logs[i + 1];
      const currentDate = parseUtc(current.clockTime);

      if (isPunchIn(current.inOutType)) {
        if (next && isPunchOut(next.inOutType)) {
          // Completed session
          const nextDate = parseUtc(next.clockTime);
          const sessionDuration = differenceInMilliseconds(nextDate, currentDate);

          if (!targetMet) {
            if (accumulatedWorkMs + sessionDuration >= shiftTotalMs) {
              // Target met during this session
              const remainingToTarget = shiftTotalMs - accumulatedWorkMs;
              actualCompletionTime = new Date(currentDate.getTime() + remainingToTarget);
              targetMet = true;
            }
          }
          accumulatedWorkMs += sessionDuration;
        } else if (!next && isSameDay(currentDate, currentTime)) {
          // Ongoing session (if today)
          const sessionDuration = differenceInMilliseconds(currentTime, currentDate);

          if (!targetMet) {
            if (accumulatedWorkMs + sessionDuration >= shiftTotalMs) {
              // Target met just now/during current session
              const remainingToTarget = shiftTotalMs - accumulatedWorkMs;
              actualCompletionTime = new Date(currentDate.getTime() + remainingToTarget);
              targetMet = true;
            }
          }
          accumulatedWorkMs += sessionDuration;
        }
      }
    }

    // Calculate breaks (separate loop or logic, reused from existing but kept clean)
    // We need total work and break stats regardless of when target was met
    // The loop above calculated accumulatedWorkMs correctly for total work including overtime

    // But we need to ensure we count breaks correctly too
    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      const next = logs[i + 1];
      const currentDate = parseUtc(current.clockTime);

      if (isPunchOut(current.inOutType)) {
        // Check for break
        if (next && isPunchIn(next.inOutType)) {
          const nextDate = parseUtc(next.clockTime);
          breakCount++;
          totalBreakMs += differenceInMilliseconds(nextDate, currentDate);
        }
      }
    }

    totalWorkMs = accumulatedWorkMs; // Assign to the returned var

    const remainingMs = shiftTotalMs - totalWorkMs;
    const progress = Math.min(100, (totalWorkMs / shiftTotalMs) * 100);

    // If we haven't met target, Estimated is moving. If we met it, it's fixed.
    // actually, estimatedEndTime is mainly for "When WILL I finish".
    // actualCompletionTime is "When DID I finish".
    // We can unify this:
    // If targetMet, use actualCompletionTime.
    // If not met, use currentTime + remaining.

    const effectiveCompletionTime =
      actualCompletionTime || new Date(currentTime.getTime() + remainingMs);

    // Calculate target hours/mins for display
    const calculatedTargetHours = Math.floor(shiftTotalMs / (1000 * 60 * 60));
    const calculatedTargetMinutes = Math.floor((shiftTotalMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      firstPunchTime: firstPunch ? parseUtc(firstPunch.clockTime) : null,
      lastActivityTime: lastPunch ? parseUtc(lastPunch.clockTime) : null,
      isWorking: lastPunch ? isPunchIn(lastPunch.inOutType) : false,
      totalWorkMs,
      totalBreakMs,
      breakCount,
      remainingMs,
      progress,
      shiftTotalMs,
      estimatedEndTime: effectiveCompletionTime,
      targetHours: calculatedTargetHours,
      targetMinutes: calculatedTargetMinutes,
      isDefaultAndMissing: !usedShiftTimes,
      resolvedLogs: logs,
    };
  }, [data, currentTime]);

  const formatHms = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  // Login View
  if (!token) {
    return (
      <div className="flex h-full items-center justify-center p-4 rounded-3xl relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md z-10"
        >
          <Card className="glass-panel border-none shadow-2xl relative overflow-hidden">
            <CardHeader className="text-center pb-6 pt-10">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-glow-emerald">
                <Icons.Building className="h-8 w-8 text-emerald-400" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight text-white mb-2">
                Mewurk Connect
              </CardTitle>
              <CardDescription className="text-white/60 text-sm font-medium tracking-wide">
                Sync your console to the master node
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 px-8">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold text-white/70 uppercase tracking-widest"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoggingIn}
                    className="glass-input h-12 text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-bold text-white/70 uppercase tracking-widest"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoggingIn}
                      className="glass-input h-12 text-sm pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-10 w-10 hover:bg-white/10 text-white/60 hover:text-white rounded-xl"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoggingIn}
                    >
                      {showPassword ? (
                        <Icons.EyeOff className="h-5 w-5" />
                      ) : (
                        <Icons.Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-sm font-medium flex items-center gap-2"
                  >
                    <Icons.Info className="h-5 w-5 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </CardContent>
              <CardFooter className="pb-10 pt-4 px-8">
                <Button
                  type="submit"
                  className="w-full glass-button-primary h-12 text-base tracking-wide"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Icons.Loader className="mr-2 h-5 w-5 animate-spin" />
                      Syncing Node...
                    </>
                  ) : (
                    <>
                      Connect Node
                      <Icons.LogIn className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Logs View
  return (
    <div className="flex flex-col gap-6 h-full font-sans overflow-hidden">
      {/* Glass Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-none p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel relative z-10"
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-sm backdrop-blur-md">
            <span className="font-black text-white text-xl">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-lg leading-tight text-white tracking-wide">
              {userName || "User"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest text-glow-emerald">
                System Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[220px] h-12 justify-start text-left font-bold glass-button-secondary text-sm",
                  !date && "text-white/50"
                )}
              >
                <Icons.Calendar className="mr-3 h-5 w-5 text-white/70" />
                {date ? format(date, "MMMM do, yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl glass-panel border-none" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) {
                    setDate(newDate);
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
                className="bg-transparent text-white"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl glass-button-secondary hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/30"
            onClick={handleLogout}
            title="Logout"
          >
            <Icons.LogOut className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* Main Content Layout */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/60 animate-in fade-in duration-200">
          <Icons.Loader className="h-8 w-8 animate-spin text-emerald-400 text-glow-emerald" />
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/80">
            Syncing node data...
          </p>
        </div>
      ) : data && stats ? (
        <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-hidden">
          {/* Monthly Stats Summary Row */}
          {monthStats && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
              }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-none"
            >
              {[
                {
                  title: "Present Days",
                  val: `${monthStats!.present.totalPresent}`,
                  icon: <Icons.CalendarCheck className="h-5 w-5 text-cyan-400" />,
                  color: "cyan",
                },
                {
                  title: "Average Hours",
                  val: `${monthStats!.workingHours.dayAvg.toFixed(1)}h`,
                  icon: <Icons.Clock className="h-5 w-5 text-emerald-400" />,
                  color: "emerald",
                },
                {
                  title: "Grace Penalties",
                  val: `${monthStats!.gracePeriod.lateIn + monthStats!.gracePeriod.earlyOut}`,
                  icon: <Icons.AlertTriangle className="h-5 w-5 text-amber-400" />,
                  color: "amber",
                },
                {
                  title: "Time Off",
                  val: `${monthStats!.offDays.totalWeekoff + monthStats!.offDays.totalLeave + monthStats!.offDays.totalHoliday}`,
                  icon: <Icons.Coffee className="h-5 w-5 text-purple-400" />,
                  color: "purple",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
                  }}
                  className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between"
                >
                  <div className="text-xs uppercase font-bold tracking-widest text-white/60 flex items-center gap-2">
                    {item.icon}
                    {item.title}
                  </div>
                  <div className="text-3xl font-black tracking-tight text-white mt-3">
                    {item.val}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Core Master Deck Panels */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
            {/* Center View: Segmented Tracker & Key Details */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full custom-scrollbar overflow-y-auto pr-2">
              {/* Main Progress Tracker Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex-none p-6 glass-panel rounded-3xl"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Icons.Timer className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-sm uppercase font-bold tracking-widest text-white">
                      {stats!.remainingMs > 0
                        ? "Tracking Session Active"
                        : "Overtime Session Active"}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)] text-glow-emerald">
                    {Math.round(stats!.progress)}% Completed
                  </span>
                </div>

                {/* Counter statistics and elapsed time */}
                <div className="flex flex-col sm:flex-row items-baseline sm:items-end justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase font-bold text-white/50 tracking-widest">
                      {stats!.remainingMs > 0 ? "Remaining Time" : "Overtime Accrued"}
                    </span>
                    <span className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md">
                      {formatHms(
                        stats!.remainingMs > 0 ? stats!.remainingMs : Math.abs(stats!.remainingMs)
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-white/70 font-bold bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between gap-4">
                      <span>Work Time:</span>
                      <span className="text-white">
                        {formatHms(stats!.totalWorkMs).split(" ")[0]}h{" "}
                        {formatHms(stats!.totalWorkMs).split(" ")[1]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Target Shift:</span>
                      <span className="text-white">
                        {stats!.targetHours}h{" "}
                        {stats!.targetMinutes > 0 && `${stats!.targetMinutes}m`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Smooth Progress Bar */}
                <div className="w-full h-3 bg-black/40 rounded-full mt-8 overflow-hidden shadow-inner border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, stats!.progress))}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                    className="h-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] relative"
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Grid 2x2 of details */}
              <div className="grid grid-cols-2 gap-6 flex-none pb-4">
                {[
                  {
                    title: "Arrival Time",
                    val: stats!.firstPunchTime ? format(stats!.firstPunchTime, "hh:mm a") : "--:--",
                    sub: "First Shift Checkin",
                    icon: <Icons.Timer className="h-6 w-6 text-cyan-400" />,
                  },
                  {
                    title: "Break Duration",
                    val: formatHms(stats!.totalBreakMs),
                    sub: `${stats!.breakCount} Breaks Active`,
                    icon: <Icons.Coffee className="h-6 w-6 text-amber-400" />,
                  },
                  {
                    title: "Shift Window",
                    val:
                      data!.shiftStartTime && data!.shiftEndTime
                        ? `${data!.shiftStartTime.split(" ")[1].slice(0, 5)} - ${data!.shiftEndTime.split(" ")[1].slice(0, 5)}`
                        : "--:-- - --:--",
                    sub: data!.shiftName || "Standard",
                    icon: <Icons.Briefcase className="h-6 w-6 text-blue-400" />,
                  },
                  {
                    title: "Policy Group",
                    val: data!.policyName,
                    sub: "Corporate Plan",
                    icon: <Icons.FileText className="h-6 w-6 text-purple-400" />,
                  },
                ].map((pill, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
                    key={idx}
                    className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-bold tracking-widest text-white/60">
                        {pill.title}
                      </span>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        {pill.icon}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-xl font-bold tracking-tight text-white truncate">
                        {pill.val}
                      </div>
                      <div className="text-xs font-bold text-white/50 mt-1 uppercase tracking-wider">
                        {pill.sub}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right View: Activity Ledger */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="lg:col-span-4 flex flex-col glass-panel rounded-3xl h-full overflow-hidden shadow-2xl relative"
            >
              <div className="flex-none py-5 px-6 border-b border-white/10 bg-black/20 backdrop-blur-md relative z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white">
                    <Icons.ListTodo className="h-5 w-5 text-emerald-400" />
                    Activity Timeline
                  </h3>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    {data!.clockInDetails.length} Entries
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-0 overflow-hidden relative z-10 bg-black/10">
                <ScrollArea className="h-full w-full p-0 custom-scrollbar">
                  {stats!.resolvedLogs && stats!.resolvedLogs.length > 0 ? (
                    <div className="p-4 relative">
                      {/* Vertical line connector ledger */}
                      <div className="absolute top-8 bottom-8 left-[39px] w-0.5 bg-white/10 pointer-events-none rounded-full" />

                      {stats!.resolvedLogs.map((log, index) => {
                        const logTime = parseUtc(log.clockTime);
                        const isAuto =
                          log.originalInOutType === "AUTO" ||
                          log.originalInOutType === "AUTO_OUT" ||
                          log.originalInOutType === "AUTO-OUT";
                        const displayStatus = isAuto
                          ? log.inOutType === "IN"
                            ? "Auto In"
                            : "Auto Out"
                          : log.inOutType === "IN"
                            ? "Walk In"
                            : "Walk Out";

                        const isIn = log.inOutType === "IN";

                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            key={index}
                            className="flex items-center justify-between py-4 px-2 hover:bg-white/5 transition-all rounded-xl mb-1 group"
                          >
                            <div className="flex items-center gap-4 min-w-0 z-10">
                              <div
                                className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center border shadow-lg transition-transform group-hover:scale-110 ${
                                  isIn
                                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                    : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                                }`}
                              >
                                {isIn ? (
                                  <Icons.LogIn className="h-4 w-4" />
                                ) : (
                                  <Icons.LogOut className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span
                                  className={`font-bold text-sm tracking-wide ${isIn ? "text-emerald-300" : "text-amber-300"}`}
                                >
                                  {displayStatus}
                                </span>
                                <span className="truncate text-xs font-medium text-white/50 mt-0.5">
                                  {log.officeName || "Remote"}{" "}
                                  {log.deviceName && `• ${log.deviceName}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-lg font-black tracking-tight text-white block drop-shadow-sm">
                                {format(logTime, "hh:mm")}
                                <span className="text-xs text-white/50 ml-1 font-bold uppercase tracking-wider">
                                  {format(logTime, "a")}
                                </span>
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/40 gap-4 p-6 text-center">
                      <div className="p-4 rounded-full bg-white/5 border border-white/10">
                        <Icons.Ghost className="h-10 w-10 text-white/30" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-widest text-white/50">
                        No activity logged yet
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-4 opacity-80">
          <div className="p-5 rounded-full bg-white/5 border border-white/10">
            <Icons.Calendar className="h-10 w-10 text-white/30" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50">
            Select a specific date to load attendance logs
          </p>
        </div>
      )}
    </div>
  );
}
