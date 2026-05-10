export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050508] text-[#f8f8fa] flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center px-6 lg:px-12 border-b border-[#222230] bg-[#0a0a0f]">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-6 h-6 rounded bg-[#6366f1] text-white flex items-center justify-center text-[10px]">◈</div>
          Notemind
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-[#121218] border border-[#222230] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#6366f1] opacity-[0.05] blur-3xl rounded-full pointer-events-none" />
          {children}
        </div>
      </main>
    </div>
  );
}
