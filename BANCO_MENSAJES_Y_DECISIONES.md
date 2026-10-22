# Barney — Historial de Decisiones de Diseño y Banco Maestro de Mensajes

> **Documento:** Registro de Decisiones de Arquitectura (ADR) & Corpus de Mensajería Contextual  
> **Versión:** `v1.0.1`  
> **Ámbito:** Guía creativa, psicológica y técnica para desarrolladores, redactores y producto.

---

## PARTE 1: Historial de Decisiones de Arquitectura y Diseño (ADRs)

Este registro explica **por qué** cada componente de Barney está diseñado de esta forma específica, evitando que futuros programadores alteren decisiones críticas de privacidad o usabilidad sin entender el contexto previo.

### ADR-01: Nombre de Marca «Barney» y Discreción Visual
- **Problema:** Una app con nombres como *«Novio Perfecto»* o *«Cuidado de Pareja»* en la pantalla de inicio o en notificaciones genera vergüenza si la pareja, un compañero de trabajo o un amigo mira la pantalla.
- **Decisión:** Nombre neutro **«Barney»** con icono de una **«B»** estilizada sobre gradiente azul-índigo. Parece un asistente de productividad o calendario corporativo.
- **En la interfaz:** La cabecera muestra avatares circulares solo con **iniciales discretas** (`LU`, `VA`, `CL`) en lugar del nombre completo de las chicas, activable por defecto.

### ADR-02: Filosofía Zero-Cloud y Blindaje Legal (RGPD Art. 2.2.c)
- **Problema:** La app gestiona datos íntimos de terceras personas (fechas de nacimiento, tallas de sujetador o anillo, días de menstruación/ovulación, nombres de suegras). Almacenar esto en un backend centralizado convierte a los creadores de la app en *Responsables del Tratamiento de Datos de Salud (Categoría Especial Art. 9 RGPD)*, con multas masivas y rechazo garantizado en Apple App Store y Google Play.
- **Decisión:** Todo el almacenamiento vive **100% en el dispositivo del usuario** (`localStorage`).
- **Base Legal:** Exención formal bajo el **Artículo 2.2.c del RGPD** (Tratamiento efectuado por una persona física en el ejercicio de actividades exclusivamente personales o domésticas).
- **Descargo Médico:** La estimación biológica incluye descargo explícito: es un cálculo matemático de calendario, no un método anticonceptivo ni de salud.

### ADR-03: Cero Scraping en Redes Sociales (Deducción Heurística)
- **Problema:** Hacer scraping de perfiles de Instagram o TikTok viola las políticas de Meta/ByteDance, expone a bloqueos de IP y requiere solicitar credenciales privadas al usuario.
- **Decisión:** Motor de **Lectura en Frío Psicológica** (`analyzeSocialProfileDeep`). Analiza las descripciones y arquetipos que el usuario introduce manualmente (`viajes`, `matcha`, `zara`, `festivales`) y los cruza con 7 dimensiones psicológicas precalibradas (`SOCIAL_DIMENSIONS`).

### ADR-04: PWA Autónoma Monolítica vs Framework Pesado en Fase Demo
- **Problema:** Requerir cuentas de desarrollador de Apple ($99/año) o Google ($25) y procesos de revisión de 2 semanas retrasaba las pruebas reales en teléfonos con testers.
- **Decisión:** Single-Page Application (SPA) pura en [index.html](file:///c:/Users/telem/Documents/antigravity/magical-davinci/index.html) con [tailwind.min.css](file:///c:/Users/telem/Documents/antigravity/magical-davinci/tailwind.min.css) compilado localmente (19.5 KB) y [sw.js](file:///c:/Users/telem/Documents/antigravity/magical-davinci/sw.js).
- **Estrategia Service Worker:** **Network-First** para peticiones de navegación/HTML (los testers reciben las actualizaciones al instante al recargar) y **Cache-First** para CSS e imágenes (funciona en modo avión).

### ADR-05: Seguridad del PIN (SHA-256 + Sal Aleatoria Local)
- **Problema:** El hash inicial FNV no tenía sal y era vulnerable si alguien extraía el backup. Cifrar con contraseñas complejas arruina la rapidez de un PIN de 4 dígitos.
- **Decisión:** Algoritmo SHA-256 síncrono nativo con **sal criptográfica aleatoria de 16 caracteres generada por dispositivo** (`sha256WithSalt`). Se advierte de forma transparente al usuario que es una barrera de privacidad local ante miradas indiscretas en el teléfono.
- **Bloqueo Inteligente:** Tras 5 intentos fallidos, bloqueo forzoso de 30 segundos.

### ADR-06: Modo Pánico («Jefe Cerca» o «Ella al lado»)
- **Problema:** El usuario está consultando la app en el sofá o en la oficina y su pareja o compañero se acerca de repente.
- **Decisión:** Al pulsar el logo **«B»** superior o si la app pasa a segundo plano durante más de 60 segundos, la interfaz se bloquea instantáneamente y muestra una pantalla opaca pidiendo el PIN.

### ADR-07: Modo Demo 100% Desbloqueado (Conmutador `FEATURES`)
- **Problema:** Los paywalls o pantallas de pago ficticias durante la fase de prueba irritan a los testers y bloquean el feedback.
- **Decisión:** Se creó el objeto central `FEATURES` y la función `hasAccess()`. En la versión actual, `hasAccess()` siempre devuelve `true` (Demo Abierta), pero todo el código ya está preparado para que, al conectar Stripe o RevenueCat, solo haya que cambiar una variable sin tocar la interfaz.

### ADR-08: Escáner de Fotos sin Almacenar Imágenes en Disco
- **Problema:** Guardar fotos pesadas en base64 satura los 5 MB de `localStorage` del navegador. Además, si la pareja abre la galería del móvil y ve fotos de escaparates, se arruina el factor sorpresa del regalo.
- **Decisión:** El escáner (`simulatePhotoScan` / `handleRealPhotoInput`) analiza los metadatos o el nombre de archivo, extrae la ficha del producto (modelo, color, precio estimado, enlace a Google Shopping o tienda oficial) y **descarta la imagen inmediatamente**.

### ADR-09: Algoritmo de Repetición Espaciada y Cooldown para Gestos (`GESTURE_POOL`)
- **Problema:** Si la app sugiere todos los días *"Llévale flores"* o *"Pregúntale por su madre"*, el hombre parece un robot repetitivo y la pareja lo nota.
- **Decisión:** Cada gesto del catálogo tiene un tiempo de enfriamiento (`cd: 3d, 7d, 14d, 21d`). Cuando se completa un gesto, el algoritmo no lo vuelve a mostrar hasta que pasen esos días, forzando rotación constante.

### ADR-10: Ergonomía Táctil y Accesibilidad
- **Problema:** Botones menores de 36px causan frustración y toques erróneos en móviles con una sola mano.
- **Decisión:** Se establecieron zonas mínimas de toque de **44x44px**, inputs a 16px para evitar el zoom forzado de iOS Safari, soporte de `prefers-reduced-motion` y etiquetas `aria-label` en el 100% de botones interactivos.

---

## PARTE 2: Banco Maestro de Mensajes, Voces y Guiones Psicológicos

Este es el corpus textual calibrado en **español natural de España**, con tono coloquial, cero roboticidad y alta empatía femenina.

---

### 1. Las 3 Voces de los Agentes IA (`PERSONAS`)

Cada agente adapta los consejos del día según la fase biológica de la chica:

```
┌─────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Agente          │ Estilo & Matiz Psicológico                                             │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Barney Stinson  │ El estratega del Bro Code y The Playbook. Carismático, ingenioso,      │
│                 │ un paso por delante de la rutina.                                      │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Ejecutivo       │ Cero bromas. Datos al grano, pragmático y enfocado a hombres ocupados. │
├─────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Stifmeister     │ Humor canalla, directo, colega de fiesta sin filtros para espabilar.   │
└─────────────────┴────────────────────────────────────────────────────────────────────────┘
```

#### Consejos por Fase Biológica:

* **Fase Menstrual (`mens` - Días 1 a 5):**
  - **Barney:** *«Código Traje: Operación Mimo con {nombre}. Regla nº 1 del Playbook: cuando ella tiene poca energía, tú apareces con su dulce favorito y te encargas de todo. Legendario.»*
  - **Ejecutivo:** *«Baja energía · Prioriza confort. Evita planes exigentes hoy. Lleva detalle dulce, resuelve la cena y dale descanso.»*
  - **Stifmeister:** *«Quieto parado: hoy toca cuidarla, crack. Ni se te ocurra liarla hoy. Pilla chocolate del bueno, pide comida rica y manta en el sofá. Quedas como un auténtico jefe.»*

* **Ventana Fértil / Ovulación (`fert` - Pico de energía y química):**
  - **Barney:** *«Noche Legendaria a la vista. La química hoy está por las nubes. Ponte guapo, reserva sitio top y si no buscáis mini-tú, ¡usa paracaídas, hermano!»*
  - **Ejecutivo:** *«Alta receptividad · Ventana fértil. Momento óptimo para cita especial. Alta conexión emocional y física (precaución si procede).»*
  - **Stifmeister:** *«¡Fuego en la pista, socio! Hoy está a tope de ganas y buen rollo. Sácala a tomar algo ya mismo (y lleva gomita si no quieres sustos, campeón).»*

* **Fase Premenstrual (`pms` - Sensibilidad / SPM):**
  - **Barney:** *«Alerta Amarilla del Playbook: Escudo Activo. Hoy cero discusiones absurdas. Si dice que el cielo es verde, tú dices «qué bonito tono de verde». Escúchala y triunfarás.»*
  - **Ejecutivo:** *«Fase sensible · Cero fricción. Paciencia máxima hoy. Escucha sin rebatir y pospón conversaciones tensas 72 horas.»*
  - **Stifmeister:** *«Pisa el freno hoy, soldado. Está sensible hoy, así que cierra el pico si vas a discutir una tontería. Dale la razón, abrázala y saldrás vivo.»*

* **Fase Estable (`ok`):**
  - **Barney:** *«Jugada Maestra para hoy. La rutina es el enemigo. Sorpréndela con un plan inesperado antes de que te pregunte qué hacéis hoy.»*
  - **Ejecutivo:** *«Fase estable · Acción recomendada. Buen día para proponer actividad fuera de casa o enviar mensaje de atención.»*
  - **Stifmeister:** *«No te duermas en los laureles, titán. Todo va sobre ruedas, pero no seas aburrido: mándale un WhatsApp con chispa y sácala de la rutina hoy.»*

---

### 2. Motor de Mensajes Contextuales (`generateAIMessages`)

El generador inyecta variables reales del perfil: `{food}`, `{coffee}`, `{sweet}`, `{flw}`, `{artist}`, `{show}`, `{sun.sunset}`, `{sun.golden}`, `{note}` y `{saintHook}`.

#### 2.1 Objetivo: Espontáneo (Romper la rutina entre semana)
* **Variante 1:**
  - *«oye {nombre}, acabo de pasar por un sitio de {food} y me he acordado de ti al segundo... ¿cómo llevas el día?»*
  - *«me acaba de saltar {artist} en el coche y automáticamente he pensado en ti jaja ¿todo bien hoy?»*
  - *«oye, ¿cómo quedó al final lo de «{note}»? me quedé pensándolo»* / *«te digo una cosa rápida: cada día me gustas un poquito más, y mira que ya era difícil»*
* **Variante 2:**
  - *«estaba aquí liado pero he hecho una pausa de 10 segundos solo para ver si tenías un buen día»*
  - *«acabo de ver un sitio con todo tu rollo ({socPlan}) y ya sé dónde te voy a llevar la próxima vez»*
  - *«no sé qué me diste el último día pero todavía me dura el buen humor contigo»*
* **Variante 3:**
  - *«pregunta seria de mitad de semana: ¿del 1 al 10 cuánto te apetece que te mime un rato hoy?»*
  - *«acabo de ver a alguien tomando {coffee} y he pensado: «le falta el estilazo de {nombre}»»*
  - *«tengo una teoría sobre ti que te tengo que contar en persona con algo de beber delante»*

#### 2.2 Objetivo: Proponer Cita (Secuestro romántico)
* **Variante 1:**
  - *«no preguntes por qué pero hoy tengo antojo de llevarte a por {food}. ¿a qué hora te paso a buscar?»*
  - *«hoy se pone el sol a las {sun.sunset}... si aparezco a las {sun.golden} con {coffee}, ¿aceptas el secuestro?»*
  - *«plan sin fisuras para desconectar: tú, yo, {show} y {sweet}. di que sí»*
* **Variante 2:**
  - *«he encontrado el sitio perfecto para hacer nuestro plan de {socPlan}. tú solo ponte guapa que del resto me encargo yo»*
  - *«hoy prohíbo que cocines o pienses: dime a qué hora sales y nos vamos a tomar algo tranquilo»*
  - *«tengo 2 entradas imaginarias para el mejor atardecer de hoy a las {sun.golden}. ¿te vienes conmigo?»*
* **Variante 3:**
  - *«te propongo un trato: yo pongo el sitio de {food} y tú pones esa sonrisa que me encanta»*
  - *«¿hacemos una escapada improvisada luego aunque sea una hora sin mirar el móvil?»*
  - *«esta semana te debo una cita de 10. ¿prefieres terraza al atardecer ({sun.sunset}) o cena sorpresa?»*

#### 2.3 Objetivo: Ligoteo y Tensión Sexual Divertida
* **Variante 1:**
  - *«estaba intentando concentrarme hoy pero con la última foto tuya me lo pones bastante complicado la verdad»*
  - *«¿sabes que tienes una sonrisa que debería ser ilegal entre semana, no?»*
  - *«estoy pensando en cuando te vea luego y te aviso que no pienso portarme nada bien»*
* **Variante 2:**
  - *«si cada vez que pienso en ti me dieran un euro, hoy ya te habría comprado medio escaparate»*
  - *«ayer me quedé con ganas de darte un beso más largo, que lo sepas»*
  - *«me gusta todo de ti, pero cuando me miras así de medio lado me ganas por goleada»*
* **Variante 3:**
  - *«deberían ponerte una multa por distraerme así en pleno día laborable»*
  - *«tienes exactamente ese punto entre tierna y peligrosa que me vuelve loco»*
  - *«¿hoy te vas a poner eso que te queda tan increíble o me vas a tener piedad?»*

#### 2.4 Objetivo: Cuidado y Apoyo (Días pesados o menstruación)
* **Variante 1:**
  - *«hoy cero estrés cuando llegues: te llevo {sweet}, me encargo yo de la cena y tú solo descansa»*
  - *«avísame cuando salgas y te paso a recoger para que no vuelvas sola»*
  - *«solo pasaba por aquí para recordarte lo orgulloso que estoy de ti y de cómo sacas todo adelante»*
* **Variante 2:**
  - *«si hoy el día se pone pesado, acuérdate de que luego tienes abrazo largo reservado conmigo»*
  - *«¿necesitas que me encargue de algún recado hoy para quitarte lío de encima? dímelo sin cortarte»*
  - *«te he comprado {sweet} porque he pensado que hoy te merecías un capricho porque sí»*
* **Variante 3:**
  - *«no hace falta que hoy tengas ganas de hablar mucho, me conformo con estar un rato contigo tranquilo»*
  - *«descansa bien hoy que mañana te llevo {coffee} bien rico para empezar el día»*
  - *«gracias por ser como eres conmigo, de verdad que sumas una barbaridad en mi vida»*

#### 2.5 Objetivo: Excusas Creativas y Santos Internacionales
* **Variante 1:**
  - *«oye, acabo de leer que {saintHook}… así que técnicamente hoy es tu día internacional y me toca invitarte a {food}. ¡felicidades!»*
  - *«me acaban de chivar que hoy es el Día Mundial de comer {food} y creo que es ilegal que no vayamos a celebrarlo tú y yo»*
  - *«estaba leyendo una curiosidad y resulta que la gente nacida en tu mes ({zodiac}) tiene fama de ser irresistible... confirmo al 100%»*
* **Variante 2:**
  - *«he descubierto que en Italia el nombre {nombre} se celebra regalando {sweet} o {flw}, así que hoy me acojo a la ley italiana contigo»*
  - *«según el calendario astronómico hoy el atardecer de las {sun.sunset} es de los más bonitos del mes... necesitaba una excusa para verte y esta es perfecta»*
  - *«acabo de leer un estudio que dice que tomar {coffee} con alguien que te gusta alarga la vida 5 años. ¿nos sumamos 5 años luego?»*
* **Variante 3:**
  - *«hoy en Dinamarca celebran la fiesta de las luces en honor a {nombre}… cualquier excusa internacional me vale para decirte lo guapa que eres»*
  - *«declarado oficialmente hoy como el Día Internacional de mimar a {nombre} sin que sea tu cumpleaños»*
  - *«me ha salido un vídeo de {artist} y he pensado que es la señal del universo para que nos escapemos este finde»*

---

### 3. Historias Culturales de Santos y Nombres (`SAINT_STORIES`)

Ganchos reales para que el mensaje tenga una historia detrás:
- **Lucía:** *«Hoy se celebra Santa Lucía en Escandinavia (Dinamarca y Suecia) con la fiesta de las luces y coronas de flores.»*
- **Vanesa:** *«El nombre Vanesa lo inventó el escritor Jonathan Swift en 1713 para su musa en un poema secreto.»*
- **Clara:** *«En Italia Santa Clara es la patrona tradicional de las noches estrelladas y el buen tiempo.»*
- **Sofía:** *«En Grecia Sofía significa literalmente «la que posee sabiduría y encanto natural».»*
- **Martina:** *«En la Roma clásica tu nombre era el dedicado a la energía, el coraje y la victoria.»*
- **Paula:** *«En la tradición clásica Paula significa «pequeña pero inolvidable».»*
- **Laura:** *«En la antigua Grecia las coronas de laurel (Laura) solo se entregaban a quienes conquistaban a todos.»*
- **Carmen:** *«En toda la costa hoy bendicen el mar con flores por la Virgen del Carmen.»*
- **Elena:** *«En la mitología griega tu nombre significa literalmente «antorcha que ilumina la noche».»*

---

### 4. Consultorio SOS de Psicología de Pareja (`SOS`)

Guiones para cuando las cosas se complican:

#### Crisis 1: «Está enfadada»
- **Qué decirle:**
  - *«Tienes razón en estar molesta, lo entiendo.»*
  - *«Cuéntame qué ha pasado, te escucho con calma.»*
- **Qué evitar a toda costa:**
  - *«Estás exagerando»*
  - *«Cálmate»*
  - Defenderte antes de dejarla hablar.
- **Plan de acción:**
  1. Escucha 5 minutos seguidos sin interrumpir ni dar explicaciones.
  2. Pide perdón por la parte concreta que sí hiciste mal.
  3. Pregunta si necesita espacio o un abrazo.

#### Crisis 2: «La he liado» (Error del usuario)
- **Qué decirle:**
  - *«Me he equivocado y lo siento de verdad.»*
  - *«No quiero que te sientas mal por mi culpa.»*
- **Qué evitar a toda costa:**
  - *«Pero es que yo no quería...»*
  - Excusas largas para justificarte.
  - Hacerte la víctima.
- **Plan de acción:**
  1. Reconoce el fallo en una sola frase directa.
  2. Propón una solución concreta de inmediato.
  3. Cumple sin quejarte en los días siguientes.

#### Crisis 3: «Está triste / Desanimada»
- **Qué decirle:**
  - *«Estoy aquí contigo, no hace falta que me expliques todo si no quieres.»*
  - *«¿Quieres que hablemos o prefieres que nos quedemos un rato tranquilos?»*
- **Qué evitar a toda costa:**
  - Dar soluciones técnicas no solicitadas.
  - *«Bueno, no es para tanto.»*
- **Plan de acción:**
  1. Abrázala y baja el ritmo del día.
  2. Llévale su dulce favorito o prepárale una infusión caliente.
  3. Pregúntale a la mañana siguiente con un mensaje cariñoso.

#### Crisis 4: «Celos o dudas»
- **Qué decirle:**
  - *«Entiendo que te hayas sentido incómoda, hablemos con total tranquilidad.»*
  - *«Para mí eres la única prioridad y te lo digo con toda la seguridad.»*
- **Qué evitar a toda costa:**
  - *«Estás loca»* o *«Son imaginaciones tuyas»*.
  - Esconder el teléfono o ponerte a la defensiva.
- **Plan de acción:**
  1. Transparencia total y tono pausado.
  2. Exprésale qué sientes por ella sin atacar su inseguridad.
  3. Refuerza tu postura con hechos reales en los días posteriores.

#### Crisis 5: «Olvidé una fecha importante»
- **Qué decirle:**
  - *«Se me ha pasado por completo y no tengo ninguna excusa. Déjame compensártelo hoy mismo.»*
- **Qué evitar a toda costa:**
  - Inventar que se te rompió el móvil o que estabas preparando algo.
  - Quitarle importancia diciendo que es solo un día.
- **Plan de acción:**
  1. Reconócelo en el primer segundo, antes de que ella lo saque.
  2. Lleva un detalle hoy mismo (flores frescas o cena sorpresa).
  3. Apunta la fecha de inmediato en Barney.

---

### 5. Catálogo de los 20 Gestos Diarios (`GESTURE_POOL`)

| ID | Categoría | Cooldown | Frecuencia | Gesto exacto |
|---|---|---|---|---|
| `g_hair` | Micro | 3 días | Alta | *Fíjate si hoy se ha hecho las uñas, el pelo o estrena algo y díselo en los primeros 5 segundos.* |
| `g_sidewalk` | Micro | 4 días | Alta | *Al caminar por la acera, ponte tú siempre por el lado de los coches sin decir nada.* |
| `g_home_safe` | Micro | 3 días | Alta | *Cuando vuelva a su casa o salga con amigas, dile: «Avísame cuando llegues para quedarme tranquilo».* |
| `g_followup` | Micro | 4 días | Alta | *Pregúntale cómo acabó aquello que te contó hace unos días (trabajo, amiga o familia).* |
| `g_story` | Micro | 4 días | Alta | *Si sube una historia o cambia su foto, reacciona con un cumplido concreto (no solo un emoji).* |
| `g_listen` | Micro | 3 días | Alta (SPM) | *Hoy escúchala desahogarse sin darle soluciones técnicas: solo abrázala y dale la razón.* |
| `g_eye_compliment` | Micro | 4 días | Alta | *Mírala un segundo en silencio y dile lo guapa que está hoy sin que venga a cuento.* |
| `g_laugh_tease` | Micro | 3 días | Alta | *Mándale una broma interna vuestra sin pedirle quedar hoy (cero necesidad).* |
| `g_chore` | Cuidado | 8 días | Media | *Encárgate hoy de una tarea o recado que a ella le dé pereza sin que te lo pida.* |
| `g_coffee` | Cuidado | 7 días | Media | *Aparece con su café o bebida favorita sin preguntar antes si quiere.* |
| `g_photo` | Cuidado | 9 días | Media | *Hazle una foto distraída mientras se ríe y mándasela luego: «Mira qué guapa salías aquí».* |
| `g_song` | Cuidado | 8 días | Media | *Mándale una canción diciendo: «La acabo de escuchar y me he acordado de ti».* |
| `g_dinner_cook` | Cuidado | 10 días | Media (SPM) | *Hoy encárgate tú al 100% de la cena para que ella solo tenga que sentarse y descansar.* |
| `g_suegra_ask` | Cuidado | 10 días | Media | *Pregúntale qué tal está su madre o su familia (suma el doble de puntos con ella).* |
| `g_guess_dinner` | Cita | 14 días | Quincenal | *Usa el truco: «Adivina dónde te llevo hoy a cenar» y llévala al primer sitio que diga con ilusión.* |
| `g_sunset_escape` | Cita | 12 días | Quincenal | *Propón ver el atardecer hoy en un sitio distinto sin mirar el móvil en 1 hora.* |
| `g_spontaneous_night` | Cita | 12 días | Quincenal | *Improvisa un plan nocturno espontáneo entre semana para romper la rutina.* |
| `g_surprise_gift` | Regalo | 21 días | Alto impacto | *Hazle un pequeño regalo sorpresa hoy SIN que sea una fecha especial.* |
| `g_random_flowers` | Regalo | 25 días | Alto impacto | *Llévale sus flores favoritas un día cualquiera solo porque sí.* |
| `g_sweet_craving` | Regalo | 18 días | Alto impacto (SPM) | *Sorpréndela llevándole su dulce o chocolate favorito sin avisar.* |

---

### 6. Arquetipos de Lectura en Frío (`SOCIAL_DIMENSIONS`)

Cuando el usuario describe las fotos o gustos de la chica, el motor activa estas deducciones psicológicas y sugerencias:

1. **Viajera & Sunset Lover:**
   - *Psicología:* Espíritu libre y visual. Asocia el amor con vivir experiencias fuera de la rutina. Se aburre con la monotonía y valora que el hombre proponga escapadas sin que ella tenga que organizarlo todo.
   - *Odia:* La rutina pesada, encerrarse todo el finde y que se quejen al viajar.
   - *Joya recomendada:* Oro dorado fino resistente al agua.
   - *Cita ideal:* Terraza secreta al atardecer + cóctel de autor.
2. **Clean Girl & Wellness:**
   - *Psicología:* Disciplinada, cuida su energía y su imagen al detalle. Valora el orden, la calma y los aromas limpios. Le atraen hombres con iniciativa que aportan paz mental.
   - *Odia:* El caos, la impuntualidad, el humo de tabaco y trasnochar forzada.
   - *Joya recomendada:* Aros dorados minimalistas.
   - *Cita ideal:* Brunch bonito al sol + paseo tranquilo con matcha latte.
3. **Fashion & Lujo Silencioso:**
   - *Psicología:* Sentido estético altísimo. Invierte tiempo en cómo se presenta y espera que tú te fijes en los primeros 5 segundos cuando estrena ropa o bolso.
   - *Odia:* Que no te fijes cuando se arregla, sitios descuidados o cutres y regalos genéricos de última hora.
   - *Joya recomendada:* Dorado clásico o perlas modernas.
   - *Cita ideal:* Cena en restaurante de moda con decoración cuidada + cóctel.
4. **Social, Divertida & Festivalera:**
   - *Psicología:* Extrovertida y muy leal a sus amigas. Lo que más le enamora es reírse contigo y sentir que eres su mejor cómplice, nunca alguien celoso que le corte las alas.
   - *Odia:* Celos absurdos cuando sale con amigas, personas aburridas y silencios incómodos.
   - *Joya recomendada:* Plata brillante o complementos llamativos.
   - *Cita ideal:* Tardeo con música en vivo + tacos gourmet y margaritas.
5. **Foodie & Hedonista:**
   - *Psicología:* Disfruta de los placeres sensoriales. Para ella, una buena cena con vino y una conversación relajada vale más que cualquier discurso ostentoso.
   - *Odia:* Que le preguntes «¿qué cenamos?» sin proponer nada, o esperar de pie mesa sin reserva previa.
   - *Joya recomendada:* Oro cálido clásico.
   - *Cita ideal:* Ruta gastronómica o menú degustación con reserva sorpresa.
6. **Intelectual, Sensible & Artística:**
   - *Psicología:* Profunda y selectiva. Analiza el vocabulario y la sensibilidad de los mensajes. Valora los detalles con historia y las conversaciones de madrugada.
   - *Odia:* La superficialidad, mensajes vacíos tipo robot y la falta de empatía.
   - *Joya recomendada:* Oro antiguo o plata minimalista con piedra natural.
   - *Cita ideal:* Exposición/teatro + cena íntima con velas en barrio bohemio.
7. **Tierna & Amante de los Animales:**
   - *Psicología:* Protectora, afectuosa y transparente. Juzga a las personas por cómo tratan a los animales y a los camareros. Se derrite ante la ternura genuina.
   - *Odia:* El postureo falso, la frialdad emocional y los ambientes pretenciosos.
   - *Joya recomendada:* Oro fino con colgante delicado.
   - *Cita ideal:* Escapada a la naturaleza / picnic al atardecer + cena acogedora.

---
*Fin del documento de decisiones y banco maestro de mensajería.*
