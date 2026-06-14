import { Link, NavLink, Outlet } from "react-router-dom";
import { ShieldCheck, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        Bantay <span className="text-brand-600">Biñan</span>
      </span>
    </Link>
  );
}

export function PublicLayout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
    );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Brand />
          <nav className="flex items-center gap-1">
            <NavLink to="/report" className={navClass}>
              Report
            </NavLink>
            <NavLink to="/track" className={navClass}>
              Track
            </NavLink>
            <NavLink to="/emergency" className={navClass}>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" /> Hotlines
              </span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} City Government of Biñan · Bantay Biñan</p>
          <Link to="/admin" className="hover:text-slate-700">
            Government staff →
          </Link>
        </div>
      </footer>
    </div>
  );
}
