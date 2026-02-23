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
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Working theory</p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold leading-tight">Care before convenience.</h2>
          <div className="mt-4 space-y-4 text-slate-700 leading-relaxed">
            <p>
              We built My Days Off because planning your life should not feel like fighting an algorithm.
              You should not need ten tabs open, three group chats, and luck.
            </p>
            <p>
              Most event platforms are built to capture attention. We are trying to hold attention with care.
              That means clear details, plain language, and less confusion when people are deciding what to do,
              where to go, and whether it is right for them.
            </p>
            <p>
              This is not about endless choice. It is about better choice.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">What we value</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Clarity over hype.</li>
              <li>Accessibility as default, not afterthought.</li>
              <li>Community signal over paid visibility.</li>
              <li>Evidence and source links people can trust.</li>
            </ul>
          </article>
          <article className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-lg">What this means in practice</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Event cards carry real planning details, not fluff.</li>
              <li>Fire votes are positive signal only.</li>
              <li>Submissions are moderated before going live.</li>
              <li>Map-first browsing, so people explore where they actually are.</li>
            </ul>
          </article>
        </section>

        <section className="rounded-3xl bg-[#14213d] text-white p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-semibold">The point</h3>
          <p className="mt-3 text-sm md:text-base text-white/90 leading-relaxed">
            Tools are not neutral when they shape daily life.
            They reflect the intention behind them.
            My Days Off is our attempt to build with intention: to help people spend less time sorting noise,
            and more time in places that make life feel lived.
          </p>
        </section>
      </main>
    </div>
  );
}
