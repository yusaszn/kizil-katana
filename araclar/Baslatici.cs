// Kızıl Katana başlatıcısı: açılışta GitHub'dan güncellemeyi kontrol eder, sonra index.html'i Edge/Chrome'da ayrı bir uygulama penceresi olarak açar.
// Derlemek için: araclar\derle.ps1
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Windows.Forms;

static class Baslatici
{
    const string Repo = "yusaszn/kizil-katana";
    const string SurumUrl = "https://raw.githubusercontent.com/" + Repo + "/main/surum.txt";
    const string ZipUrl = "https://github.com/" + Repo + "/archive/refs/heads/main.zip";

    [STAThread]
    static void Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        try { Guncelle(dir); } catch { /* internet yoksa ya da GitHub'a ulaşılamazsa eldeki sürümle açılır */ }
        Ac(dir);
    }

    // surum.txt GitHub'dakinden farklıysa depoyu zip olarak indirip oyun dosyalarını yeniler
    static void Guncelle(string dir)
    {
        string eski = Path.Combine(dir, "Kızıl Katana.eski");
        if (File.Exists(eski)) { try { File.Delete(eski); } catch { } }
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;   // TLS 1.2
        string yerel = File.Exists(Path.Combine(dir, "surum.txt")) ? File.ReadAllText(Path.Combine(dir, "surum.txt")).Trim() : "";
        string uzak;
        using (var wc = new ZamanAsimliIstemci(4000)) uzak = wc.DownloadString(SurumUrl + "?t=" + DateTime.UtcNow.Ticks).Trim();
        if (uzak.Length == 0 || uzak == yerel) return;

        var bilgi = new Form { Text = "Kızıl Katana", Width = 360, Height = 110, StartPosition = FormStartPosition.CenterScreen, FormBorderStyle = FormBorderStyle.FixedDialog, ControlBox = false };
        bilgi.Controls.Add(new Label { Text = "Yeni sürüm indiriliyor (" + uzak + ")...", Dock = DockStyle.Fill, TextAlign = System.Drawing.ContentAlignment.MiddleCenter });
        bilgi.Show(); Application.DoEvents();
        string tmp = Path.Combine(Path.GetTempPath(), "KizilKatanaGuncelleme");
        try
        {
            if (Directory.Exists(tmp)) Directory.Delete(tmp, true);
            Directory.CreateDirectory(tmp);
            string zip = Path.Combine(tmp, "oyun.zip");
            using (var wc = new ZamanAsimliIstemci(60000)) wc.DownloadFile(ZipUrl, zip);
            ZipFile.ExtractToDirectory(zip, tmp);
            string kok = Directory.GetDirectories(tmp)[0];   // kizil-katana-main
            string exeAdi = Path.GetFileName(Application.ExecutablePath);
            foreach (string kaynak in Directory.GetFiles(kok, "*", SearchOption.AllDirectories))
            {
                string goreli = kaynak.Substring(kok.Length + 1);
                if (goreli.StartsWith(".claude")) continue;
                string hedef = Path.Combine(dir, goreli);
                Directory.CreateDirectory(Path.GetDirectoryName(hedef));
                if (string.Equals(goreli, exeAdi, StringComparison.OrdinalIgnoreCase))
                {
                    // çalışan exe'nin üstüne yazılamaz ama adı değiştirilebilir: eskisi kenara, yenisi yerine
                    if (File.Exists(eski)) File.Delete(eski);
                    File.Move(Application.ExecutablePath, eski);
                }
                File.Copy(kaynak, hedef, true);
            }
        }
        finally { bilgi.Close(); try { Directory.Delete(tmp, true); } catch { } }
    }

    static void Ac(string dir)
    {
        string page = Path.Combine(dir, "index.html");
        if (!File.Exists(page))
        {
            MessageBox.Show("index.html bulunamadı:\n" + page, "Kızıl Katana", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        string url = new Uri(page).AbsoluteUri;
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] browsers = {
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
        };
        string profile = Path.Combine(local, "KizilKatana");
        foreach (string b in browsers)
        {
            if (!File.Exists(b)) continue;
            string args = "--app=\"" + url + "\" --start-maximized --user-data-dir=\"" + profile + "\" --autoplay-policy=no-user-gesture-required --disable-features=Translate --no-first-run";
            Process.Start(new ProcessStartInfo(b, args) { UseShellExecute = false });
            return;
        }
        Process.Start(new ProcessStartInfo(page) { UseShellExecute = true });
    }

    class ZamanAsimliIstemci : WebClient
    {
        readonly int ms;
        public ZamanAsimliIstemci(int ms) { this.ms = ms; Headers[HttpRequestHeader.UserAgent] = "KizilKatana"; }
        protected override WebRequest GetWebRequest(Uri address) { var r = base.GetWebRequest(address); r.Timeout = ms; return r; }
    }
}
