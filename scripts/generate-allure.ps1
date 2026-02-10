param(
  [switch]$Open
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command allure -ErrorAction SilentlyContinue)) {
  Write-Error "Allure CLI is not installed. Install it first (for example: npm i -D allure-commandline or install globally)."
  exit 1
}

npm run report:allure
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Open) {
  npm run report:open
  exit $LASTEXITCODE
}
