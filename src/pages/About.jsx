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
              <p className="text-xs text-slate-500 -mt-0.5">Less noise. More life.</p>
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
          <h2 className="text-2xl font-bold">What this app does</h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            My Days Off is a map-based event browser for UK events. It combines curated source data and moderated
            community submissions so you can see what is happening by date and location.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">🧭 Clarity over clutter</h3>
            <p className="mt-2 text-sm text-slate-700">
              Event cards show core details first: date, time, place, cost, categories, and practical notes.
              This is designed to reduce missing information before people plan.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">♿ Accessibility first</h3>
            <p className="mt-2 text-sm text-slate-700">
              Submitters can include accessibility and audience fields (for example wheelchair access or all-ages).
              These fields appear directly on listings to support better planning.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">🔥 Community signal</h3>
            <p className="mt-2 text-sm text-slate-700">
              Fire votes are upvotes only. They help sort events by current interest without downvote behaviour.
            </p>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">🤝 Trusted sources + local voice</h3>
            <p className="mt-2 text-sm text-slate-700">
              Data comes from trusted feeds where available plus user submissions. User submissions are held for
              moderation before approval.
            </p>
          </article>
        </section>

        <section className="rounded-3xl bg-[#14213d] text-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Current scope</h3>
          <p className="mt-2 text-sm text-white/90">
            Current focus is feed reliability, mobile stability, moderation workflow, and subscription support
            (first month free, then £1/month).
          </p>
        </section>
      </main>
    </div>
  );
}
