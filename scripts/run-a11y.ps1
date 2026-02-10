param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

npx playwright test tests/a11y --grep "@a11y" @Args
exit $LASTEXITCODE