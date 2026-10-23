// Textos de la interfaz en español. Para otro idioma, copia este archivo con las mismas claves.

export default {
  lang: 'es',
  appName: 'Clutch',
  tagline: 'Nunca falles en el momento importante',
  tabs: { hoy: 'Hoy', ella: 'Ella', apuntar: 'Apuntar', escribele: 'Escríbele', yo: 'Yo' },
  stages: { rollo: 'Rollo', pareja: 'Pareja', matrimonio: 'Matrimonio' },
  stageHint: {
    rollo: 'Ligero y con chispa.',
    pareja: 'Cariño y constancia.',
    matrimonio: 'Cariño y constancia.'
  },
  welcome: {
    title: 'Tu mejor amigo para no fallar',
    body: 'Empieza con su nombre. Lo demás, cuando lo sepas.',
    cta: 'Crear su ficha'
  },
  profile: {
    name: 'Su nombre (o cómo la llamas)',
    birth: 'Fecha de nacimiento (si la sabes)',
    band: 'Su edad aproximada',
    noBirth: 'No sé su fecha',
    stage: 'Etapa',
    since: 'Desde cuándo (opcional)',
    sinceHint: 'Cuando os conocisteis, empezasteis o os casasteis',
    adultOnly: 'Solo se pueden crear perfiles de personas adultas (18 años o más).',
    errors: {
      'menor-de-edad': 'Solo se admiten perfiles de personas de 18 años o más.',
      'fecha-invalida': 'Escribe una fecha de nacimiento válida.',
      'nombre-vacio': 'Escribe su nombre.',
      'etapa-invalida': 'Elige una etapa.',
      'sin-edad': 'Pon su fecha de nacimiento o elige su edad aproximada.'
    },
    save: 'Guardar',
    upgrade: 'Cambiar de etapa',
    upgradeNote: 'Al cambiar de etapa se conserva todo lo que ya sabes de ella.'
  },
  today: {
    play: 'La jugada de hoy',
    gestures: 'Gestos para hoy',
    dates: 'Próximas fechas',
    noDates: 'Aún no hay fechas. Pon su cumpleaños en Ella > Editar.',
    todo: 'Te toca',
    calendar: 'Ver calendario',
    calendarHint: 'Clutch te avisa aquí, en Hoy, de lo que toca hacer antes de cada fecha: pensar el regalo, comprarlo y preparar el plan.',
    sosRow: '¿La has liado? Ve a SOS',
    days: (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`)
  },
  write: {
    title: 'Escríbele',
    realData: 'Dato real',
    basics: 'Mensajes sencillos',
    copy: 'Copiar',
    copied: 'Copiado',
    whatsapp: 'WhatsApp',
    proRewrite: 'Reescribir con tu estilo',
    pro: 'Pronto'
  },
  capture: {
    title: 'Apuntar',
    placeholder: 'Escribe lo que has visto o escuchado. Ej.: su anillo es una talla 14',
    camera: 'Hacer foto',
    gallery: 'Galería',
    classify: 'Clasificar',
    sendTo: 'Va a',
    confirm: 'Guardar aquí',
    toInbox: 'Mandar a la Bandeja',
    inbox: 'Bandeja',
    inboxEmpty: 'La bandeja está vacía.',
    classifyLater: 'Clasificar',
    discard: 'Descartar',
    saved: 'Guardado en',
    photoNote: 'La foto se guarda en este móvil. Elige dónde va.'
  },
  sos: {
    title: 'SOS',
    breathe: 'Respira un minuto',
    breatheHint: 'Antes de escribir en caliente',
    inhale: 'Inspira',
    hold: 'Sostén',
    exhale: 'Espira',
    start: 'Empezar',
    stop: 'Parar',
    situations: '¿Qué ha pasado?',
    steps: 'Antes de escribir',
    script: 'Mensaje para copiar',
    proChat: 'Hablar con la IA',
    pro: 'Pronto'
  },
  me: {
    title: 'Yo',
    plan: 'Modo simple',
    planBody: 'Un perfil, gestos diarios, Apuntar, ganchos y SOS con guiones. Durante la beta iremos abriendo funciones nuevas poco a poco.',
    discretion: 'Discreción',
    pin: 'PIN de Clutch',
    pinHint: 'Aparte del bloqueo de huella o cara de tu móvil',
    lockLeave: 'Bloqueo al salir',
    lockLeaveHint: 'Tras 60 segundos en segundo plano',
    where: 'Dónde estás',
    country: 'País',
    city: 'Ciudad',
    useGps: 'Usar GPS',
    companion: 'Tu acompañante',
    companionHint: 'Quién te habla en la app. Por defecto, Clutch te habla de forma cordial y cercana. Las personalidades son PRO.',
    data: 'Tus datos',
    export: 'Copia de seguridad',
    exportHint: 'Se muestra el texto para que lo copies y lo guardes.',
    import: 'Restaurar o importar',
    importHint: 'Pega una copia de seguridad de Clutch.',
    theme: 'Aspecto',
    themeAuto: 'Automático',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    beta: 'Beta',
    feedback: 'Enviar comentario',
    version: 'Clutch beta 0.3'
  },
  join: {
    title: 'Únete a la beta',
    pitch: 'Apúntate para probar las funciones nuevas antes que nadie y ayudarnos a mejorar Clutch.',
    alias: 'Cómo quieres que te llamemos',
    email: 'Tu email (solo para avisarte de la beta)',
    terms: 'Acepto las condiciones de la beta y la política de privacidad',
    readLegal: 'Leer condiciones y privacidad',
    metrics: 'Enviar estadísticas anónimas de uso (qué funciones uso; nunca textos ni datos de ella). Opcional.',
    send: 'Apuntarme',
    haveCode: '¿Ya tienes un código?',
    pending: 'Solicitud enviada. En cuanto te aprobemos se abrirán las funciones nuevas; no tienes que hacer nada más.',
    blocked: 'Tu acceso a la beta está desactivado. Si crees que es un error, escríbenos.',
    errors: {
      alias: 'Pon un nombre de 2 a 24 caracteres.', email: 'Revisa el email.', condiciones: 'Tienes que aceptar las condiciones.',
      'ya-registrado': 'Ese email ya está apuntado. Si perdiste tu código, escríbenos y te lo reenviamos.',
      completo: 'La beta está completa ahora mismo. Prueba más adelante.', cerrado: 'Las altas están cerradas ahora mismo. Prueba más adelante.',
      limite: 'Demasiados intentos. Prueba dentro de un rato.', red: 'No se pudo conectar. Revisa tu conexión.', servidor: 'El servidor tuvo un problema. Prueba más tarde.'
    }
  },
  lock: { title: 'Introduce tu PIN', wrong: 'PIN incorrecto', unlock: 'Entrar' },
  cycle: {
    title: 'Su ciclo',
    off: 'Apunta cuándo le viene la regla y Clutch te dice en qué fase está y qué suele funcionar: chocolate antes de la regla, una cita especial en sus mejores días…',
    startedToday: 'Le ha venido hoy',
    last: 'Primer día de la última regla',
    length: 'Días del ciclo',
    note: 'Son tendencias de los estudios, no reglas: cada mujer es distinta (y con anticonceptivos hormonales se notan menos). No sirve como método anticonceptivo.'
  },
  social: {
    title: 'Analizar su perfil',
    row: 'Sus redes con IA: gustos e ideas de regalo',
    pitch: 'Haz capturas de su perfil público (Instagram, TikTok…) y la IA te dice qué le puede gustar, ideas de regalo y planes que le pueden ir.',
    how: 'Haz capturas de su perfil público: fotos, publicaciones y lo que escribe. Hasta 6.',
    privacy: 'Solo perfiles públicos. Las capturas se envían a la IA para analizarlas y no se guardan en ningún sitio.'
  },
  dest: { gustos: 'Gustos', evitar: 'Evitar', tallas: 'Tallas', regalos: 'Regalos', eventos: 'Eventos', recordar: 'Recordar', bandeja: 'Bandeja' }
};
