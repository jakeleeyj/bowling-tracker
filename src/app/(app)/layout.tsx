import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import { ToastProvider } from "@/components/Toast";
import { UnsavedGuardProvider } from "@/components/UnsavedGuard";
import PullToRefresh from "@/components/PullToRefresh";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnsavedGuardProvider>
      <ToastProvider>
        <div className="glow-blue glow-purple min-h-dvh overflow-x-clip lg:flex">
          <SideNav />
          <main className="relative z-10 mx-auto max-w-[480px] px-4 pb-32 pt-6 lg:max-w-4xl lg:mx-auto lg:flex-1 lg:pb-8 lg:pt-8 lg:px-8">
            <PullToRefresh>{children}</PullToRefresh>
          </main>
        </div>
        <BottomNav />
      </ToastProvider>
    </UnsavedGuardProvider>
  );
}
