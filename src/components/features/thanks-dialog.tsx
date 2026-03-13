"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icons";

interface ThanksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThanksDialog({ open, onOpenChange }: ThanksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <DialogHeader className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
            <Icons.PartyPopper className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
              Nitish Just Crushed the Bug!🔥
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-foreground/80">
              The CORS error is officially history. Huge shoutout to Nitish T. for the save!
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center space-y-2">
          <p className="text-sm font-bold text-primary uppercase tracking-widest">
            Vibe Check: Passed ✅
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Thanks for your patience while we fixed the vibe. Everything is back to normal.
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto px-8 font-bold uppercase tracking-wider shadow-lg shadow-primary/20"
          >
            LFG! 🚀
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
