param(
  [string]$GitHubToken
)

$ErrorActionPreference = 'Stop'

function Resolve-PythonCommand {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    return @('py', '-3')
  }

  if (Get-Command python -ErrorAction SilentlyContinue) {
    return @('python')
  }

  throw 'Python was not found on PATH. Install Python or use py.exe.'
}

function Resolve-GitHubToken([string]$TokenArgument) {
  if ($TokenArgument) {
    return $TokenArgument.Trim()
  }

  if ($env:GITHUB_TOKEN) {
    return $env:GITHUB_TOKEN.Trim()
  }

  $secureToken = Read-Host 'GitHub token' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
  }
  finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$publisherPath = Join-Path $scriptDir 'publish_flow_net_v2.py'

if (-not (Test-Path -LiteralPath $publisherPath)) {
  throw "Missing publish helper: $publisherPath"
}

$resolvedToken = Resolve-GitHubToken $GitHubToken
if (-not $resolvedToken) {
  throw 'GitHub token is required.'
}

$pythonCommand = Resolve-PythonCommand
if ($pythonCommand.Length -gt 1) {
  & $pythonCommand[0] $pythonCommand[1] $publisherPath $resolvedToken
}
else {
  & $pythonCommand[0] $publisherPath $resolvedToken
}
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  exit $exitCode
}
