// ==========================================
// WINGMAN (WM) — Cerebro & Lógica de la App
// ==========================================

// Base de datos de perfiles iniciales de demostración
const DEFAULT_PROFILES = [
  {
    id: "prof_lucia",
    name: "Lucía",
    status: "Pareja",
    avatarColor: "#e5b84b",
    birthday: "1997-05-14",
    lastPeriodDate: "2026-09-27",
    cycleDay: 14,
    cycleLength: 28,
    zodiac: "Tauro",
    favorites: {
      cafe: "Latte con leche de avena y canela",
      flores: "Peonías o tulipanes blancos",
      dulce: "Chocolate negro con sal marina o croissant",
      comida: "Sushi, pasta trufada y comida mexicana",
      oloresOdiados: "Tabaco y frituras fuertes"
    },
    sizes: {
      anillo: "Talla 12 (dedo anular)",
      calzado: "38 EU",
      camiseta: "Talla S / 36",
      pantalon: "Talla 36"
    },
    dates: [
      { id: "d1", title: "Aniversario de Novios", date: "2026-11-12", icon: "💍" },
      { id: "d2", title: "Primer Beso", date: "2026-10-24", icon: "💋" },
      { id: "d3", title: "Cumpleaños de Lucía", date: "2027-05-14", icon: "🎂" }
    ],
    hints: [
      { id: "h1", text: "Dijo al pasar que le flipa el perfume de jazmín de Diptyque", cat: "Regalo", date: "Ayer" },
      { id: "h2", text: "Tiene muchas ganas de probar la tarta de queso de La Viña", cat: "Restaurante", date: "Hace 4 días" },
      { id: "h3", text: "Comentó que el jersey de lana beige de Sézane le queda precioso", cat: "Talla", date: "Hace 1 semana" }
    ]
  },
  {
    id: "prof_marta",
    name: "Marta",
    status: "Conociéndola",
    avatarColor: "#ec4899",
    birthday: "2000-09-22",
    lastPeriodDate: null,
    cycleDay: 8,
    cycleLength: 28,
    zodiac: "Virgo",
    favorites: {
      cafe: "Iced Americano con toque de vainilla",
      flores: "Margaritas o flores silvestres",
      dulce: "Helado de pistacho o galletas Lotus",
      comida: "Tacos al pastor y comida tailandesa",
      oloresOdiados: "Colonias masculinas demasiado fuertes"
    },
    sizes: {
      anillo: "Pendiente (mira misión Wingman)",
      calzado: "37 EU",
      camiseta: "Talla XS / S",
      pantalon: "Pendiente"
    },
    dates: [
      { id: "d4", title: "Primera Cita", date: "2026-10-03", icon: "🍸" },
      { id: "d5", title: "Cumpleaños de Marta", date: "2027-09-22", icon: "🎂" }
    ],
    hints: [
      { id: "h4", text: "Su grupo favorito (Coldplay) toca el año que viene", cat: "Viaje", date: "En la primera cita" },
      { id: "h5", text: "Le encanta el vino blanco verdejo muy frío", cat: "Restaurante", date: "Hace 3 días" }
    ]
  }
];

// Base de ideas por niveles
const IDEAS_DATABASE = {
  0: [
    { title: "Nota sorpresa en el bolso o espejo", desc: "Escribe en un post-it: 'Solo quería recordarte lo guapa que estás hoy'. Cero euros, impacto emocional máximo." },
    { title: "Masaje de pies o espalda sin pedir nada a cambio", desc: "Pon música relajante, aceite o crema y dale 15 minutos de masaje. Sin buscar sexo, solo puro mimo." },
    { title: "Noche de cine personalizada en casa", desc: "Elige su película favorita, prepara palomitas y ten su manta lista en el sofá antes de que llegue." },
    { title: "Playlist privada de Spotify", desc: "Crea una lista con 10 canciones que te recuerden a momentos juntos y titúlala con una broma interna vuestra." }
  ],
  1: [
    { title: "Su café exacto por sorpresa", desc: "Aparece con su café favorito antes de que empiece a trabajar o estudiar. Demuestra que recuerdas sus gustos exactos." },
    { title: "Una flor suelta camino a casa", desc: "No compres un ramo gigante de 60€. Una peonía o un tulipán suelto un martes cualquiera transmite mucho más amor espontáneo." },
    { title: "Su dulce o postre reconfortante", desc: "Pásate por su pastelería preferida y llévale ese croissant o chocolatina que le alegra el día." },
    { title: "Desayuno sorpresa de panadería", desc: "Levántate 20 minutos antes y vuelve con pan recién hecho, fruta y zumo para desayunar juntos en la cama." }
  ],
  2: [
    { title: "Experiencia o cena en restaurante de su lista", desc: "Reserva en ese sitio que ella mencionó hace semanas y no le digas adónde vais hasta llegar a la puerta." },
    { title: "Joyería sutil (con su talla verificada)", desc: "Un collar fino con la inicial de su nombre o una pulsera minimalista en plata o dorado según sus joyas habituales." },
    { title: "Su perfume favorito de reposición", desc: "Mira qué bote le queda a menos de la mitad en su tocador y regálaselo antes de que se le gaste." },
    { title: "Escapada de fin de semana sorpresa", desc: "Una noche en una cabaña en la montaña o un hotel boutique con spa cerca de la ciudad." }
  ]
};

// Base de mensajes para WhatsApp
const MESSAGES_DATABASE = {
  morning: [
    "Buenos días preciosa. Solo te escribía para decirte que me he despertado acordándome de ti. Que tengas un día increíble ☕✨",
    "Paso por aquí para recordarte que estás guapísima hasta con cara de sueño. ¡A comerte el día! 💪",
    "Oye, tengo un problema grave hoy: no me concentro porque no paro de pensar en lo bien que lo pasamos el otro día 😏"
  ],
  spontaneous: [
    "Oye, no hay ninguna fecha especial hoy, pero quería decirte que me encanta tenerte en mi vida.",
    "Estaba escuchando una canción y me he acordado directo de tu risa. Eres de lo mejor que me ha pasado últimamente.",
    "¿Sabes qué me gusta de ti? Que haces que los días normales parezcan planes increíbles."
  ],
  spicy: [
    "Tengo que decirte una cosa urgente: el vestido/ropa que llevabas ayer debería ser ilegal... me costó mantener la compostura 😏🔥",
    "Tengo muchas ganas de verte hoy. Y no precisamente para hablar de cómo nos ha ido el día...",
    "Hazme un favor: no te pongas nada cómodo esta noche que tengo otros planes en mente."
  ],
  support: [
    "Sé que hoy el cuerpo te pide sofá y desconectar. No te preocupes por nada, yo me encargo de la cena o de lo que necesites ❤️",
    "Si hoy el mundo te parece pesado, acuérdate de que tienes a tu mayor fan aquí para darte mimos y llevarte chocolate.",
    "Paso de camino a casa. ¿Quieres que te compre algo dulce o algo calentito? Pídeme lo que sea."
  ]
};

// Información de signos del zodiaco
const ZODIAC_DATA = {
  "Aries": { icon: "♈", tip: "Directa y apasionada. Dile hoy: 'Me encanta la determinación que le pones a todo'." },
  "Tauro": { icon: "♉", tip: "Valora la lealtad, la paz y la buena comida. Dile hoy: 'Tienes un gusto exquisito para todo'." },
  "Géminis": { icon: "♊", tip: "Curiosa e ingeniosa. Mándale un meme o dato curioso hoy y pídele su opinión." },
  "Cáncer": { icon: "♋", tip: "Emocional y hogareña. Hoy necesita saberse querida y un abrazo largo en el sofá." },
  "Leo": { icon: "♌", tip: "Luminosa y segura. Halaga su estilo hoy: 'Ese look te queda de revista'." },
  "Virgo": { icon: "♍", tip: "Detallista y trabajadora. Alíviale una carga: 'Déjame que yo me encargue de eso por ti'." },
  "Libra": { icon: "♎", tip: "Amante de la belleza y la armonía. Llévala a un sitio bonito y cuida los detalles estéticos." },
  "Escorpio": { icon: "♏", tip: "Intensa y leal. Conéctate con miradas directas y conversación profunda a solas." },
  "Sagitario": { icon: "♐", tip: "Aventurera y libre. Proponle una escapada o plan improvisado fuera de la rutina." },
  "Capricornio": { icon: "♑", tip: "Ambiciosa y fiel. Celebra sus logros profesionales: 'Estoy súper orgulloso de lo que estás consiguiendo'." },
  "Acuario": { icon: "♒", tip: "Original e independiente. Dale su espacio y admira su forma única de ver las cosas." },
  "Piscis": { icon: "♓", tip: "Romántica y soñadora. Una nota bonita o música suave le derretirá el corazón hoy." }
};

// ==========================================
// ESTADO DE LA APLICACIÓN
// ==========================================

class WingmanApp {
  constructor() {
    this.profiles = this.loadProfiles();
    this.activeProfileId = this.profiles[0]?.id || "prof_lucia";
    this.activeTier = 0;
    this.activeMsgCategory = "morning";
    this.isLocked = false;

    this.initDOM();
    this.bindEvents();
    this.renderAll();
  }

  loadProfiles() {
    const saved = localStorage.getItem("wm_profiles");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_PROFILES;
  }

  saveProfiles() {
    localStorage.setItem("wm_profiles", JSON.stringify(this.profiles));
  }

  getActiveProfile() {
    return this.profiles.find(p => p.id === this.activeProfileId) || this.profiles[0];
  }

  // ==========================================
  // INICIALIZACIÓN Y EVENTOS
  // ==========================================
  initDOM() {
    // Referencias a elementos clave
    this.lockScreen = document.getElementById("lock-screen");
    this.btnUnlock = document.getElementById("btn-unlock");
    this.quickUnlock = document.getElementById("quick-demo-unlock");
    this.btnLockToggle = document.getElementById("btn-lock-toggle");
    this.btnHeaderLock = document.getElementById("btn-header-lock");
    this.btnToggleView = document.getElementById("btn-toggle-view");
    this.phoneFrame = document.getElementById("phone-frame");
    this.toast = document.getElementById("toast");

    this.profilesBar = document.getElementById("profiles-bar");
    this.cycleSlider = document.getElementById("cycle-slider");
    this.sliderDayIndicator = document.getElementById("slider-day-indicator");
    this.cycleBadge = document.getElementById("cycle-badge");

    // Modales
    this.modalHint = document.getElementById("modal-hint");
    this.modalSos = document.getElementById("modal-sos");
    this.modalAddProfile = document.getElementById("modal-add-profile");
  }

  bindEvents() {
    // Desbloqueo y bloqueo
    this.btnUnlock.addEventListener("click", () => this.unlock());
    this.quickUnlock.addEventListener("click", () => this.unlock());
    this.btnLockToggle.addEventListener("click", () => this.toggleLock());
    this.btnHeaderLock.addEventListener("click", () => this.toggleLock());

    // Toggle de vista completa / marco móvil en PC
    this.btnToggleView.addEventListener("click", () => {
      if (this.phoneFrame.style.maxWidth === "100%") {
        this.phoneFrame.style.maxWidth = "430px";
        this.phoneFrame.style.borderRadius = "38px";
        this.phoneFrame.style.border = "8px solid #1e293b";
        this.btnToggleView.textContent = "📱 Pantalla Completa";
      } else {
        this.phoneFrame.style.maxWidth = "100%";
        this.phoneFrame.style.borderRadius = "0";
        this.phoneFrame.style.border = "none";
        this.btnToggleView.textContent = "💻 Vista Móvil";
      }
    });

    // Navegación de pestañas inferiores
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetTab = btn.getAttribute("data-tab");
        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(targetTab)?.classList.add("active");
      });
    });

    // Slider de simulación del ciclo
    this.cycleSlider.addEventListener("input", (e) => {
      const day = parseInt(e.target.value);
      const prof = this.getActiveProfile();
      prof.cycleDay = day;
      this.sliderDayIndicator.textContent = `Día ${day} de 28`;
      this.renderCycleRadar(prof);
      this.saveProfiles();
    });

    // Pestañas de niveles de regalos
    document.querySelectorAll(".tier-btn[data-tier]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tier-btn[data-tier]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeTier = parseInt(btn.getAttribute("data-tier"));
        this.renderTierIdeas();
      });
    });

    // Pestañas de categorías de mensajes
    document.querySelectorAll(".tier-btn[data-msg-cat]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tier-btn[data-msg-cat]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeMsgCategory = btn.getAttribute("data-msg-cat");
        this.renderMessages();
      });
    });

    // Botones de Modales
    document.getElementById("btn-open-hint-modal").addEventListener("click", () => {
      this.modalHint.classList.add("open");
      document.getElementById("hint-input-text").focus();
    });
    document.getElementById("btn-close-hint-modal").addEventListener("click", () => this.modalHint.classList.remove("open"));

    document.getElementById("btn-save-hint").addEventListener("click", () => this.saveHintFromModal());

    // Botón SOS
    document.getElementById("btn-open-sos").addEventListener("click", () => this.modalSos.classList.add("open"));
    document.getElementById("btn-activate-sos").addEventListener("click", () => this.modalSos.classList.add("open"));
    document.getElementById("btn-close-sos-modal").addEventListener("click", () => this.modalSos.classList.remove("open"));
    document.getElementById("btn-done-sos").addEventListener("click", () => this.modalSos.classList.remove("open"));

    // Modal Añadir Chica
    document.getElementById("btn-close-add-profile").addEventListener("click", () => this.modalAddProfile.classList.remove("open"));
    document.getElementById("btn-save-new-profile").addEventListener("click", () => this.saveNewProfile());

    // Añadir fecha rápida
    document.getElementById("btn-add-date").addEventListener("click", () => {
      const title = prompt("Título de la fecha especial (Ej: Primer Beso, Viaje a Roma):");
      if (!title) return;
      const dateStr = prompt("Fecha en formato YYYY-MM-DD (Ej: 2026-11-20):");
      if (!dateStr) return;
      const prof = this.getActiveProfile();
      prof.dates.push({ id: "d_" + Date.now(), title, date: dateStr, icon: "✨" });
      this.saveProfiles();
      this.renderDates(prof);
      this.showToast("Fecha guardada en el calendario de " + prof.name);
    });

    // Editar expediente de gustos
    document.getElementById("btn-edit-vault").addEventListener("click", () => {
      const prof = this.getActiveProfile();
      const newCafe = prompt("¿Cuál es su café favorito exacto?", prof.favorites.cafe);
      if (newCafe !== null) prof.favorites.cafe = newCafe;
      const newDulce = prompt("¿Cuál es su dulce o postre preferido?", prof.favorites.dulce);
      if (newDulce !== null) prof.favorites.dulce = newDulce;
      this.saveProfiles();
      this.renderVault(prof);
      this.showToast("Expediente de " + prof.name + " actualizado");
    });
  }

  unlock() {
    this.lockScreen.classList.add("hidden");
    this.isLocked = false;
    this.showToast("Bienvenido a Wingman");
  }

  toggleLock() {
    if (this.lockScreen.classList.contains("hidden")) {
      this.lockScreen.classList.remove("hidden");
      this.isLocked = true;
    } else {
      this.unlock();
    }
  }

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.add("show");
    setTimeout(() => {
      this.toast.classList.remove("show");
    }, 2400);
  }

  // ==========================================
  // RENDERING ENGINE
  // ==========================================
  renderAll() {
    const prof = this.getActiveProfile();
    this.renderProfilePills();
    this.renderCycleRadar(prof);
    this.renderCosmic(prof);
    this.renderDates(prof);
    this.renderTierIdeas();
    this.renderMessages();
    this.renderVault(prof);
  }

  renderProfilePills() {
    this.profilesBar.innerHTML = "";
    this.profiles.forEach(p => {
      const pill = document.createElement("button");
      pill.className = `profile-pill ${p.id === this.activeProfileId ? "active" : ""}`;
      pill.innerHTML = `
        <span class="status-dot" style="background: ${p.status === 'Pareja' ? '#10b981' : '#ec4899'};"></span>
        <span>${p.name}</span>
        <span style="font-size: 10px; opacity: 0.7;">(${p.status === 'Pareja' ? 'Pareja' : 'Citas'})</span>
      `;
      pill.addEventListener("click", () => {
        this.activeProfileId = p.id;
        this.renderAll();
      });
      this.profilesBar.appendChild(pill);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "add-profile-pill";
    addBtn.textContent = "+ Añadir Chica";
    addBtn.addEventListener("click", () => {
      this.modalAddProfile.classList.add("open");
    });
    this.profilesBar.appendChild(addBtn);
  }

  renderCycleRadar(prof) {
    const day = prof.cycleDay || 14;
    this.cycleSlider.value = day;
    this.sliderDayIndicator.textContent = `Día ${day} de 28`;

    let badgeText = "";
    let badgeClass = "";
    let fertility = "";
    let fertilityColor = "";
    let energy = "";
    let energyColor = "";
    let smell = "";
    let smellColor = "";
    let mood = "";
    let moodColor = "";
    let briefing = "";
    let actions = [];

    if (day >= 1 && day <= 5) {
      // Menstruación
      badgeText = `Día ${day} • Menstruación (Regla)`;
      badgeClass = "badge-danger";
      fertility = "Baja (Casi nula)";
      fertilityColor = "#10b981";
      energy = "Baja / Cansancio físico";
      energyColor = "#f59e0b";
      smell = "Sensible a olores";
      smellColor = "#f59e0b";
      mood = "Necesita paz y confort";
      moodColor = "#a855f7";
      briefing = `<strong>Regla activa en ${prof.name}:</strong> Tiene molestias físicas y caída de energía. Tu papel hoy es ser su refugio: cero demandas, prepárale algo dulce o cena rica y déjala descansar.`;
      actions = [
        `🍫 Cómprale un dulce o su chocolatina favorita camino a casa (aunque no se lo coma, el gesto es de 10).`,
        `🛋️ Plan ideal: Película en el sofá, manta caliente y mimos sin buscar nada más.`,
        `🚫 No le propongas planes agotadores con mucha gente hoy.`
      ];
    } else if (day >= 6 && day <= 11) {
      // Folicular
      badgeText = `Día ${day} • Fase Folicular`;
      badgeClass = "badge-purple";
      fertility = "Media / En ascenso";
      fertilityColor = "#f59e0b";
      energy = "Alta y sociable";
      energyColor = "#10b981";
      smell = "Normal";
      smellColor = "#94a3b8";
      mood = "Optimista y receptiva";
      moodColor = "#10b981";
      briefing = `<strong>Fase de subida de estrógenos:</strong> ${prof.name} se siente con energía fresca, ganas de salir, probar restaurantes nuevos y reírse. Es la mejor semana para citas dinámicas fuera de casa.`;
      actions = [
        `🍸 Invítala a un restaurante nuevo o una copa en una terraza bonita.`,
        `✨ Está súper receptiva a conversaciones divertidas y planes espontáneos.`,
        `💬 Mándale un mensaje con tonteo hoy a mediodía.`
      ];
    } else if (day >= 12 && day <= 16) {
      // Ovulación / Pico Fértil
      badgeText = `Día ${day} • Pico de Ovulación`;
      badgeClass = "badge-gold";
      fertility = "🔥 MÁXIMA (Alerta Embarazo)";
      fertilityColor = "#ef4444";
      energy = "⚡ Máxima / Libido a tope";
      energyColor = "#10b981";
      smell = "Muy agudo (Usa buena colonia)";
      smellColor = "#ec4899";
      mood = "Segura de sí misma y apasionada";
      moodColor = "#ec4899";
      briefing = `<strong>ALERTA DE OVULACIÓN:</strong> ${prof.name} está en su pico biológico de fertilidad y deseo sexual. Si no buscáis bebé, <em>¡precaución máxima (nada de hacerlo a pelo)!</em>. Por la noche, noche de pasión garantizada.`;
      actions = [
        `⚠️ Cuidado con la anticoncepción: fertilidad en su punto más alto del mes.`,
        `🔥 Vístete impecable, arréglate bien y échate tu mejor perfume (su olfato está híper sensible).`,
        `💋 El romanticismo apasionado y el juego previo hoy triunfan al 100%.`
      ];
    } else if (day >= 17 && day <= 21) {
      // Lútea Temprana
      badgeText = `Día ${day} • Fase Lútea Temprana`;
      badgeClass = "badge-success";
      fertility = "Baja";
      fertilityColor = "#10b981";
      energy = "Estable y calmada";
      energyColor = "#3b82f6";
      smell = "Normal";
      smellColor = "#94a3b8";
      mood = "Hogareña y reflexiva";
      moodColor = "#3b82f6";
      briefing = `<strong>Transición lútea:</strong> La progesterona empieza a subir. Buen momento para conversaciones tranquilas, planes íntimos de pareja y hablar del futuro o de vuestros proyectos.`;
      actions = [
        `🏡 Cocinad juntos en casa o dad un paseo tranquilo.`,
        `❤️ Valora el tiempo de calidad sin pantallas ni prisas.`
      ];
    } else {
      // Premenstrual / SPM (Día 22-28)
      badgeText = `Día ${day} • Fase Premenstrual (SPM)`;
      badgeClass = "badge-warning";
      fertility = "Baja";
      fertilityColor = "#10b981";
      energy = "Baja / Retención de líquidos";
      energyColor = "#f59e0b";
      smell = "Muy sensible a olores y comida";
      smellColor = "#ef4444";
      mood = "⚠️ Irritabilidad / Sensible";
      moodColor = "#ef4444";
      briefing = `<strong>MODO DIPLOMÁTICO / CORTAFUEGOS:</strong> Caída drástica de serotonina. ${prof.name} puede estar más susceptible o estresada por cualquier nimiedad. <em>No te metas en discusiones, dale la razón y cuida tus palabras.</em>`;
      actions = [
        `🛡️ Regla de oro: No entres al trapo. Si se queja de algo, no debatas: asiente y apóyala.`,
        `💆 Dale un masaje en el cuello o la espalda para quitar tensión.`,
        `🍫 Cero comentarios sobre su peso o su estado de ánimo. Un detalle dulce la desarmará.`
      ];
    }

    this.cycleBadge.textContent = badgeText;
    this.cycleBadge.className = `badge ${badgeClass}`;

    const mFert = document.getElementById("metric-fertility");
    mFert.textContent = fertility;
    mFert.style.color = fertilityColor;

    const mEner = document.getElementById("metric-energy");
    mEner.textContent = energy;
    mEner.style.color = energyColor;

    const mSmell = document.getElementById("metric-smell");
    mSmell.textContent = smell;
    mSmell.style.color = smellColor;

    const mMood = document.getElementById("metric-mood");
    mMood.textContent = mood;
    mMood.style.color = moodColor;

    document.getElementById("wingman-briefing-text").innerHTML = briefing;

    const actionList = document.getElementById("cycle-action-list");
    actionList.innerHTML = actions.map(act => `<li><span>👉</span> <span>${act}</span></li>`).join("");

    // Detalle recomendado de hoy
    document.getElementById("detail-today-desc").textContent = 
      day >= 22 || day <= 5 
        ? `Llévale ${prof.favorites.dulce || 'su chocolate favorito'} o prepara una infusión caliente. En estos días un dulce no le hace daño a nadie y te corona como un rey.`
        : `Sorpréndela con un mensaje a media tarde o invítala a tomar un café. Pequeños gestos que mantienen viva la llama.`;
  }

  renderCosmic(prof) {
    // Cálculo aproximado de Luna real
    const lunarPhases = [
      { name: "Luna Llena", icon: "🌕", tip: "Mística y romántica. Excusa perfecta para sacarle una foto bajo las estrellas o salir a dar un paseo nocturno." },
      { name: "Cuarto Menguante", icon: "🌗", tip: "Energía de cerrar ciclos. Ideal para escucharla y dejar que se desahogue de la semana." },
      { name: "Luna Nueva", icon: "🌑", tip: "Comienzo de ciclo. Proponle un nuevo plan que nunca hayáis hecho juntos." },
      { name: "Cuarto Creciente", icon: "🌓", tip: "Energía positiva creciente. Excelente momento para hablar de viajes o proyectos futuros." }
    ];
    const todayPhase = lunarPhases[0]; // Demostración fija en Luna Llena para máximo romanticismo
    document.getElementById("lunar-icon").textContent = todayPhase.icon;
    document.getElementById("lunar-phase-name").textContent = todayPhase.name;
    document.getElementById("lunar-tip").textContent = todayPhase.tip;

    // Signo del zodiaco de ella
    const zodiacName = prof.zodiac || "Tauro";
    const zodiacInfo = ZODIAC_DATA[zodiacName] || ZODIAC_DATA["Tauro"];
    document.getElementById("zodiac-icon").textContent = zodiacInfo.icon;
    document.getElementById("zodiac-sign-name").textContent = zodiacName;
    document.getElementById("zodiac-tip").textContent = zodiacInfo.tip;
  }

  renderDates(prof) {
    const list = document.getElementById("dates-list");
    if (!prof.dates || prof.dates.length === 0) {
      list.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">No hay fechas registradas. Pulsa en + Añadir.</p>`;
      return;
    }

    list.innerHTML = prof.dates.map(d => {
      // Calcular días restantes
      const now = new Date();
      const target = new Date(d.date);
      const diffTime = target - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const countdownText = diffDays > 0 ? `Faltan ${diffDays} días` : (diffDays === 0 ? "¡ES HOY!" : "Ya pasó");
      const badgeStyle = diffDays <= 7 ? "badge-danger" : "badge-gold";

      return `
        <div class="idea-item">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 20px;">${d.icon || '🗓️'}</div>
            <div class="idea-text">
              <h4>${d.title}</h4>
              <p>${d.date}</p>
            </div>
          </div>
          <span class="badge ${badgeStyle}">${countdownText}</span>
        </div>
      `;
    }).join("");
  }

  renderTierIdeas() {
    const container = document.getElementById("tier-ideas-container");
    const ideas = IDEAS_DATABASE[this.activeTier] || IDEAS_DATABASE[0];
    const prof = this.getActiveProfile();

    container.innerHTML = ideas.map(idea => `
      <div class="idea-item">
        <div class="idea-text">
          <h4>${idea.title}</h4>
          <p>${idea.desc.replace(/su dulce/g, prof.favorites.dulce || 'su dulce favorito')}</p>
        </div>
        <button class="btn-secondary" style="padding: 5px 9px; font-size: 11px; white-space: nowrap;" onclick="app.showToast('¡Plan fijado en tu radar!')">
          Elegir
        </button>
      </div>
    `).join("");
  }

  renderMessages() {
    const container = document.getElementById("messages-list-container");
    const msgs = MESSAGES_DATABASE[this.activeMsgCategory] || MESSAGES_DATABASE.morning;

    container.innerHTML = msgs.map(msg => `
      <div class="idea-item" style="cursor: pointer;" onclick="app.copyMessage('${encodeURIComponent(msg)}')">
        <div class="idea-text" style="width: 100%;">
          <p style="color: #f1f5f9; font-size: 12.5px; line-height: 1.4;">"${msg}"</p>
        </div>
        <div style="font-size: 16px; opacity: 0.8;" title="Copiar">📋</div>
      </div>
    `).join("");
  }

  copyMessage(encoded) {
    const text = decodeURIComponent(encoded);
    navigator.clipboard?.writeText(text);
    this.showToast("Copiado al portapapeles. ¡Pégalo en WhatsApp!");
  }

  renderVault(prof) {
    // Barra de completitud
    let score = 0;
    if (prof.birthday) score += 20;
    if (prof.lastPeriodDate) score += 20;
    if (prof.favorites.cafe) score += 15;
    if (prof.favorites.dulce) score += 15;
    if (prof.sizes.anillo && !prof.sizes.anillo.includes("Pendiente")) score += 15;
    if (prof.hints && prof.hints.length > 0) score += 15;

    document.getElementById("vault-completion-text").textContent = `${score}%`;
    document.getElementById("vault-progress-bar").style.width = `${score}%`;
    document.getElementById("vault-status-badge").textContent = prof.status;

    // Misión Wingman sugerida
    const missionBox = document.getElementById("spy-mission-box");
    if (!prof.sizes.anillo || prof.sizes.anillo.includes("Pendiente")) {
      missionBox.innerHTML = `<strong>Misión Wingman:</strong> ¿No sabes su talla de anillo? Pruébate jugando uno de sus anillos en tu meñique y fíjate exactamente hasta qué nudillo llega. ¡Listo!`;
    } else if (!prof.lastPeriodDate) {
      missionBox.innerHTML = `<strong>Misión Wingman:</strong> Si un día dice que le duele la tripa o está cansada, pregúntale con cariño: <em>'¿Esos días del mes?'</em> y apunta la fecha aquí.`;
    } else {
      missionBox.innerHTML = `<strong>Misión Wingman:</strong> ¡Expediente impecable! Sigue usando el botón <em>'Cazar Indirecta'</em> cada vez que mencione algo que le gusta.`;
    }

    // Grid de favoritos
    const favGrid = document.getElementById("vault-favorites-grid");
    favGrid.innerHTML = `
      <div class="vault-item">
        <span>Café favorito</span>
        <strong>${prof.favorites.cafe || 'Por registrar'}</strong>
      </div>
      <div class="vault-item">
        <span>Flores</span>
        <strong>${prof.favorites.flores || 'Por registrar'}</strong>
      </div>
      <div class="vault-item">
        <span>Dulce / Antojo</span>
        <strong>${prof.favorites.dulce || 'Por registrar'}</strong>
      </div>
      <div class="vault-item">
        <span>Comida preferida</span>
        <strong>${prof.favorites.comida || 'Por registrar'}</strong>
      </div>
    `;

    // Grid de tallas
    const sizeGrid = document.getElementById("vault-sizes-grid");
    sizeGrid.innerHTML = `
      <div class="vault-item">
        <span>Anillo</span>
        <strong>${prof.sizes.anillo || 'Por registrar'}</strong>
      </div>
      <div class="vault-item">
        <span>Zapatos</span>
        <strong>${prof.sizes.calzado || 'Por registrar'}</strong>
      </div>
      <div class="vault-item">
        <span>Ropa / Camiseta</span>
        <strong>${prof.sizes.camiseta || 'Por registrar'}</strong>
      </div>
      <div class="vault-item">
        <span>Pantalón</span>
        <strong>${prof.sizes.pantalon || 'Por registrar'}</strong>
      </div>
    `;

    // Indirectas cazadas
    const hintsCount = document.getElementById("hints-count");
    hintsCount.textContent = prof.hints?.length || 0;

    const hintsList = document.getElementById("vault-hints-list");
    if (!prof.hints || prof.hints.length === 0) {
      hintsList.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">Aún no has cazado ninguna indirecta. Pulsa el botón flotante amarillo.</p>`;
    } else {
      hintsList.innerHTML = prof.hints.map(h => `
        <div class="idea-item">
          <div class="idea-text">
            <h4>${h.cat || 'Capricho'}: ${h.text}</h4>
            <p>Anotado: ${h.date}</p>
          </div>
          <button class="btn-secondary" style="padding: 4px 7px; font-size: 11px;" onclick="app.deleteHint('${h.id}')">✕</button>
        </div>
      `).join("");
    }
  }

  saveHintFromModal() {
    const text = document.getElementById("hint-input-text").value.trim();
    const cat = document.getElementById("hint-input-cat").value;
    if (!text) {
      alert("Por favor escribe qué ha dicho ella");
      return;
    }

    const prof = this.getActiveProfile();
    if (!prof.hints) prof.hints = [];
    prof.hints.unshift({
      id: "h_" + Date.now(),
      text: text,
      cat: cat,
      date: "Hoy"
    });

    this.saveProfiles();
    this.modalHint.classList.remove("open");
    document.getElementById("hint-input-text").value = "";
    this.renderVault(prof);
    this.showToast("🎯 ¡Indirecta cazada y guardada en su ficha!");
  }

  deleteHint(hintId) {
    const prof = this.getActiveProfile();
    prof.hints = prof.hints.filter(h => h.id !== hintId);
    this.saveProfiles();
    this.renderVault(prof);
    this.showToast("Indirecta eliminada");
  }

  saveNewProfile() {
    const name = document.getElementById("new-profile-name").value.trim();
    const status = document.getElementById("new-profile-status").value;
    const birthday = document.getElementById("new-profile-birthday").value;
    const period = document.getElementById("new-profile-period").value;

    if (!name) {
      alert("Introduce al menos el nombre de la chica");
      return;
    }

    const newProf = {
      id: "prof_" + Date.now(),
      name: name,
      status: status,
      birthday: birthday || "1998-07-15",
      lastPeriodDate: period || null,
      cycleDay: 14,
      cycleLength: 28,
      zodiac: "Leo",
      favorites: {
        cafe: "Pendiente de averiguar",
        flores: "Pendiente",
        dulce: "Pendiente",
        comida: "Pendiente"
      },
      sizes: {
        anillo: "Pendiente",
        calzado: "Pendiente",
        camiseta: "Pendiente",
        pantalon: "Pendiente"
      },
      dates: [
        { id: "d_" + Date.now(), title: "Cumpleaños", date: birthday || "2027-07-15", icon: "🎂" }
      ],
      hints: []
    };

    this.profiles.push(newProf);
    this.activeProfileId = newProf.id;
    this.saveProfiles();
    this.modalAddProfile.classList.remove("open");
    document.getElementById("new-profile-name").value = "";
    this.renderAll();
    this.showToast(`Perfil de ${name} creado con éxito`);
  }
}

// Inicializar la aplicación global
let app;
window.addEventListener("DOMContentLoaded", () => {
  app = new WingmanApp();
});
