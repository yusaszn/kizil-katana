# Kızıl Katana ikonunu (256x256 PNG içeren .ico) çizer.
param([string]$Out)
Add-Type -AssemblyName System.Drawing
$s = 256
$bmp = New-Object System.Drawing.Bitmap $s, $s
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point 0,0), (New-Object System.Drawing.Point $s,$s), [System.Drawing.Color]::FromArgb(255,90,8,6), [System.Drawing.Color]::FromArgb(255,18,2,2))
$g.FillEllipse($bg, 6, 6, $s-12, $s-12)
$ring = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,255,58,42)), 10
$g.DrawEllipse($ring, 11, 11, $s-22, $s-22)
# kan damlaları
$red = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,200,16,10))
$g.FillEllipse($red, 150, 150, 46, 46); $g.FillEllipse($red, 190, 110, 18, 18); $g.FillEllipse($red, 120, 196, 14, 14)
# katana: kabza sol alt, uç sağ üst
$g.TranslateTransform(128, 128); $g.RotateTransform(-45)
$blade = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,235,240,245))
$pts = @((New-Object System.Drawing.PointF -40,-7), (New-Object System.Drawing.PointF 92,-9), (New-Object System.Drawing.PointF 112,4), (New-Object System.Drawing.PointF 86,7), (New-Object System.Drawing.PointF -40,7))
$g.FillPolygon($blade, [System.Drawing.PointF[]]$pts)
$gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,40,30,26))
$g.FillRectangle($gold, -50, -20, 12, 40)
$grip = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,122,20,16))
$g.FillRectangle($grip, -104, -9, 54, 18)
$dark = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,27,13,10)), 4
for ($x = -98; $x -lt -52; $x += 12) { $g.DrawLine($dark, $x, -9, $x + 8, 9) }
$g.Dispose()
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $ms.ToArray()
$fs = [System.IO.File]::Create($Out)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)
$bw.Write($png)
$bw.Close()
