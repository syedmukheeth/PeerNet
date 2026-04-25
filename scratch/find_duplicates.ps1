param(
    [string]$Path = "frontend/src/index.css",
    [int]$Top = 100
)

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

$lines = Get-Content -LiteralPath $Path
$map = @{}
$atRuleStack = @()
$depth = 0
$prevMeaningful = ""

for ($i = 0; $i -lt $lines.Length; $i++) {
    $lineNo = $i + 1
    $line = $lines[$i].Trim()

    if (-not $line) { continue }
    if ($line.StartsWith("/*")) { continue }
    $hasOpen = $line -match "\{"
    $hasClose = $line -match "\}"
    $isAtRuleOpen = $line -match "^@.+\{\s*$"
    $isSelectorOpen = $line -match "^[^@\s][^{]*\{\s*$"

    if ($isAtRuleOpen) {
        $label = $line.Substring(0, $line.LastIndexOf("{")).Trim()
        $atRuleStack += [pscustomobject]@{
            Label = $label
            Depth = $depth + 1
        }
    }

    if ($isSelectorOpen) {
        # Skip continuation selector lines from multi-selector blocks.
        if ($prevMeaningful -notmatch ",\s*$") {
            # Skip probable declaration lines like "color: red;" that can include braces in values.
            if ($line -notmatch "^[a-zA-Z-]+\s*:") {
                $context = if ($atRuleStack.Count -gt 0) { ($atRuleStack | ForEach-Object { $_.Label }) -join " > " } else { "root" }
                $key = "$context :: $line"
                if (-not $map.ContainsKey($key)) {
                    $map[$key] = @()
                }
                $map[$key] += $lineNo
            }
        }
    }

    $openCount = ([regex]::Matches($line, "\{")).Count
    $closeCount = ([regex]::Matches($line, "\}")).Count
    $depth += $openCount
    $depth -= $closeCount
    if ($depth -lt 0) { $depth = 0 }

    while ($atRuleStack.Count -gt 0 -and $atRuleStack[-1].Depth -gt $depth) {
        if ($atRuleStack.Count -eq 1) {
            $atRuleStack = @()
        } else {
            $atRuleStack = $atRuleStack[0..($atRuleStack.Count - 2)]
        }
    }

    $prevMeaningful = $line
}

$dups = $map.GetEnumerator() |
    Where-Object { $_.Value.Count -gt 1 } |
    Sort-Object { $_.Value.Count } -Descending

if (-not $dups) {
    Write-Output "OK: no duplicate selector openings detected in $Path"
    exit 0
}

Write-Output "Found $($dups.Count) duplicate selector openings in ${Path}:"
$dups |
    Select-Object -First $Top |
    ForEach-Object {
        $lineList = ($_.Value -join ", ")
        Write-Output (" - {0}x {1} (lines: {2})" -f $_.Value.Count, $_.Key, $lineList)
    }

exit 0
