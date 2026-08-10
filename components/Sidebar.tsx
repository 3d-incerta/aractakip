"use client";

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
  { href: "/denetim", label: "Denetim" },
];

const NAV_MUHASEBE = [
  { href: "/", label: "Panel" },
  { href: "/analiz", label: "Analiz" },
  { href: "/rapor", label: "Aylık Rapor" },
  { href: "/yol-masraflari", label: "Yol Masrafları" },
  { href: "/belgeler", label: "Belgeler" },
  { href: "/denetim", label: "Denetim" },
];

const NAV_SURUCU = [
  { href: "/araclar", label: "Araçlar" },
  { href: "/personel", label: "Sürücüler" },
  { href: "/is-kayitlari", label: "Gidilen İşler" },
  { href: "/muayeneler", label: "Muayeneler" },
  { href: "/yakit", label: "Yakıt" },
  { href: "/belgeler", label: "Belgeler" },
];

function navSec(rol: Rol) {
  if (rol === "MUHASEBE") return NAV_MUHASEBE;
  if (rol === "SURUCU") return NAV_SURUCU;
  return NAV_YONETICI;
}

const ROL_ETIKET: Record<Rol, string> = {
  YONETICI: "Yönetici",
  MUHASEBE: "Muhasebe",
  SURUCU: "Sürücü",
};

export default function Sidebar({ userEmail, rol }: { userEmail?: string; rol: Rol }) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = navSec(rol);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-navy text-slate-300 flex flex-col min-h-screen">
      <div className="px-6 pt-7 pb-6 border-b border-white/10 flex items-center gap-2.5">
        <Logo size={26} />
        <div>
          <div className="font-display text-lg text-white tracking-tight leading-tight">3D InCerTa</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">
            Araç Takip Sistemi
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2.5 rounded-md text-sm border-l-2 transition-colors ${
                active
                  ? "border-amber text-white bg-white/5"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber mb-2">
          {ROL_ETIKET[rol]}
        </div>
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
