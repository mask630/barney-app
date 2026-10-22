// Condiciones de la beta y política de privacidad (borrador: revisar antes de publicar).
// Rellena OWNER y CONTACT: el RGPD exige identificar al responsable y dar un contacto.

export const OWNER = '[NOMBRE DEL RESPONSABLE]';
export const CONTACT = '[EMAIL DE CONTACTO]';
export const UPDATED = '22 de octubre de 2026';

export const LEGAL = [
  { h: 'Condiciones de la beta', p: [
    'Clutch está en pruebas: puede fallar, cambiar o cerrarse sin aviso. Úsalo sabiendo que es una versión beta.',
    'Solo para mayores de 18 años, y solo para recordar fechas y escribir mejor a una persona adulta.',
    'Úsalo con respeto: nada de acoso, presión, manipulación ni vigilancia de otra persona. Si lo usas así, cerraremos tu acceso.',
    'La IA puede equivocarse. Revisa siempre lo que vayas a enviar: tú decides qué mandas.',
    'Puedes dejar la beta cuando quieras escribiendo al contacto de abajo.'
  ] },
  { h: 'Quién es el responsable', p: [`${OWNER}. Contacto: ${CONTACT}.`] },
  { h: 'Qué se queda en tu móvil', p: [
    'Todo lo que apuntas de ella (nombre, fechas, gustos, tallas, regalos, fotos) vive solo en este móvil. No lo guardamos en ningún servidor.'
  ] },
  { h: 'Qué guardamos al apuntarte', p: [
    'Tu alias, tu email, tu código de tester, la fecha de alta, el último día que usaste la app, tu grupo de la beta y si aceptas las estadísticas.',
    'Para qué: gestionar la beta (aprobarte, abrirte funciones) y escribirte sobre ella. Base legal: tu consentimiento al apuntarte.',
    'No lo usamos para publicidad ni lo vendemos.'
  ] },
  { h: 'Cuando usas la IA', p: [
    'Se envía el texto que pides reescribir o lo que cuentas en el SOS, sin su nombre (va como {n}) y sin su fecha de nacimiento; solo el tramo de edad y el tipo de relación. Las fotos solo se envían si pulsas «Reconocer con IA».',
    'Proveedores: Anthropic (la IA), Vercel (el servidor) y Upstash (la base de datos de la beta).'
  ] },
  { h: 'Estadísticas (solo si las aceptas)', p: [
    'Recuentos anónimos de qué funciones se usan y si vuelves a la app, para saber qué mejorar. Nunca textos, nombres ni datos de ella. Puedes desactivarlas en Yo cuando quieras.'
  ] },
  { h: 'Cuánto tiempo y tus derechos', p: [
    'Guardamos tus datos de la beta hasta que termine o pidas la baja.',
    `Puedes pedir acceso, corrección o borrado de tus datos, u oponerte a su uso, escribiendo a ${CONTACT}. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`
  ] }
];
