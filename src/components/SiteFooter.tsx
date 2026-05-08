import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-background/60">
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} MecaRate</p>
        <nav className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-foreground">
            Términos
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
