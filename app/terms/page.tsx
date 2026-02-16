import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones — RouteGenius | Top Networks Inc.",
  description:
    "Términos y condiciones de uso de RouteGenius, plataforma de rotación probabilística de tráfico operada por Top Networks Inc.",
};

export default function TermsPage() {
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
            Términos y Condiciones de Uso
          </h1>
          <p className="text-sm text-gray-500">
            Fecha de vigencia: 10 de enero de 2024 — Última actualización: 16 de
            febrero de 2026
          </p>
        </div>

        <div className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-brand-blue prose-a:no-underline hover:prose-a:underline">
          <p className="text-gray-700 font-medium bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            LEA ESTOS TÉRMINOS Y CONDICIONES DE USO DETENIDAMENTE, YA QUE SU USO
            DEL SITIO INDICA SU ACUERDO CON ESTOS TÉRMINOS.
          </p>

          <p>
            La plataforma{" "}
            <a href="https://route.topnetworks.co">route.topnetworks.co</a> (la
            &quot;Plataforma&quot; o el &quot;Sitio&quot;) es propiedad de y
            está operada por Top Networks Inc. (&quot;Top Networks&quot;,
            &quot;nosotros&quot;, &quot;nuestro&quot; o &quot;nos&quot;), una
            empresa constituida bajo las leyes de la República de Panamá.
            Nuestro Sitio proporciona una plataforma SaaS para la distribución
            probabilística de tráfico web, permitiendo a los usuarios configurar
            la rotación ponderada de tráfico entre múltiples URLs de destino,
            organizada en proyectos y enlaces con autenticación completa,
            analíticas en tiempo real y seguridad de nivel empresarial.
          </p>
          <p>
            Estos Términos y Condiciones de Uso (los &quot;Términos&quot;) están
            disponibles para los usuarios en todo momento y se aplican junto con
            nuestra <Link href="/privacy">Política de Privacidad</Link>. Al usar
            o acceder al Sitio, usted confirma que ha leído, comprendido y
            acepta estos Términos. Si no está de acuerdo con todos los Términos,
            por favor no utilice el Sitio.
          </p>

          <h2>1. Acerca de RouteGenius</h2>
          <p>
            RouteGenius es una plataforma creada para permitir a los usuarios
            distribuir tráfico web entre múltiples URLs de destino mediante
            rotación probabilística ponderada. La Plataforma ofrece gestión de
            proyectos, configuración de enlaces, reglas de rotación, analíticas
            de clics en tiempo real y funcionalidades de respaldo de datos.
          </p>
          <p>
            Siempre que usemos &quot;Top Networks&quot;, &quot;nosotros&quot; o
            &quot;nuestro&quot;, nos referimos a Top Networks Inc.; de manera
            similar, cuando usamos &quot;usted&quot; o &quot;usuario&quot;, nos
            referimos a las personas que aceptan estos Términos y acceden al
            Sitio.
          </p>

          <h2>2. Responsabilidades del Usuario para el Acceso</h2>
          <p>
            El usuario es responsable de obtener el equipo necesario
            (computadora, teléfono inteligente, tableta) y el software
            (navegador) requerido para acceder al Sitio, así como de mantener un
            entorno de navegación seguro. Esto incluye actualizar antivirus,
            firewall y otras herramientas de ciberseguridad para mitigar riesgos
            potenciales.
          </p>

          <h2>3. Acceso y Uso del Sitio</h2>
          <p>
            El acceso a RouteGenius requiere autenticación a través de Google
            OAuth. Al registrarse, usted confirma que:
          </p>
          <ul>
            <li>Tiene al menos 18 años de edad.</li>
            <li>
              La información proporcionada es precisa, completa y está
              actualizada.
            </li>
            <li>
              Mantendrá la precisión de su información y la actualizará
              oportunamente según sea necesario.
            </li>
            <li>
              Es el titular autorizado de la cuenta de Google utilizada para la
              autenticación.
            </li>
          </ul>
          <p>
            Si proporciona información falsa, incompleta o desactualizada, Top
            Networks Inc. se reserva el derecho de suspender o terminar su
            acceso al Sitio sin previo aviso.
          </p>

          <h2>4. Recopilación y Uso de Datos</h2>
          <p>
            Al aceptar estos Términos, usted consiente la recopilación y
            procesamiento de datos, incluyendo pero no limitado a:
          </p>
          <ul>
            <li>
              <strong>Datos de Identificación Personal:</strong> Nombre, correo
              electrónico y foto de perfil proporcionados a través de Google
              OAuth.
            </li>
            <li>
              <strong>Datos de Configuración:</strong> Proyectos, enlaces,
              reglas de rotación, etiquetas y metadatos que usted crea dentro de
              la plataforma.
            </li>
            <li>
              <strong>Datos de Analíticas:</strong> Eventos de clic anonimizados
              generados por los visitantes de sus enlaces de redirección.
            </li>
          </ul>
          <p>
            Para detalles sobre nuestras prácticas de manejo de datos, consulte
            nuestra <Link href="/privacy">Política de Privacidad</Link>.
          </p>

          <h2>5. Precisión de la Información</h2>
          <p>
            Top Networks Inc. se esfuerza por proporcionar información precisa y
            actualizada en el Sitio. Sin embargo, no garantizamos que el
            contenido sea libre de errores o esté siempre disponible. El acceso
            puede verse afectado por factores fuera de nuestro control, como
            problemas del proveedor de internet o mantenimiento técnico.
          </p>

          <h2>6. Enlaces a Sitios Web de Terceros</h2>
          <p>
            La naturaleza de RouteGenius implica la redirección de tráfico a
            URLs de destino configuradas por los usuarios. Top Networks Inc. no
            es responsable del contenido, términos de uso o políticas de
            privacidad de estos sitios web de terceros, y los usuarios asumen
            cualquier riesgo asociado con su uso.
          </p>

          <h2>7. Conducta Prohibida</h2>
          <p>Los usuarios acuerdan no:</p>
          <ul>
            <li>Violar leyes o regulaciones aplicables.</li>
            <li>Suplantar la identidad de otra persona o entidad.</li>
            <li>
              Usar la plataforma para distribuir tráfico a sitios web que
              contengan contenido ilegal, difamatorio, malware o que sea dañino
              para otros.
            </li>
            <li>
              Intentar realizar ingeniería inversa, descompilar o manipular el
              Sitio o sus componentes, incluyendo el algoritmo de rotación.
            </li>
            <li>
              Abusar del sistema de redirección para generar tráfico falso o
              fraudulento.
            </li>
            <li>
              Intentar acceder a datos de otros usuarios o eludir los controles
              de seguridad multi-tenant.
            </li>
            <li>
              Exceder los límites de tasa establecidos o intentar realizar
              ataques de denegación de servicio.
            </li>
          </ul>
          <p>
            La violación de estos Términos puede resultar en la suspensión o
            terminación del acceso al Sitio.
          </p>

          <h2>8. Propiedad Intelectual</h2>
          <p>
            Todo el contenido en{" "}
            <a href="https://route.topnetworks.co">route.topnetworks.co</a>{" "}
            (incluyendo texto, imágenes, gráficos, logotipos, software y el
            algoritmo de rotación probabilística) es propiedad de o está
            licenciado a Top Networks Inc. y está protegido por leyes de
            propiedad intelectual. Los usuarios tienen prohibido copiar,
            modificar o usar comercialmente cualquier contenido sin autorización
            previa de Top Networks Inc.
          </p>

          <h2>9. Propiedad de los Datos del Usuario</h2>
          <p>
            Usted conserva la propiedad de todos los datos de configuración
            (proyectos, enlaces, reglas de rotación) que crea dentro de la
            plataforma. Top Networks Inc. proporciona funcionalidades de
            exportación (CSV) para facilitar la portabilidad de datos. No
            reclamamos propiedad sobre el contenido que usted crea o las URLs de
            destino que configura.
          </p>

          <h2>10. Renuncia de Garantías</h2>
          <p className="uppercase text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl p-4">
            LOS SERVICIOS E INFORMACIÓN PROPORCIONADOS EN ROUTE.TOPNETWORKS.CO
            SE PROPORCIONAN &quot;TAL CUAL&quot; Y &quot;SEGÚN
            DISPONIBILIDAD&quot;, SIN GARANTÍA O CONDICIÓN DE NINGÚN TIPO, YA
            SEA EXPRESA O IMPLÍCITA. TOP NETWORKS INC. SE ESFUERZA POR MANTENER
            SERVICIOS PRECISOS Y FUNCIONALES, PERO NO PODEMOS GARANTIZAR LA
            OPERACIÓN CONTINUA O ACCESIBILIDAD DEL SITIO, NI PODEMOS GARANTIZAR
            LA AUSENCIA DE ERRORES O INEXACTITUDES.
          </p>
          <h3>A) Sin Garantías</h3>
          <p className="text-xs uppercase font-medium text-gray-500">
            Top Networks Inc. renuncia expresamente a cualquier garantía
            implícita de comerciabilidad, idoneidad para un propósito
            particular, disfrute pacífico o no infracción, así como cualquier
            garantía que surja del uso o práctica comercial. Los usuarios asumen
            todo riesgo por cualquier daño que pueda resultar de su uso o acceso
            al Sitio. Top Networks Inc. no es responsable de la pérdida, daño o
            indisponibilidad de la información que los usuarios envíen, y los
            usuarios son responsables de mantener copias de seguridad de dicha
            información.
          </p>
          <h3>B) Sin Garantía de Precisión</h3>
          <p className="text-xs uppercase font-medium text-gray-500">
            Top Networks Inc. no garantiza la precisión de, y renuncia a toda
            responsabilidad por, errores o inexactitudes en cualquier
            información, contenido, estadísticas o materiales disponibles a
            través del Sitio, incluyendo las analíticas de clics y porcentajes
            de distribución de tráfico.
          </p>

          <h2>11. Limitación de Responsabilidad</h2>
          <p className="text-xs uppercase font-medium text-gray-500">
            En la medida máxima permitida por la ley, Top Networks Inc. y sus
            directores, empleados y proveedores de servicios no serán
            responsables de ningún daño indirecto, incidental, especial,
            consecuente o punitivo, incluyendo pérdida de ganancias, datos o
            uso, que surja de o esté relacionado con su uso o incapacidad de
            usar el Sitio, incluso si Top Networks Inc. ha sido advertido de la
            posibilidad de tales daños.
          </p>
          <p className="text-xs uppercase font-medium text-gray-500">
            Si, a pesar de las exclusiones anteriores, se impone responsabilidad
            a Top Networks Inc., esta se limitará al mayor entre el monto pagado
            por usted por los servicios (si corresponde) y USD $100.
          </p>

          <h2>12. Ley Aplicable</h2>
          <p>
            Estos Términos se rigen e interpretan de acuerdo con las leyes de la
            República de Panamá, sin tener en cuenta los principios de conflicto
            de leyes. Todas las acciones legales que surjan de o estén
            relacionadas con estos Términos se presentarán exclusivamente en los
            tribunales de la Ciudad de Panamá, República de Panamá.
          </p>

          <h2>13. Indemnización</h2>
          <p>
            Usted acepta indemnizar y mantener indemne a Top Networks Inc. y sus
            afiliados, directores, agentes y empleados de cualquier reclamación,
            pérdida o responsabilidad que surja de su uso del Sitio, violación
            de estos Términos, o cualquier uso no autorizado de información o
            contenido.
          </p>

          <h2>14. Notificaciones</h2>
          <p>
            Las notificaciones o mensajes a los usuarios sobre actualizaciones,
            cambios u otra información importante pueden ser publicadas en el
            Sitio o enviadas al correo electrónico asociado a su cuenta de
            Google. Para preguntas o problemas, los usuarios pueden contactar a
            Top Networks Inc. en:{" "}
            <a href="mailto:info@topfinanzas.com">info@topfinanzas.com</a>.
          </p>

          <h2>15. Disposiciones Generales</h2>
          <p>
            Si alguna disposición de estos Términos se considera inaplicable,
            las disposiciones restantes permanecerán en pleno vigor y efecto. La
            falta de Top Networks Inc. de hacer cumplir cualquier disposición no
            se considerará una renuncia a esa disposición ni a ninguna otra.
          </p>

          <h2>16. Información de Contacto</h2>
          <p>
            Para preguntas o inquietudes sobre estos Términos, puede
            contactarnos en:
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
              className="font-medium text-brand-blue"
              aria-current="page"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacy"
              className="hover:text-brand-blue transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
