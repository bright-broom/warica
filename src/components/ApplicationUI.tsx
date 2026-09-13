'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { TriangleAlert, type LucideIcon } from 'lucide-react';
import { TooltipProvider } from './ui/tooltip';
import { Toaster } from './ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

type Confirmation = { title: string; description: string; action: string; icon?: LucideIcon };
const ConfirmationContext = createContext<((request: Confirmation) => Promise<boolean>) | null>(
  null,
);
export function ApplicationUI({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const confirm = useCallback(
    (next: Confirmation) =>
      new Promise<boolean>((resolve) => {
        if (pending.current) {
          resolve(false);
          return;
        }
        trigger.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        pending.current = resolve;
        setRequest(next);
      }),
    [],
  );
  useEffect(
    () => () => {
      pending.current?.(false);
      pending.current = null;
    },
    [],
  );
  function finish(accepted: boolean) {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(accepted);
  }
  const Icon = request?.icon ?? TriangleAlert;
  return (
    <TooltipProvider delayDuration={350}>
      <ConfirmationContext.Provider value={confirm}>
        {children}
        <Toaster />
        <AlertDialog
          open={!!request}
          onOpenChange={(open) => {
            if (!open) finish(false);
          }}
        >
          <AlertDialogContent
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-panel border-main/15"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (trigger.current?.isConnected) trigger.current.focus();
              else document.querySelector('main')?.focus();
            }}
          >
            <AlertDialogHeader>
              <Icon className="mb-2 size-6" aria-hidden="true" />
              <AlertDialogTitle>{request?.title}</AlertDialogTitle>
              <AlertDialogDescription className="leading-6 wrap-anywhere">
                {request?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => finish(false)}>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={() => finish(true)}>{request?.action}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ConfirmationContext.Provider>
    </TooltipProvider>
  );
}
export function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('ApplicationUI is required');
  return confirm;
}
