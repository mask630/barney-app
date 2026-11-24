# Clutch · Resumen del proyecto (16-nov-2026)

## Enlaces
| Qué | Dónde |
|---|---|
| **App** (para ti y los testers) | https://mask630.github.io/barney-app/clutch/ |
| **Panel de control** | https://clutch-ia.vercel.app/admin/ |
| Contraseña del panel | La tuya: la que pusiste en Vercel como `CLUTCH_ADMIN`. Claude no la tiene ni la guarda. Si la olvidas: Vercel > proyecto `clutch-ia` > Settings > Environment Variables. |
| Servidor (IA, cuentas, avisos) | https://clutch-ia.vercel.app (Vercel, proyecto `clutch-ia`) |
| Base de datos | Upstash (conectada desde Vercel) |
| Código | GitHub `mask630/barney-app`, rama `clutch-v2`, carpeta `clutch/` |
| Copia en tu PC | `C:\Users\telem\Documents\antigravity\magical-davinci\clutch\` |
| Email de la app | clutch.app.2026@gmail.com |
| Responsable legal | Isaac Briales |

## Qué es Clutch
App para el móvil que ayuda a un hombre a cuidar su relación (Rollo, Pareja o Matrimonio): recordar lo que importa de ella y saber qué hacer o decir. En la pantalla de inicio del móvil se llama «Agenda» (discreción).

## Qué hace hoy (beta 0.5)
- **Hoy**: qué te toca (pensar el regalo, comprarlo, preparar el plan), la jugada del día con mensaje listo, gestos, próximas fechas y calendario de todo el año.
- **Ella**: su ficha (gustos, tallas, evitar, regalos, eventos, recordar; se añade tocando cada apartado), su ciclo con tendencias y su etapa.
- **Apuntar**: escribes o haces una foto y lo clasifica solo.
- **Escríbele**: mensajes que no se repiten y suenan a WhatsApp de verdad.
- **SOS**: qué ha pasado → consejo de una línea + mensaje listo.
- **Cuentas**: entrar con email + código (o con Google); cada usuario tiene sus datos, cifrados en el servidor, en cualquier móvil. *Se activan al ejecutar `configurar-cuentas.ps1`.*
- **Avisos en el móvil**: cada mañana con algo pendiente, «Agenda: tienes algo pendiente hoy», sin nombres. *Se activan con el mismo script.*
- **PRO** (las abres por grupos desde el panel): reescribir con IA, chat SOS con IA, foto con IA, analizar su perfil (capturas de sus redes), planes cerca, tu estilo, acompañantes, varias personas y copia de seguridad.
- **Panel**: aprobar, bloquear o borrar testers, grupos y funciones, plazas, límite diario de IA, estadísticas, opiniones, errores y aviso de caducidad de la clave de IA.

## Lo que te toca a ti (por orden)
1. ✅ Clave de la IA renovada (16-nov). El panel avisa 14 días antes de que caduque la nueva; para renovarla, `desplegar-ia.ps1`.
2. ✅ **Cuentas y avisos activados (24-nov).** Si un día hay que cambiar la contraseña de Gmail, se vuelve a ejecutar `configurar-cuentas.ps1`. Pasos que se siguieron:
   - Con la cuenta clutch.app.2026@gmail.com, entra en https://myaccount.google.com/apppasswords (si lo pide, activa antes la verificación en dos pasos), crea una contraseña «Clutch» y copia las 16 letras. No se la pases a nadie.
   - Ejecuta `configurar-cuentas.ps1` y pégala cuando te la pida. Al terminar debe decir «Listo».
3. En el panel: borra el tester «Prueba Claude (borrar)» y marca «Perfil IA» en los grupos que quieras.
4. Prueba en un iPhone (Safari > Compartir > Añadir a pantalla de inicio) y en un Android: crear cuenta, apuntar, avisos.
5. Invita a los primeros 5-10 testers.
6. Opcional: botón «Entrar con Google» (ID de cliente de Google Cloud, origen `https://mask630.github.io`; luego vuelve a ejecutar el script).

## Qué falta para terminarla
| Paso | Quién | Estado |
|---|---|---|
| App, servidor, IA, panel, cuentas, avisos | Claude | ✅ hecho y probado (113 pruebas + 3 recorridos en móvil simulado) |
| Renovar clave de IA | 👤 tú | ✅ hecho (16-nov) |
| Activar cuentas y avisos | 👤 tú | ✅ hecho (24-nov) |
| Prueba en móviles reales | 👤 tú + Claude arregla lo que salga | pendiente |
| Beta con testers (2-4 semanas): leer métricas y opiniones, pulir | los dos | pendiente |
| Nombre definitivo: comprobar marca «Clutch» y comprar dominio | 👤 tú decides, Claude lo configura | pendiente |
| Más contenido: santos y días de la madre/padre por país | Claude | pendiente |
| Cobro de la versión PRO (suscripción) | por decidir | no empezado |
| Tiendas (App Store / Google Play) | por decidir | no empezado (hoy es una web instalable) |

## Si algo falla
- La IA no responde: el panel avisa si la clave no funciona o caduca pronto.
- Nadie puede entrar con email: vuelve a ejecutar `configurar-cuentas.ps1`.
- `CLUTCH_DATA_KEY` (la clave que cifra los datos de los usuarios) **no se cambia nunca**: los datos guardados dejarían de poder leerse.
- Detalle técnico para un programador: `HANDOFF.md`. Historial de lo hecho: `ROADMAP.md`.
