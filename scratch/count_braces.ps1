param(
    [string]$Path = "frontend/src/index.css"
)

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

$content = Get-Content -LiteralPath $Path -Raw
$line = 1
$depth = 0
$inComment = $false
$inSingle = $false
$inDouble = $false
$escape = $false
$errors = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    $ch = $content[$i]
    $next = if ($i + 1 -lt $content.Length) { $content[$i + 1] } else { [char]0 }

    if ($ch -eq "`n") {
        $line++
    }

    if ($inComment) {
        if ($ch -eq "*" -and $next -eq "/") {
            $inComment = $false
            $i++
        }
        continue
    }

    if ($inSingle) {
        if (-not $escape -and $ch -eq "'") { $inSingle = $false }
        $escape = (-not $escape -and $ch -eq "\")
        continue
    }

    if ($inDouble) {
        if (-not $escape -and $ch -eq '"') { $inDouble = $false }
        $escape = (-not $escape -and $ch -eq "\")
        continue
    }

    if ($ch -eq "/" -and $next -eq "*") {
        $inComment = $true
        $i++
        continue
    }

    if ($ch -eq "'") { $inSingle = $true; $escape = $false; continue }
    if ($ch -eq '"') { $inDouble = $true; $escape = $false; continue }

    if ($ch -eq "{") {
        $depth++
        continue
    }

    if ($ch -eq "}") {
        $depth--
        if ($depth -lt 0) {
            $errors += "Extra closing brace at line $line"
            $depth = 0
        }
    }
}

if ($depth -gt 0) {
    $errors += "Missing $depth closing brace(s) at end of file"
}

if ($errors.Count -eq 0) {
    Write-Output "OK: brace balance is correct for $Path"
    exit 0
}

Write-Output "FAIL: brace imbalance detected in $Path"
$errors | ForEach-Object { Write-Output " - $_" }
exit 2
