"use client";

export function PortfolioPdfPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="screen-only fixed right-6 top-6 z-[60] rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(17,24,39,0.18)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      Print / Save PDF
    </button>
  );
}
