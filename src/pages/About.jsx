export default function About() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f9fbff_100%)] text-[#14213d]">
      <header className="border-b bg-white/85 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="#/" className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-slate-100 transition">
            <div className="w-10 h-10 rounded-xl bg-[#ff6a3d]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#ff6a3d]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 21c-4.97-6.58-6-8.5-6-11a6 6 0 1 1 12 0c0 2.5-1.03 4.42-6 11z" />
                <circle cx="12" cy="10" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">My Days Off</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Clearer event planning, less stress.</p>
            </div>
          </a>
          <nav className="flex items-center gap-2">
            <a href="#/" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Home</a>
            <a href="#/submit" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">Submit</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold">A calmer way to choose your day</h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            My Days Off exists to reduce event-planning confusion. We surface what matters first: cost, vibe,
            accessibility, effort level, and practical planning notes. Less noise. Better decisions.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">🧭 Clarity over clutter</h3>
            <p className="mt-2 text-sm text-slate-700">
              Every listing aims to answer the same questions quickly: who it is for, how active it is, whether it is
              indoors/outdoors, and what to bring.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">♿ Accessibility first</h3>
            <p className="mt-2 text-sm text-slate-700">
              We encourage organisers to include wheelchair access, hearing support, quiet-space notes, and practical
              facilities so people can plan with confidence.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">🔥 Community signal</h3>
            <p className="mt-2 text-sm text-slate-700">
              Fire votes show what feels most relevant in each area right now. No downvotes, no dogpiles, just useful
              positive signal.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">🤝 Trusted sources + local voice</h3>
            <p className="mt-2 text-sm text-slate-700">
              We combine trusted public sources with community submissions. Submissions are moderated before they go
              live.
            </p>
          </article>
        </section>

        <section className="rounded-3xl bg-[#14213d] text-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">What we are building next</h3>
          <p className="mt-2 text-sm text-white/90">
            Better live integrations, richer planning fields, and supporter features that keep the product ad-free while
            staying genuinely useful.
          </p>
        </section>
      </main>
    </div>
  );
}
