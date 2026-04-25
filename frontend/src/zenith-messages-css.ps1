$path = "e:\PeerNet\frontend\src\index.css"
$content = Get-Content $path -Raw
$lines = $content -split "`r?`n"

$zenithCSS = @"
/* ==========================================================================
   PROJECT ZENITH: PREMIUM MESSAGES (Instagram Desktop Grade)
   ========================================================================== */

:root {
  --zn-bg: #000000;
  --zn-surface: #0a0a0a;
  --zn-surface-raised: #121212;
  --zn-border: rgba(255, 255, 255, 0.06);
  --zn-accent: #7c3aed;
  --zn-accent-glow: rgba(124, 58, 237, 0.3);
  --zn-list-w: 360px;
}

.zn-layout {
  display: flex;
  height: 100dvh;
  width: 100%;
  background: var(--zn-bg);
  overflow: hidden;
  position: relative;
}

/* 1. Sidebar (360px) */
.zn-sidebar {
  width: var(--zn-list-w);
  height: 100%;
  border-right: 1px solid var(--zn-border);
  display: flex;
  flex-direction: column;
  background: var(--zn-bg);
  z-index: 20;
}

.zn-sidebar-header {
  padding: 32px 24px 20px;
}

.zn-search-box {
  background: var(--zn-surface-raised);
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.zn-search-box:focus-within {
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 0 0 2px var(--zn-accent-glow);
}

/* 2. Main Chat View */
.zn-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top right, #0d0d12 0%, #000000 100%);
  position: relative;
}

.zn-header {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--zn-border);
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(20px);
  z-index: 50;
}

/* 3. BUBBLE ENGINE (Zenith Fixed) */
.zn-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zn-row {
  display: flex;
  flex-direction: column;
  max-width: 65%;
  position: relative;
  margin-bottom: 2px;
  writing-mode: horizontal-tb !important;
}

.zn-row.self { align-self: flex-end; align-items: flex-end; }
.zn-row.peer { align-self: flex-start; align-items: flex-start; }

.zn-bubble {
  display: block !important;
  min-width: 120px;
  padding: 12px 18px;
  border-radius: 24px;
  font-size: 15px;
  line-height: 1.5;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.zn-row.self .zn-bubble {
  background: var(--zn-accent);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.2);
}

.zn-row.peer .zn-bubble {
  background: #262626;
  color: #fff;
  border-bottom-left-radius: 4px;
  border: 1px solid var(--zn-border);
}

/* Grouping Physics */
.zn-row.msg-top.self .zn-bubble { border-bottom-right-radius: 4px; }
.zn-row.msg-middle.self .zn-bubble { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.zn-row.msg-bottom.self .zn-bubble { border-top-right-radius: 4px; border-bottom-right-radius: 24px; }

/* 4. Zenith Composer */
.zn-footer {
  padding: 20px 40px 32px;
}

.zn-composer-pill {
  background: var(--zn-surface-raised);
  border: 1px solid var(--zn-border);
  border-radius: 32px;
  padding: 6px 8px 6px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.zn-composer-pill:focus-within {
  border-color: rgba(255,255,255,0.15);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.zn-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;
  padding: 10px 0;
}

/* Day Separator */
.zn-day {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 32px 0 20px;
  font-size: 11px;
  font-weight: 800;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  width: 100%;
}

.zn-meta {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-3);
  margin-top: 4px;
  padding: 0 8px;
  opacity: 0.5;
}

/* Scrollbar */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
"@

# Find the start of the MESSAGES blocks and replace EVERYTHING after it
$startIndex = 0
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "MESSAGES REFINED" -or $lines[$i] -match "MESSAGES RE-ENGINEERING" -or $lines[$i] -match "MESSAGES REDESIGN") {
        $startIndex = $i - 2
        break
    }
}

$prefix = $lines | Select-Object -First $startIndex
$finalContent = ($prefix -join "`r`n") + "`r`n" + $zenithCSS
Set-Content $path -Value $finalContent -Encoding UTF8
