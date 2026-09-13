'use client';
import type { LucideIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type Choice = { label: string; icon: LucideIcon };
export function IconChoices({
  label,
  value,
  onValueChange,
  choices,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  choices: readonly Choice[];
}) {
  return (
    <ToggleGroup
      type="single"
      spacing={1}
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      {choices.map(({ label, icon: Icon }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={label}
              aria-label={label}
              className="h-12 w-12 min-w-12 rounded-control p-0 aria-checked:bg-accent/25 aria-checked:text-main aria-pressed:bg-accent/25 aria-pressed:text-main"
            >
              <Icon className="size-5" aria-hidden="true" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
