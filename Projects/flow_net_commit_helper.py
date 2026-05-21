import subprocess
from pathlib import Path


REPO_DIR = Path(r"C:\Users\ethan\Saved Games\ide\Projects\flownet")
COMMIT_MESSAGE = "Add PowerShell helper for FLOW-NET V2 publish"
SCRIPT_TEXT = """param([string]$GitHubToken)

$ErrorActionPreference = 'Stop'

if (-not $GitHubToken) {
  $GitHubToken = $env:GITHUB_TOKEN
}

if (-not $GitHubToken) {
  $GitHubToken = Read-Host 'GitHub token'
}

if (-not $GitHubToken) {
  throw 'GitHub token is required.'
}

$publisherPath = Join-Path $PSScriptRoot 'publish_flow_net_v2.py'

if (-not (Test-Path -LiteralPath $publisherPath)) {
  throw "Missing publish helper: $publisherPath"
}

if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3 $publisherPath $GitHubToken
}
elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python $publisherPath $GitHubToken
}
else {
  throw 'Python was not found on PATH. Install Python or use py.exe.'
}

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
"""


def run_git(*args: str, input_text: str | None = None) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_DIR,
        input=input_text,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout.strip()


def main() -> None:
    blob_sha = run_git("hash-object", "-w", "--stdin", input_text=SCRIPT_TEXT)
    head_tree = run_git("ls-tree", "HEAD")
    tree_spec = f"{head_tree}\n100644 blob {blob_sha}\tpush-flow-net-v2.ps1\n"
    tree_sha = run_git("mktree", input_text=tree_spec)
    commit_sha = run_git("commit-tree", tree_sha, "-p", "HEAD", "-m", COMMIT_MESSAGE)
    print(commit_sha)


if __name__ == "__main__":
    main()
