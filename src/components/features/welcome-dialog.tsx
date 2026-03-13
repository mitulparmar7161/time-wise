
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeDialog({ open, onOpenChange }: WelcomeDialogProps) {

  const handleGetStarted = () => {
      onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">Welcome to TimeWise!</DialogTitle>
          <DialogDescription>
            Your simple, private, and client-side time tracking companion.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            TimeWise helps you track your work hours, breaks, and overtime without any server-side data storage. Everything stays in your browser.
          </p>
          <p className="text-sm text-muted-foreground">
              To get started, simply punch in! You can adjust your work duration target in the <strong>Session Info</strong> card.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleGetStarted} className="w-full">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    