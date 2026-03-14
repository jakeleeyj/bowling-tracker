import BottomNav from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";
import { UnsavedGuardProvider } from "@/components/UnsavedGuard";
import PullToRefresh from "@/components/PullToRefresh";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnsavedGuardProvider>
      <ToastProvider>
        <div className="glow-blue glow-purple min-h-dvh overflow-x-hidden">
          <main className="relative z-10 mx-auto max-w-[480px] px-4 pb-32 pt-6">
            <PullToRefresh>{children}</PullToRefresh>
          </main>
        </div>
        <BottomNav />
      </ToastProvider>
    </UnsavedGuardProvider>
  );
}
