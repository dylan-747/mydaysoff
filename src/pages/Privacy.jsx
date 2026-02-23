export default function Privacy() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f9fbff_100%)] text-[#14213d]">
      <header className="border-b bg-white/85 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <a href="#/" className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-slate-100 transition">
            <div className="w-10 h-10 rounded-xl bg-[#ff6a3d]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#ff6a3d]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 21c-4.97-6.58-6-8.5-6-11a6 6 0 1 1 12 0c0 2.5-1.03 4.42-6 11z" />
                <circle cx="12" cy="10" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">My Days Off</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Privacy Policy</p>
            </div>
          </a>
          <nav className="flex items-center gap-2">
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Home</a>
            <a href="#/about" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">About</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4 text-sm leading-relaxed text-slate-700">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Effective date: February 23, 2026</p>
          <h2 className="text-2xl font-bold text-[#14213d]">Privacy Policy</h2>

          <div>
            <h3 className="font-semibold text-base text-[#14213d]">What we collect</h3>
            <p>When you join the weekly local picks list, we collect your email address and optional city/interests.</p>
          </div>

          <div>
            <h3 className="font-semibold text-base text-[#14213d]">How we use it</h3>
            <p>We use this information to send a weekly event roundup and improve local relevance of recommendations.</p>
          </div>

          <div>
            <h3 className="font-semibold text-base text-[#14213d]">What we do not do</h3>
            <p>We do not sell your personal data. We do not use your email for unrelated third-party marketing.</p>
          </div>

          <div>
            <h3 className="font-semibold text-base text-[#14213d]">Retention and unsubscribe</h3>
            <p>You can unsubscribe at any time. We keep subscriber records only as long as needed to operate this service.</p>
          </div>

          <div>
            <h3 className="font-semibold text-base text-[#14213d]">Contact</h3>
            <p>
              For privacy questions, use the submit page contact details for now. A dedicated privacy inbox will be added before full launch.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
