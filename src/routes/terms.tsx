import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — MecaRate" },
      { name: "description", content: "Términos y condiciones de uso de MecaRate." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-foreground">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: mayo 2026</p>

      <section className="mt-8 space-y-4 text-foreground">
        <h2 className="font-display text-xl font-semibold">1. Aceptación</h2>
        <p>
          Al usar MecaRate aceptas estos términos. Si no estás de acuerdo, no utilices el servicio.
        </p>

        <h2 className="font-display text-xl font-semibold">2. Uso del servicio</h2>
        <p>
          MecaRate es una plataforma para descubrir y reseñar talleres mecánicos. Te comprometes a
          publicar información veraz, no difamatoria y a no utilizar el servicio para fines ilícitos.
        </p>

        <h2 className="font-display text-xl font-semibold">3. Cuentas de usuario</h2>
        <p>
          Eres responsable de mantener la confidencialidad de tu cuenta y de todas las actividades
          realizadas desde ella.
        </p>

        <h2 className="font-display text-xl font-semibold">4. Contenido publicado</h2>
        <p>
          Las reseñas, comentarios y fotos que publiques son tu responsabilidad. Nos otorgas una
          licencia no exclusiva para mostrarlas dentro de la plataforma. Podemos eliminar contenido
          que viole estos términos o que sea reportado como inapropiado.
        </p>

        <h2 className="font-display text-xl font-semibold">5. Talleres</h2>
        <p>
          La información sobre talleres es aportada por la comunidad y puede contener errores.
          MecaRate no garantiza la calidad de los servicios ofrecidos por los talleres listados.
        </p>

        <h2 className="font-display text-xl font-semibold">6. Limitación de responsabilidad</h2>
        <p>
          MecaRate se ofrece "tal cual". No nos hacemos responsables por daños derivados del uso de
          la información publicada en la plataforma.
        </p>

        <h2 className="font-display text-xl font-semibold">7. Cambios</h2>
        <p>
          Podemos actualizar estos términos en cualquier momento. El uso continuado del servicio
          implica la aceptación de los cambios.
        </p>

        <h2 className="font-display text-xl font-semibold">8. Contacto</h2>
        <p>Para cualquier duda escríbenos a soporte@mecarate.app.</p>
      </section>
    </main>
  );
}
