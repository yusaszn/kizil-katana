# Kızıl Katana.exe başlatıcısını yeniden derler. Oyun kodunu değiştirmek için gerekmez.
# Çalıştırmak için: sağ tık > PowerShell ile çalıştır
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& "$PSScriptRoot\ikon.ps1" -Out "$PSScriptRoot\ikon.ico"
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'Kızıl Katana.exe'
& $csc /nologo /codepage:65001 /target:winexe /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll "/win32icon:$PSScriptRoot\ikon.ico" "/out:$out" "$PSScriptRoot\Baslatici.cs"
if ($LASTEXITCODE -ne 0) { throw 'Derleme başarısız' }
Write-Host "Hazır: $out"
