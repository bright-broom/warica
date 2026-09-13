'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export function Feedback({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-main/10 bg-main px-5 py-3 text-sm text-sub shadow-lg shadow-main/10 motion-safe:animate-[feedback-in_180ms_ease-out]"
    >
      <Check size={18} className="text-accent" aria-hidden="true" />
      <span className="min-w-0 wrap-anywhere">{message}</span>
    </div>
  );
}
