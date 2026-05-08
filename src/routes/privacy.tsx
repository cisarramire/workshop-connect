import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — MecaRate" },
      { name: "description", content: "Cómo MecaRate recopila y usa tus datos personales." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-foreground">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: mayo 2026</p>

      <section className="mt-8 space-y-4 text-foreground">
        <h2 className="font-display text-xl font-semibold">1. Datos que recopilamos</h2>
        <ul className="ml-6 list-disc space-y-1">
          <li>Datos de cuenta: correo, nombre y avatar.</li>
          <li>Contenido que publicas: reseñas, comentarios, fotos y talleres.</li>
          <li>Ubicación aproximada (solo si la autorizas) para mostrar talleres cercanos.</li>
          <li>Datos técnicos básicos como IP y tipo de dispositivo.</li>
        </ul>

        <h2 className="font-display text-xl font-semibold">2. Cómo los usamos</h2>
        <p>
          Usamos tus datos para operar la plataforma, mostrar contenido relevante, prevenir abuso y
          mejorar el servicio. No vendemos tu información personal.
        </p>

        <h2 className="font-display text-xl font-semibold">3. Ubicación</h2>
        <p>
          La ubicación solo se solicita cuando pulsas el botón correspondiente. No se almacena en
          nuestros servidores; se usa únicamente en tu navegador para centrar el mapa.
        </p>

        <h2 className="font-display text-xl font-semibold">4. Contenido público</h2>
        <p>
          Las reseñas, fotos y nombre de usuario son públicos por naturaleza del servicio. No
          publiques información que no quieras que sea visible.
        </p>

        <h2 className="font-display text-xl font-semibold">5. Tus derechos</h2>
        <p>
          Puedes acceder, corregir o eliminar tus datos escribiéndonos a privacidad@mecarate.app.
          También puedes eliminar tus reseñas y talleres directamente desde la app.
        </p>

        <h2 className="font-display text-xl font-semibold">6. Proveedores</h2>
        <p>
          Usamos servicios de terceros para autenticación, base de datos y mapas (OpenStreetMap).
          Estos proveedores cumplen estándares de seguridad reconocidos.
        </p>

        <h2 className="font-display text-xl font-semibold">7. Contacto</h2>
        <p>Para cualquier consulta sobre privacidad: privacidad@mecarate.app.</p>
      </section>
    </main>
  );
}
