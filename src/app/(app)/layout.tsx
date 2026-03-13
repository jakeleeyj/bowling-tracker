import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="glow-blue glow-purple min-h-dvh overflow-hidden">
      <main className="relative z-10 mx-auto max-w-[480px] px-4 pb-32 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
