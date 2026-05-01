import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/workshops/new")({
  head: () => ({
    meta: [
      { title: "Agregar un taller — MecaRate" },
      { name: "description", content: "Agrega un taller mecánico al directorio de MecaRate." },
    ],
  }),
  component: NewWorkshopPage,
});

function NewWorkshopPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-bold text-foreground">Agregar un taller</h1>
        <p className="max-w-2xl text-muted-foreground">
          Esta pantalla se está regenerando para corregir un error del preview. El resto del sitio ya debe
          cargar con normalidad.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            En el siguiente paso dejaré de nuevo el formulario completo con dirección, fotos y datos del dueño.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}