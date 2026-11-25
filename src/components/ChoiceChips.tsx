'use client';
import type { LucideIcon } from 'lucide-react';
import { cx } from './ui';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type Choice = { label: string; icon: LucideIcon };

/**
 * よく使う値をワンタップで入れる候補。選ぶと入力欄の値が置き換わる。
 * 640px 以上はアイコンと文字、スマホは親指の届く右側に収まるようアイコンだけにする
 * （名前は読み上げとツールチップで伝える）。
 */
export function ChoiceChips({
  label,
  value,
  onValueChange,
  choices,
}: {
  /** 候補の並びの読み上げ名 */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  choices: readonly Choice[];
}) {
  return (
    <ToggleGroup
      type="single"
      spacing={1}
      // スマホは右半分（約 9.5rem）に収める：3つまでは1行、4つは2つずつ2行
      className={cx(
        'flex flex-wrap justify-end gap-2 sm:max-w-none sm:justify-start',
        choices.length <= 3 ? 'max-w-[9.5rem]' : 'max-w-[6.25rem]',
      )}
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
              className="size-11 min-w-11 rounded-full p-0 text-sm font-medium sm:h-11 sm:w-auto sm:px-4"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{label}</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent sideOffset={6} className="sm:hidden">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
