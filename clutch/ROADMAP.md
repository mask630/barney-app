# Clutch · Hoja de ruta hacia la beta (22-oct-2026)

Leyenda: 🤖 lo hago yo (Claude) · 👤 te toca a ti · ✅ hecho · ⚠️ roto o sin probar

## Dónde estamos

| Pieza | Estado |
|---|---|
| App (Hoy, Ella, Escríbele, Apuntar, SOS, Yo) | ✅ funciona, 55 pruebas + 2 pruebas en móvil simulado |
| Servidor de IA (reescribir, SOS, foto) | ✅ desplegado y probado: `clutch-ia.vercel.app/api/ai` |
| Funciones por tester | ✅ el servidor decide qué ve cada uno (grupos `base`, `pro-1`, `pro-2`, `admin`); lo cerrado sale como "Pronto" |
| IA en la app | ✅ servidor integrado; solo hace falta el código. Reescribir, SOS y foto probados en real |
| Planes cerca | ✅ por nuestro servidor (Photon → Nominatim → Overpass) con caché de 7 días; probado en Málaga y Madrid |
| Registro de testers | ❌ no existe |
| Métricas de uso | ❌ no existen |
| Opiniones | ⚠️ solo "Copiar para enviar" (el tester tiene que pegarlo en otro sitio) |
| Clave de Anthropic | ⚠️ caduca el 21-nov-2026 |

## Fase 1 · Interruptores remotos de funciones ✅ (22-oct)
Hecho. Arreglados de paso: la IA devolvía respuestas vacías (el modelo gastaba el límite "pensando"), el SOS salía con asteriscos y la foto con IA fallaba siempre en real.
Pendiente de esta fase para la Fase 2: base de datos (Upstash) para guardar testers y grupos.

<details><summary>Plan original</summary>


Objetivo: tú decides desde un panel qué funciones ve cada tester; el tester no puede activarlas.
- Servidor: `/api/config` devuelve las funciones activas para cada tester (por grupos: `base`, `pro-1`, `pro-2`…).
- App: cambiar el `pro` único por funciones sueltas: `ai_rewrite`, `sos_chat`, `photo_ai`, `plans`, `my_style`, `companions_pro`, `encrypted_backup`.
- Las funciones desactivadas no se muestran como rotas: o no aparecen o salen como "Próximamente".
- La dirección del servidor de IA va dentro de la app: el tester ya no pega nada.
- Quitar el interruptor "Versión PRO de prueba".
- Base de datos del servidor: Upstash Redis desde Vercel (gratis). 👤 2 clics en Vercel para añadirla (te guío).
</details>

## Fase 2 · Registro de beta testers (🤖 + 👤 aprobar) ← en curso
Decidido: se apuntan solos y tú los apruebas. Métricas anónimas con su permiso.
- ✅ Alta en la app (Hoy invita; Yo > Beta), código automático, estado pendiente/activo/bloqueado.
- ✅ Panel en https://clutch-ia.vercel.app/admin/ (entras con tu código de dueño): aprobar, bloquear, borrar, grupos, plazas, límite diario de IA.
- ✅ Borrador de condiciones y privacidad en `js/i18n/legal.js`.
- ✅ Base de datos Upstash conectada (22-oct). Ciclo completo probado en real: alta → aprobar → pro-1 → IA → bloquear → borrar.
- 👤 Rellenar en `js/i18n/legal.js` el responsable y el email de contacto.
- Pantalla de bienvenida: "Únete a la beta": alias + email + aceptar condiciones.
- El servidor genera su código personal; la app lo guarda sola (adiós a CLUTCH_CODES a mano).
- Panel `/admin` (protegido con tu contraseña): lista de testers, aprobar/bloquear, moverlos de grupo, límite de plazas.
- Límites de uso de IA por tester (diario) para que nadie te gaste el saldo.
- 👤 Textos legales mínimos (RGPD): privacidad y condiciones de la beta. 🤖 redacto el borrador, 👤 lo revisas.

## Fase 3 · Saber qué se usa (🤖)
- Métricas anónimas y agregadas, solo si el tester acepta: "abrió Escríbele", "copió un mensaje", "usó SOS"… Nunca nombres, textos ni datos de ella.
- Botón "Enviar opinión" que llega directo a tu panel (con versión y pantalla), en vez de copiar y pegar.
- Panel: usuarios activos por día/semana, uso por función, retención (vuelve a los 1/7/30 días), opiniones.
- Error automático: si la app falla, se envía un aviso técnico sin datos personales.

## Fase 4 · Que todo funcione de verdad (🤖)
- ⚠️ Planes cerca: pasar las búsquedas por nuestro servidor (con caché) y probar en Málaga, Madrid, etc.
- Repaso completo en móvil simulado de cada función PRO con el servidor real (no simulado).
- Prueba en iPhone (Safari > Añadir a pantalla de inicio) 👤 y Android.
- Avisos/recordatorios: comprobar qué funciona hoy sin push real y dejarlo claro en la app.
- Renovación de la clave: aviso en el panel antes de que caduque.

## Fase 5 · Publicar la beta
- 👤 Decidir dominio (y comprobar marca "Clutch") → 🤖 configurarlo.
- 🤖 Publicar en `main` (GitHub Pages) siguiendo el proceso de HANDOFF.md.
- 👤 Invitar a los primeros 5-10 testers solo con funciones `base`.
- Semana 1-2: leer métricas y opiniones → pulir.
- Semana 2-4: abrir `pro-1` (IA reescribir + estilo) a la mitad de testers, comparar.
- Semana 4+: abrir `pro-2` (SOS, foto, planes, copia cifrada).

## Fase 6 · Después de la beta (ya en HANDOFF.md)
- Cuentas, copia en la nube cifrada y avisos push reales.
- Más días mundiales y santos por país (solo con fuente verificada).
- Agendas locales (Malagueando…): requiere acuerdo.
- Otros idiomas a partir de `js/i18n/es.js`.
