import { Link } from "react-router";

type HeaderProps = {
  session?: {
    user?: {
      email?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

export function SiteHeader({ session }: HeaderProps) {
  const userLabel =
    session?.user?.email ?? session?.user?.name ?? "Signed in";

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-sand/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-12">
        <Link to="/" className="flex items-center gap-3 text-slate-900">
          <span className="rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-600">
            Kroeg Atlas
          </span>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Amsterdam
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-700">
          <Link to="/map" className="hover:text-slate-900">
            Map
          </Link>
          <Link to="/list" className="hover:text-slate-900">
            List
          </Link>
          <Link to="/admin" className="hover:text-slate-900">
            Admin
          </Link>
          {session?.user ? (
            <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {userLabel}
            </span>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-900">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600 hover:text-slate-900"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
