import { Link } from "@tanstack/react-router";
import { Wrench, Plus, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Wrench className="h-5 w-5" />
          </span>
          <span>MecaRate</span>
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/">Explorar</Link>
          </Button>
          {user ? (
            <>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/workshops/new">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Agregar taller</span>
                  <span className="sm:hidden">Agregar</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to="/me">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{profile?.display_name ?? "Yo"}</span>
                </Link>
              </Button>
              <Button onClick={signOut} variant="outline" size="sm">
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/login">
                <LogIn className="h-4 w-4" /> Iniciar sesión
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
