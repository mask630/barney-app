# Barney — Co-Piloto para Parejas y Citas (Versión Demo PWA)

Barney es un co-piloto digital inteligente para el móvil diseñado para ayudar a hombres a recordar detalles importantes, fechas clave, tallas, gustos, planes originales e ideas de regalos para sus parejas o citas, con enfoque en la empatía, el respeto y la privacidad total.

---

## 🚀 Instalación en Teléfonos Móviles (Para Testers)

La app está construida como **PWA (Progressive Web App)** nativa instalable y funciona **100% sin conexión a internet**.

### 📱 En Android (Google Chrome)
1. Abre el enlace HTTPS de la app en Chrome.
2. Pulsa en el menú de tres puntos (arriba a la derecha) o en el banner inferior emergente.
3. Selecciona **«Instalar aplicación»** o **«Añadir a pantalla de inicio»**.
4. Barney aparecerá en tu cajón de aplicaciones con su icono oficial y funcionará a pantalla completa sin barras de navegador.

### 🍏 En iPhone / iOS (Safari)
1. Abre el enlace HTTPS de la app en Safari.
2. Toca el botón **Compartir** (el icono de un cuadrado con una flecha hacia arriba en la barra inferior).
3. Desplázate hacia abajo y selecciona **«Añadir a la pantalla de inicio»** (`Add to Home Screen`).
4. Pulsa **«Añadir»** arriba a la derecha.
5. Abre Barney desde tu pantalla de inicio: se ejecutará como app nativa a pantalla completa (`standalone`) con soporte para Safe Area (notch / isla dinámica).

---

## 🛠️ Ejecución y Pruebas en Red Local

Para probar la app en tu propio ordenador y móvil dentro de la misma red Wi-Fi:

```bash
# Opción 1: Node.js (recomendada)
npx serve .

# Opción 2: Python
python -m http.server 8080
```

Luego abre en el navegador de tu móvil `http://TU_IP_LOCAL:8080` (ej: `http://192.168.1.50:8080`).

---

## 🔒 Privacidad, Salud y Marco Legal (RGPD)

- **Zero-Cloud / 100% Local:** Todos los datos (notas, tallas, gustos, eventos) residen exclusivamente en la memoria local del dispositivo (`localStorage`). No existen servidores remotos ni almacenamiento en la nube de perfiles de terceros, conforme al **Art. 2.2.c del RGPD** (exención de actividades exclusivamente domésticas y personales).
- **Seguimiento del Ciclo Menstrual Opcional:** Herramienta matemática orientativa por calendario. Incorpora un descargo médico explícito (**no constituye método médico, diagnóstico clínico ni anticonceptivo**) y puede desactivarse en cualquier momento desde `Yo → Privacidad` o `Ella → Fechas y Ciclo`.
- **Deducción de Estilo en Redes (Cero Scraping):** La función de lectura psicológica y sugerencia de regalos opera mediante deducción heurística basada en la observación manual del usuario. Barney **no se conecta a APIs de Instagram, TikTok ni Meta ni extrae datos privados**.
- **Control Total y Derecho al Olvido:** El usuario puede exportar una copia completa en `.json` o pulsar **«Borrar todos mis datos de Barney»** en cualquier momento para vaciar permanentemente el dispositivo.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una batería de **1.000 pruebas automatizadas**:
- **500 Pruebas Base:** Motor de parseo en lenguaje natural, fechas, sol/luna astronómico, asignación de apartados.
- **500 Pruebas DEMO IA:** Lectura psicológica multirred, generador multicanal (WhatsApp/Instagram/TikTok), radar de conciertos, escáner de visión.

Ejecutar pruebas:
```bash
node scratch/test_1000.js
node scratch/audit.js
```
