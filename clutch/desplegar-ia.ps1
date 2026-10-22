# Despliega la IA de Clutch en Vercel. Dos pasos son tuyos: iniciar sesión en el navegador y pegar tu clave de Anthropic.
# La clave se pide oculta, se envía directamente a Vercel y no se guarda en ningún archivo.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$proyecto = 'clutch-ia'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Node.js. Instálalo desde https://nodejs.org (versión LTS) y vuelve a ejecutar este archivo.' -ForegroundColor Yellow
  Read-Host 'Pulsa Enter para salir'; exit 1
}

Write-Host "`n1/4 Inicia sesión en Vercel (se abrirá el navegador)..." -ForegroundColor Cyan
npx --yes vercel@latest login

Write-Host "`n2/4 Enlazando el proyecto '$proyecto'..." -ForegroundColor Cyan
npx --yes vercel@latest link --yes --project $proyecto

Write-Host "`n3/4 Configuración segura" -ForegroundColor Cyan
$seguro = Read-Host 'Pega tu clave de la API de Anthropic (no se verá al escribir)' -AsSecureString
$clave = [System.Net.NetworkCredential]::new('', $seguro).Password
if ([string]::IsNullOrWhiteSpace($clave)) { Write-Host 'No se introdujo ninguna clave.' -ForegroundColor Red; exit 1 }
$codigo = -join ((48..57) + (97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ })

function Poner-Variable($nombre, $valor) {
  try { npx --yes vercel@latest env rm $nombre production --yes 2>$null | Out-Null } catch {}
  $valor | npx --yes vercel@latest env add $nombre production | Out-Null
}
Poner-Variable 'ANTHROPIC_API_KEY' $clave
Poner-Variable 'CLUTCH_CODES' $codigo
Poner-Variable 'CLUTCH_ORIGINS' 'https://mask630.github.io'
$clave = $null

Write-Host "`n4/4 Desplegando..." -ForegroundColor Cyan
$salida = npx --yes vercel@latest deploy --prod --yes 2>&1 | Out-String
Write-Host $salida
$m = [regex]::Match($salida, 'https://[a-z0-9-]+\.vercel\.app')
if (-not $m.Success) { Write-Host 'No encontré la dirección en la salida. Cópiala del texto de arriba y añade /api/ai al final.' -ForegroundColor Yellow }
$direccion = if ($m.Success) { "$($m.Value)/api/ai" } else { '(mira arriba)/api/ai' }

$resumen = "Servidor: $direccion`nCódigo de tester: $codigo"
Set-Clipboard -Value $resumen
Write-Host "`n=== LISTO ===" -ForegroundColor Green
Write-Host $resumen -ForegroundColor Green
Write-Host "(Copiado al portapapeles). Pégalo en Clutch > Yo > IA (opcional)." -ForegroundColor Green
Write-Host "Consejo: en console.anthropic.com pon un límite de gasto mensual a esta clave." -ForegroundColor Yellow
Read-Host "`nPulsa Enter para cerrar"
