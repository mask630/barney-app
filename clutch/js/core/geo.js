// País y ciudad. Primero la zona horaria (sin permisos); el GPS solo si la persona lo pide.

export const CITIES = [
  { name: 'Málaga', country: 'España', lat: 36.7213, lon: -4.4214, tz: 'Europe/Madrid' },
  { name: 'Madrid', country: 'España', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
  { name: 'Barcelona', country: 'España', lat: 41.3874, lon: 2.1686, tz: 'Europe/Madrid' },
  { name: 'Sevilla', country: 'España', lat: 37.3891, lon: -5.9845, tz: 'Europe/Madrid' },
  { name: 'Valencia', country: 'España', lat: 39.4699, lon: -0.3763, tz: 'Europe/Madrid' },
  { name: 'Bilbao', country: 'España', lat: 43.263, lon: -2.935, tz: 'Europe/Madrid' },
  { name: 'Las Palmas', country: 'España', lat: 28.1235, lon: -15.4363, tz: 'Atlantic/Canary' },
  { name: 'Ciudad de México', country: 'México', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
  { name: 'Bogotá', country: 'Colombia', lat: 4.711, lon: -74.0721, tz: 'America/Bogota' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693, tz: 'America/Santiago' },
  { name: 'Lima', country: 'Perú', lat: -12.0464, lon: -77.0428, tz: 'America/Lima' }
];

const TZ_COUNTRY = {
  'Europe/Madrid': 'España', 'Atlantic/Canary': 'España', 'Africa/Ceuta': 'España',
  'America/Mexico_City': 'México', 'America/Bogota': 'Colombia', 'America/Lima': 'Perú',
  'America/Santiago': 'Chile', 'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Caracas': 'Venezuela', 'America/Montevideo': 'Uruguay', 'Europe/Lisbon': 'Portugal',
  'Europe/Paris': 'Francia', 'Europe/Rome': 'Italia', 'Europe/London': 'Reino Unido'
};

export function countryFromTimezone(tz) {
  return TZ_COUNTRY[tz] || null;
}

export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// Ciudad más cercana de la lista a unas coordenadas (para el GPS).
export function nearestCity(lat, lon) {
  let best = null;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + ((c.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (!best || d < best.d) best = { c, d };
  }
  return best.c;
}
