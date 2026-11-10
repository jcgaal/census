// Spanish copy for every section and the terminal, typed as Copy so it
// must match the English shape key for key, and any key that is missing
// or misspelled here fails the typecheck before the page ever builds.
import { listOf, type OutputInfo } from './list';
import { pageTitle, site } from '../site.config';
import type { Copy } from './lang';

export const es: Copy = {
  meta: { title: pageTitle('es') },
  header: {
    sub: 'seguimiento propio en vivo',
    how: 'Cómo funciona',
    contact: 'Contacto',
    fork: 'Haz fork del repo',
    forget: 'Olvidarme',
    switchTo: 'EN',
    switchLabel: 'View in English',
  },
  consent: {
    label: '00 // Consentimiento',
    title: 'Lo que un sitio web sabe de ti en tu primera visita',
    body: (
      <p>
        Esta página registra los datos que una plataforma de datos de clientes como Segment recogería sobre ti, y te los va mostrando en el momento, con el mismo
        formato de eventos que usa Segment.
      </p>
    ),
    bodyLocal: (
      <p>
        <strong>Todo se queda en tu navegador.</strong>{' '}
        <span className="dim">No guardamos nada de nuestro lado ni lo enviamos a terceros, y puedes borrarlo cuando quieras.</span>
      </p>
    ),
    start: 'Empezar',
    sample: 'Ver datos de ejemplo',
    bodyOutputs: (outputs: OutputInfo[], forwardIp: boolean) => (
      <p>
        <strong>Este sitio también envía tus eventos a {listOf(outputs.map((o) => `${o.name} (${o.host})`), 'y')}.</strong>{' '}
        <span className="dim">
          Cuando pulsas Empezar, su propio servidor reenvía cada evento que ves aquí{forwardIp ? ', con tu dirección IP' : ', sin tu dirección IP'}, y la terminal
          muestra cada envío. Olvidarme detiene los envíos siguientes, pero lo que ya se envió se queda en esa herramienta.
        </span>
      </p>
    ),
  },
  fieldCols: ['Dato', 'Origen'],
  s01: {
    label: '01 // Identidad',
    body: (
      <>
        <p>Cuando hiciste clic en Empezar, esta página generó un identificador aleatorio para ti y lo guardó en una cookie de este dominio.</p>
        <p>
          La cookie dura un año.{' '}
          <span className="dim">Cualquier página de este sitio que abras durante ese tiempo puede leerla y unir esa visita con las anteriores.</span>
        </p>
        <p>
          Una CDP le llama <strong>anonymousId</strong>, y a ese identificador se le van sumando todos los eventos, formularios y compras que vengan después.
        </p>
      </>
    ),
    rows: [
      [<code>anonymousId</code>, <><code>crypto.randomUUID()</code>, se genera una sola vez</>],
      [<code>{site.cookieName}</code>, 'Cookie propia de este dominio, 365 días, SameSite=Lax'],
      [<code>firstSeen</code>, 'Hora de tu primera visita con consentimiento, guardada en localStorage'],
    ],
  },
  s02: {
    label: '02 // Origen',
    body: (
      <>
        <p>Este sitio puede leer la URL por la que entraste y la página que te trajo hasta aquí.</p>
        <p>
          Los equipos de marketing agregan parámetros UTM a sus enlaces para saber <strong>de qué campaña viene cada clic</strong>.{' '}
          <span className="dim">
            Las plataformas de anuncios añaden su propio identificador de clic, gclid en Google y fbclid en Meta, para que la venta se le atribuya al anuncio.
          </span>
        </p>
      </>
    ),
    rows: [
      ['Referrer', <><code>document.referrer</code>, la página que enlazó hasta aquí</>],
      ['Parámetros UTM', <><code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_term</code>, <code>utm_content</code> en la URL</>],
      ['IDs de clic de anuncios', <><code>gclid</code> Google, <code>fbclid</code> Meta, <code>msclkid</code> Microsoft, <code>ttclid</code> TikTok, <code>li_fat_id</code> LinkedIn</>],
    ],
    reload: 'Recargar con un enlace de anuncio de LinkedIn',
  },
  s03: {
    label: '03 // Dispositivo',
    body: (
      <>
        <p>Tu navegador manda una descripción de sí mismo con cada solicitud, y deja ver más a través de las APIs estándar de JavaScript.</p>
        <p>
          Las herramientas de analítica leen el navegador y el sistema operativo, el tamaño de la pantalla y de la ventana, el idioma y la zona horaria, además de
          algunas preferencias de accesibilidad y privacidad. <strong>Una CDP guarda todo eso en tu perfil.</strong>
        </p>
      </>
    ),
    rows: [
      ['Navegador, sistema, móvil', <><code>navigator.userAgentData</code> o la cadena del user agent</>],
      ['Idioma, zona horaria', <><code>navigator.languages</code>, <code>Intl.DateTimeFormat</code></>],
      ['Pantalla, ventana, densidad de píxeles', <><code>screen</code>, <code>innerWidth</code>, <code>devicePixelRatio</code></>],
      ['Tema de color, movimiento reducido', 'Media queries de CSS'],
      ['Conexión', <><code>navigator.connection</code>, si el navegador la expone</>],
      ['Cookies, Do Not Track, GPC', <><code>navigator.cookieEnabled</code>, <code>doNotTrack</code>, <code>globalPrivacyControl</code></>],
    ],
  },
  s04: {
    label: '04 // Ubicación',
    body: (
      <>
        <p>Cada solicitud a un servidor lleva tu dirección IP, porque el servidor la necesita para devolverte la página.</p>
        <p>
          Si se busca esa IP en una base de datos de geolocalización, sale una <strong>ciudad</strong> aproximada.{' '}
          <span className="dim">Suele acertar a nivel de zona metropolitana, y con eso alcanza para segmentar anuncios y armar reportes por región.</span>
        </p>
      </>
    ),
    rows: [
      ['Dirección IP', 'La propia solicitud de red. Este servidor no la registra ni la guarda.'],
      ['País, región, ciudad', 'Geolocalización por IP, desde los headers del hosting o un servicio de consulta'],
      ['Accept-Language', 'Header que tu navegador manda con cada página'],
    ],
  },
  s05: {
    label: '05 // Comportamiento',
    body: (
      <>
        <p>
          A partir de aquí, esta página registra un evento cada vez que llegas a una sección nueva, haces clic en un botón o enlace, cambias de pestaña o pasas
          otros 30 segundos leyendo.
        </p>
        <p>
          Cada evento lleva la hora y tu anonymousId, así que una CDP puede ordenarlos como <strong>una línea de tiempo de tu visita</strong>.
        </p>
      </>
    ),
    cols: ['Evento', 'Se registra cuando'],
    rows: [
      [<code>Section Viewed</code>, 'Una sección llega por primera vez al 40% de la pantalla'],
      [<code>Scroll Depth Reached</code>, 'Pasas el 25, 50, 75 y 100% de la página, una vez cada uno'],
      [<code>Element Clicked</code>, 'Haces clic en un botón o enlace. Solo se guarda el texto visible y el tipo de elemento.'],
      [<code>Time On Page</code>, 'Cada 30 segundos mientras esta pestaña está visible'],
      [<code>Tab Hidden / Tab Visible</code>, 'Cambias de pestaña o de ventana'],
      [<code>Form Started</code>, 'Entras por primera vez al formulario de la sección 06. Nunca se guarda lo que escribes.'],
    ],
  },
  s06: {
    label: '06 // Resolución de identidad',
    body: (
      <>
        <p>Hasta ahora, cada evento de esta página pertenece a un identificador anónimo.</p>
        <p>
          Escribe un correo abajo. La CDP va a vincular ese identificador con el correo y a pasar <strong>todo lo que hiciste aquí</strong> a un perfil con nombre.
        </p>
      </>
    ),
    after: (
      <>
        <p>
          Todos los eventos registrados antes del formulario están ahora en el mismo perfil que tu correo.{' '}
          <span className="dim">Esa unión es el trabajo principal de una CDP.</span>
        </p>
        <p>
          Si vuelves la próxima semana desde otro enlace, la cookie va a seguir ahí y <strong>esa visita también va a caer en este perfil.</strong>
        </p>
      </>
    ),
    email: 'Correo · obligatorio',
    name: 'Nombre',
    company: 'Empresa',
    optional: 'Opcional',
    emailPlaceholder: 'tu@empresa.com',
    submit: 'Identificarme',
    note: 'Tu correo no se envía a ningún lado. Puedes usar uno falso.',
    noteOutputs: (names: string[]) => `Tu correo se envía a ${listOf(names, 'y')} con la llamada identify. Puedes usar uno falso.`,
  },
  s07: {
    label: '07 // Destinos',
    body: (
      <>
        <p>Los eventos que se recogen se reenvían a las demás herramientas que usa la empresa.</p>
        <p>
          Cada herramienta espera su propio formato, así que la CDP reescribe el mismo evento para{' '}
          <strong>Google Analytics, la plataforma de anuncios de Meta, el CRM y el data warehouse.</strong>
        </p>
      </>
    ),
    cols: ['Destino', 'Formato'],
    rows: [
      ['Google Analytics 4', 'Cuerpo de Measurement Protocol: client_id, events, user_properties'],
      ['Meta Conversions API', 'event_name, event_time, action_source, user_data con el correo hasheado'],
      ['HubSpot', 'Propiedades del contacto y un evento de timeline'],
      ['Data warehouse', 'Una fila en una tabla tracks o pages'],
    ],
    note: 'Es solo una vista previa. Esta página no le envía nada a estas empresas.',
    alsoSent: (name: string, host: string) => `También se envía a ${name} (${host})`,
  },
  s08: {
    label: '08 // Límites',
    body: (
      <>
        <p>
          Un sitio web alcanza <strong>mucho menos de lo que casi todos suponen</strong>.{' '}
          <span className="dim">
            El navegador aísla a cada sitio de todo lo demás, y funciones como la ubicación o los contactos necesitan tu permiso explícito.
          </span>
        </p>
      </>
    ),
    cols: ['No puede ver', 'Por qué'],
    rows: [
      ['Cookies de otros sitios', 'Los navegadores las aíslan por diseño'],
      ['Tu historial de navegación', 'No está expuesto a los sitios web'],
      ['Archivos, fotos, contactos, mensajes', 'Una página web no tiene acceso a ellos'],
      ['Tu nombre o correo antes de que lo escribas', 'Solo después de un formulario o un inicio de sesión'],
      ['Tu ubicación exacta', 'Solo con tu permiso explícito'],
    ],
  },
  closing: {
    contact: site.owner ? `Escribir a ${site.owner}` : 'Escríbenos',
    fork: `Haz fork de ${site.name} en GitHub`,
  },
  footer: {
    demos: 'Demos',
    thisPage: `${site.name} (esta página)`,
    source: 'Código en GitHub',
    contact: 'Contacto',
    privacy: 'Privacidad',
    privacyNote: 'Nada de esta página se guarda ni se comparte.',
    privacyNoteOutputs: 'Aquí no se guarda nada. Los eventos solo van a los destinos nombrados en la pantalla de consentimiento.',
  },
  term: {
    pending: 'pendiente',
    granted: 'otorgado',
    sampleConsent: 'datos de ejemplo (no se captura nada)',
    forgot: 'cookie borrada · 0 eventos · perfil eliminado',
    forgotOutputs: (names: string[]) => `envíos detenidos · lo que ya se envió a ${listOf(names, 'y')} se queda ahí y hay que borrarlo en esa herramienta`,
    sentNote: '// reenviado por el servidor de este sitio, sin tu IP. Las claves nunca llegan al navegador.',
    sentNoteIp: '// reenviado por el servidor de este sitio, con tu dirección IP. Las claves nunca llegan al navegador.',
    sentNoResponse: 'sin respuesta',
    sentError: (status: string) => `no enviado: /api/collect respondió ${status}`,
    outputsMismatch: 'destinos sin usar: la configuración del servidor no coincide con lo que dijo la pantalla de consentimiento',
    outputsUnverified: 'destinos sin usar: el servidor no pudo confirmarlos',
    srcCookie: '// origen: cookie propia que puso esta página',
    srcCookieSample: '// origen: datos de ejemplo (no se puso ninguna cookie)',
    srcPage: '// origen: URL de la página y document.referrer',
    srcDevice: '// origen: APIs navigator, screen e Intl del navegador',
    srcLocation: '// origen: solicitud de red, geolocalización por IP',
    srcDest: '// origen: los eventos de arriba, transformados en tu navegador. 0 solicitudes de red.',
    live: 'en vivo',
    fetching: 'consultando…',
    fetchError: 'error: no se pudo contactar /api/context',
    showIp: 'ver IP completa',
    maskIp: 'ocultar IP',
    geoUnavailable: 'no disponible en este hosting',
    notExposed: 'este navegador no lo expone',
    notSet: 'sin definir',
    merged: (n: number, id: string) => `${n} eventos anónimos unidos a ${id}`,
    hashNote: '// las plataformas de anuncios comparan este hash con los correos hasheados de sus propios usuarios',
    banner: 'Es solo una vista previa. Esta página no le envía nada a estas empresas.',
    cookieNote: '// el navegador solo le entrega a una página las cookies de su propio sitio',
    cookieEmpty: '(vacío)',
    summary: (took: string) => `// una CDP armó este perfil con ${took} en esta página`,
    streaming: (n: number) => `// ${n} eventos hasta ahora · los nuevos aparecen en cuanto ocurren`,
    events: 'eventos',
    profile: 'perfil',
    anonymous: 'anónimo',
    identified: 'identificado',
    consent: 'consentimiento',
    consentSample: 'ejemplo',
    copy: 'copiar perfil JSON',
    copied: 'copiado ✓',
    forget: 'olvidarme',
    dest: {
      gaNote: 'GA4 no acepta correos ni otros datos personales, así que solo viajan user_id y company.',
      metaHashed: 'em es el SHA-256 de tu correo normalizado.',
      metaNoEmail: 'Todavía no hay em. Meta solo puede reconocerte cuando tiene un correo.',
      hubspotNoContact: '// todavía no hay contacto: HubSpot solo lo crea cuando tiene un correo',
      hubspotEndpoint: 'propiedades del contacto + evento de timeline',
      warehousePages: 'una fila en la tabla: pages',
      warehouseTracks: 'una fila en la tabla: tracks',
    },
  },
};
