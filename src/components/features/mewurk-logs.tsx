"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  differenceInMilliseconds,
  isSameDay,
  isValid,
} from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/ui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MewurkService, AttendanceData, CardDetailsResponse } from "@/services/mewurk";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- THEME IMPORTS ---
import { OriginalLayout } from "./themes/OriginalLayout";
import { TechnicalLayout } from "./themes/TechnicalLayout";
import { HardwareLayout } from "./themes/HardwareLayout";
import { MinimalLayout } from "./themes/MinimalLayout";
import { BrutalistLayout } from "./themes/BrutalistLayout";
import { LuminaLayout } from "./themes/LuminaLayout";
import { MonitorLayout } from "./themes/MonitorLayout";
import { EditorialLayout } from "./themes/EditorialLayout";
import { OrganicLayout } from "./themes/OrganicLayout";
import { TypographicLayout } from "./themes/TypographicLayout";

export interface MewurkThemeProps {
  data: AttendanceData;
  stats: any;
  monthStats: CardDetailsResponse["data"]["cardDetails"] | null;
  userName: string | null;
  currentTime: Date;
  isSequenceBroken: boolean;
  parseUtc: (dateStr: string) => Date;
  formatHms: (ms: number) => string;
  // For Settings
  isEditingDuration: boolean;
  setIsEditingDuration: (val: boolean) => void;
  tempHours: string;
  setTempHours: (val: string) => void;
  tempMinutes: string;
  setTempMinutes: (val: string) => void;
  handleSaveDuration: () => void;
}

interface MewurkLogsProps {
  targetHours: number;
  targetMinutes: number;
  onSettingsChange: (hours: string, minutes: string) => void;
}

export function MewurkLogs({ targetHours, targetMinutes, onSettingsChange }: MewurkLogsProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Settings State
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [tempHours, setTempHours] = useState(targetHours.toString());
  const [tempMinutes, setTempMinutes] = useState(targetMinutes.toString());

  // Login Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data State
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<AttendanceData | null>(null);
  const [monthStats, setMonthStats] = useState<CardDetailsResponse["data"]["cardDetails"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [designTheme, setDesignTheme] = useState("original");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Sync temp settings
  useEffect(() => {
    setTempHours(targetHours.toString());
    setTempMinutes(targetMinutes.toString());
  }, [targetHours, targetMinutes]);

  const handleSaveDuration = () => {
    onSettingsChange(tempHours, tempMinutes);
    setIsEditingDuration(false);
  };

  // Auth initialization & Timer
  useEffect(() => {
    const storedToken = localStorage.getItem("mewurk_auth_token");
    const storedEmpCode = localStorage.getItem("mewurk_employee_code");
    const storedName = localStorage.getItem("mewurk_user_name");
    if (storedToken && storedEmpCode) {
      setToken(storedToken);
      setEmployeeCode(storedEmpCode);
      if (storedName) setUserName(storedName);
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshSession = async () => {
    const storedRefreshToken = localStorage.getItem("mewurk_refresh_token");
    if (!storedRefreshToken) return false;
    try {
      const res = await MewurkService.refreshToken(storedRefreshToken);
      if (res.isSuccess && res.data.token) {
        localStorage.setItem("mewurk_auth_token", res.data.token);
        if (res.data.refreshToken) localStorage.setItem("mewurk_refresh_token", res.data.refreshToken);
        setToken(res.data.token);
        return true;
      }
    } catch (e) { console.error("Auto-refresh failed", e); }
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoggingIn(true);
    setError(null);
    try {
      const lookupRes = await MewurkService.lookupUser(email);
      if (!lookupRes.isSuccess || !lookupRes.data.tenantDetails.length) throw new Error("User not found.");
      const tenantId = lookupRes.data.tenantDetails[0].tenantId;
      const loginRes = await MewurkService.loginUser(email, password, tenantId);
      if (!loginRes.isSuccess) throw new Error(loginRes.message || "Login failed.");

      localStorage.setItem("mewurk_auth_token", loginRes.data.token);
      if (loginRes.data.refreshToken) localStorage.setItem("mewurk_refresh_token", loginRes.data.refreshToken);
      localStorage.setItem("mewurk_employee_code", String(loginRes.data.userModel.employeeCode));
      localStorage.setItem("mewurk_user_name", `${loginRes.data.userModel.firstName} ${loginRes.data.userModel.lastName}`);

      setToken(loginRes.data.token);
      setEmployeeCode(String(loginRes.data.userModel.employeeCode));
      setUserName(`${loginRes.data.userModel.firstName} ${loginRes.data.userModel.lastName}`);
      toast({ title: "Success", description: "Logged in successfully." });
    } catch (err: any) {
      setError(err.message);
    } finally { setIsLoggingIn(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setEmployeeCode(null);
    setUserName(null);
    setData(null);
  };

  const fetchLogs = async () => {
    if (!token || !employeeCode) return;
    setLoading(true);
    setError(null);
    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const [logsRes, statsRes] = await Promise.all([
        MewurkService.fetchAttendanceLogs(formattedDate, token, employeeCode),
        MewurkService.fetchCardDetails(token, employeeCode, date.getFullYear(), date.getMonth() + 1),
      ]);

      if (logsRes.isSuccess) {
        setData(logsRes.data);
      } else if (logsRes.statusCode === 401) {
        const refreshed = await refreshSession();
        if (!refreshed) handleLogout();
      } else {
        setError(logsRes.message || "Failed to fetch logs");
      }

      if (statsRes.isSuccess) setMonthStats(statsRes.data.cardDetails);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token && employeeCode) fetchLogs(); }, [date, token, employeeCode]);

  // --- MATH LOGIC (COMPACTED BUT PRESERVED) ---
  const parseUtc = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes("T") && !dateStr.toLowerCase().includes("z")) return new Date(dateStr + "Z");
    const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]));
    return new Date(dateStr);
  };

  const formatHms = (ms: number) => {
    const a = Math.abs(ms);
    return `${Math.floor(a/3600000)}h ${Math.floor((a%3600000)/60000)}m ${Math.floor((a%60000)/1000)}s`;
  };

  const stats = useMemo(() => {
    if (!data || !data.clockInDetails.length) return null;
    const logs = [...data.clockInDetails].sort((a,b) => new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime());
    let workMs = 0, breakMs = 0, bCount = 0, targetMet = false, compTime: Date | null = null;
    let shiftMs = (targetHours * 3600000) + (targetMinutes * 60000);

    if (data.shiftStartTime && data.shiftEndTime) {
      const s = parseUtc(data.shiftStartTime), e = parseUtc(data.shiftEndTime);
      if (isValid(s) && isValid(e)) shiftMs = Math.abs(differenceInMilliseconds(e, s));
    }

    logs.forEach((log, i) => {
      const next = logs[i+1], cur = parseUtc(log.clockTime);
      if (log.inOutType === "IN") {
        const end = next ? parseUtc(next.clockTime) : (isSameDay(cur, currentTime) ? currentTime : cur);
        const dur = differenceInMilliseconds(end, cur);
        if (!targetMet && workMs + dur >= shiftMs) { compTime = new Date(cur.getTime() + (shiftMs - workMs)); targetMet = true; }
        workMs += dur;
      } else if (next && next.inOutType === "IN") { breakMs += differenceInMilliseconds(parseUtc(next.clockTime), cur); bCount++; }
    });

    return {
      firstPunchTime: parseUtc(logs[0].clockTime),
      totalBreakMs: breakMs, breakCount: bCount,
      progress: Math.min(100, (workMs/shiftMs)*100),
      remainingMs: shiftMs - workMs,
      estimatedEndTime: compTime || new Date(currentTime.getTime() + (shiftMs - workMs)),
      targetHours: Math.floor(shiftMs/3600000), targetMinutes: Math.floor((shiftMs%3600000)/60000)
    };
  }, [data, currentTime, targetHours, targetMinutes]);

  const isSequenceBroken = useMemo(() => {
    if (!data?.clockInDetails || data.clockInDetails.length < 2) return false;
    return data.clockInDetails.some((l, i) => i > 0 && l.inOutType === data.clockInDetails[i-1].inOutType);
  }, [data]);

  // Login View
  if (!token) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="text-center">
            <Icons.Building className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-2xl font-bold">Mewurk Connect</CardTitle>
            <CardDescription>Login with your corporate credentials</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoggingIn} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoggingIn} required />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Icons.EyeOff className="h-4 w-4" /> : <Icons.Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                  <Icons.Info className="h-4 w-4" /> {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <Icons.Loader className="mr-2 animate-spin" /> : "Login to Mewurk"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  const themeProps: MewurkThemeProps = {
    data: data!, stats: stats!, monthStats, userName, currentTime, isSequenceBroken, parseUtc, formatHms,
    isEditingDuration, setIsEditingDuration, tempHours, setTempHours, tempMinutes, setTempMinutes, handleSaveDuration
  };

  return (
    <div className="flex flex-col gap-4 h-full font-sans overflow-hidden">
      {/* Header */}
      <Card className="flex-none shadow-md border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{userName?.[0]}</div>
          <div>
            <h3 className="font-bold leading-none">{userName}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Connected</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="capitalize"><Icons.Palette className="mr-2 h-4 w-4" />{designTheme}</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["original", "technical", "hardware", "minimal", "brutalist", "lumia", "monitor", "editorial", "organic", "typographic"].map(t => (
                    <DropdownMenuItem key={t} onClick={() => setDesignTheme(t)} className="capitalize">{t}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild><Button variant="outline" className="sm:w-[200px] text-left"><Icons.Calendar className="mr-2 h-4 w-4" />{format(date, "MMM dd, yyyy")}</Button></PopoverTrigger>
            <PopoverContent align="end" className="p-0"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus /></PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={handleLogout} className="text-destructive hover:bg-destructive/10"><Icons.LogOut className="h-4 w-4" /></Button>
        </div>
      </Card>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Icons.Loader className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-medium">Fetching Records...</p>
          </div>
        ) : data && stats ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500 pb-8 px-1">
            {designTheme === "original" && <OriginalLayout {...themeProps} />}
            {designTheme === "technical" && <TechnicalLayout {...themeProps} />}
            {designTheme === "hardware" && <HardwareLayout {...themeProps} />}
            {designTheme === "minimal" && <MinimalLayout {...themeProps} />}
            {designTheme === "brutalist" && <BrutalistLayout {...themeProps} />}
            {designTheme === "lumia" && <LuminaLayout {...themeProps} />}
            {designTheme === "monitor" && <MonitorLayout {...themeProps} />}
            {designTheme === "editorial" && <EditorialLayout {...themeProps} />}
            {designTheme === "organic" && <OrganicLayout {...themeProps} />}
            {designTheme === "typographic" && <TypographicLayout {...themeProps} />}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground"><Icons.Calendar className="h-12 w-12 mb-2 opacity-20" /><p>Select a date to view logs.</p></div>
        )}
      </ScrollArea>
    </div>
  );
}