export default function BuildStamp() {
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
  const buildDate = typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : "";

  return (
    <div
      className="pointer-events-none fixed bottom-2 right-2 z-[2000] rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-1 text-[10px] leading-none text-slate-500 shadow-sm backdrop-blur"
      aria-label="Site version"
      title={`Version ${version}${buildDate ? ` · ${buildDate}` : ""}`}
      style={{ paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      v{version}
      {buildDate ? ` · ${buildDate}` : ""}
    </div>
  );
}
