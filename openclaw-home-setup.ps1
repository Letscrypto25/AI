$ErrorActionPreference = "Stop"

$configPath = "C:\Users\ethan\.openclaw\openclaw.json"
$workspacePath = "C:\Users\ethan\Saved Games\ide"
$gatewayScript = Join-Path $workspacePath "openclaw-gateway-launch.cmd"
$gatewayPort = 18789
$gatewayUrl = "http://127.0.0.1:$gatewayPort/"
$canvasUrl = "http://127.0.0.1:$gatewayPort/__openclaw__/canvas/"
$envPath = Join-Path $workspacePath ".env"
$outLog = Join-Path $workspacePath "openclaw-gateway.out.log"
$errLog = Join-Path $workspacePath "openclaw-gateway.err.log"

function Import-DotEnv {
  param([string]$Path)

  $loaded = @()
  if (-not (Test-Path $Path)) {
    return $loaded
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($trimmed -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") {
      $name = $matches[1]
      $value = $matches[2].Trim()
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      [Environment]::SetEnvironmentVariable($name, $value, "Process")
      $loaded += $name
    }
  }

  return $loaded
}

function Test-GatewayUrl {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Test-GatewayReady {
  return ((Test-GatewayUrl $gatewayUrl) -or (Test-GatewayUrl $canvasUrl))
}

function Get-GatewayProcessIds {
  $ids = @()
  try {
    $ids = Get-CimInstance Win32_Process |
      Where-Object {
        $_.CommandLine -and (
          $_.CommandLine -like "*node_modules\openclaw\dist\index.js gateway --port $gatewayPort*" -or
          $_.CommandLine -like "*node_modules\openclaw\openclaw.mjs*gateway --port $gatewayPort*" -or
          $_.CommandLine -like "*openclaw-gateway-launch.cmd*" -or
          $_.CommandLine -like "*\.openclaw\gateway.cmd*"
        )
      } |
      Select-Object -ExpandProperty ProcessId
  } catch {
    $ids = @()
  }

  return @($ids | Sort-Object -Unique)
}

function Stop-StaleGateway {
  $stopped = @()
  if (Test-GatewayReady) {
    return $stopped
  }

  foreach ($processId in Get-GatewayProcessIds) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      $stopped += $processId
    } catch {
    }
  }

  if ($stopped.Count -gt 0) {
    Start-Sleep -Seconds 2
  }

  return $stopped
}

$loadedEnvKeys = Import-DotEnv $envPath

if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json
} else {
  $config = [pscustomobject]@{}
}

if (-not $config.PSObject.Properties["gateway"]) {
  $config | Add-Member -NotePropertyName gateway -NotePropertyValue ([pscustomobject]@{})
}
if (-not $config.gateway.PSObject.Properties["auth"]) {
  $config.gateway | Add-Member -NotePropertyName auth -NotePropertyValue ([pscustomobject]@{})
}
if (-not $config.gateway.PSObject.Properties["mode"]) {
  $config.gateway | Add-Member -NotePropertyName mode -NotePropertyValue "local"
} else {
  $config.gateway.mode = "local"
}
if (-not $config.gateway.PSObject.Properties["bind"]) {
  $config.gateway | Add-Member -NotePropertyName bind -NotePropertyValue "loopback"
} else {
  $config.gateway.bind = "loopback"
}
if (-not $config.gateway.PSObject.Properties["port"]) {
  $config.gateway | Add-Member -NotePropertyName port -NotePropertyValue $gatewayPort
} else {
  $config.gateway.port = $gatewayPort
}
if (-not $config.gateway.auth.PSObject.Properties["mode"]) {
  $config.gateway.auth | Add-Member -NotePropertyName mode -NotePropertyValue "token"
} else {
  $config.gateway.auth.mode = "token"
}
if (-not $config.gateway.auth.PSObject.Properties["token"] -or [string]::IsNullOrWhiteSpace([string]$config.gateway.auth.token)) {
  $token = -join ((1..48) | ForEach-Object { "{0:x}" -f (Get-Random -Minimum 0 -Maximum 16) })
  if ($config.gateway.auth.PSObject.Properties["token"]) {
    $config.gateway.auth.token = $token
  } else {
    $config.gateway.auth | Add-Member -NotePropertyName token -NotePropertyValue $token
  }
}

if (-not $config.PSObject.Properties["agents"]) {
  $config | Add-Member -NotePropertyName agents -NotePropertyValue ([pscustomobject]@{})
}
if (-not $config.agents.PSObject.Properties["defaults"]) {
  $config.agents | Add-Member -NotePropertyName defaults -NotePropertyValue ([pscustomobject]@{})
}
if (-not $config.agents.defaults.PSObject.Properties["workspace"]) {
  $config.agents.defaults | Add-Member -NotePropertyName workspace -NotePropertyValue $workspacePath
} else {
  $config.agents.defaults.workspace = $workspacePath
}
if (-not $config.agents.defaults.PSObject.Properties["repoRoot"]) {
  $config.agents.defaults | Add-Member -NotePropertyName repoRoot -NotePropertyValue $workspacePath
} else {
  $config.agents.defaults.repoRoot = $workspacePath
}
if (-not $config.agents.defaults.PSObject.Properties["model"]) {
  $config.agents.defaults | Add-Member -NotePropertyName model -NotePropertyValue ([pscustomobject]@{})
}
if (-not $config.agents.defaults.model.PSObject.Properties["primary"]) {
  $config.agents.defaults.model | Add-Member -NotePropertyName primary -NotePropertyValue "openai-codex/gpt-5.4"
} else {
  $config.agents.defaults.model.primary = "openai-codex/gpt-5.4"
}

if (-not $config.PSObject.Properties["tools"]) {
  $config | Add-Member -NotePropertyName tools -NotePropertyValue ([pscustomobject]@{})
}
if (-not $config.tools.PSObject.Properties["profile"]) {
  $config.tools | Add-Member -NotePropertyName profile -NotePropertyValue "coding"
} else {
  $config.tools.profile = "coding"
}

$config | ConvertTo-Json -Depth 20 | Set-Content -Path $configPath -Encoding UTF8

$stoppedPids = Stop-StaleGateway
$startedPid = $null

if (-not (Test-GatewayReady)) {
  if (Test-Path $outLog) { Remove-Item $outLog -Force }
  if (Test-Path $errLog) { Remove-Item $errLog -Force }

  $process = Start-Process -PassThru -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList "/c", "`"$gatewayScript`"" -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  $startedPid = $process.Id
}

$ready = $false
for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 2
  if (Test-GatewayReady) {
    $ready = $true
    break
  }
}

[pscustomobject]@{
  config_path = $configPath
  workspace = $workspacePath
  model = "openai-codex/gpt-5.4"
  env_path = $envPath
  env_keys_loaded = $loadedEnvKeys
  gateway_url = $gatewayUrl
  canvas_url = $canvasUrl
  gateway_ready = $ready
  stopped_stale_pids = $stoppedPids
  started_pid = $startedPid
  out_log = $outLog
  err_log = $errLog
} | ConvertTo-Json -Depth 5
