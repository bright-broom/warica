'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { APPEARANCE_KEY, type Appearance } from '@/design/appearance';

const AppearanceContext = createContext<{ appearance: Appearance; toggle: () => void } | null>(
  null,
);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>('pop');
  useEffect(() => {
    setAppearance(document.documentElement.dataset.appearance === 'classic' ? 'classic' : 'pop');
  }, []);
  function toggle() {
    const next = appearance === 'pop' ? 'classic' : 'pop';
    document.documentElement.dataset.appearance = next;
    setAppearance(next);
    try {
      window.localStorage.setItem(APPEARANCE_KEY, next);
    } catch {
      toast('この画面で切り替えました。デザイン設定は保存できませんでした。');
    }
  }
  return (
    <AppearanceContext.Provider value={{ appearance, toggle }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('AppearanceProvider is required');
  return value;
}
