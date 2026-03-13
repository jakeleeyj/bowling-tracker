import BottomNav from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="glow-blue glow-purple min-h-dvh overflow-hidden">
        <main className="relative z-10 mx-auto max-w-[480px] px-4 pb-32 pt-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
