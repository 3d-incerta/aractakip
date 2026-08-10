"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Mesaj = {
  id: string;
  gonderen_id: string;
  gonderen_ad: string;
  mesaj: string;
  created_at: string;
};

function saatFormatla(iso: string) {
  const d = new Date(iso);
  const bugun = new Date();
  const dun = new Date();
  dun.setDate(dun.getDate() - 1);

  const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (d.toDateString() === bugun.toDateString()) return saat;
  if (d.toDateString() === dun.toDateString()) return `Dün ${saat}`;
  return `${d.toLocaleDateString("tr-TR")} ${saat}`;
}

export default function MesajlarPage() {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [loading, setLoading] = useState(true);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [kendiId, setKendiId] = useState<string | null>(null);
  const [kendiAd, setKendiAd] = useState<string>("Kullanıcı");
  const listeSonuRef = useRef<HTMLDivElement>(null);

  async function kullaniciBilgisiHazirla() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setKendiId(user.id);

    const { data: surucuKaydi } = await supabase
      .from("suruculer")
      .select("ad, soyad")
      .eq("kullanici_id", user.id)
      .maybeSingle();

    if (surucuKaydi) {
      setKendiAd(`${surucuKaydi.ad} ${surucuKaydi.soyad}`);
    } else {
      setKendiAd(user.email?.split("@")[0] ?? "Yönetici");
    }
  }

  async function loadData() {
    const { data } = await supabase
      .from("mesajlar")
      .select("id, gonderen_id, gonderen_ad, mesaj, created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    setMesajlar(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    kullaniciBilgisiHazirla();
    loadData();
    const zamanlayici = setInterval(loadData, 5000);
    return () => clearInterval(zamanlayici);
  }, []);

  useEffect(() => {
    listeSonuRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar.length]);

  async function handleGonder(e: React.FormEvent) {
    e.preventDefault();
    const metin = yeniMesaj.trim();
    if (!metin || !kendiId) return;

    setGonderiliyor(true);
    const { error } = await supabase.from("mesajlar").insert({
      gonderen_id: kendiId,
      gonderen_ad: kendiAd,
      mesaj: metin,
    });
    setGonderiliyor(false);

    if (error) {
      alert("Gönderilemedi: " + error.message);
      return;
    }

    setYeniMesaj("");
    loadData();
  }

  async function handleSil(m: Mesaj) {
    if (!confirm("Bu mesajı silmek istediğine emin misin?")) return;
    const { error } = await supabase.from("mesajlar").delete().eq("id", m.id);
    if (error) {
      alert("Silinemedi: " + error.message);
      return;
    }
    loadData();
  }

  return (
    <div className="p-8 max-w-3xl flex flex-col" style={{ height: "calc(100vh - 0px)" }}>
      <div className="mb-4">
        <h1 className="font-display text-2xl mb-1">Mesajlar</h1>
        <p className="text-sm text-slate-500">Tüm ekip burada birbirine yazabilir</p>
      </div>

      <div className="card flex-1 overflow-y-auto p-5 mb-4 flex flex-col gap-3" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {loading && <div className="text-sm text-slate-400 text-center py-10 animate-pulse">Yükleniyor...</div>}
        {!loading && mesajlar.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-10">Henüz mesaj yok. İlk mesajı sen yaz.</div>
        )}
        {mesajlar.map((m) => {
          const kendisiMi = m.gonderen_id === kendiId;
          return (
            <div key={m.id} className={`flex ${kendisiMi ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2.5 ${kendisiMi ? "bg-navy text-white" : "bg-paper border border-line text-ink"}`}>
                {!kendisiMi && (
                  <div className="text-xs font-medium text-slate-500 mb-0.5">{m.gonderen_ad}</div>
                )}
                <div className="text-sm whitespace-pre-wrap break-words">{m.mesaj}</div>
                <div className={`text-[10px] mt-1 flex items-center justify-between gap-3 ${kendisiMi ? "text-slate-300" : "text-slate-400"}`}>
                  <span>{saatFormatla(m.created_at)}</span>
                  {kendisiMi && (
                    <button onClick={() => handleSil(m)} className="hover:underline">
                      Sil
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={listeSonuRef} />
      </div>

      <form onSubmit={handleGonder} className="flex items-center gap-3">
        <input
          className="input"
          value={yeniMesaj}
          onChange={(e) => setYeniMesaj(e.target.value)}
          placeholder="Bir mesaj yaz..."
        />
        <button type="submit" disabled={gonderiliyor || !yeniMesaj.trim()} className="btn-primary whitespace-nowrap">
          Gönder
        </button>
      </form>
    </div>
  );
}
