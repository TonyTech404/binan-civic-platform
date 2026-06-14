import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

function Seal({ size, dim = false }: { size: number; dim?: boolean }) {
  return (
    <img
      src="/binan-seal.png"
      alt="Biñan City Seal"
      width={size}
      height={size}
      className={cn("flex-shrink-0 rounded-full object-cover", dim && "opacity-60")}
      style={{ boxShadow: "0 0 0 1.5px #D4A800" }}
    />
  );
}

export function PublicLayout() {
  const location = useLocation();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 text-[13px] font-medium transition-all duration-150 sm:px-4",
      isActive
        ? "border-b-2 border-brand-600 font-bold text-brand-600"
        : "text-slate-500 hover:text-slate-900 hover:-translate-y-px",
    );

  return (
    <div className="flex min-h-full flex-col">
      {/* Red accent bar */}
      <div className="h-1 bg-brand-600" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-4 sm:h-[68px] sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5">
            <Seal size={36} />
            <div>
              <div className="font-serif text-[14px] font-bold leading-tight tracking-[-0.01em] text-slate-900 sm:text-[16px]">
                BANTAY BIÑAN
              </div>
              <div className="hidden text-[10px] font-medium uppercase tracking-[0.08em] leading-tight text-slate-400 sm:block">
                City Government of Biñan
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-0">
            <NavLink to="/report" className={navClass}>Report</NavLink>
            <NavLink to="/track"  className={navClass}>Track</NavLink>
            <NavLink to="/emergency" className={navClass}>
              <span className="hidden sm:inline">Hotlines</span>
              <span className="sm:hidden">SOS</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div key={location.pathname} className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-brand-600 bg-forest-900">
        <div className="mx-auto max-w-[1200px] px-4 py-7 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Seal size={32} dim />
              <div>
                <p className="text-[12px] font-semibold text-white sm:text-[13px]">
                  © 2026 City Government of Biñan, Laguna
                </p>
                <p className="text-[11px] text-white/50">
                  BANTAY BIÑAN is an official service.
                </p>
              </div>
            </div>
            <Link
              to="/admin"
              className="text-[12px] text-white/50 transition-colors hover:text-white"
            >
              Government staff portal →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
