$ErrorActionPreference = "Stop"

$outLog = "C:\Users\ethan\Saved Games\ide\openclaw-gateway.out.log"
$errLog = "C:\Users\ethan\Saved Games\ide\openclaw-gateway.err.log"
$gatewayScript = "C:\Users\ethan\Saved Games\ide\openclaw-gateway-launch.cmd"
$gatewayUrl = "http://127.0.0.1:18789/"

if (Test-Path $outLog) { Remove-Item $outLog -Force }
if (Test-Path $errLog) { Remove-Item $errLog -Force }

$process = Start-Process -PassThru -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList "/c", "`"$gatewayScript`"" -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Start-Sleep -Seconds 12

$reachable = $false
try {
  $response = Invoke-WebRequest -Uri $gatewayUrl -UseBasicParsing -TimeoutSec 5
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
    $reachable = $true
  }
} catch {
}

[pscustomobject]@{
  pid = $process.Id
  alive = -not $process.HasExited
  exit_code = if ($process.HasExited) { $process.ExitCode } else { $null }
  gateway_reachable = $reachable
  out_log = $outLog
  err_log = $errLog
  out_tail = if (Test-Path $outLog) { (Get-Content $outLog -Tail 40) -join "`n" } else { "" }
  err_tail = if (Test-Path $errLog) { (Get-Content $errLog -Tail 40) -join "`n" } else { "" }
} | ConvertTo-Json -Depth 5
