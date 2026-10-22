# Despliega la IA de Clutch en Vercel. Dos pasos son tuyos: iniciar sesión en el navegador y pegar tu clave de Anthropic.
# La clave se pide oculta, se envía directamente a Vercel y no se guarda en ningún archivo.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$proyecto = 'clutch-ia'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Node.js. Instálalo desde https://nodejs.org (versión LTS) y vuelve a ejecutar este archivo.' -ForegroundColor Yellow
  Read-Host 'Pulsa Enter para salir'; exit 1
}

# Usa el Vercel instalado si existe; si no, el de npx.
function vercel {
  $exe = if (Get-Command vercel.cmd -ErrorAction SilentlyContinue) { @('vercel.cmd') } else { @('npx', '--yes', 'vercel@latest') }
  $cmd, $resto = $exe
  if ($MyInvocation.ExpectingInput) { $input | & $cmd @resto @args } else { & $cmd @resto @args }
}

Write-Host "`n1/4 Sesión en Vercel..." -ForegroundColor Cyan
$ErrorActionPreference = 'Continue'
vercel whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host 'Inicia sesión (se abrirá el navegador)...'; vercel login }
else { Write-Host 'Ya tienes la sesión iniciada.' }
$ErrorActionPreference = 'Stop'

Write-Host "`n2/4 Enlazando el proyecto '$proyecto'..." -ForegroundColor Cyan
vercel link --yes --project $proyecto

Write-Host "`n3/4 Configuración segura" -ForegroundColor Cyan
$seguro = Read-Host 'Pega tu clave de la API de Anthropic (no se verá al escribir)' -AsSecureString
$clave = [System.Net.NetworkCredential]::new('', $seguro).Password
if ([string]::IsNullOrWhiteSpace($clave)) { Write-Host 'No se introdujo ninguna clave.' -ForegroundColor Red; exit 1 }
$codigo = -join ((48..57) + (97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ })

function Poner-Variable($nombre, $valor) {
  try { vercel env rm $nombre production --yes 2>$null | Out-Null } catch {}
  # --value en vez de tubería: PowerShell añade un salto de línea al pasar texto por tubería.
  vercel env add $nombre production --value $valor --yes --force | Out-Null
}
Poner-Variable 'ANTHROPIC_API_KEY' $clave
Poner-Variable 'CLUTCH_CODES' $codigo
Poner-Variable 'CLUTCH_ORIGINS' 'https://mask630.github.io'
$clave = $null

Write-Host "`n4/4 Desplegando..." -ForegroundColor Cyan
# Vercel escribe el progreso por stderr; con 'Stop' PowerShell 5.1 lo trataría como error.
$ErrorActionPreference = 'Continue'
$salida = vercel deploy --prod --yes 2>&1 | ForEach-Object { "$_" } | Out-String
Write-Host $salida
# La dirección "Aliased" es la pública; la primera que aparece es la del despliegue concreto, que Vercel protege.
$m = [regex]::Match($salida, 'Aliased:\s*(https://[a-z0-9-]+\.vercel\.app)')
if ($m.Success) { $m = $m.Groups[1] } else { $m = [regex]::Match($salida, 'https://[a-z0-9-]+\.vercel\.app') }
if (-not $m.Success) { Write-Host 'No encontré la dirección en la salida. Cópiala del texto de arriba y añade /api/ai al final.' -ForegroundColor Yellow }
$direccion = if ($m.Success) { "$($m.Value)/api/ai" } else { '(mira arriba)/api/ai' }

$resumen = "Servidor: $direccion`nCódigo de tester: $codigo"
Set-Clipboard -Value $resumen
Write-Host "`n=== LISTO ===" -ForegroundColor Green
Write-Host $resumen -ForegroundColor Green
Write-Host "(Copiado al portapapeles). Pégalo en Clutch > Yo > IA (opcional)." -ForegroundColor Green
Write-Host "Consejo: en console.anthropic.com pon un límite de gasto mensual a esta clave." -ForegroundColor Yellow
Read-Host "`nPulsa Enter para cerrar"
