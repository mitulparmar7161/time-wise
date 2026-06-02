"use client";

import { differenceInMilliseconds, format, isSameDay, isValid } from "date-fns";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

import { EmployeeSearch } from "./employee-search";

interface MewurkLogsProps {
  targetHours: number;
  targetMinutes: number;
  onSettingsChange?: (hours: string, minutes: string) => void;
}

type MonthStats = CardDetailsResponse["data"]["cardDetails"];

interface CachedMewurkLogs {
  data: AttendanceData | null;
  monthStats: MonthStats | null;
}

const MEWURK_LOGS_CACHE_PREFIX = "mewurk_logs_cache";

export function MewurkLogs({ targetHours, targetMinutes }: MewurkLogsProps) {
  const { toast } = useToast();

  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  // ─── NEW: guard so we never treat the initial async null as "logged out" ───
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // Login Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data State
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<AttendanceData | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time State (for live updates)
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeView, setActiveView] = useState<"my-logs" | "search">("my-logs");

  // ─── Stable refs so intervals/callbacks never capture stale closures ───
  const tokenRef = useRef<string | null>(null);
  const employeeCodeRef = useRef<string | null>(null);
  const dateRef = useRef<Date>(new Date());

  // Keep refs in sync with state
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { employeeCodeRef.current = employeeCode; }, [employeeCode]);
  useEffect(() => { dateRef.current = date; }, [date]);

  const getLogsCacheKey = useCallback(
    (selectedDate: Date, code: string) =>
      `${MEWURK_LOGS_CACHE_PREFIX}:${code}:${format(selectedDate, "yyyy-MM-dd")}`,
    []
  );

  const readCachedLogs = useCallback((cacheKey: string): CachedMewurkLogs | null => {
    // ─── Never serve cache for today — always want fresh data ───
    const datePart = cacheKey.split(":").slice(2).join(":");
    if (isSameDay(new Date(datePart), new Date())) return null;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      return cached ? (JSON.parse(cached) as CachedMewurkLogs) : null;
    } catch (e) {
      console.error("Mewurk logs cache parsing error", e);
      return null;
    }
  }, []);

  const writeCachedLogs = useCallback((cacheKey: string, value: CachedMewurkLogs) => {
    // ─── Never cache today's data — it changes as employee clocks in/out ───
    const datePart = cacheKey.split(":").slice(2).join(":");
    if (isSameDay(new Date(datePart), new Date())) return;
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(value));
    } catch (e) {
      console.error("Mewurk logs cache write error", e);
    }
  }, []);

  // ─── Load auth from cookies on mount ───
  useEffect(() => {
    const initAuth = async () => {
      const state = await getInitialAuthStateAction();
      if (state.token && state.employeeCode) {
        setToken(state.token);
        setEmployeeCode(state.employeeCode);
        setUserName(state.userName);
      }
      // ─── Mark auth as ready AFTER we know the real state ───
      setIsAuthInitialized(true);
    };
    initAuth();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await refreshSessionAction();
      if (res.isSuccess && res.token) {
        setToken(res.token);
        tokenRef.current = res.token;
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
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(MEWURK_LOGS_CACHE_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
    setToken(null);
    setEmployeeCode(null);
    setUserName(null);
    setData(null);
    setMonthStats(null);
  }, []);

  // ─── Core fetch — always hits network for today, cache only for past dates ───
  const fetchLogs = useCallback(async () => {
    const currentToken = tokenRef.current;
    const currentCode = employeeCodeRef.current;
    const currentDate = dateRef.current;

    if (!currentToken || !currentCode) return;

    const cacheKey = getLogsCacheKey(currentDate, currentCode);
    // readCachedLogs already returns null for today, so this is safe
    const cached = readCachedLogs(cacheKey);
    if (cached) {
      setData(cached.data);
      setMonthStats(cached.monthStats);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedDate = format(currentDate, "yyyy-MM-dd");
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [logsRes, statsRes] = await Promise.all([
        getAttendanceLogsAction(formattedDate),
        getCardDetailsAction(year, month),
      ]);

      if (logsRes.isSuccess && "data" in logsRes) {
        setData(logsRes.data);
        const nextMonthStats =
          statsRes.isSuccess && "data" in statsRes
            ? statsRes.data.cardDetails
            : null;
        if (nextMonthStats) setMonthStats(nextMonthStats);
        // Only cache past dates
        writeCachedLogs(cacheKey, { data: logsRes.data, monthStats: nextMonthStats });
      } else {
        if (logsRes.statusCode === 401) {
          const refreshed = await refreshSession();
          if (refreshed) return; // useEffect will re-run via token change
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
      } else if (statsRes.statusCode === 401) {
        handleLogout();
        toast({
          title: "Session Expired",
          description: "Please login again.",
          variant: "destructive",
        });
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
  }, [getLogsCacheKey, readCachedLogs, writeCachedLogs, refreshSession, handleLogout, toast]);

  // ─── Trigger fetchLogs when date/token/code changes ───
  useEffect(() => {
    if (!isAuthInitialized) return; // wait until we know real auth state
    if (token && employeeCode) {
      fetchLogs();
    }
  }, [date, token, employeeCode, isAuthInitialized, fetchLogs]);

  // ─── Silent 30s polling for today only — reads from refs so never stale ───
  useEffect(() => {
    if (!isAuthInitialized) return;

    const tick = async () => {
      const currentToken = tokenRef.current;
      const currentCode = employeeCodeRef.current;
      const currentDate = dateRef.current;

      // Only poll if logged in and viewing today
      if (!currentToken || !currentCode) return;
      if (!isSameDay(currentDate, new Date())) return;

      try {
        const formattedDate = format(currentDate, "yyyy-MM-dd");
        const [logsRes, statsRes] = await Promise.all([
          getAttendanceLogsAction(formattedDate),
          getCardDetailsAction(currentDate.getFullYear(), currentDate.getMonth() + 1),
        ]);
        if (logsRes.isSuccess && "data" in logsRes) setData(logsRes.data);
        if (statsRes.isSuccess && "data" in statsRes)
          setMonthStats(statsRes.data.cardDetails);
      } catch {
        // silent — don't show errors on background polls
      }
    };

    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
    // ─── Only depends on isAuthInitialized — refs handle the rest ───
  }, [isAuthInitialized]);

  // --- CALCULATIONS ---
  const parseUtc = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes("T") && !dateStr.toLowerCase().includes("z")) {
      return new Date(dateStr + "Z");
    }
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
      const [datePart, timePart] = dateStr.split(" ");
      const [month, day, year] = datePart.split("/");
      const [hour, minute, second] = timePart.split(":");
      return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
    }
    return new Date(dateStr);
  };

  const stats = useMemo(() => {
    if (!data || !data.clockInDetails.length) return null;

    const logs = [...data.clockInDetails].sort((a, b) => {
      return new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime();
    });

    const firstPunch = logs.find((l) => l.inOutType === "IN");
    const lastPunch = logs[logs.length - 1];

    let actualCompletionTime: Date | null = null;
    let accumulatedWorkMs = 0;
    let targetMet = false;

    let totalBreakMs = 0;
    let breakCount = 0;

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

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      const next = logs[i + 1];
      const currentDate = parseUtc(current.clockTime);

      if (current.inOutType === "IN") {
        if (next && next.inOutType === "OUT") {
          const nextDate = parseUtc(next.clockTime);
          const sessionDuration = differenceInMilliseconds(nextDate, currentDate);

          if (!targetMet) {
            if (accumulatedWorkMs + sessionDuration >= shiftTotalMs) {
              const remainingToTarget = shiftTotalMs - accumulatedWorkMs;
              actualCompletionTime = new Date(currentDate.getTime() + remainingToTarget);
              targetMet = true;
            }
          }
          accumulatedWorkMs += sessionDuration;
        } else if (!next && isSameDay(currentDate, currentTime)) {
          const sessionDuration = differenceInMilliseconds(currentTime, currentDate);

          if (!targetMet) {
            if (accumulatedWorkMs + sessionDuration >= shiftTotalMs) {
              const remainingToTarget = shiftTotalMs - accumulatedWorkMs;
              actualCompletionTime = new Date(currentDate.getTime() + remainingToTarget);
              targetMet = true;
            }
          }
          accumulatedWorkMs += sessionDuration;
        }
      }
    }

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      const next = logs[i + 1];
      const currentDate = parseUtc(current.clockTime);

      if (current.inOutType === "OUT") {
        if (next && next.inOutType === "IN") {
          const nextDate = parseUtc(next.clockTime);
          breakCount++;
          totalBreakMs += differenceInMilliseconds(nextDate, currentDate);
        }
      }
    }

    const totalWorkMs = accumulatedWorkMs;
    const remainingMs = shiftTotalMs - totalWorkMs;
    const progress = Math.min(100, (totalWorkMs / shiftTotalMs) * 100);

    const effectiveCompletionTime =
      actualCompletionTime || new Date(currentTime.getTime() + remainingMs);

    const calculatedTargetHours = Math.floor(shiftTotalMs / (1000 * 60 * 60));
    const calculatedTargetMinutes = Math.floor((shiftTotalMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      firstPunchTime: firstPunch ? parseUtc(firstPunch.clockTime) : null,
      lastActivityTime: lastPunch ? parseUtc(lastPunch.clockTime) : null,
      isWorking: lastPunch?.inOutType === "IN",
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
    };
  }, [data, currentTime]);

  const formatHms = (ms: number) => {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  // ─── Show nothing until we know auth state (prevents login flash on tab switch) ───
  if (!isAuthInitialized) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Icons.Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login View
  if (!token) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center p-2 sm:p-4 lg:h-full">
        <Card className="w-full max-w-sm shadow-xl border-primary/10 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Icons.Building className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Mewurk Connect</CardTitle>
            <CardDescription>Login with your corporate credentials</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoggingIn}
                  className="bg-background/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoggingIn}
                    className="bg-background/50 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-9 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoggingIn}
                  >
                    {showPassword ? (
                      <Icons.EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Icons.Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                  <Icons.Info className="h-4 w-4" />
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full shadow-lg shadow-primary/20"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Login to Mewurk
                    <Icons.LogIn className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Logs View
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 overflow-visible font-sans">
      {/* Header Badge */}
      <Card className="flex-none shadow-md border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-5 display-none"></div>
        <CardContent className="relative z-10 flex flex-col items-stretch justify-between gap-4 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="font-bold text-primary text-sm">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div className="flex min-w-0 flex-col">
              <h3 className="truncate text-base font-bold leading-none tracking-tight">
                {userName || "User"}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">
                  Connected to Mewurk
                </span>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto] gap-2 sm:flex sm:w-auto sm:items-center">
            <Button
              variant={activeView === "search" ? "secondary" : "default"}
              className={cn(
                "col-span-2 h-10 shrink-0 gap-2 px-3 font-semibold transition-colors sm:col-span-1 sm:px-4",
                activeView === "search" && "border border-primary/30 bg-primary/20 text-primary"
              )}
              onClick={() => setActiveView(activeView === "search" ? "my-logs" : "search")}
              title={activeView === "search" ? "View My Logs" : "Search Employees"}
            >
              {activeView === "search" ? (
                <>
                  <Icons.Clock className="h-4 w-4" />
                  <span className="text-sm">My Logs</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span className="text-sm">Search Employees</span>
                </>
              )}
            </Button>

            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start overflow-hidden text-left font-normal bg-background/80 sm:w-[240px]",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <Icons.Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">{date ? format(date, "PPP") : "Pick a date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
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
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              onClick={handleLogout}
              title="Logout"
            >
              <Icons.LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Render */}
      {activeView === "search" ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-300">
          <EmployeeSearch
            targetHours={targetHours}
            targetMinutes={targetMinutes}
            token={token}
            date={date}
          />
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-500">
          <div className="relative">
            <Icons.Loader className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full border border-primary opacity-20"></div>
          </div>
          <p className="text-sm font-medium">Fetching Records...</p>
        </div>
      ) : data && stats ? (
        <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500 overflow-visible">
          {/* Monthly Overview */}
          {monthStats && (
            <div className="grid flex-none grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Icons.CalendarCheck className="h-3.5 w-3.5" /> Present
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 sm:text-2xl">
                    {monthStats.present.totalPresent}{" "}
                    <span className="text-xs font-sans font-medium text-muted-foreground ml-0.5">
                      Days
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Icons.Clock className="h-3.5 w-3.5" /> Avg Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="font-mono text-xl font-bold text-blue-700 dark:text-blue-400 sm:text-2xl">
                    {monthStats.workingHours.dayAvg.toFixed(1)}{" "}
                    <span className="text-xs font-sans font-medium text-muted-foreground ml-0.5">
                      Hrs/Day
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Icons.AlertTriangle className="h-3.5 w-3.5" /> In/Out
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex gap-3">
                  <div>
                    <div className="text-xl font-bold font-mono text-orange-700 dark:text-orange-400">
                      {monthStats.gracePeriod.lateIn}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">
                      Late
                    </div>
                  </div>
                  <div className="w-px bg-orange-500/20" />
                  <div>
                    <div className="text-xl font-bold font-mono text-orange-700 dark:text-orange-400">
                      {monthStats.gracePeriod.earlyOut}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">
                      Early
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-500/5 to-transparent border-cyan-500/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-semibold text-cyan-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Icons.Coffee className="h-3.5 w-3.5" /> Off Days
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="font-mono text-xl font-bold text-cyan-700 dark:text-cyan-400 sm:text-2xl">
                    {monthStats.offDays.totalWeekoff +
                      monthStats.offDays.totalLeave +
                      monthStats.offDays.totalHoliday}{" "}
                    <span className="text-xs font-sans font-medium text-muted-foreground ml-0.5">
                      Total
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3 min-w-0 w-full overflow-visible">
            {/* Left Column: Stats */}
            <div className="flex flex-col gap-4 overflow-visible lg:col-span-2 lg:pr-1">
              {/* Time Progress */}
              <Card className="flex-none shadow-md border-primary/20 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2 pt-3 relative z-10 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Icons.Timer className="h-3.5 w-3.5 text-primary" />
                    {stats.remainingMs > 0 ? "Time Remaining" : "Overtime Session"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 p-3 pt-0 pb-3">
                  <div className="animate-in fade-in zoom-in-95 space-y-3">
                    <div className="flex flex-col items-center justify-center space-y-0.5">
                      <div
                        className={`w-full min-w-0 break-words text-center font-mono text-[clamp(2.1rem,11vw,3.75rem)] font-extrabold leading-none tracking-tighter tabular-nums ${
                          stats.remainingMs <= 0
                            ? "text-orange-600 dark:text-orange-500 drop-shadow-sm"
                            : "text-foreground drop-shadow-sm"
                        }`}
                      >
                        {formatHms(
                          stats.remainingMs > 0 ? stats.remainingMs : Math.abs(stats.remainingMs)
                        )}
                        {stats.remainingMs <= 0 && (
                          <span className="text-sm align-top ml-0.5 text-orange-600 font-bold">
                            +
                          </span>
                        )}
                      </div>
                      {stats.remainingMs <= 0 && (
                        <span className="text-[10px] font-bold text-orange-600/90 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm border border-orange-200 dark:border-orange-800/50">
                          Over Target
                        </span>
                      )}
                      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-muted/40 px-3 py-1.5 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 mt-2 sm:px-4">
                        <span className="text-xs uppercase font-bold tracking-widest">
                          Time Spent
                        </span>
                        <span className="font-mono text-base font-bold text-foreground sm:text-xl">
                          {formatHms(stats.totalWorkMs)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 px-1">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Progress
                        </span>
                        <span className="text-xs font-mono font-bold text-primary">
                          {Math.round(stats.progress)}%
                        </span>
                      </div>
                      <div className="relative h-2 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${stats.remainingMs <= 0 ? "bg-gradient-to-r from-orange-400 to-orange-600" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`}
                          style={{ width: `${Math.min(100, stats.progress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1 min-[380px]:grid-cols-2">
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-secondary/40 border border-border/50">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
                          {stats.remainingMs <= 0 ? "Finished At" : "Completes At"}
                        </span>
                        <div className="flex items-center gap-1 text-foreground">
                          <Icons.Flag className="w-3 h-3 text-primary/70" />
                          <span className="font-mono text-lg font-bold tracking-tight sm:text-xl">
                            {format(stats.estimatedEndTime, "hh:mm a")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-secondary/40 border border-border/50 relative overflow-hidden">
                        {stats.isDefaultAndMissing && (
                          <div
                            className="absolute top-0 right-0 p-1 opacity-50"
                            title="Using default 8h 15m duration (Shift times not detected)"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          </div>
                        )}
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
                          Goal
                        </span>
                        <div className="flex items-center gap-1 text-foreground">
                          <Icons.Target className="w-3 h-3 text-primary/70" />
                          <span className="font-mono text-lg font-bold tracking-tight sm:text-xl">
                            {stats.targetHours}h{" "}
                            {stats.targetMinutes > 0 ? `${stats.targetMinutes}m` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid flex-1 grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:gap-4">
                {/* First Punch */}
                <Card className="h-full flex flex-col justify-center">
                  <CardHeader className="p-4 pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Icons.Timer className="h-3 w-3" /> Started At
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="font-mono text-2xl font-bold sm:text-3xl">
                      {stats.firstPunchTime ? format(stats.firstPunchTime, "hh:mm a") : "--:--"}
                    </div>
                  </CardContent>
                </Card>

                {/* Breaks */}
                <Card className="h-full flex flex-col justify-center">
                  <CardHeader className="p-4 pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Icons.Coffee className="h-3 w-3" /> Breaks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 p-4 pt-0 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
                    <div className="font-mono text-2xl font-bold sm:text-3xl">
                      {formatHms(stats.totalBreakMs)}
                    </div>
                    <div className="text-sm px-2.5 py-1 bg-secondary rounded-full font-medium">
                      {stats.breakCount}x
                    </div>
                  </CardContent>
                </Card>

                {/* Shift Info */}
                <Card className="h-full flex flex-col justify-center overflow-hidden bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/20">
                  <CardHeader className="p-4 pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Icons.Briefcase className="h-3 w-3" /> Shift: {data.shiftName || "N/A"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground/90">
                      {data.shiftStartTime && data.shiftEndTime
                        ? `${data.shiftStartTime.split(" ")[1].slice(0, 5)} - ${data.shiftEndTime.split(" ")[1].slice(0, 5)}`
                        : "--:-- - --:--"}
                    </div>
                  </CardContent>
                </Card>

                {/* Policy Info */}
                <Card className="h-full flex flex-col justify-center overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                  <CardHeader className="p-4 pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Icons.FileText className="h-3 w-3" /> Policy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div
                      className="text-sm sm:text-base font-semibold truncate text-foreground/90"
                      title={data.policyName}
                    >
                      {data.policyName}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                      Active Plan
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column: Timeline */}
            <Card className="flex max-h-[28rem] flex-col overflow-hidden border-none bg-gradient-to-br from-card to-secondary/10 shadow-lg lg:col-span-1 w-full min-w-0">
              <CardHeader className="flex-none py-3 px-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-sm font-bold flex items-center gap-2">
                    <Icons.ListTodo className="h-4 w-4 text-primary" />
                    Timeline
                  </CardTitle>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border">
                    {data.clockInDetails.length} Entries
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0 overflow-hidden relative">
                <ScrollArea className="h-full w-full p-0 overflow-hidden">
                  {data.clockInDetails.length > 0 ? (
                    <div className="divide-y divide-border/40 w-full">
                      {data.clockInDetails.map((log, index) => {
                        const logTime = parseUtc(log.clockTime);
                        return (
                          <div
                          key={index}
                          className="p-3 hover:bg-muted/30 transition-colors group"
                        >
                          {/* Mobile layout (<365px): stacked */}
                          <div className="flex items-center gap-3 min-[365px]:hidden">
                            <div
                              className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow-sm border ${
                                log.inOutType === "IN"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                              }`}
                            >
                              {log.inOutType === "IN" ? <Icons.LogIn className="h-4 w-4" /> : <Icons.LogOut className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-bold text-sm truncate ${log.inOutType === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                                  {log.inOutType === "IN" ? "Walk In" : "Walk Out"}
                                </span>
                                <span className="font-mono text-xs font-bold text-foreground shrink-0">
                                  {format(logTime, "hh:mm a")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Icons.MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {log.officeName || "Remote"}
                                  {log.deviceName && <span className="opacity-70"> • {log.deviceName}</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Desktop layout (>=365px): side by side */}
                          <div className="hidden min-[365px]:flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow-sm border ${
                                  log.inOutType === "IN"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                                }`}
                              >
                                {log.inOutType === "IN" ? <Icons.LogIn className="h-4 w-4" /> : <Icons.LogOut className="h-4 w-4" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`font-bold text-sm sm:text-base truncate ${log.inOutType === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                                  {log.inOutType === "IN" ? "Walk In" : "Walk Out"}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Icons.MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">
                                    {log.officeName || "Remote"}
                                    {log.deviceName && (
                                      <span className="opacity-70 mx-1">• {log.deviceName}</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-base sm:text-lg font-bold text-foreground block">
                                {format(logTime, "hh:mm")}
                                <span className="text-xs text-muted-foreground ml-0.5 font-sans font-medium">
                                  {format(logTime, "a")}
                                </span>
                              </span>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-60 p-4 text-center">
                      <Icons.Ghost className="h-10 w-10" />
                      <p className="text-xs font-medium">No activity yet.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-80">
          <Icons.Calendar className="h-12 w-12 stroke-1" />
          <p className="text-sm">Select a specific date to view attendance logs.</p>
        </div>
      )}
    </div>
  );
}