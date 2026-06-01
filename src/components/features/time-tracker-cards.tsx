"use client";

import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogEntry } from "@/hooks/use-time-tracking";

interface TimeTrackerCardsProps {
  isWorkDayOver: boolean;
  isValid: boolean;
  completionTime: Date | null;
  currentTime: Date;
  overtime: number;
  timeRemaining: number;
  progress: number;
  activeDurationMode: "full" | "half";
  onSetWorkDuration: (mode: "full" | "half") => void;
  arrivalTime: Date | null;
  onStartTimeChange: (newTime: string) => void;
  totalBreakMs: number;
  isOnBreak: boolean;
  onToggleBreak: () => void;
  logs: LogEntry[];
  fullDayHours: string;
  fullDayMinutes: string;
  onDurationSettingsChange: (hours: string, minutes: string) => void;
  onAddManualBreak: (minutes: number) => void;
  workDoneMs: number;
}

export function TimeTrackerCards({
  isWorkDayOver,
  isValid,
  completionTime,
  currentTime,
  overtime,
  timeRemaining,
  progress,
  activeDurationMode,
  onSetWorkDuration,
  arrivalTime,
  onStartTimeChange,
  totalBreakMs,
  isOnBreak,
  onToggleBreak,
  logs,
  fullDayHours,
  fullDayMinutes,
  onDurationSettingsChange,
  onAddManualBreak,
  workDoneMs,
}: TimeTrackerCardsProps) {
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [isAddingBreak, setIsAddingBreak] = useState(false);
  const [manualBreakMinutes, setManualBreakMinutes] = useState("");
  const [tempHours, setTempHours] = useState(fullDayHours);
  const [tempMinutes, setTempMinutes] = useState(fullDayMinutes);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  const handleSaveStartTime = () => {
    setIsEditingStartTime(false);
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStartTimeChange(e.target.value);
  };

  const handleSaveDuration = () => {
      onDurationSettingsChange(tempHours, tempMinutes);
      setIsEditingDuration(false);
  }

  const startEditingDuration = () => {
      if (isEditingDuration) {
          setIsEditingDuration(false);
          return;
      }
      setTempHours(fullDayHours);
      setTempMinutes(fullDayMinutes);
      setIsEditingDuration(true);
  }

  const handleAddBreak = (mode: "add" | "reduce") => {
    let minutes = parseInt(manualBreakMinutes, 10);
    if (!isNaN(minutes) && minutes > 0) {
      if (mode === "reduce") {
          minutes = -minutes;
      }
      onAddManualBreak(minutes);
      setManualBreakMinutes("");
      setIsAddingBreak(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full max-w-full overflow-x-hidden overflow-y-visible flex-col gap-4 font-sans sm:gap-6 2xl:h-full 2xl:min-h-0 2xl:overflow-hidden">
        <Card
          className={`text-center shadow-lg flex-none transition-all duration-300 hover:shadow-xl ${
            isWorkDayOver
              ? "border-orange-500/50 shadow-orange-500/10"
              : "border-primary/20 shadow-primary/5"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-sm text-muted-foreground uppercase tracking-widest font-semibold">
              {isWorkDayOver ? "Overtime Session" : "Time Remaining"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4 pt-2">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div
                className={`w-full min-w-0 break-words font-mono text-[clamp(2.35rem,12vw,3.75rem)] font-extrabold leading-none tracking-tighter tabular-nums ${
                  isWorkDayOver ? "text-orange-600 drop-shadow-sm" : "text-primary drop-shadow-sm"
                }`}
              >
                {isValid ? formatTime(isWorkDayOver ? overtime : timeRemaining) : "00:00:00"}
              </div>

              {isValid && (
                <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-muted/40 px-3 py-1 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 mt-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest">
                    Time Spent
                  </span>
                  <span className="font-mono text-base font-bold text-foreground sm:text-lg">
                    {formatTime(workDoneMs)}
                  </span>
                </div>
              )}

              {isWorkDayOver && (
                <span className="text-[10px] font-semibold text-orange-600/80 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Over Limit
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress
                value={isValid ? progress : 0}
                className={`h-3 w-full rounded-full ${isWorkDayOver ? "bg-orange-100 dark:bg-orange-950/30" : "bg-primary/10"}`}
              />
            </div>

            {isValid && completionTime ? (
              <div className="grid grid-cols-1 gap-3 pt-1 min-[380px]:grid-cols-2">
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 border border-muted/60 transition-colors hover:bg-muted/60">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    {isWorkDayOver ? "Ended At" : "Completes At"}
                  </span>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Icons.Clock className="w-3 h-3 text-primary/70" />
                    <span className="font-mono text-lg font-bold tracking-tight sm:text-xl">
                      {format(completionTime, "hh:mm a")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 border border-muted/60 transition-colors hover:bg-muted/60">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Current Time
                  </span>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-mono text-lg font-bold tracking-tight sm:text-xl">
                      {format(currentTime, "hh:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              !isValid && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-pulse border border-destructive/20">
                  Please configure your work duration in settings to start tracking.
                </div>
              )
            )}
          </CardContent>
        </Card>

        <div className="grid flex-none grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
          <Card className="shadow-lg flex flex-col hover:shadow-xl transition-all duration-300 border-green-500/20 bg-gradient-to-br from-card to-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="font-headline text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Session Info
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={startEditingDuration}
                >
                  <Icons.Settings className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-center items-center py-4 relative">
              {/* View Mode Content - Always rendered to maintain size */}
              <div
                className={`flex flex-col items-center space-y-6 w-full transition-opacity duration-200 ${isEditingDuration ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              >
                <div
                  className="text-center group relative cursor-pointer"
                  onClick={() => !isEditingStartTime && setIsEditingStartTime(true)}
                >
                  <Label className="text-muted-foreground text-xs uppercase tracking-widest font-semibold mb-1 block">
                    Punched In At
                  </Label>
                  {isEditingStartTime ? (
                    <div className="flex flex-col items-stretch gap-2 animate-in fade-in zoom-in-95 min-[380px]:flex-row min-[380px]:items-center">
                      <Input
                        type="time"
                        value={arrivalTime ? format(arrivalTime, "HH:mm") : ""}
                        onChange={handleTimeInputChange}
                        className="w-auto font-mono text-lg"
                        autoFocus
                        onBlur={handleSaveStartTime}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveStartTime()}
                      />
                      <Button onClick={handleSaveStartTime} size="sm" className="h-10">
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 transition-opacity hover:opacity-80">
                      <p className="font-mono text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
                        {arrivalTime
                          ? arrivalTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "--:--"}
                      </p>
                      <Icons.Pencil className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 w-full">
                  <Button
                    variant={activeDurationMode === "full" ? "default" : "secondary"}
                    size="sm"
                    className="flex-1 transition-all active:scale-95 shadow-sm"
                    onClick={() => onSetWorkDuration("full")}
                  >
                    Full Day
                  </Button>
                  <Button
                    variant={activeDurationMode === "half" ? "default" : "secondary"}
                    size="sm"
                    className="flex-1 transition-all active:scale-95 shadow-sm"
                    onClick={() => onSetWorkDuration("half")}
                  >
                    Half Day
                  </Button>
                </div>
              </div>

              {/* Edit Mode Overlay */}
              {isEditingDuration && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-card/95 backdrop-blur-sm rounded-lg animate-in fade-in zoom-in-95">
                  <div className="w-full bg-muted/30 p-4 rounded-lg border border-muted space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Set Full Workday
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={tempHours}
                          onChange={(e) => setTempHours(e.target.value)}
                          className="h-9 font-mono text-center"
                          placeholder="Hrs"
                        />
                        <span className="text-[10px] text-muted-foreground text-center block mt-1">
                          Hours
                        </span>
                      </div>
                      <span className="font-bold">:</span>
                      <div className="flex-1">
                        <Input
                          value={tempMinutes}
                          onChange={(e) => setTempMinutes(e.target.value)}
                          className="h-9 font-mono text-center"
                          placeholder="Min"
                        />
                        <span className="text-[10px] text-muted-foreground text-center block mt-1">
                          Mins
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-1 min-[380px]:flex-row">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8"
                        onClick={() => setIsEditingDuration(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" className="flex-1 h-8" onClick={handleSaveDuration}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className={`shadow-lg flex flex-col hover:shadow-xl transition-all duration-300 ${
              isOnBreak ? "border-amber-500 bg-amber-500/5" : "border-amber-500/20"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="font-headline text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Icons.Coffee
                    className={`h-5 w-5 ${isOnBreak ? "text-amber-600 animate-bounce" : "text-amber-500/70"}`}
                  />
                  Break Tracker
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-foreground [&_svg]:size-5"
                      onClick={() => setIsAddingBreak(!isAddingBreak)}
                    >
                      <Icons.Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manage Break</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-center items-center py-6 relative">
              {/* Main Content - Always Rendered */}
              <div
                className={`flex flex-col items-center w-full transition-opacity duration-300 ${isAddingBreak ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              >
                <div
                  className={`mb-4 w-full min-w-0 break-words font-mono text-[clamp(2.35rem,12vw,3.75rem)] font-bold leading-none tracking-tighter tabular-nums ${
                    isOnBreak ? "text-amber-600 animate-pulse" : "text-foreground"
                  }`}
                >
                  {formatTime(totalBreakMs)}
                </div>
                <Button
                  variant={isOnBreak ? "destructive" : "secondary"}
                  className={`w-full max-w-[200px] font-semibold transition-all shadow-sm ${isOnBreak ? "hover:bg-red-600" : "hover:bg-secondary/80"}`}
                  onClick={onToggleBreak}
                  size="lg"
                >
                  {isOnBreak ? "End Break" : "Start Break"}
                </Button>
              </div>

              {/* Manual Break Overlay - Absolute */}
              {isAddingBreak && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-card/95 backdrop-blur-sm transition-all animate-in fade-in duration-200 rounded-lg">
                  <div className="w-full space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block text-center">
                      Manage Break Time
                    </Label>
                    <div className="flex items-center gap-2 justify-center">
                      <div className="flex-1">
                        <Input
                          value={manualBreakMinutes}
                          onChange={(e) => setManualBreakMinutes(e.target.value)}
                          className="h-9 font-mono text-center"
                          placeholder="Min"
                          type="number"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleAddBreak("add")}
                        />
                        <span className="text-[10px] text-muted-foreground text-center block mt-1">
                          Minutes
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-1 min-[380px]:grid-cols-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8"
                        onClick={() => setIsAddingBreak(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-8"
                        onClick={() => handleAddBreak("reduce")}
                      >
                        Reduce
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => handleAddBreak("add")}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {logs && logs.length > 0 && (
          <Card className="shadow-md w-full flex flex-col border-muted bg-muted/20 overflow-hidden 2xl:min-h-0 2xl:flex-1">
            <CardHeader className="flex-none py-3 px-4 border-b bg-card rounded-t-lg">
              <CardTitle className="font-headline text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Icons.ListTodo className="h-4 w-4" />
                Session Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden bg-card/50 2xl:min-h-0 2xl:flex-1">
              <ScrollArea className="h-72 w-full p-3 sm:p-4 lg:h-80 2xl:h-full">
                <div className="space-y-3 min-w-0 w-full">
                  {logs
                    .slice()
                    .reverse()
                    .map((log, index) => (
                      <div
                        key={index}
                      className="flex flex-col gap-1 text-sm group hover:bg-muted/50 p-2 rounded-md transition-colors">
                        <div className="flex min-w-0 items-center gap-3 w-full">
                          <div
                          className={`flex-shrink-0 p-1.5 rounded-full ${
                              log.type === "punch-in"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                                : log.type === "break-start"
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                                  : log.type === "break-end"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {log.type === "punch-in" && (
                              <Icons.Play className="h-3 w-3 fill-current" />
                            )}
                            {log.type === "break-start" && <Icons.Coffee className="h-3 w-3" />}
                            {log.type === "break-end" && <Icons.CheckCircle className="h-3 w-3" />}
                          </div>
                          <span className="break-all font-medium text-foreground min-w-0">
                            {log.message}
                          </span>
                            </div>
                              <span className="font-mono text-xs text-muted-foreground/70">
                                  {format(new Date(log.timestamp), "hh:mm:ss a")}
                                </span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
