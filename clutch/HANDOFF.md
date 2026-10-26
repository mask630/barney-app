# Clutch · nota de traspaso (22-oct-2026)

App PWA en español para ayudar a un hombre a recordar fechas y escribir bien a una mujer adulta. Sustituye a Barney v1 (que sigue intacto en `/barney-app/`).
Dueño: mask. Habla español. Pide respaldos antes de tocar cosas, interfaz simple, móvil primero, datos solo en el dispositivo.

## Dónde está todo
- Código: repo `mask630/barney-app`, rama `clutch-v2`, carpeta `clutch/`. Copia en el PC: `C:\Users\telem\Documents\antigravity\magical-davinci\clutch\`.
- App en vivo: https://mask630.github.io/barney-app/clutch/ (archivos compilados en la carpeta `clutch/` de la rama `main`; NO fusionar `clutch-v2` en `main`).
- Prueba privada en Claude: https://claude.ai/artifact/JL71T9oektVsZprXamKAdV
- Copia de Barney v1: rama `backup/barney-v1.0.1` y `backup\v1.0.1` en el PC.

## Comandos (en la carpeta clutch)
- `npm install` (una vez), `node --test test/*.test.js`, `node scripts/build.mjs` (genera `dist/`),
  `node scripts/e2e.mjs` y `node scripts/e2e-pro.mjs` (prueban la app en un móvil simulado; en Windows usan Edge).
- 105 pruebas desde el 24-oct.
- Publicar: compilar, copiar `dist/index.html`, `manifest.webmanifest`, `sw.js`, `icon-*.png` a `clutch/` en `main`, commit y push. Pages tarda 1-2 minutos.

## Reglas de producto (no romper)
- Solo perfiles de 18+ (se rechaza menor de edad).
- Mensajes solo con datos reales y verificados. Días mundiales: solo los de `js/data/worldDays.js` con `verified:true` y fuentes; los dudosos están en `UNVERIFIED`.
- Sin datos no se inventa nada: se muestran sugerencias de qué añadir.
- Astrología siempre como "según los astros", calculada (Luna, signo), nunca inventada.
- Ciclo (decidido por mask el 24-oct): opcional, en todas las etapas. Fase calculada con lo que suele pasar según los estudios (ánimo, qué funciona y deseo), siempre como tendencia, con aviso de que cada mujer es distinta y de que no es método anticonceptivo. Nunca para presionar.
- Avisos: dentro de la app (Hoy > «Te toca» y Ver calendario), no en el calendario del móvil. Sin push real, solo avisa al abrirla (y número en el icono si el móvil lo permite).
- Mensajes: que suenen a WhatsApp de una persona; sin empezar por su nombre ni frases de tarjeta.
- Discreción: nombre "Agenda", icono neutro, PIN, avisos neutros.
- La IA nunca recibe el nombre de ella (va como `{n}`) y se descarta cualquier número que invente.

## Servidor (actualizado 22-oct-2026)
- Vercel, proyecto `clutch-ia`: https://clutch-ia.vercel.app. IA, funciones por tester, alta de testers, estadísticas, opiniones y planes cerca (`api/`). Base de datos Upstash conectada.
- Panel del dueño: https://clutch-ia.vercel.app/admin/ (entra con la contraseña `CLUTCH_ADMIN`, que puso mask; el código de dueño `CLUTCH_CODES` sirve para la app, no para el panel).
- La clave de Anthropic caduca (la actual, el 2026-11-21): crear otra y ejecutar `desplegar-ia.ps1`; conserva el código de dueño. El panel avisa 14 días antes.
- Hoja de ruta y estado detallado: `ROADMAP.md`.

## Cuentas (26-oct-2026)
- Entrar con email + código de 6 cifras (Gmail de Clutch por SMTP) o con Google. Cada cuenta es a la vez un tester (mismo código); el formulario antiguo de la beta ya no sale.
- Datos de cada usuario cifrados en el servidor (`data:<código>`, AES-256-GCM con `CLUTCH_DATA_KEY`). **CLUTCH_DATA_KEY no se cambia nunca**: los datos guardados dejarían de poder leerse. Las fotos no se suben.
- Sincroniza sola: al abrir, al volver a la app y 2,5 s después de cada cambio. Conflictos entre móviles: gana la ficha cambiada más tarde; lo borrado no vuelve.
- Cerrar sesión borra el móvil (los datos siguen en la cuenta). «Borrar mi cuenta» lo borra todo. Borrar un tester en el panel borra también sus datos.
- Variables: `CLUTCH_DATA_KEY`, `GMAIL_APP_PASSWORD`, `GMAIL_USER`, `GOOGLE_CLIENT_ID` (opcional). Las pone `configurar-cuentas.ps1`. Sin correo ni Google, la app no ofrece cuentas (funciona como antes).
- Prueba en móvil simulado: `node scripts/e2e-account.mjs`.

## Pendiente
1. ~~Desplegar la IA~~ Hecho. La app ya trae el servidor integrado: el tester solo pone su código (o se apunta en Yo > Beta).
2. Pasar la nueva app al dominio definitivo y comprobar instalación en iPhone (Safari > Añadir a pantalla de inicio).
3. Más días mundiales y santos por país (solo con fuente verificada).
4. Planes locales de agendas (p. ej. Malagueando): requiere acuerdo/API; hoy solo hay lugares de OpenStreetMap (no probado contra el servicio real).
5. ~~Cuentas y copia en la nube cifrada~~ Hecho el 26-oct. Falta: avisos push reales.
6. Comprobar disponibilidad del nombre Clutch (marca, dominio, tiendas) antes de lanzar.
7. Textos de la app en `js/i18n/es.js`: copiar con las mismas claves para otros idiomas.
