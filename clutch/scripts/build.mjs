// Empaqueta Clutch en: dist/index.html (PWA para GitHub Pages) y dist/artifact.html (página única para probar).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const js = (await build({ entryPoints: ['js/app.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false })).outputFiles[0].text;
const css = readFileSync('css/app.css', 'utf8');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap">';
const safeJs = js.replace(/<\/script/gi, '<\\/script');

// PWA completa
writeFileSync('dist/index.html', `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Clutch</title>
<meta name="theme-color" content="#0e1014">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Agenda">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
${fonts}
<style>${css}</style></head>
<body><div id="app"></div>
<script>window.CLUTCH_SW=true;</script>
<script>${safeJs}</script></body></html>`);

// Fragmento para Artifact (el contenedor aporta <html>, <head> y <body>)
writeFileSync('dist/artifact.html', `<title>Clutch</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${css}
:root{padding-bottom:0}</style>
<div id="app"></div>
<script>${safeJs}</script>`);

for (const f of ['manifest.webmanifest', 'sw.js', 'icon-180.png', 'icon-192.png', 'icon-512.png']) if (existsSync(`public/${f}`)) copyFileSync(`public/${f}`, `dist/${f}`);
console.log('ok', (safeJs.length / 1024).toFixed(0) + ' KB js');
