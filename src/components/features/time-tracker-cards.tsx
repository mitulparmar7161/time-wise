"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  };

  const startEditingDuration = () => {
    if (isEditingDuration) {
      setIsEditingDuration(false);
      return;
    }
    setTempHours(fullDayHours);
    setTempMinutes(fullDayMinutes);
    setIsEditingDuration(true);
  };

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
      <div className="flex flex-col gap-6 h-full font-sans overflow-hidden">
        {/* Core Progress Hub with Segmented Horizontal Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex-none p-6 glass-panel rounded-3xl"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Icons.Timer className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm uppercase font-bold tracking-widest text-white">
                {isWorkDayOver ? "Overtime Session Active" : "Tracking Session Active"}
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)] text-glow-emerald">
              {Math.round(progress)}% Goal
            </span>
          </div>

          {/* Progress bar container and text stats */}
          <div className="flex flex-col sm:flex-row items-baseline sm:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase font-bold text-white/50 tracking-widest">
                {isWorkDayOver ? "Overtime Accrued" : "Time Left"}
              </span>
              <span className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-md">
                {isValid ? formatTime(isWorkDayOver ? overtime : timeRemaining) : "00:00:00"}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-sm text-white/70 font-bold bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center justify-between gap-4">
                <span>Work Time:</span>
                <span className="text-white">
                  {isValid ? formatTime(workDoneMs).slice(0, 5) : "00:00"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Goal Shift:</span>
                <span className="text-white">
                  {fullDayHours}h {Number(fullDayMinutes) > 0 && `${fullDayMinutes}m`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-amber-400">Finishes At:</span>
                <span className="text-amber-400 font-black">
                  {isValid && completionTime ? format(completionTime, "hh:mm a") : "--:--"}
                </span>
              </div>
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full h-3 bg-black/40 rounded-full mt-8 overflow-hidden shadow-inner border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] relative"
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Console Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-none">
          {/* Card 1: Session Config */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl glass-panel glass-panel-hover p-5 flex flex-col justify-between relative overflow-hidden h-[180px]"
          >
            <div className="absolute top-4 right-4 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={startEditingDuration}
              >
                <Icons.Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                  <Icons.Settings className="h-5 w-5 text-white/70" />
                </div>
                <span className="text-xs uppercase font-bold tracking-widest text-white/70">
                  Shift Parameters
                </span>
              </div>

              {/* View Mode Content */}
              <div
                className={`flex flex-col justify-center items-center flex-grow transition-opacity duration-300 ${isEditingDuration ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              >
                <div
                  className="text-center group relative cursor-pointer"
                  onClick={() => !isEditingStartTime && setIsEditingStartTime(true)}
                >
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block">
                    Punch In Time
                  </Label>
                  {isEditingStartTime ? (
                    <div className="flex items-center gap-2 justify-center animate-in fade-in zoom-in-95 mt-1">
                      <Input
                        type="time"
                        value={arrivalTime ? format(arrivalTime, "HH:mm") : ""}
                        onChange={handleTimeInputChange}
                        className="w-24 glass-input font-mono text-center text-sm h-9"
                        autoFocus
                        onBlur={handleSaveStartTime}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveStartTime()}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80 mt-1">
                      <p className="text-3xl font-bold mono-display text-white drop-shadow-sm">
                        {arrivalTime ? format(arrivalTime, "hh:mm a") : "--:--"}
                      </p>
                      <Icons.Pencil className="h-4 w-4 text-white/40" />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 w-full mt-4 px-4">
                  <Button
                    size="sm"
                    className={`flex-grow h-10 rounded-xl font-bold text-xs transition-all ${activeDurationMode === "full" ? "glass-button-primary" : "glass-button-secondary"}`}
                    onClick={() => onSetWorkDuration("full")}
                  >
                    Full Day
                  </Button>
                  <Button
                    size="sm"
                    className={`flex-grow h-10 rounded-xl font-bold text-xs transition-all ${activeDurationMode === "half" ? "glass-button-primary" : "glass-button-secondary"}`}
                    onClick={() => onSetWorkDuration("half")}
                  >
                    Half Day
                  </Button>
                </div>
              </div>
            </div>

            {/* Edit Mode Overlay */}
            {isEditingDuration && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl animate-in fade-in zoom-in-95">
                <div className="w-full space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white/80 text-center block">
                    Set Shift Goal
                  </Label>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                      <Input
                        value={tempHours}
                        onChange={(e) => setTempHours(e.target.value)}
                        className="h-10 w-16 glass-input font-mono text-center text-sm"
                        placeholder="Hrs"
                      />
                      <span className="text-[10px] text-white/50 font-bold uppercase mt-1">
                        Hours
                      </span>
                    </div>
                    <span className="font-bold text-white/40 text-xl pb-4">:</span>
                    <div className="flex flex-col items-center">
                      <Input
                        value={tempMinutes}
                        onChange={(e) => setTempMinutes(e.target.value)}
                        className="h-10 w-16 glass-input font-mono text-center text-sm"
                        placeholder="Min"
                      />
                      <span className="text-[10px] text-white/50 font-bold uppercase mt-1">
                        Mins
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-24 text-xs rounded-xl glass-button-secondary"
                      onClick={() => setIsEditingDuration(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 w-24 text-xs rounded-xl glass-button-primary"
                      onClick={handleSaveDuration}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Card 2: Break Console */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`rounded-2xl glass-panel glass-panel-hover p-5 flex flex-col justify-between relative overflow-hidden h-[180px] ${isOnBreak ? "border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]" : ""}`}
          >
            <div className="absolute top-4 right-4 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={() => setIsAddingBreak(!isAddingBreak)}
              >
                <Icons.Pencil className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl border ${isOnBreak ? "bg-amber-500/20 border-amber-500/30" : "bg-white/10 border-white/20"}`}
                >
                  <Icons.Coffee
                    className={`h-5 w-5 ${isOnBreak ? "text-amber-400 animate-pulse" : "text-white/70"}`}
                  />
                </div>
                <span className="text-xs uppercase tracking-widest font-bold text-white/70">
                  Break Console
                </span>
              </div>

              {/* View Mode Content */}
              <div
                className={`flex flex-col justify-center items-center flex-grow transition-opacity duration-300 ${isAddingBreak ? "opacity-0 pointer-events-none" : "opacity-100"}`}
              >
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1 block">
                    Total Break Time
                  </span>
                  <p
                    className={`text-4xl font-black mono-display mt-1 drop-shadow-md ${isOnBreak ? "text-amber-400" : "text-white"}`}
                  >
                    {formatTime(totalBreakMs).slice(0, 5)}
                  </p>
                </div>

                <div className="w-full mt-4 flex justify-center px-4">
                  <Button
                    className={`w-full h-10 rounded-xl font-bold text-xs transition-all ${isOnBreak ? "bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "glass-button-secondary"}`}
                    onClick={onToggleBreak}
                    size="sm"
                  >
                    {isOnBreak ? "End Break" : "Start Break"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Manual Break Overlay */}
            {isAddingBreak && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl animate-in fade-in zoom-in-95">
                <div className="w-full space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-white/80 text-center block">
                    Adjust Break Time
                  </Label>
                  <div className="flex items-center justify-center">
                    <Input
                      value={manualBreakMinutes}
                      onChange={(e) => setManualBreakMinutes(e.target.value)}
                      className="h-10 w-24 glass-input font-mono text-center text-sm"
                      placeholder="Min"
                      type="number"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleAddBreak("add")}
                    />
                  </div>
                  <div className="flex justify-center gap-2 mt-2 px-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs rounded-xl glass-button-secondary"
                      onClick={() => setIsAddingBreak(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-xs rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white backdrop-blur-md"
                      onClick={() => handleAddBreak("reduce")}
                    >
                      Reduce
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-xs rounded-xl glass-button-primary"
                      onClick={() => handleAddBreak("add")}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Card 3: Session Logs Timeline */}
        {logs && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex-grow min-h-0 flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <div className="flex-none py-5 px-6 border-b border-white/10 bg-black/20 backdrop-blur-md relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white">
                  <Icons.ListTodo className="h-5 w-5 text-emerald-400" />
                  Timeline Records
                </h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {logs.length} Actions
                </span>
              </div>
            </div>

            <div className="flex-grow min-h-0 p-0 overflow-hidden relative z-10 bg-black/10">
              <ScrollArea className="h-full w-full p-0 custom-scrollbar">
                <div className="p-4 relative">
                  {/* Vertical connector line */}
                  <div className="absolute top-8 bottom-8 left-[39px] w-0.5 bg-white/10 pointer-events-none rounded-full" />

                  {logs
                    .slice()
                    .reverse()
                    .map((log, index) => {
                      const isPunchIn = log.type === "punch-in";
                      const isBreak = log.type.includes("break");

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="flex items-center justify-between py-4 px-2 hover:bg-white/5 transition-all rounded-xl mb-1 group"
                        >
                          <div className="flex items-center gap-4 min-w-0 z-10">
                            <div
                              className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center border shadow-lg transition-transform group-hover:scale-110 ${
                                isPunchIn
                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                  : isBreak
                                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                                    : "bg-sky-500/20 border-sky-500/30 text-sky-400"
                              }`}
                            >
                              {isPunchIn ? (
                                <Icons.LogIn className="h-4 w-4" />
                              ) : isBreak ? (
                                <Icons.Coffee className="h-4 w-4" />
                              ) : (
                                <Icons.Settings className="h-4 w-4" />
                              )}
                            </div>
                            <span
                              className={`font-bold text-sm tracking-wide ${
                                isPunchIn
                                  ? "text-emerald-300"
                                  : isBreak
                                    ? "text-amber-300"
                                    : "text-sky-300"
                              }`}
                            >
                              {log.message}
                            </span>
                          </div>
                          <span className="text-lg font-black tracking-tight text-white block drop-shadow-sm">
                            {format(new Date(log.timestamp), "hh:mm:ss")}
                            <span className="text-xs text-white/50 ml-1 font-bold uppercase tracking-wider">
                              {format(new Date(log.timestamp), "a")}
                            </span>
                          </span>
                        </motion.div>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}
