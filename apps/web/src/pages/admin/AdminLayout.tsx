import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button, Spinner } from "@/components/ui";

function Seal({ size }: { size: number }) {
  return (
    <img src="/binan-seal.png" alt="Biñan City Seal" width={size} height={size}
      className="flex-shrink-0 rounded-full object-cover"
      style={{ boxShadow: "0 0 0 1.5px #D4A800" }} />
  );
}

export function AdminLayout() {
  const { session, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!session) return <Navigate to="/admin/login" replace />;

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-full">
      <div className="h-1 bg-brand-600" />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[56px] max-w-[1440px] items-center justify-between px-4 sm:h-[60px] sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link to="/admin" className="flex items-center gap-2.5">
              <Seal size={32} />
              <span className="font-serif text-[14px] font-bold tracking-[-0.01em] text-slate-900 sm:text-[15px]">
                BANTAY BIÑAN
              </span>
            </Link>
            <div className="mx-1 h-4 w-px bg-slate-200" />
            <span className="rounded-sm bg-brand-100 px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.1em] text-brand-600 sm:px-2.5 sm:text-[10px]">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {user?.email && (
              <span className="hidden font-mono text-[11px] text-slate-400 md:inline sm:text-[12px]">
                {user.email}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 px-3 text-[12px] sm:h-9 sm:px-4">
              <LogOut className="h-3 w-3 text-slate-400 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div key={location.pathname} className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
