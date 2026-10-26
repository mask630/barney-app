# Activa las cuentas de Clutch (entrar con email + código y, si quieres, con Google). Ejecútalo una vez.
# Te pide la contraseña de aplicación de Gmail de la cuenta de Clutch (oculta, va directa a Vercel y no se guarda en ningún archivo)
# y, opcionalmente, el ID de cliente de Google. La clave que cifra los datos se crea sola la primera vez y NUNCA se cambia.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$proyecto = 'clutch-ia'

function vercel {
  $exe = if (Get-Command vercel.cmd -ErrorAction SilentlyContinue) { @('vercel.cmd') } else { @('npx', '--yes', 'vercel@latest') }
  $cmd, $resto = $exe
  & $cmd @resto @args
}
function Poner-Variable($nombre, $valor) {
  try { vercel env rm $nombre production --yes 2>$null | Out-Null } catch {}
  vercel env add $nombre production --value $valor --yes --force | Out-Null
}

Write-Host "`n1/4 Sesión en Vercel..." -ForegroundColor Cyan
$ErrorActionPreference = 'Continue'
vercel whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { vercel login }
vercel link --yes --project $proyecto 2>$null | Out-Null
$hay = vercel env ls production 2>&1 | Out-String
$ErrorActionPreference = 'Stop'

Write-Host "`n2/4 Clave para cifrar los datos de los usuarios" -ForegroundColor Cyan
if ($hay -match 'CLUTCH_DATA_KEY') { Write-Host 'Ya existe: se mantiene (si cambiara, los datos guardados no se podrían leer).' }
else {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Poner-Variable 'CLUTCH_DATA_KEY' ([Convert]::ToBase64String($bytes))
  Write-Host 'Creada.'
}

Write-Host "`n3/4 Correo para enviar los códigos (Gmail de Clutch)" -ForegroundColor Cyan
Write-Host 'Es la "contraseña de aplicación" de 16 letras de clutch.app.2026@gmail.com (no la contraseña normal).'
$seguro = Read-Host 'Pégala aquí (no se verá al escribir; Enter para dejar la que haya)' -AsSecureString
$clave = [System.Net.NetworkCredential]::new('', $seguro).Password -replace '\s', ''
if ($clave) { Poner-Variable 'GMAIL_APP_PASSWORD' $clave; Poner-Variable 'GMAIL_USER' 'clutch.app.2026@gmail.com'; Write-Host 'Guardada.' }
elseif ($hay -notmatch 'GMAIL_APP_PASSWORD') { Write-Host 'Sin contraseña no se podrán enviar códigos por email.' -ForegroundColor Yellow }
$clave = $null

$google = Read-Host "`nID de cliente de Google (termina en .apps.googleusercontent.com; Enter para saltar)"
if ($google -match '\.apps\.googleusercontent\.com$') { Poner-Variable 'GOOGLE_CLIENT_ID' $google.Trim(); Write-Host 'Guardado.' }

Write-Host "`n4/4 Desplegando..." -ForegroundColor Cyan
$ErrorActionPreference = 'Continue'
vercel deploy --prod --yes 2>&1 | ForEach-Object { "$_" } | Select-String 'Aliased|Error' | ForEach-Object { Write-Host $_ }
$info = try { Invoke-RestMethod 'https://clutch-ia.vercel.app/api/auth' } catch { $null }
if ($info -and $info.email) { Write-Host "`nListo: las cuentas están activas." -ForegroundColor Green }
else { Write-Host "`nAlgo no ha ido bien: el correo aún no aparece como activo." -ForegroundColor Yellow }
Read-Host 'Pulsa Enter para cerrar'
