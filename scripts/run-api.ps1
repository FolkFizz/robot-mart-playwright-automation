param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

npx playwright test tests/api --grep "@api" @Args
exit $LASTEXITCODE