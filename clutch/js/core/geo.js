// País y ciudad. Primero la zona horaria (sin permisos); el GPS solo si la persona lo pide.

export const CITIES = [
  { name: 'Málaga', country: 'España', lat: 36.7213, lon: -4.4214, tz: 'Europe/Madrid' },
  { name: 'Madrid', country: 'España', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
  { name: 'Barcelona', country: 'España', lat: 41.3874, lon: 2.1686, tz: 'Europe/Madrid' },
  { name: 'Sevilla', country: 'España', lat: 37.3891, lon: -5.9845, tz: 'Europe/Madrid' },
  { name: 'Valencia', country: 'España', lat: 39.4699, lon: -0.3763, tz: 'Europe/Madrid' },
  { name: 'Zaragoza', country: 'España', lat: 41.6488, lon: -0.8891, tz: 'Europe/Madrid' },
  { name: 'Murcia', country: 'España', lat: 37.9922, lon: -1.1307, tz: 'Europe/Madrid' },
  { name: 'Palma', country: 'España', lat: 39.5696, lon: 2.6502, tz: 'Europe/Madrid' },
  { name: 'Las Palmas', country: 'España', lat: 28.1235, lon: -15.4363, tz: 'Atlantic/Canary' },
  { name: 'Santa Cruz de Tenerife', country: 'España', lat: 28.4636, lon: -16.2518, tz: 'Atlantic/Canary' },
  { name: 'Bilbao', country: 'España', lat: 43.263, lon: -2.935, tz: 'Europe/Madrid' },
  { name: 'Alicante', country: 'España', lat: 38.3452, lon: -0.481, tz: 'Europe/Madrid' },
  { name: 'Córdoba', country: 'España', lat: 37.8882, lon: -4.7794, tz: 'Europe/Madrid' },
  { name: 'Valladolid', country: 'España', lat: 41.6523, lon: -4.7245, tz: 'Europe/Madrid' },
  { name: 'Vigo', country: 'España', lat: 42.2406, lon: -8.7207, tz: 'Europe/Madrid' },
  { name: 'Gijón', country: 'España', lat: 43.5322, lon: -5.6611, tz: 'Europe/Madrid' },
  { name: 'Granada', country: 'España', lat: 37.1773, lon: -3.5986, tz: 'Europe/Madrid' },
  { name: 'A Coruña', country: 'España', lat: 43.3623, lon: -8.4115, tz: 'Europe/Madrid' },
  { name: 'Vitoria', country: 'España', lat: 42.8467, lon: -2.6716, tz: 'Europe/Madrid' },
  { name: 'San Sebastián', country: 'España', lat: 43.3183, lon: -1.9812, tz: 'Europe/Madrid' },
  { name: 'Oviedo', country: 'España', lat: 43.3619, lon: -5.8494, tz: 'Europe/Madrid' },
  { name: 'Santander', country: 'España', lat: 43.4623, lon: -3.8099, tz: 'Europe/Madrid' },
  { name: 'Pamplona', country: 'España', lat: 42.8125, lon: -1.6458, tz: 'Europe/Madrid' },
  { name: 'Salamanca', country: 'España', lat: 40.9701, lon: -5.6635, tz: 'Europe/Madrid' },
  { name: 'Almería', country: 'España', lat: 36.834, lon: -2.4637, tz: 'Europe/Madrid' },
  { name: 'Cádiz', country: 'España', lat: 36.5271, lon: -6.2886, tz: 'Europe/Madrid' },
  { name: 'Huelva', country: 'España', lat: 37.2614, lon: -6.9447, tz: 'Europe/Madrid' },
  { name: 'Jaén', country: 'España', lat: 37.7796, lon: -3.7849, tz: 'Europe/Madrid' },
  { name: 'Toledo', country: 'España', lat: 39.8628, lon: -4.0273, tz: 'Europe/Madrid' },
  { name: 'Badajoz', country: 'España', lat: 38.8794, lon: -6.9707, tz: 'Europe/Madrid' },
  { name: 'Logroño', country: 'España', lat: 42.4627, lon: -2.4449, tz: 'Europe/Madrid' },
  { name: 'León', country: 'España', lat: 42.5987, lon: -5.5671, tz: 'Europe/Madrid' },
  { name: 'Tarragona', country: 'España', lat: 41.1189, lon: 1.2445, tz: 'Europe/Madrid' },
  { name: 'Girona', country: 'España', lat: 41.9794, lon: 2.8214, tz: 'Europe/Madrid' },
  { name: 'Marbella', country: 'España', lat: 36.5101, lon: -4.8824, tz: 'Europe/Madrid' },
  { name: 'Ciudad de México', country: 'México', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
  { name: 'Guadalajara', country: 'México', lat: 20.6597, lon: -103.3496, tz: 'America/Mexico_City' },
  { name: 'Monterrey', country: 'México', lat: 25.6866, lon: -100.3161, tz: 'America/Monterrey' },
  { name: 'Bogotá', country: 'Colombia', lat: 4.711, lon: -74.0721, tz: 'America/Bogota' },
  { name: 'Medellín', country: 'Colombia', lat: 6.2442, lon: -75.5812, tz: 'America/Bogota' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
  { name: 'Córdoba (AR)', country: 'Argentina', lat: -31.4201, lon: -64.1888, tz: 'America/Argentina/Cordoba' },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lon: -70.6693, tz: 'America/Santiago' },
  { name: 'Lima', country: 'Perú', lat: -12.0464, lon: -77.0428, tz: 'America/Lima' },
  { name: 'Quito', country: 'Ecuador', lat: -0.1807, lon: -78.4678, tz: 'America/Guayaquil' },
  { name: 'Montevideo', country: 'Uruguay', lat: -34.9011, lon: -56.1645, tz: 'America/Montevideo' },
  { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lon: -66.9036, tz: 'America/Caracas' },
  { name: 'San José', country: 'Costa Rica', lat: 9.9281, lon: -84.0907, tz: 'America/Costa_Rica' },
  { name: 'Ciudad de Panamá', country: 'Panamá', lat: 8.9824, lon: -79.5199, tz: 'America/Panama' },
  { name: 'Santo Domingo', country: 'Rep. Dominicana', lat: 18.4861, lon: -69.9312, tz: 'America/Santo_Domingo' },
  { name: 'Lisboa', country: 'Portugal', lat: 38.7223, lon: -9.1393, tz: 'Europe/Lisbon' },
  { name: 'Londres', country: 'Reino Unido', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
  { name: 'París', country: 'Francia', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
  { name: 'Roma', country: 'Italia', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome' }
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
