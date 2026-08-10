"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import type { Rol } from "@/components/AuthGate";

const NAV_YONETICI = [
  { href: "/", label: "Panel" },
  { href: "/araclar", label: "Araçlar" },
  { href: "/personel", label: "Sürücüler" },
  { href: "/is-kayitlari", label: "Gidilen İşler" },
  { href: "/yol-masraflari", label: "Yol Masrafları" },
  { href: "/belgeler", label: "Belgeler" },
  { href: "/konum", label: "Konum" },
  { href: "/muayeneler", label: "Muayeneler" },
  { href: "/yakit", label: "Yakıt" },
  { href: "/analiz", label: "Analiz" },
  { href: "/rapor", label: "Aylık Rapor" },
  { href: "/mesajlar", label: "Mesajlar" },
  { href: "/denetim", label: "Denetim" },
];

const NAV_MUHASEBE = [
  { href: "/", label: "Panel" },
  { href: "/analiz", label: "Analiz" },
  { href: "/rapor", label: "Aylık Rapor" },
  { href: "/yol-masraflari", label: "Yol Masrafları" },
  { href: "/belgeler", label: "Belgeler" },
  { href: "/mesajlar", label: "Mesajlar" },
  { href: "/denetim", label: "Denetim" },
];

const NAV_SURUCU = [
  { href: "/araclar", label: "Araçlar" },
  { href: "/personel", label: "Sürücüler" },
  { href: "/is-kayitlari", label: "Gidilen İşler" },
  { href: "/muayeneler", label: "Muayeneler" },
  { href: "/yakit", label: "Yakıt" },
  { href: "/yol-masraflari", label: "Yol Masrafları" },
  { href: "/belgeler", label: "Belgeler" },
  { href: "/mesajlar", label: "Mesajlar" },
];

function navSec(rol: Rol) {
  if (rol === "MUHASEBE") return NAV_MUHASEBE;
  if (rol === "SURUCU") return NAV_SURUCU;
  return NAV_YONETICI; // YONETICI ve FINANS — tam menü
}

const ROL_ETIKET: Record<Rol, string> = {
  YONETICI: "Yönetici",
  MUHASEBE: "Muhasebe Sorumlusu",
  FINANS: "Muhasebe ve Finans Müdürü",
  SURUCU: "Sürücü",
};

export default function Sidebar({ userEmail, userName, rol }: { userEmail?: string; userName?: string | null; rol: Rol }) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = navSec(rol);
  const [bekleyenSayisi, setBekleyenSayisi] = useState(0);

  useEffect(() => {
    // Sadece onay verebilecek roller için bekleyen masraf sayısını göster
    if (rol !== "YONETICI" && rol !== "MUHASEBE" && rol !== "FINANS") return;

    async function bekleyenleriGetir() {
      const { count } = await supabase
        .from("yol_masraflari")
        .select("*", { count: "exact", head: true })
        .eq("durum", "BEKLEMEDE");
      setBekleyenSayisi(count ?? 0);
    }

    bekleyenleriGetir();
    // Sayfa değişse bile (başka bir işlem sonrası) güncel kalsın diye periyodik yenile
    const zamanlayici = setInterval(bekleyenleriGetir, 30000);
    return () => clearInterval(zamanlayici);
  }, [rol]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="lux-sidebar w-60 shrink-0 text-slate-300 flex flex-col min-h-screen">
      <div className="lux-sidebar-header px-6 pt-7 pb-6 flex items-center gap-2.5">
        <Logo size={26} />
        <div>
          <div className="font-lux text-lg text-white leading-tight">3D InCerTa</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">
            Araç Takip Sistemi
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const bildirimGoster = item.href === "/yol-masraflari" && bekleyenSayisi > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`lux-nav-item flex items-center justify-between px-3 py-2.5 rounded-md text-sm border-l-2 transition-colors ${
                active
                  ? "active"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.label}</span>
              {bildirimGoster && (
                <span className="lux-badge-count inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold">
                  {bekleyenSayisi}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="lux-sidebar-footer px-4 py-4">
        <span className="lux-role-tag mb-2">{ROL_ETIKET[rol]}</span>
        {userName ? (
          <div className="text-sm text-white truncate mt-2 mb-0.5 font-medium">{userName}</div>
        ) : null}
        {userEmail && (
          <div className="text-xs text-slate-500 truncate mb-2 font-mono">{userEmail}</div>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Çıkış yap
        </button>
      </div>
    </aside>
  );
}
