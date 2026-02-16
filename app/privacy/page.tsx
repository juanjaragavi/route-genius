import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad — RouteGenius | Top Networks Inc.",
  description:
    "Política de privacidad de RouteGenius, plataforma de rotación probabilística de tráfico operada por Top Networks Inc.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-200/60">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a RouteGenius
          </Link>
          <div className="flex items-center gap-2 text-brand-blue">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Legal
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Política de Privacidad
          </h1>
          <p className="text-sm text-gray-500">
            Fecha de vigencia: 10 de enero de 2024 — Última actualización: 16 de
            febrero de 2026
          </p>
        </div>

        <div className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline">
          <p>
            Top Networks Inc. (&quot;nosotros&quot;, &quot;nuestro&quot; o
            &quot;nos&quot;) se compromete a proteger su información personal.
            Esta Política de Privacidad describe cómo recopilamos, usamos y
            compartimos sus datos, las medidas de seguridad que empleamos y los
            derechos que usted tiene sobre su información personal. Le
            recomendamos leer esta política detenidamente.
          </p>

          <h2>1. Quiénes Somos</h2>
          <p>
            Top Networks Inc. opera{" "}
            <a href="https://route.topnetworks.co">route.topnetworks.co</a>{" "}
            (&quot;RouteGenius&quot;, la &quot;Plataforma&quot; o el
            &quot;Sitio&quot;), una plataforma SaaS para la distribución
            probabilística de tráfico web en múltiples URLs de destino. Top
            Networks Inc. está constituida en Panamá y cumple con regulaciones
            internacionales y estadounidenses para proteger sus datos.
          </p>
          <p>
            Si tiene alguna pregunta sobre esta Política de Privacidad o cómo
            manejamos sus datos, contáctenos en{" "}
            <a href="mailto:info@topfinanzas.com">info@topfinanzas.com</a>.
          </p>

          <h2>2. Tipos de Información que Recopilamos</h2>
          <p>
            Recopilamos varios tipos de información de los usuarios de nuestro
            Sitio:
          </p>
          <ul>
            <li>
              <strong>Información de Identificación Personal:</strong> Nombre,
              dirección de correo electrónico e información de perfil
              proporcionada a través de autenticación Google OAuth.
            </li>
            <li>
              <strong>Datos de Configuración:</strong> Proyectos, enlaces,
              reglas de rotación y otras configuraciones que usted crea y
              administra en la plataforma.
            </li>
            <li>
              <strong>Información del Dispositivo y Navegación:</strong>{" "}
              Dirección IP, tipo de navegador, sistema operativo, tipo de
              dispositivo y comportamiento de navegación en nuestro Sitio.
            </li>
            <li>
              <strong>Datos de Uso:</strong> Detalles sobre interacciones en
              nuestro Sitio, incluyendo páginas visitadas, enlaces clicados y
              otras métricas de interacción.
            </li>
            <li>
              <strong>Datos de Analíticas de Clics:</strong> Para los enlaces de
              redirección creados en la plataforma, registramos eventos de clic
              anonimizados incluyendo timestamp, URL de destino, user-agent y
              geolocalización aproximada.
            </li>
          </ul>

          <h2>3. Cómo Recopilamos la Información</h2>
          <p>Recopilamos información de las siguientes maneras:</p>
          <ul>
            <li>
              <strong>Directamente de Usted:</strong> Información que
              proporciona al iniciar sesión con Google OAuth, crear proyectos,
              configurar enlaces o contactarnos.
            </li>
            <li>
              <strong>Automáticamente a Través de Tecnología:</strong> Usamos
              cookies, web beacons y otras tecnologías de seguimiento para
              recopilar información automáticamente mientras navega por el
              Sitio.
            </li>
            <li>
              <strong>De Proveedores Terceros:</strong> Podemos recibir
              información de Google (a través de OAuth) para verificar su
              identidad.
            </li>
          </ul>

          <h2>4. Cómo Usamos Su Información</h2>
          <p>
            Sus datos nos permiten mejorar y personalizar su experiencia en
            nuestro Sitio. Específicamente, los usamos para:
          </p>
          <ul>
            <li>
              Proporcionar y mantener los servicios de la plataforma
              RouteGenius.
            </li>
            <li>Autenticar su identidad y gestionar su sesión de usuario.</li>
            <li>
              Ejecutar la rotación probabilística de tráfico según sus
              configuraciones.
            </li>
            <li>
              Generar analíticas y estadísticas sobre el rendimiento de sus
              enlaces.
            </li>
            <li>
              Responder consultas, brindar soporte y comunicarnos con usted.
            </li>
            <li>Realizar análisis y mejorar la funcionalidad del Sitio.</li>
            <li>
              Cumplir con obligaciones legales y proteger la seguridad e
              integridad de nuestro Sitio.
            </li>
          </ul>

          <h2>5. Compartir y Divulgación de Su Información</h2>
          <p>Compartimos su información solo en circunstancias específicas:</p>
          <ul>
            <li>
              <strong>Proveedores de Servicios:</strong> Trabajamos con
              proveedores terceros para servicios como alojamiento (Vercel),
              base de datos (Supabase), almacenamiento (Google Cloud Storage) y
              autenticación (Google OAuth), quienes pueden acceder a su
              información estrictamente para prestar servicios en nuestro
              nombre.
            </li>
            <li>
              <strong>Cumplimiento Legal:</strong> Podemos divulgar su
              información cuando lo requiera la ley, como en respuesta a una
              citación o para proteger nuestros derechos.
            </li>
            <li>
              <strong>Transferencias Comerciales:</strong> En caso de fusión,
              venta u otra transferencia comercial, sus datos pueden ser
              transferidos a la nueva entidad.
            </li>
          </ul>

          <h2>6. Cookies y Tecnologías de Seguimiento</h2>
          <p>
            Usamos cookies y tecnologías similares para mejorar la experiencia
            del usuario, analizar el uso y entregar contenido relevante.
          </p>
          <ul>
            <li>
              <strong>Cookies Esenciales:</strong> Necesarias para la
              funcionalidad del Sitio, incluyendo cookies de sesión de
              autenticación (Better Auth).
            </li>
            <li>
              <strong>Cookies de Rendimiento:</strong> Para seguimiento del
              comportamiento del usuario y analíticas (Google Analytics).
            </li>
            <li>
              <strong>Gestión de Cookies:</strong> Puede controlar las cookies a
              través de la configuración de su navegador. Sin embargo,
              deshabilitar las cookies puede limitar su experiencia en el Sitio.
            </li>
          </ul>

          <h2>7. Medidas de Seguridad de Datos</h2>
          <p>
            Empleamos medidas físicas, técnicas y administrativas para
            salvaguardar su información personal, incluyendo:
          </p>
          <ul>
            <li>
              <strong>Cifrado:</strong> Para asegurar datos durante la
              transferencia y almacenamiento (HTTPS/TLS).
            </li>
            <li>
              <strong>Controles de Acceso:</strong> Arquitectura multi-tenant
              con aislamiento de datos por usuario mediante Row Level Security
              (RLS) en PostgreSQL.
            </li>
            <li>
              <strong>Limitación de Tasa:</strong> Protección contra abuso
              mediante limitación de tasa basada en PostgreSQL.
            </li>
            <li>
              <strong>Auditorías y Monitoreo Regulares:</strong> Para mantener y
              mejorar las prácticas de seguridad.
            </li>
          </ul>
          <p>
            A pesar de estas precauciones, ningún sistema es completamente
            infalible. Usted reconoce que la transmisión de datos a través de
            internet es bajo su propio riesgo.
          </p>

          <h2>8. Retención y Eliminación de Datos Personales</h2>
          <p>
            Retenemos su información personal solo durante el tiempo necesario
            para cumplir los propósitos descritos en esta Política de Privacidad
            o según lo requiera la ley. Cuando los datos ya no son necesarios,
            los eliminamos o anonimizamos de forma segura.
          </p>

          <h2>9. Derechos del Usuario</h2>
          <p>
            Dependiendo de su ubicación, puede tener ciertos derechos respecto a
            su información personal:
          </p>
          <ul>
            <li>
              <strong>Acceso:</strong> Solicitar una copia de sus datos
              personales que mantenemos.
            </li>
            <li>
              <strong>Corrección:</strong> Solicitar la corrección de
              información inexacta o incompleta.
            </li>
            <li>
              <strong>Eliminación:</strong> Solicitar la eliminación de sus
              datos, sujeto a ciertas limitaciones.
            </li>
            <li>
              <strong>Portabilidad:</strong> Solicitar una copia de sus datos en
              un formato electrónico de uso común (la plataforma ofrece
              exportación CSV).
            </li>
            <li>
              <strong>Retirar Consentimiento:</strong> Cuando el procesamiento
              se basa en consentimiento, retirar ese consentimiento en cualquier
              momento.
            </li>
          </ul>
          <p>
            Para ejercer estos derechos, contáctenos en{" "}
            <a href="mailto:info@topfinanzas.com">info@topfinanzas.com</a>.
          </p>

          <h2>10. Transferencias Internacionales de Datos</h2>
          <p>
            Sus datos pueden ser transferidos y procesados en países distintos
            al suyo. Tomamos medidas para asegurar que dichas transferencias
            cumplan con las leyes de privacidad aplicables, incluyendo el uso de
            cláusulas contractuales estándar cuando sea necesario.
          </p>

          <h2>11. Privacidad de Menores</h2>
          <p>
            Nuestro Sitio no está dirigido a menores de 18 años y no recopilamos
            conscientemente información personal de menores. Si nos enteramos de
            que hemos recopilado datos de un menor inadvertidamente, los
            eliminaremos de inmediato.
          </p>

          <h2>12. Enlaces y Servicios de Terceros</h2>
          <p>
            Nuestro Sitio puede contener enlaces a sitios web de terceros,
            incluyendo las URLs de destino configuradas por los usuarios para
            redirección. Esta Política de Privacidad no se aplica a sitios de
            terceros. No somos responsables de sus prácticas de privacidad y le
            recomendamos leer sus políticas de privacidad antes de proporcionar
            datos personales.
          </p>

          <h2>13. Cambios a Esta Política de Privacidad</h2>
          <p>
            Top Networks Inc. se reserva el derecho de modificar esta Política
            de Privacidad en cualquier momento. Cualquier actualización será
            publicada en esta página con una fecha de vigencia actualizada. Al
            continuar usando nuestro Sitio después de que se realicen cambios,
            usted acepta la Política de Privacidad revisada.
          </p>

          <h2>14. Información de Contacto</h2>
          <p>
            Si tiene alguna pregunta, comentario o solicitud respecto a esta
            Política de Privacidad, contáctenos en:
          </p>
          <address className="not-italic text-gray-700 bg-gray-50 rounded-xl p-5 border border-gray-100">
            <strong>Top Networks Inc.</strong>
            <br />
            Correo electrónico:{" "}
            <a href="mailto:info@topfinanzas.com">info@topfinanzas.com</a>
            <br />
            Dirección: Av. Aquilino de la Guardia, Ocean Business Plaza
            Building, Piso 12, Ciudad de Panamá, Panamá
          </address>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>
            © {new Date().getFullYear()} Top Networks Inc. Todos los derechos
            reservados.
          </p>
          <div className="flex gap-6">
            <Link
              href="/terms"
              className="hover:text-brand-blue transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacy"
              className="font-medium text-brand-blue"
              aria-current="page"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
