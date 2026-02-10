param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$ErrorActionPreference = 'Stop'

npx playwright test --grep "@smoke" --grep-invert "@stripe|@chaos|@ai" @Args
exit $LASTEXITCODE