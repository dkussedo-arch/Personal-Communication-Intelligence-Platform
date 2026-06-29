"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  trackUserRatedOutput,
  type OutputRating as OutputRatingValue,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface OutputRatingProps {
  className?: string;
  label?: string;
}

export function OutputRating({
  className,
  label = "Was this helpful?",
}: OutputRatingProps) {
  const [rating, setRating] = useState<OutputRatingValue | null>(null);

  const handleRate = (value: OutputRatingValue) => {
    if (rating) {
      return;
    }

    setRating(value);
    trackUserRatedOutput(value);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2",
        className
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={rating === "thumbs_up" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          aria-label="Rate output thumbs up"
          disabled={rating !== null}
          onClick={() => handleRate("thumbs_up")}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={rating === "thumbs_down" ? "destructive" : "ghost"}
          size="icon"
          className="h-8 w-8"
          aria-label="Rate output thumbs down"
          disabled={rating !== null}
          onClick={() => handleRate("thumbs_down")}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
