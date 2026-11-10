<#
.SYNOPSIS
  Mesures de performance de Flex Timer depuis le PC, telephone branche (adb).

.DESCRIPTION
  Remplace les impressions (« ca rame ») par des chiffres. Tout est en lecture seule.
  Prerequis : telephone en mode developpeur + debogage USB, branche, app lancee.
  adb est cherche dans le PATH puis dans %LOCALAPPDATA%\Android\Sdk\platform-tools.
  Les mesures sont sauvegardees dans E:\ftb\perf\ (jamais sur C:).

  MODES (premier argument) :
    check     adb, telephone, version de l'app, pid.
    mem       Photo de la memoire (dumpsys meminfo) + ecart avec la photo precedente
              (meme app non redemarree). Total PSS, Java, Natif, Graphique, vues,
              activites, binders (une fuite de vues/activites se voit ici).
    frames    Fluidite : remet gfxinfo a zero, tu fais ton geste pendant -Seconds,
              puis images totales / lentes (>16,7 / 33 / 50 / 100 ms), centiles
              50/90/95/99, les 5 pires images.
    watch     Releve toutes les -Every secondes pendant -Seconds (ex. un MIX de
              45 min) : memoire, vues, batterie, statut thermique -> fichier CSV +
              resume (pente en Mo / 10 min). Ctrl+C pour arreter : le resume s'affiche.
    heat      Photo « chauffe » : statut thermique (dumpsys thermalservice), batterie
              (dumpsys battery), charge CPU (dumpsys cpuinfo, lignes de l'app) et les
              10 premiers fils (top -H) — a lancer JUSTE APRES un long MIX qui rame.
    threads   Seulement les fils qui chauffent (top -H, 10 premiers).
    selftest  Verifie les lecteurs de texte avec des exemples integres (sans telephone).

  EXEMPLES
    .\measure.ps1 check
    .\measure.ps1 mem -Label avant-mix      # puis, apres le MIX :
    .\measure.ps1 mem -Label apres-mix      # affiche l'ecart avec « avant-mix »
    .\measure.ps1 frames -Seconds 15 -Label swipe-accueil
    .\measure.ps1 watch -Seconds 2700 -Every 10 -Label mix-45min
    .\measure.ps1 heat -Label apres-mix-57min

  NOTE : ecrit sans tester sur telephone (les formats de dumpsys varient un peu
  selon la version d'Android) ; `selftest` verifie les lecteurs sur des exemples.
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('check', 'mem', 'frames', 'watch', 'heat', 'threads', 'selftest')]
  [string]$Mode = 'check',
  [string]$Package = 'com.flextimer.app',
  [string]$Label = '',
  [int]$Seconds = 20,
  [int]$Every = 10,
  [string]$Device = '',
  [string]$OutDir = 'E:\ftb\perf'
)

$ErrorActionPreference = 'Stop'
$script:Adb = $null

# ---------------------------------------------------------------- adb

function Find-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  # Les variables d'environnement peuvent manquer : Join-Path refuse une valeur nulle.
  foreach ($root in @($env:LOCALAPPDATA, $env:ANDROID_HOME, $env:ANDROID_SDK_ROOT)) {
    if (-not $root) { continue }
    foreach ($sub in 'Android\Sdk\platform-tools\adb.exe', 'platform-tools\adb.exe') {
      $c = Join-Path $root $sub
      if (Test-Path $c) { return $c }
    }
  }
  throw "adb introuvable. Installe les « platform-tools » Android ou ajoute adb au PATH."
}

function ConvertTo-ArgString([string[]]$Items) {
  ($Items | ForEach-Object {
    if ($_ -match '[\s"|<>&]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }) -join ' '
}

# Lance adb SANS passer par 2>&1 (PowerShell 5.1 transforme la sortie d'erreur d'un
# programme natif en erreur) : stdout et stderr sont lus separement.
function Invoke-Adb([string[]]$AdbArgs) {
  if (-not $script:Adb) { $script:Adb = Find-Adb }
  $all = @()
  if ($Device) { $all += @('-s', $Device) }
  $all += $AdbArgs
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $script:Adb
  $psi.Arguments = ConvertTo-ArgString $all
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
  $p = [System.Diagnostics.Process]::Start($psi)
  $errTask = $p.StandardError.ReadToEndAsync()
  $out = $p.StandardOutput.ReadToEnd()
  $p.WaitForExit()
  $err = $errTask.Result
  if ($p.ExitCode -ne 0 -and -not $out) { throw "adb a echoue : $err" }
  return $out
}

function Invoke-AdbShell([string]$Command) { Invoke-Adb @('shell', $Command) }

function Get-AppPid {
  $out = (Invoke-AdbShell "pidof $Package").Trim()
  if (-not $out) { throw "L'app $Package n'est pas lancee sur le telephone (ouvre-la d'abord)." }
  return [int]($out -split '\s+')[0]
}

# ---------------------------------------------------------------- lecteurs de texte

function ConvertFrom-MemInfo([string]$Text) {
  $r = [ordered]@{}
  foreach ($name in 'Java Heap', 'Native Heap', 'Code', 'Stack', 'Graphics', 'Private Other', 'System') {
    $m = [regex]::Match($Text, '(?m)^\s*' + [regex]::Escape($name) + ':\s+(\d+)')
    if ($m.Success) { $r[$name] = [int]$m.Groups[1].Value }
  }
  $t = [regex]::Match($Text, 'TOTAL PSS:\s+(\d+)')
  if (-not $t.Success) { $t = [regex]::Match($Text, '(?m)^\s*TOTAL\s+(\d+)') }
  if ($t.Success) { $r['TOTAL PSS'] = [int]$t.Groups[1].Value }
  $s = [regex]::Match($Text, 'TOTAL SWAP PSS:\s+(\d+)')
  if ($s.Success) { $r['TOTAL SWAP PSS'] = [int]$s.Groups[1].Value }
  $names = 'Views|ViewRootImpl|AppContexts|Activities|Assets|AssetManagers|Local Binders|Proxy Binders|Parcel memory|Parcel count|Death Recipients|OpenSSL Sockets|WebViews'
  foreach ($m in [regex]::Matches($Text, '(' + $names + '):\s+(\d+)')) {
    $r[$m.Groups[1].Value] = [int]$m.Groups[2].Value
  }
  return $r
}

function ConvertFrom-FrameStats([string]$Text) {
  # Renvoie des objets { Intended, Ms } pour les images valides (Flags = 0).
  $frames = New-Object System.Collections.ArrayList
  $inData = $false
  $idx = $null
  foreach ($line in ($Text -split "`r?`n")) {
    $l = $line.Trim()
    if ($l -eq '---PROFILEDATA---') { $inData = -not $inData; continue }
    if (-not $inData -or -not $l) { continue }
    $cols = $l.TrimEnd(',') -split ','
    if ($cols[0] -eq 'Flags') {
      $idx = @{}
      for ($i = 0; $i -lt $cols.Count; $i++) { $idx[$cols[$i]] = $i }
      continue
    }
    if (-not $idx -or -not $idx.ContainsKey('IntendedVsync') -or -not $idx.ContainsKey('FrameCompleted')) { continue }
    if ($cols.Count -le $idx['FrameCompleted']) { continue }
    $inv = [System.Globalization.CultureInfo]::InvariantCulture
    $flags = [double]::Parse($cols[$idx['Flags']], $inv)
    if ($flags -ne 0) { continue }   # image non representative (fenetre redimensionnee, etc.)
    $intended = [double]::Parse($cols[$idx['IntendedVsync']], $inv)
    $done = [double]::Parse($cols[$idx['FrameCompleted']], $inv)
    $ms = ($done - $intended) / 1000000.0
    if ($ms -le 0 -or $ms -gt 10000) { continue }  # image en cours / valeur sentinelle
    [void]$frames.Add([pscustomobject]@{ Intended = $intended; Ms = $ms })
  }
  return , $frames
}

function Get-Percentile([double[]]$Sorted, [double]$P) {
  if (-not $Sorted -or $Sorted.Count -eq 0) { return $null }
  $i = [math]::Ceiling($P / 100.0 * $Sorted.Count) - 1
  if ($i -lt 0) { $i = 0 }
  return $Sorted[$i]
}

function ConvertFrom-GfxSummary([string]$Text) {
  $r = [ordered]@{}
  foreach ($m in [regex]::Matches($Text, '(?m)^\s*(Total frames rendered|Janky frames|50th percentile|90th percentile|95th percentile|99th percentile|Number Missed Vsync|Number High input latency|Number Slow UI thread|Number Slow bitmap uploads|Number Slow issue draw commands|Number Frame deadline missed):\s*(.+?)\s*$')) {
    $r[$m.Groups[1].Value] = $m.Groups[2].Value
  }
  return $r
}

function ConvertFrom-Battery([string]$Text) {
  $r = [ordered]@{}
  $t = [regex]::Match($Text, '(?m)^\s*temperature:\s*(-?\d+)')
  if ($t.Success) { $r['TempC'] = [int]$t.Groups[1].Value / 10.0 }
  $l = [regex]::Match($Text, '(?m)^\s*level:\s*(\d+)')
  if ($l.Success) { $r['Pct'] = [int]$l.Groups[1].Value }
  $r['Branche'] = ($Text -match '(?m)^\s*(AC|USB|Wireless) powered:\s*true')
  return $r
}

function ConvertFrom-Thermal([string]$Text) {
  $r = [ordered]@{ Status = $null; Temps = @() }
  $s = [regex]::Match($Text, 'Thermal Status:\s*(\d+)')
  if ($s.Success) { $r['Status'] = [int]$s.Groups[1].Value }
  $temps = @()
  foreach ($m in [regex]::Matches($Text, 'mValue=(-?[\d.]+),\s*mType=(\d+),\s*mName=([^,}]+)')) {
    $temps += ('{0} = {1} C' -f $m.Groups[3].Value.Trim(), $m.Groups[1].Value)
  }
  $r['Temps'] = $temps
  return $r
}

$ThermalNames = @('Normal', 'Leger', 'Modere', 'Severe', 'Critique', 'Urgence', 'Arret')
function Format-Thermal($Status) {
  if ($null -eq $Status) { return 'n/d' }
  $i = [math]::Max(0, [math]::Min($ThermalNames.Count - 1, [int]$Status))
  return '{0} ({1})' -f $ThermalNames[$i], $Status
}

# ---------------------------------------------------------------- utilitaires

function Initialize-OutDir {
  if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
}

function New-OutFile([string]$Prefix, [string]$Ext) {
  Initialize-OutDir
  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  $lab = ''
  if ($Label) { $lab = '-' + ($Label -replace '[^\w\-]', '_') }
  return Join-Path $OutDir ('{0}-{1}{2}.{3}' -f $Prefix, $ts, $lab, $Ext)
}

function Write-Table($Rows) { $Rows | Format-Table -AutoSize | Out-String | Write-Host }

function Get-MemSnapshot {
  $pidApp = Get-AppPid
  $mem = ConvertFrom-MemInfo (Invoke-AdbShell "dumpsys meminfo $Package")
  return [pscustomobject]@{ Pid = $pidApp; At = (Get-Date).ToString('s'); Mem = $mem }
}

function Get-HeatText {
  $thermal = ConvertFrom-Thermal (Invoke-AdbShell 'dumpsys thermalservice')
  $battery = ConvertFrom-Battery (Invoke-AdbShell 'dumpsys battery')
  return [pscustomobject]@{ Thermal = $thermal; Battery = $battery }
}

function Show-TopThreads([int]$AppPid) {
  # top -H : un fil par ligne. Le format varie selon Android : on affiche le brut.
  $out = Invoke-AdbShell "top -H -b -n 1 -p $AppPid"
  if (-not $out -or $out -match 'Unknown option|invalid option') {
    $out = Invoke-AdbShell "ps -T -p $AppPid"
  }
  $lines = $out -split "`r?`n" | Where-Object { $_.Trim() }
  Write-Host "--- Fils les plus actifs (10 premiers) ---" -ForegroundColor Cyan
  $lines | Select-Object -First 18 | ForEach-Object { Write-Host $_ }
}

# ---------------------------------------------------------------- modes

function Invoke-Check {
  $devices = Invoke-Adb @('devices', '-l')
  Write-Host $devices
  if (-not ($devices -split "`r?`n" | Where-Object { $_ -match '\sdevice\s' })) {
    Write-Host "Aucun telephone detecte : branche-le en USB, active le debogage USB et accepte l'autorisation sur l'ecran." -ForegroundColor Yellow
    return
  }
  $pidApp = $null
  try { $pidApp = Get-AppPid } catch { Write-Host $_.Exception.Message -ForegroundColor Yellow }
  Write-Host ('Modele      : ' + (Invoke-AdbShell 'getprop ro.product.model').Trim())
  Write-Host ('Android     : ' + (Invoke-AdbShell 'getprop ro.build.version.release').Trim())
  $ver = (Invoke-AdbShell "dumpsys package $Package") -split "`r?`n" | Where-Object { $_ -match 'versionName=|versionCode=' } | Select-Object -First 2
  $ver | ForEach-Object { Write-Host ('App         : ' + $_.Trim()) }
  if ($pidApp) { Write-Host "pid de l'app : $pidApp" -ForegroundColor Green }
}

function Invoke-Mem {
  Initialize-OutDir
  $snap = Get-MemSnapshot
  $file = New-OutFile 'mem' 'json'
  # Photo precedente (la plus recente deja sauvegardee) pour l'ecart.
  $prev = $null
  $last = Get-ChildItem -Path $OutDir -Filter 'mem-*.json' -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
  if ($last) { $prev = Get-Content $last.FullName -Raw -Encoding UTF8 | ConvertFrom-Json }
  $snap | ConvertTo-Json -Depth 5 | Set-Content -Path $file -Encoding UTF8

  Write-Host ("Memoire de {0} (pid {1}) - valeurs en Ko" -f $Package, $snap.Pid) -ForegroundColor Cyan
  $comparable = $prev -and ($prev.Pid -eq $snap.Pid)
  $rows = foreach ($k in $snap.Mem.Keys) {
    $v = $snap.Mem[$k]
    $d = ''
    if ($comparable -and $null -ne $prev.Mem.$k) { $diff = $v - $prev.Mem.$k; if ($diff -ne 0) { $d = '{0:+#;-#;0}' -f $diff } else { $d = '=' } }
    [pscustomobject]@{ Mesure = $k; Valeur = $v; Ecart = $d }
  }
  Write-Table $rows
  if ($comparable) { Write-Host ("Ecart avec la photo du {0} ({1})." -f $prev.At, (Split-Path $last.Name -Leaf)) }
  elseif ($prev) { Write-Host "Photo precedente d'un autre lancement de l'app : pas d'ecart affiche." -ForegroundColor Yellow }
  Write-Host "Sauvegarde : $file"
  Write-Host "Lecture : si 'Views' ou 'Activities' montent a chaque passage, des ecrans ne sont pas liberes ; 'Native Heap' / 'Graphics' qui montent = sons, images, vues gardes."
}

function Invoke-Frames {
  $pidApp = Get-AppPid
  [void](Invoke-AdbShell "dumpsys gfxinfo $Package reset")
  Write-Host "Compteurs remis a zero. Fais ton geste MAINTENANT pendant $Seconds s (glisse l'accueil, ouvre des feuilles...)." -ForegroundColor Cyan
  $seen = New-Object 'System.Collections.Generic.HashSet[double]'
  $durations = New-Object System.Collections.ArrayList
  $frames = New-Object System.Collections.ArrayList
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($watch.Elapsed.TotalSeconds -lt $Seconds) {
    # framestats ne garde que ~120 images : on relit souvent et on dedoublonne.
    $batch = ConvertFrom-FrameStats (Invoke-AdbShell "dumpsys gfxinfo $Package framestats")
    foreach ($f in $batch) {
      if ($seen.Add($f.Intended)) { [void]$durations.Add([double]$f.Ms); [void]$frames.Add($f) }
    }
    Write-Host ("`r  {0,3} s / {1} s - {2} images" -f [int]$watch.Elapsed.TotalSeconds, $Seconds, $durations.Count) -NoNewline
    Start-Sleep -Milliseconds 700
  }
  Write-Host ''
  $summary = ConvertFrom-GfxSummary (Invoke-AdbShell "dumpsys gfxinfo $Package")
  $sorted = [double[]]($durations | Sort-Object)
  $n = $sorted.Count
  if ($n -eq 0) { Write-Host "Aucune image relevee : l'app etait-elle a l'ecran ?" -ForegroundColor Yellow; return }
  $res = [ordered]@{
    Images       = $n
    'Plus de 16,7 ms' = @($sorted | Where-Object { $_ -gt 16.7 }).Count
    'Plus de 33 ms'   = @($sorted | Where-Object { $_ -gt 33.3 }).Count
    'Plus de 50 ms'   = @($sorted | Where-Object { $_ -gt 50 }).Count
    'Plus de 100 ms'  = @($sorted | Where-Object { $_ -gt 100 }).Count
    'Centile 50 (ms)' = [math]::Round((Get-Percentile $sorted 50), 1)
    'Centile 90 (ms)' = [math]::Round((Get-Percentile $sorted 90), 1)
    'Centile 95 (ms)' = [math]::Round((Get-Percentile $sorted 95), 1)
    'Centile 99 (ms)' = [math]::Round((Get-Percentile $sorted 99), 1)
    'Pire image (ms)' = [math]::Round($sorted[$n - 1], 1)
  }
  Write-Host ("Fluidite pendant {0} s (pid {1}) :" -f $Seconds, $pidApp) -ForegroundColor Cyan
  $res.GetEnumerator() | ForEach-Object { Write-Host ('  {0,-18} {1}' -f $_.Key, $_.Value) }
  $worst = $frames | Sort-Object Ms -Descending | Select-Object -First 5 | ForEach-Object { [math]::Round($_.Ms, 1) }
  Write-Host ('  5 pires images (ms) : ' + ($worst -join ', '))
  Write-Host "  (une image doit tenir en 16,7 ms a 60 Hz, 11,1 ms a 90 Hz, 8,3 ms a 120 Hz)"
  if ($summary.Count) {
    Write-Host "Resume du systeme (dumpsys gfxinfo) :" -ForegroundColor Cyan
    $summary.GetEnumerator() | ForEach-Object { Write-Host ('  {0,-32} {1}' -f $_.Key, $_.Value) }
  }
  $file = New-OutFile 'frames' 'json'
  [pscustomobject]@{ Pid = $pidApp; At = (Get-Date).ToString('s'); Seconds = $Seconds; Result = $res; System = $summary } |
    ConvertTo-Json -Depth 5 | Set-Content -Path $file -Encoding UTF8
  Write-Host "Sauvegarde : $file"
}

function Invoke-Watch {
  if ($Seconds -eq 20) { $Seconds = 3600 }   # valeur par defaut de ce mode : 1 heure
  $pidApp = Get-AppPid
  $file = New-OutFile 'watch' 'csv'
  'time,elapsed_s,pss_total_kb,java_kb,native_kb,graphics_kb,code_kb,private_other_kb,views,activities,local_binders,proxy_binders,battery_c,battery_pct,thermal' |
    Set-Content -Path $file -Encoding UTF8
  Write-Host ("Releve toutes les {0} s pendant {1} s (Ctrl+C pour arreter). Fichier : {2}" -f $Every, $Seconds, $file) -ForegroundColor Cyan
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  $first = $null; $lastMem = $null; $minP = $null; $maxP = $null; $maxTemp = $null; $maxThermal = $null
  try {
    while ($watch.Elapsed.TotalSeconds -lt $Seconds) {
      $m = ConvertFrom-MemInfo (Invoke-AdbShell "dumpsys meminfo $Package")
      $h = Get-HeatText
      $el = [int]$watch.Elapsed.TotalSeconds
      $pss = $m['TOTAL PSS']
      if ($null -ne $pss) {
        if ($null -eq $first) { $first = $pss }
        $lastMem = $pss
        if ($null -eq $minP -or $pss -lt $minP) { $minP = $pss }
        if ($null -eq $maxP -or $pss -gt $maxP) { $maxP = $pss }
      }
      $temp = $h.Battery['TempC']
      if ($null -ne $temp -and ($null -eq $maxTemp -or $temp -gt $maxTemp)) { $maxTemp = $temp }
      $th = $h.Thermal['Status']
      if ($null -ne $th -and ($null -eq $maxThermal -or $th -gt $maxThermal)) { $maxThermal = $th }
      $row = @((Get-Date).ToString('s'), $el, $pss, $m['Java Heap'], $m['Native Heap'], $m['Graphics'], $m['Code'], $m['Private Other'],
               $m['Views'], $m['Activities'], $m['Local Binders'], $m['Proxy Binders'], $temp, $h.Battery['Pct'], $th) -join ','
      Add-Content -Path $file -Value $row -Encoding UTF8
      Write-Host ('{0,5} s  PSS {1,7} Ko  Java {2,6}  Natif {3,6}  Graph {4,6}  Vues {5,4}  Batterie {6} C  Chauffe {7}' -f
        $el, $pss, $m['Java Heap'], $m['Native Heap'], $m['Graphics'], $m['Views'], $temp, (Format-Thermal $th))
      Start-Sleep -Seconds $Every
    }
  }
  finally {
    if ($null -ne $first -and $null -ne $lastMem) {
      $el = [math]::Max(1, $watch.Elapsed.TotalSeconds)
      $slope = ($lastMem - $first) / 1024.0 / $el * 600.0
      Write-Host ''
      Write-Host '--- Resume ---' -ForegroundColor Cyan
      Write-Host ('Memoire totale : debut {0:N0} Ko -> fin {1:N0} Ko (min {2:N0}, max {3:N0})' -f $first, $lastMem, $minP, $maxP)
      Write-Host ('Pente : {0:+0.0;-0.0;0.0} Mo toutes les 10 min' -f $slope)
      Write-Host ('Batterie max : {0} C   Chauffe max : {1}' -f $maxTemp, (Format-Thermal $maxThermal))
      Write-Host "CSV : $file (ouvre-le dans Excel pour tracer la courbe)"
    }
  }
}

function Invoke-Heat {
  $pidApp = Get-AppPid
  $h = Get-HeatText
  Write-Host ("--- Chauffe (pid {0}) ---" -f $pidApp) -ForegroundColor Cyan
  Write-Host ('Statut thermique : ' + (Format-Thermal $h.Thermal['Status']) + '   (0 normal, 2 modere = commence a brider, 3 severe = ralentit)')
  foreach ($t in ($h.Thermal['Temps'] | Select-Object -First 10)) { Write-Host ('  ' + $t) }
  Write-Host ('Batterie : {0} C, {1} %, branchee : {2}' -f $h.Battery['TempC'], $h.Battery['Pct'], $h.Battery['Branche'])
  Write-Host "--- Charge processeur (dumpsys cpuinfo) ---" -ForegroundColor Cyan
  $cpu = (Invoke-AdbShell 'dumpsys cpuinfo') -split "`r?`n"
  $cpu | Where-Object { $_ -match '^Load:|flextimer|TOTAL' } | Select-Object -First 8 | ForEach-Object { Write-Host $_ }
  Show-TopThreads $pidApp
  $file = New-OutFile 'heat' 'json'
  [pscustomobject]@{ Pid = $pidApp; At = (Get-Date).ToString('s'); Thermal = $h.Thermal; Battery = $h.Battery } |
    ConvertTo-Json -Depth 5 | Set-Content -Path $file -Encoding UTF8
  Write-Host "Sauvegarde : $file"
}

function Invoke-Threads {
  Show-TopThreads (Get-AppPid)
}

# ---------------------------------------------------------------- selftest

function Invoke-SelfTest {
  $fail = 0
  function Assert-Equal($Name, $Actual, $Expected) {
    if ("$Actual" -eq "$Expected") { Write-Host "  OK   $Name" -ForegroundColor Green }
    else { Write-Host "  ECHEC $Name : obtenu '$Actual', attendu '$Expected'" -ForegroundColor Red; $script:selfFail++ }
  }
  $script:selfFail = 0

  $mem = @'
** MEMINFO in pid 12345 [com.flextimer.app] **
                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap
                 Total    Dirty    Clean    Dirty    Total     Size    Alloc     Free
                ------   ------   ------   ------   ------   ------   ------   ------
  Native Heap    52345    52300        0        0    53000    70000    55000    14000

 App Summary
                       Pss(KB)                        Rss(KB)
                        ------                         ------
           Java Heap:    33012                          65432
         Native Heap:    52345                          53000
                Code:    45123                          80000
               Stack:     1234                           1300
            Graphics:    78910                          78910
       Private Other:    12345
              System:    23456
           TOTAL PSS:   312345            TOTAL RSS:   400000       TOTAL SWAP PSS:      17

 Objects
               Views:      123         ViewRootImpl:        2
         AppContexts:        4           Activities:        1
              Assets:       12        AssetManagers:        0
       Local Binders:       35        Proxy Binders:       40
'@
  $m = ConvertFrom-MemInfo $mem
  Write-Host 'ConvertFrom-MemInfo'
  Assert-Equal 'TOTAL PSS' $m['TOTAL PSS'] 312345
  Assert-Equal 'Java Heap' $m['Java Heap'] 33012
  Assert-Equal 'Native Heap (resume, pas le tableau)' $m['Native Heap'] 52345
  Assert-Equal 'Graphics' $m['Graphics'] 78910
  Assert-Equal 'Private Other' $m['Private Other'] 12345
  Assert-Equal 'SWAP' $m['TOTAL SWAP PSS'] 17
  Assert-Equal 'Views' $m['Views'] 123
  Assert-Equal 'Activities' $m['Activities'] 1
  Assert-Equal 'Proxy Binders' $m['Proxy Binders'] 40

  # Images : 10 ms, 20 ms, 50 ms valides ; une image « Flags = 1 » et une image en cours sont ignorees.
  function Row($flags, $intended, $completed) {
    $c = New-Object 'string[]' 17
    for ($i = 0; $i -lt 17; $i++) { $c[$i] = '0' }
    $c[0] = "$flags"; $c[1] = "$intended"; $c[13] = "$completed"
    return ($c -join ',') + ','
  }
  $header = 'Flags,IntendedVsync,Vsync,OldestInputEvent,NewestInputEvent,HandleInputStart,AnimationStart,PerformTraversalsStart,DrawStart,SyncQueued,SyncStart,IssueDrawCommandsStart,SwapBuffers,FrameCompleted,DequeueBufferDuration,QueueBufferDuration,GpuCompleted,'
  $fs = @(
    'Stats since: 5000000000ns',
    '---PROFILEDATA---',
    $header,
    (Row 0 1000000000 1010000000),
    (Row 0 1016666666 1036666666),
    (Row 1 1033333333 1043333333),
    (Row 0 1050000000 1100000000),
    (Row 0 1066666666 9223372036854775807),
    '---PROFILEDATA---'
  ) -join "`n"
  $frames = ConvertFrom-FrameStats $fs
  Write-Host 'ConvertFrom-FrameStats / Get-Percentile'
  Assert-Equal 'images valides' $frames.Count 3
  Assert-Equal 'premiere image (ms)' ([math]::Round($frames[0].Ms, 1)) 10
  $sorted = [double[]]($frames | ForEach-Object { $_.Ms } | Sort-Object)
  Assert-Equal 'centile 50' ([math]::Round((Get-Percentile $sorted 50), 1)) 20
  Assert-Equal 'centile 99' ([math]::Round((Get-Percentile $sorted 99), 1)) 50
  Assert-Equal 'centile vide' (Get-Percentile @() 50) ''

  $gfx = ConvertFrom-GfxSummary @'
Total frames rendered: 120
Janky frames: 6 (5.00%)
50th percentile: 8ms
99th percentile: 48ms
Number Slow UI thread: 3
'@
  Write-Host 'ConvertFrom-GfxSummary'
  Assert-Equal 'frames' $gfx['Total frames rendered'] 120
  Assert-Equal 'janky' $gfx['Janky frames'] '6 (5.00%)'
  Assert-Equal 'p99' $gfx['99th percentile'] '48ms'
  Assert-Equal 'slow UI' $gfx['Number Slow UI thread'] 3

  $bat = ConvertFrom-Battery @'
Current Battery Service state:
  AC powered: false
  USB powered: true
  status: 2
  level: 78
  scale: 100
  temperature: 372
'@
  Write-Host 'ConvertFrom-Battery'
  Assert-Equal 'temperature' $bat['TempC'] 37.2
  Assert-Equal 'niveau' $bat['Pct'] 78
  Assert-Equal 'branche' $bat['Branche'] True

  $th = ConvertFrom-Thermal @'
Thermal Status: 2
Cached temperatures:
	Temperature{mValue=41.3, mType=3, mName=skin, mStatus=0}
	Temperature{mValue=48.5, mType=0, mName=cpu0, mStatus=1}
'@
  Write-Host 'ConvertFrom-Thermal'
  Assert-Equal 'statut' $th['Status'] 2
  Assert-Equal 'nb de temperatures' $th['Temps'].Count 2
  Assert-Equal 'premiere temperature' $th['Temps'][0] 'skin = 41.3 C'
  Assert-Equal 'libelle' (Format-Thermal 2) 'Modere (2)'
  Assert-Equal 'libelle inconnu' (Format-Thermal $null) 'n/d'

  Write-Host 'ConvertTo-ArgString'
  Assert-Equal 'guillemets' (ConvertTo-ArgString @('shell', 'dumpsys meminfo x')) 'shell "dumpsys meminfo x"'

  if ($script:selfFail -eq 0) { Write-Host 'selftest : tout est bon.' -ForegroundColor Green }
  else { Write-Host ("selftest : {0} echec(s)." -f $script:selfFail) -ForegroundColor Red; exit 1 }
}

# ---------------------------------------------------------------- aiguillage

switch ($Mode) {
  'selftest' { Invoke-SelfTest }
  'check'    { Invoke-Check }
  'mem'      { Invoke-Mem }
  'frames'   { Invoke-Frames }
  'watch'    { Invoke-Watch }
  'heat'     { Invoke-Heat }
  'threads'  { Invoke-Threads }
}
