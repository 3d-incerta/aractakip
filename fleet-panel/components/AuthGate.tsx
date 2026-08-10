"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

export type Rol = "YONETICI" | "MUHASEBE" | "FINANS" | "SURUCU";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [rol, setRol] = useState<Rol>("YONETICI");
  const pathname = usePathname();
  const router = useRouter();

  async function rolBelirle(userId: string) {
    const { data } = await supabase
      .from("suruculer")
      .select("rol")
      .eq("kullanici_id", userId)
      .maybeSingle();

    if (!data) return "YONETICI" as Rol;
    if (data.rol === "MUHASEBE") return "MUHASEBE" as Rol;
    if (data.rol === "FINANS") return "FINANS" as Rol;
    return "SURUCU" as Rol;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const r = await rolBelirle(data.session.user.id);
        setRol(r);
        // Sürücülerin varsayılan iniş sayfası dashboard değil, Araçlar olsun
        if (r === "SURUCU" && pathname === "/") {
          router.replace("/araclar");
        }
      }
      setChecking(false);
      if (!data.session && pathname !== "/login") {
        router.replace("/login");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const r = await rolBelirle(newSession.user.id);
        setRol(r);
      }
      if (!newSession && pathname !== "/login") {
        router.replace("/login");
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 font-mono">
        Oturum kontrol ediliyor...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={session.user?.email} rol={rol} />
      <main className="flex-1 bg-paper min-h-screen">{children}</main>
    </div>
  );
}
