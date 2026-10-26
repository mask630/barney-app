// Envío de correos (códigos para entrar) por el SMTP de Gmail, sin dependencias.
// Variables: GMAIL_APP_PASSWORD (contraseña de aplicación de la cuenta de Clutch) y GMAIL_USER (por defecto, el email de la app).

import tls from 'node:tls';

const user = () => (process.env.GMAIL_USER || 'clutch.app.2026@gmail.com').trim();
const pass = () => (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

export const mailConfigured = () => !!pass();

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');

export function buildMessage({ from, to, subject, text, now = new Date() }) {
  return [
    `From: "Clutch" <${from}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${now.getTime()}.${Math.random().toString(36).slice(2)}@clutch>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(text))
  ].join('\r\n');
}

// Conversación SMTP mínima: saludo, EHLO, AUTH PLAIN, MAIL, RCPT, DATA y QUIT.
export function sendMail({ to, subject, text }, { host = 'smtp.gmail.com', port = 465, timeoutMs = 15000, connect = tls.connect } = {}) {
  if (!/^[^\s@<>]+@[^\s@<>]+$/.test(to)) return Promise.reject(new Error('destinatario'));
  const from = user();
  const steps = [
    { send: null, expect: 220 },
    { send: 'EHLO clutch', expect: 250 },
    { send: `AUTH PLAIN ${b64(`\0${from}\0${pass()}`)}`, expect: 235 },
    { send: `MAIL FROM:<${from}>`, expect: 250 },
    { send: `RCPT TO:<${to}>`, expect: 250 },
    { send: 'DATA', expect: 354 },
    { send: `${buildMessage({ from, to, subject, text }).replace(/^\./gm, '..')}\r\n.`, expect: 250 },
    { send: 'QUIT', expect: 221 }
  ];
  return new Promise((resolve, reject) => {
    const sock = connect(port, host, { servername: host });
    let buf = '', i = 0, done = false, sent = false;
    const finish = (err) => { if (done) return; done = true; clearTimeout(timer); sock.destroy(); err && !sent ? reject(err) : resolve(true); };
    const timer = setTimeout(() => finish(new Error('smtp-tiempo')), timeoutMs);
    sock.on('error', (e) => finish(e));
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      // Respuesta completa: última línea «NNN texto» (las intermedias son «NNN-texto»).
      const lines = buf.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1];
      if (!buf.endsWith('\r\n') || !/^\d{3} /.test(last || '')) return;
      buf = '';
      const code = +last.slice(0, 3);
      if (code !== steps[i].expect) return finish(new Error(`smtp-${code}`));
      i++;
      if (i === steps.length - 1) sent = true; // el correo ya está aceptado; el QUIT es cortesía
      if (i >= steps.length) return finish();
      sock.write(`${steps[i].send}\r\n`);
    });
  });
}
