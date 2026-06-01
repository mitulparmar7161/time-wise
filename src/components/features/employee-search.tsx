"use client";

import { differenceInMilliseconds, format, isSameDay, isValid } from "date-fns";
import {
  Briefcase,
  CalendarDays,
  Clock3,
  Coffee,
  FileText,
  Flag,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Search,
  Target,
  Timer,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAllEmployeesAction, getEmployeeFullDataAction } from "@/app/actions";
import { Icons } from "@/components/ui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AttendanceData, CardDetailsResponse, EmployeeSearchResult } from "@/services/mewurk";

interface EmployeeSearchProps {
  targetHours?: number;
  targetMinutes?: number;
  token?: string | null;
  date: Date;
}

const MAX_SEARCH_RESULTS = 8;

type MonthStats = CardDetailsResponse["data"]["cardDetails"];

export function EmployeeSearch({ token = null, date }: EmployeeSearchProps) {
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const allEmployeesRef = useRef<EmployeeSearchResult[]>([]);
  const hasFetchedData = useRef(false);

  const [searchResults, setSearchResults] = useState<EmployeeSearchResult[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  // ── Sidebar search open/close state ──
  const [searchOpen, setSearchOpen] = useState(false);
  const sidebarSearchRef = useRef<HTMLDivElement>(null);
  const sidebarInputRef = useRef<HTMLInputElement>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);

  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── CACHING LOGIC ───
  useEffect(() => {
    if (!token) return;

    const CACHE_KEY = "mewurk_employees_cache";
    const CACHE_TIME_KEY = "mewurk_employees_cache_time";
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
      if (cachedData && cacheTime && Date.now() - Number(cacheTime) < CACHE_EXPIRY) {
        const parsed = JSON.parse(cachedData);
        allEmployeesRef.current = parsed;
        hasFetchedData.current = true;
        setEmployeeCount(parsed.length);
        return;
      }
    } catch (e) {
      console.error("Cache parsing error", e);
    }

    getAllEmployeesAction()
      .then((res) => {
        const list = res.data ?? [];
        allEmployeesRef.current = list;
        hasFetchedData.current = true;
        setEmployeeCount(list.length);
        if (list.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        }
        setQuery((currentQuery) => {
          if (currentQuery.trim()) {
            setSearchResults(filterEmployees(list, currentQuery));
            setIsLoadingEmployees(false);
          }
          return currentQuery;
        });
      })
      .catch(() => {});
  }, [token]);

  // ── Close sidebar search on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarSearchRef.current && !sidebarSearchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery("");
        setSearchResults([]);
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Auto-focus input when sidebar search opens ──
 useEffect(() => {
  if (!searchOpen) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sidebarInputRef.current?.focus();
    });
  });
}, [searchOpen]);

  const filterEmployees = (list: EmployeeSearchResult[], value: string) => {
    const lower = value.toLowerCase().trim();
    if (!lower) return [];
    return list
      .map((e) => {
        const first = (e.firstName ?? "").toLowerCase();
        const last = (e.lastName ?? "").toLowerCase();
        const full = `${first} ${last}`;
        const code = String(e.employeeCode).toLowerCase();
        const email = (e.email ?? "").toLowerCase();
        const designation = (e.designation ?? "").toLowerCase();
        const department = (e.department ?? "").toLowerCase();
        const mobile = (e.mobileNumber ?? "").toLowerCase();

        let score = 0;
        if (code === lower) score += 120;
        if (code.startsWith(lower)) score += 80;
        if (full === lower) score += 100;
        if (full.startsWith(lower)) score += 70;
        if (first.startsWith(lower) || last.startsWith(lower)) score += 45;
        if (email.startsWith(lower)) score += 35;
        if (department.startsWith(lower) || designation.startsWith(lower)) score += 25;
        if (
          first.includes(lower) ||
          last.includes(lower) ||
          full.includes(lower) ||
          code.includes(lower) ||
          email.includes(lower) ||
          designation.includes(lower) ||
          department.includes(lower) ||
          mobile.includes(lower)
        ) {
          score += 10;
        }

        return { employee: e, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SEARCH_RESULTS)
      .map(({ employee }) => employee);
  };

  const handleSearchInput = (value: string) => {
    setQuery(value);
    setActiveResultIndex(0);
    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);
    if (hasFetchedData.current) {
      setSearchResults(filterEmployees(allEmployeesRef.current, value));
      setIsLoadingEmployees(false);
    } else {
      setIsLoadingEmployees(true);
    }
  };

  const fetchEmployeeData = useCallback(
    async (emp: EmployeeSearchResult, selectedDate: Date) => {
      if (!token) return;
      setLoadingData(true);
      setAttendanceData(null);
      setMonthStats(null);
      try {
        const res = await getEmployeeFullDataAction(
          format(selectedDate, "yyyy-MM-dd"),
          String(emp.employeeCode),
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1
        );
        setAttendanceData(res.logs ?? null);
        setMonthStats(res.stats ?? null);
      } catch {
        toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    },
    [token, toast]
  );

  const handleEmployeeMouseDown = (emp: EmployeeSearchResult) => {
    setSelectedEmployee(emp);
    setQuery(`${emp.firstName} ${emp.lastName}`);
    setShowDropdown(false);
    setSearchOpen(false);
    setAttendanceData(null);
    setMonthStats(null);
  };

  useEffect(() => {
    if (selectedEmployee) fetchEmployeeData(selectedEmployee, date);
  }, [date, selectedEmployee, fetchEmployeeData]);

  const handleSearchReset = () => {
    setQuery("");
    setSearchResults([]);
    setActiveResultIndex(0);
    setShowDropdown(false);
    requestAnimationFrame(() => sidebarInputRef.current?.focus());
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const visibleResults = searchResults;

    if (e.key === "Escape") {
      setSearchOpen(false);
      setQuery(
        selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ""
      );
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (!showDropdown || visibleResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveResultIndex((index) => (index + 1) % visibleResults.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveResultIndex((index) => (index - 1 + visibleResults.length) % visibleResults.length);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleEmployeeMouseDown(visibleResults[activeResultIndex] ?? visibleResults[0]);
    }
  };

  const getEmployeeSubtitle = (emp: EmployeeSearchResult) =>
    [emp.designation, emp.department].filter(Boolean).join(" · ");

  const parseUtc = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes("T") && !dateStr.toLowerCase().includes("z"))
      return new Date(dateStr + "Z");
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
      const [dp, tp] = dateStr.split(" ");
      const [mo, d, y] = dp.split("/");
      const [h, mi, s] = tp.split(":");
      return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    }
    return new Date(dateStr);
  };

  const stats = useMemo(() => {
    if (!attendanceData?.clockInDetails?.length) return null;
    const logs = [...attendanceData.clockInDetails].sort(
      (a, b) => new Date(a.clockTime).getTime() - new Date(b.clockTime).getTime()
    );
    const firstPunch = logs.find((l) => l.inOutType === "IN");
    const lastPunch = logs[logs.length - 1];
    let actualCompletionTime: Date | null = null;
    let accumulatedWorkMs = 0,
      targetMet = false,
      totalBreakMs = 0,
      breakCount = 0,
      shiftTotalMs = 29700000;

    if (attendanceData.shiftStartTime && attendanceData.shiftEndTime) {
      try {
        const s = parseUtc(attendanceData.shiftStartTime),
          e = parseUtc(attendanceData.shiftEndTime);
        if (isValid(s) && isValid(e)) {
          const diff = differenceInMilliseconds(e, s);
          if (diff > 0) shiftTotalMs = diff;
        }
      } catch {}
    }
    for (let i = 0; i < logs.length; i++) {
      const curr = logs[i],
        next = logs[i + 1],
        currDate = parseUtc(curr.clockTime);
      if (curr.inOutType === "IN") {
        if (next?.inOutType === "OUT") {
          const dur = differenceInMilliseconds(parseUtc(next.clockTime), currDate);
          if (!targetMet && accumulatedWorkMs + dur >= shiftTotalMs) {
            actualCompletionTime = new Date(
              currDate.getTime() + (shiftTotalMs - accumulatedWorkMs)
            );
            targetMet = true;
          }
          accumulatedWorkMs += dur;
        } else if (!next && isSameDay(currDate, currentTime)) {
          const dur = differenceInMilliseconds(currentTime, currDate);
          if (!targetMet && accumulatedWorkMs + dur >= shiftTotalMs) {
            actualCompletionTime = new Date(
              currDate.getTime() + (shiftTotalMs - accumulatedWorkMs)
            );
            targetMet = true;
          }
          accumulatedWorkMs += dur;
        }
      }
      if (curr.inOutType === "OUT" && next?.inOutType === "IN") {
        breakCount++;
        totalBreakMs += differenceInMilliseconds(
          parseUtc(next.clockTime),
          parseUtc(curr.clockTime)
        );
      }
    }
    const remainingMs = shiftTotalMs - accumulatedWorkMs;
    return {
      firstPunchTime: firstPunch ? parseUtc(firstPunch.clockTime) : null,
      isWorking: lastPunch?.inOutType === "IN",
      totalWorkMs: accumulatedWorkMs,
      totalBreakMs,
      breakCount,
      remainingMs,
      progress: Math.min(100, (accumulatedWorkMs / shiftTotalMs) * 100),
      estimatedEndTime: actualCompletionTime || new Date(currentTime.getTime() + remainingMs),
      targetHours: Math.floor(shiftTotalMs / 3600000),
      targetMinutes: Math.floor((shiftTotalMs % 3600000) / 60000),
    };
  }, [attendanceData, currentTime]);

  const formatHms = (ms: number) => {
    const h = Math.floor(ms / 3600000),
      m = Math.floor((ms % 3600000) / 60000),
      s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const initials = selectedEmployee
    ? `${selectedEmployee.firstName?.charAt(0) ?? ""}${selectedEmployee.lastName?.charAt(0) ?? ""}`.toUpperCase()
    : "";

  // ── Not logged in ──
  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground opacity-70">
        {/* <UserSearch className="h-12 w-12 stroke-1" /> */}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 overflow-visible">
      <div className="flex-none px-0 pb-4 sm:px-1">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div ref={sidebarSearchRef} className="relative flex-1">
          {/* ── Collapsed: icon button ── */}
          {!searchOpen && (
            <button
              onClick={() => {
                setSearchOpen(true);
                setShowDropdown(Boolean(query.trim()));
              }}
              className={cn(
                "flex items-center gap-3 w-full",
                "min-h-12 px-3 rounded-lg",
                "bg-card border border-border/60 shadow-sm",
                "text-muted-foreground hover:text-foreground",
                "hover:border-primary/40 hover:bg-primary/5",
                "transition-all duration-150 group text-left"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {selectedEmployee ? <User className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {selectedEmployee
                    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                    : "Search employee"}
                </span>
                {/* <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {selectedEmployee
                    ? `#${selectedEmployee.employeeCode}${getEmployeeSubtitle(selectedEmployee) ? ` · ${getEmployeeSubtitle(selectedEmployee)}` : ""}`
                    : hasFetchedData.current
                      ? `${employeeCount} employees ready`
                      : "Loading employee directory"}
                </span> */}
              </span>
              <span className="hidden shrink-0 rounded-md border border-border/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 group-hover:border-primary/30 group-hover:text-primary min-[380px]:inline-flex">
                Find
              </span>
            </button>
          )}

          {/* ── Expanded search ── */}
              <div
                  className={cn(
                    searchOpen ? "block" : "hidden"
                  )}
                >
            <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-card p-2 shadow-lg">
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 h-11 shadow-inner focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
                <Search className="h-4 w-4 text-primary/80 flex-shrink-0" />
                <input
                  ref={sidebarInputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => setShowDropdown(Boolean(query.trim()))}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search employee"
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none",
                    "text-sm text-foreground placeholder:text-muted-foreground/55",
                    "font-medium"
                  )}
                />
                {query && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSearchReset();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="overflow-hidden rounded-lg border border-border/60 bg-card"
                >
                  {isLoadingEmployees ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <Icons.Loader className="h-5 w-5 animate-spin text-primary" />
                      <span>Loading directory...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto overscroll-contain">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                          <Search className="h-3 w-3" />
                          {searchResults.length} match
                          {searchResults.length !== 1 ? "es" : ""}
                        </span>
                        {hasFetchedData.current && (
                          <span className="text-[10px] font-mono text-muted-foreground/50">
                            {employeeCount} loaded
                          </span>
                        )}
                      </div>
                      {searchResults.map((emp, index) => (
                        <button
                          key={emp.employeeCode}
                          onMouseDown={() => handleEmployeeMouseDown(emp)}
                          onMouseEnter={() => setActiveResultIndex(index)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 text-left transition-all duration-150 border-b border-border/30 last:border-0 group",
                            activeResultIndex === index ? "bg-primary/10" : "hover:bg-primary/5"
                          )}
                        >
                          <div className="relative shrink-0">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {emp.firstName?.charAt(0)}
                                {emp.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground/70 flex items-center gap-2 min-w-0">
                              <span className="font-mono">#{emp.employeeCode}</span>
                              {getEmployeeSubtitle(emp) && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{getEmployeeSubtitle(emp)}</span>
                                </>
                              )}
                            </div>
                            {emp.email && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/55">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{emp.email}</span>
                              </div>
                            )}
                          </div>
                          {emp.department && (
                            <span className="hidden sm:inline-flex max-w-24 truncate text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                              {emp.department}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <Users className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No employee found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try a name, employee code, email, department, or designation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!selectedEmployee && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/10 flex items-center justify-center">
              <Users className="h-10 w-10 text-primary/30" />
            </div>
            <div
              className="absolute inset-0 rounded-full bg-primary/5 animate-ping"
              style={{ animationDuration: "3s" }}
            />
          </div>
          <div className="max-w-xs px-4 text-center space-y-1">
            <p className="text-base font-semibold text-foreground/60">Find an Employee</p>
            <p className="text-sm text-muted-foreground/50">
              Type a name or employee code to view their attendance
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/40">
            <span className="px-2 py-1 rounded-md bg-muted/30 font-mono">
              {hasFetchedData.current
                ? `${employeeCount} employee${employeeCount !== 1 ? "s" : ""} loaded`
                : "Loading directory..."}
            </span>
          </div>
        </div>
      )}

      {/* ── Employee view ── */}
      {selectedEmployee && (
        <div className="flex-1 flex flex-col gap-4 overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Profile strip */}
          <div className="flex-none flex items-start gap-3 px-0 sm:items-center sm:gap-4 sm:px-1">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 to-blue-600/20 shadow-lg sm:h-14 sm:w-14">
                <span className="bg-gradient-to-br from-primary to-blue-400 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                  {initials}
                </span>
              </div>
              <div
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${stats?.isWorking ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full bg-white ${stats?.isWorking ? "animate-pulse" : ""}`}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold tracking-tight leading-none truncate">
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">
                  #{selectedEmployee.employeeCode}
                </span>
                {selectedEmployee.designation && (
                  <span className="max-w-full truncate text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {selectedEmployee.designation}
                  </span>
                )}
                {selectedEmployee.department && (
                  <span className="max-w-full truncate text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                    {selectedEmployee.department}
                  </span>
                )}
                {stats && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stats.isWorking ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                  >
                    {stats.isWorking ? "● Working" : "○ Out"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Monthly stats strip */}
          {loadingData && !monthStats ? (
            <div className="grid flex-none grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            monthStats && (
              <div className="grid flex-none grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-4">
                {[
                  {
                    label: "Present",
                    value: monthStats.present.totalPresent,
                    unit: "days",
                    color: "emerald",
                    icon: <CalendarDays className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Avg / Day",
                    value: `${monthStats.workingHours.dayAvg.toFixed(1)}h`,
                    unit: "",
                    color: "blue",
                    icon: <Clock3 className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Absent",
                    value: monthStats.absent.totalAbsent,
                    unit: "days",
                    color: "rose",
                    icon: <TrendingUp className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Late / Early",
                    value: `${monthStats.gracePeriod.lateIn} / ${monthStats.gracePeriod.earlyOut}`,
                    unit: "",
                    color: "amber",
                    icon: <Timer className="h-3.5 w-3.5" />,
                  },
                ].map(({ label, value, unit, color, icon }) => (
                  <div
                    key={label}
                    className={`rounded-xl p-3 border bg-gradient-to-br border-${color}-500/20 from-${color}-500/5 to-transparent`}
                  >
                    <div className={`flex items-center gap-1.5 text-${color}-500 mb-1`}>
                      {icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                    <div
                      className={`text-xl font-bold font-mono text-${color}-600 dark:text-${color}-400`}
                    >
                      {value}
                      <span className="text-xs font-sans text-muted-foreground ml-1">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Main content */}
          {loadingData && !attendanceData ? (
            <div className="grid flex-1 grid-cols-1 gap-3 overflow-visible lg:grid-cols-5">
              <div className="flex flex-col gap-3 lg:col-span-3">
                <Skeleton className="h-44 rounded-2xl" />
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              </div>
              <Skeleton className="lg:col-span-2 rounded-2xl min-h-32" />
            </div>
          ) : !attendanceData ? (
            <div className="flex min-h-[20rem] flex-1 flex-col items-center justify-center gap-3 text-muted-foreground/50">
              <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                <Icons.Ghost className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">No attendance data</p>
                <p className="text-xs mt-0.5">
                  This employee did not clock in on {format(date, "dd MMM yyyy")}
                </p>
              </div>
            </div>
          ) : (
            stats && (
              <div className="grid flex-1 grid-cols-1 gap-3 overflow-visible lg:grid-cols-5">
                {/* Left: main stats */}
                <div className="flex flex-col gap-3 overflow-visible lg:col-span-3">
                  {/* Hero time card */}
                  <div
                    className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${
                      stats.remainingMs <= 0
                        ? "border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5"
                        : "border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5"
                    }`}
                  >
                    {/* <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
                      <div
                        className={`w-full h-full rounded-full border-8 ${
                          stats.remainingMs <= 0 ? "border-orange-500" : "border-primary"
                        }`}
                      />
                    </div> */}
                    <div className="relative z-10">
                      <div className="mb-3 flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                          {stats.remainingMs > 0 ? "Time Remaining" : "Overtime"}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            stats.remainingMs <= 0
                              ? "bg-orange-500/15 text-orange-500"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {Math.round(stats.progress)}% done
                        </span>
                      </div>
                      <div
                        className={`w-full min-w-0 break-words font-mono text-[clamp(2.1rem,11vw,3.75rem)] font-black leading-none tracking-tighter tabular-nums ${
                          stats.remainingMs <= 0 ? "text-orange-500" : "text-foreground"
                        }`}
                      >
                        {formatHms(Math.abs(stats.remainingMs))}
                        {stats.remainingMs <= 0 && (
                          <span className="text-2xl align-top text-orange-400 ml-1">+</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground/60 font-mono">
                        Worked:{" "}
                        <span className="text-foreground font-bold">
                          {formatHms(stats.totalWorkMs)}
                        </span>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              stats.remainingMs <= 0
                                ? "bg-gradient-to-r from-orange-400 to-red-500"
                                : "bg-gradient-to-r from-primary to-blue-400"
                            }`}
                            style={{ width: `${Math.min(100, stats.progress)}%` }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs">
                          <Flag className="h-3 w-3" />
                          <span>
                            {stats.remainingMs <= 0 ? "Finished" : "Finishes"}{" "}
                            {format(stats.estimatedEndTime, "hh:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs">
                          <Target className="h-3 w-3" />
                          <span>
                            Goal {stats.targetHours}h
                            {stats.targetMinutes > 0 ? ` ${stats.targetMinutes}m` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mini stat cards */}
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <div className="rounded-xl border border-border/50 bg-card p-4">
                      <div className="flex items-center gap-2 text-muted-foreground/60 mb-2">
                        <Timer className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Started At
                        </span>
                      </div>
                      <div className="font-mono text-xl font-bold sm:text-2xl">
                        {stats.firstPunchTime ? format(stats.firstPunchTime, "hh:mm") : "--:--"}
                        <span className="text-sm font-sans text-muted-foreground ml-1">
                          {stats.firstPunchTime ? format(stats.firstPunchTime, "a") : ""}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card p-4">
                      <div className="flex items-center gap-2 text-muted-foreground/60 mb-2">
                        <Coffee className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Break Time
                        </span>
                      </div>
                      <div className="font-mono text-xl font-bold sm:text-2xl">
                        {formatHms(stats.totalBreakMs)}
                        <span className="text-xs font-sans text-muted-foreground ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary">
                          {stats.breakCount}x
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent p-4">
                      <div className="flex items-center gap-2 text-indigo-400/80 mb-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Shift
                        </span>
                      </div>
                      <div className="text-sm font-bold truncate">
                        {attendanceData.shiftName || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {attendanceData.shiftStartTime && attendanceData.shiftEndTime
                          ? `${attendanceData.shiftStartTime.split(" ")[1]?.slice(0, 5)} — ${attendanceData.shiftEndTime.split(" ")[1]?.slice(0, 5)}`
                          : "--:-- — --:--"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent p-4">
                      <div className="flex items-center gap-2 text-teal-400/80 mb-2">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Policy
                        </span>
                      </div>
                      <div className="text-sm font-bold truncate" title={attendanceData.policyName}>
                        {attendanceData.policyName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Active Plan</div>
                    </div>
                  </div>
                </div>

                {/* Right: Timeline */}
                <div className="flex max-h-[28rem] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card lg:col-span-2">
                  <div className="flex-none px-4 py-3 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                        Timeline
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {attendanceData.clockInDetails.length} punches
                    </span>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-1">
                      {attendanceData.clockInDetails.map((log, idx) => {
                        const logTime = parseUtc(log.clockTime);
                        const isIn = log.inOutType === "IN";
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                              isIn
                                ? "bg-emerald-500/5 border border-emerald-500/10"
                                : "bg-orange-500/5 border border-orange-500/10"
                            }`}
                          >
                            <div
                              className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
                                isIn
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-orange-500/15 text-orange-500"
                              }`}
                            >
                              {isIn ? (
                                <LogIn className="h-3.5 w-3.5" />
                              ) : (
                                <LogOut className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-xs font-bold ${
                                  isIn ? "text-emerald-500" : "text-orange-500"
                                }`}
                              >
                                {isIn ? "Clock In" : "Clock Out"}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 truncate">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">
                                  {log.officeName || "Remote"}
                                  {log.deviceName ? ` · ${log.deviceName}` : ""}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-sm font-bold">
                                {format(logTime, "hh:mm")}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-0.5">
                                {format(logTime, "a")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
