param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

npx playwright test --grep "@regression" @Args
exit $LASTEXITCODE