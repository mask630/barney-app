import test from 'node:test';
import assert from 'node:assert/strict';
import { buildICS, importantDates } from '../js/engine/calendar.js';

const T = '2026-10-22';
const lucia = { id: 'p1', name: 'Lucía', birth: '1997-05-14', stage: 'pareja', since: '2026-07-14',
  events: [{ id: 'e1', text: 'Concierto, en Madrid', month: 11, day: 5, year: 2026, yearly: false }, { id: 'e2', text: 'Santo', month: 12, day: 13, year: null, yearly: true }, { id: 'e3', text: 'Pasado', month: 1, day: 2, year: 2026, yearly: false }] };

test('calendario: cumpleaños y aniversario anuales, hitos próximos y eventos', () => {
  const d = importantDates(lucia, T);
  const by = Object.fromEntries(d.map((x) => [x.key, x]));
  assert.deepEqual(by.birthday, { key: 'birthday', date: '2026-05-14', label: 'Cumpleaños de Lucía', yearly: true });
  assert.equal(by.anniversary.date, '2027-07-14');
  assert.equal(by['milestone-100'].date, '2026-10-22');
  assert.equal(by['milestone-200'].date, '2027-01-30');
  assert.ok(!by['milestone-1000'], 'solo los del próximo año');
  assert.equal(by['event-e1'].yearly, false);
  assert.equal(by['event-e2'].yearly, true);
  assert.ok(!by['event-e3'], 'eventos ya pasados no');
  assert.equal(importantDates({ ...lucia, stage: 'amiga' }, T).some((x) => x.key === 'anniversary'), false);
});

test('calendario: formato .ics, avisos y títulos discretos sin nombres', () => {
  const { text, count } = buildICS([lucia], T, { now: new Date('2026-10-22T10:00:00Z') });
  assert.equal(count, importantDates(lucia, T).length);
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n') && text.endsWith('END:VCALENDAR\r\n'));
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, count);
  assert.equal((text.match(/BEGIN:VALARM/g) || []).length, count * 2);
  assert.ok(text.includes('TRIGGER:-PT15H') && text.includes('TRIGGER:PT9H'));
  assert.ok(!text.includes('Lucía'), 'discreto por defecto: ningún nombre');
  assert.ok(text.includes('SUMMARY:Agenda · evento'));
  const open = buildICS([lucia], T, { discreet: false }).text;
  assert.ok(open.includes('SUMMARY:Cumpleaños de Lucía'));
  assert.ok(open.includes('SUMMARY:Lucía · Concierto\\, en Madrid'), 'comas escapadas');
  assert.ok(open.includes('RRULE:FREQ=YEARLY'));
});
