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
  { href: "/denetim", label: "Denetim" },
];

const NAV_SURUCU = [
  { href: "/araclar", label: "Araçlar" },
  { href: "/personel", label: "Sürücüler" },
  { href: "/is-kayitlari", label: "Gidilen İşler" },
  { href: "/muayeneler", label: "Muayeneler" },
  { href: "/yakit", label: "Yakıt" },
];

function navSec(rol: Rol) {
  if (rol === "MUHASEBE") return NAV_MUHASEBE;
  if (rol === "SURUCU") return NAV_SURUCU;
