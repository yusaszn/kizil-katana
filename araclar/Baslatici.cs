// Kızıl Katana başlatıcısı: index.html'i Edge/Chrome'da ayrı bir uygulama penceresi olarak açar.
// Derlemek için: araclar\derle.bat
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

static class Baslatici
{
    [STAThread]
    static void Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
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
}
