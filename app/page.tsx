"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type YaklasanMuayene = {
  plaka: string;
  marka: string;
  model: string;
  gecerlilik_tarihi: string;
  kalan_gun: number;
};

type BakimBekleyen = {
  plaka: string;
  marka: string;
  model: string;
  guncel_km: number;
  hedef_km: number;
};

const IconArac = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 13l1.6-5.2A2 2 0 0 1 6.5 6.4h11a2 2 0 0 1 1.9 1.4L21 13" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2.5" y="13" width="19" height="6" rx="1.5" />
    <circle cx="7" cy="19.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="17" cy="19.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const IconKullanici = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" />
  </svg>
);

const IconTakvim = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);

const IconElmas = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 9l3.5-5h9L20 9l-8 11L4 9z" strokeLinejoin="round" />
    <path d="M4 9h16M9.5 4L8 9l4 11 4-11-1.5-5" strokeLinejoin="round" />
  </svg>
);

export default function DashboardPage() {
  const [aracSayisi, setAracSayisi] = useState<number | null>(null);
  const [surucuSayisi, setSurucuSayisi] = useState<number | null>(null);
  const [yaklasanSayisi, setYaklasanSayisi] = useState<number | null>(null);
  const [buAyYakit, setBuAyYakit] = useState<number | null>(null);
  const [yaklasanListe, setYaklasanListe] = useState<YaklasanMuayene[]>([]);
  const [bakimListe, setBakimListe] = useState<BakimBekleyen[]>([]);
  const [loading, setLoading] = useState(true);
  const [tarihMetni, setTarihMetni] = useState("");

  useEffect(() => {
    setTarihMetni(
      new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    );

    async function load() {
      setLoading(true);

      const [{ count: aracCount }, { count: surucuCount }, { data: yaklasan }, { data: araclarBakim }] =
        await Promise.all([
          supabase.from("araclar").select("*", { count: "exact", head: true }).eq("durum", "AKTIF"),
          supabase.from("suruculer").select("*", { count: "exact", head: true }).eq("aktif_mi", true),
          supabase.from("v_yaklasan_muayeneler").select("*").order("kalan_gun", { ascending: true }),
          supabase.from("araclar").select("plaka, marka, model, guncel_km, son_bakim_km, bakim_araligi_km"),
        ]);

      setAracSayisi(aracCount ?? 0);
      setSurucuSayisi(surucuCount ?? 0);
      setYaklasanListe((yaklasan as YaklasanMuayene[]) ?? []);
      setYaklasanSayisi((yaklasan ?? []).length);

      const bakimGerekenler: BakimBekleyen[] = (araclarBakim ?? [])
        .filter((a: any) => a.son_bakim_km && a.bakim_araligi_km && a.guncel_km)
        .map((a: any) => ({
          plaka: a.plaka,
          marka: a.marka,
          model: a.model,
          guncel_km: a.guncel_km,
          hedef_km: a.son_bakim_km + a.bakim_araligi_km,
        }))
        .filter((a: BakimBekleyen) => a.hedef_km - a.guncel_km <= 1000)
        .sort((a: BakimBekleyen, b: BakimBekleyen) => (a.hedef_km - a.guncel_km) - (b.hedef_km - b.guncel_km));
      setBakimListe(bakimGerekenler);

      const now = new Date();
      const ayBaslangic = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: yakitData } = await supabase
        .from("yakit_kayitlari")
        .select("toplam_tutar")
        .gte("tarih", ayBaslangic);

      const toplam = (yakitData ?? []).reduce(
        (sum: number, r: any) => sum + Number(r.toplam_tutar ?? 0),
        0
      );
      setBuAyYakit(toplam);

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      {/* LÜKS KARŞILAMA BÖLÜMÜ */}
      <div className="lux-hero mb-8">
        <div className="relative">
          <div className="lux-eyebrow mb-3">{tarihMetni}</div>
          <h1 className="font-lux text-3xl sm:text-4xl text-white mb-2">3D İnCerTa Filo Paneli</h1>
          <p className="text-slate-300 text-sm max-w-md">
            Araç, sürücü ve masraf yönetiminizin genel görünümü — tek bakışta.
          </p>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="lux-stat-card">
          <div className="lux-stat-icon"><IconArac /></div>
          <div className="lux-stat-value">{loading ? "—" : aracSayisi ?? 0}</div>
          <div className="lux-stat-label">Aktif araç</div>
        </div>
        <div className="lux-stat-card">
          <div className="lux-stat-icon"><IconKullanici /></div>
          <div className="lux-stat-value">{loading ? "—" : surucuSayisi ?? 0}</div>
          <div className="lux-stat-label">Aktif sürücü</div>
        </div>
        <div className="lux-stat-card">
          <div className="lux-stat-icon"><IconTakvim /></div>
          <div className="lux-stat-value">{loading ? "—" : yaklasanSayisi ?? 0}</div>
          <div className="lux-stat-label">Yaklaşan muayene (30 gün)</div>
        </div>
        <div className="lux-stat-card">
          <div className="lux-stat-icon"><IconElmas /></div>
          <div className="lux-stat-value">
            {loading ? "—" : (buAyYakit ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
            <span className="text-base align-top ml-1">₺</span>
          </div>
          <div className="lux-stat-label">Bu ay yakıt gideri</div>
        </div>
      </div>

      {/* YAKLAŞAN MUAYENELER */}
      <div className="lux-section mb-6">
        <div className="lux-section-header">
          <span className="lux-dot" />
          <h2 className="font-lux text-lg">Yaklaşan Muayeneler</h2>
        </div>
        {yaklasanListe.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500 text-center">
            {loading ? <span className="animate-pulse">Yükleniyor...</span> : "Önümüzdeki 30 gün içinde muayenesi dolan araç yok."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-line">
                <th className="px-6 py-3 font-normal">Plaka</th>
                <th className="px-6 py-3 font-normal">Araç</th>
                <th className="px-6 py-3 font-normal">Geçerlilik</th>
                <th className="px-6 py-3 font-normal">Kalan gün</th>
              </tr>
            </thead>
            <tbody>
              {yaklasanListe.map((m) => (
                <tr key={m.plaka + m.gecerlilik_tarihi} className="border-b border-line last:border-0">
                  <td className="px-6 py-3 font-mono">{m.plaka}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {m.marka} {m.model}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(m.gecerlilik_tarihi).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`badge ${
                        m.kalan_gun <= 7 ? "badge-danger" : "badge-warn"
                      }`}
                    >
                      {m.kalan_gun} gün
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* BAKIMI YAKLAŞAN ARAÇLAR */}
      <div className="lux-section">
        <div className="lux-section-header">
          <span className="lux-dot" />
          <h2 className="font-lux text-lg">Bakımı Yaklaşan Araçlar</h2>
        </div>
        {bakimListe.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500 text-center">
            {loading ? <span className="animate-pulse">Yükleniyor...</span> : "Yakın zamanda bakımı gereken araç yok."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-line">
                <th className="px-6 py-3 font-normal">Plaka</th>
                <th className="px-6 py-3 font-normal">Araç</th>
                <th className="px-6 py-3 font-normal">Güncel km</th>
                <th className="px-6 py-3 font-normal">Durum</th>
              </tr>
            </thead>
            <tbody>
              {bakimListe.map((b) => {
                const kalan = b.hedef_km - b.guncel_km;
                return (
                  <tr key={b.plaka} className="border-b border-line last:border-0">
                    <td className="px-6 py-3 font-mono">{b.plaka}</td>
                    <td className="px-6 py-3 text-slate-600">{b.marka} {b.model}</td>
                    <td className="px-6 py-3 font-mono text-slate-600">{b.guncel_km.toLocaleString("tr-TR")}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${kalan <= 0 ? "badge-danger" : "badge-warn"}`}>
                        {kalan <= 0 ? "Bakım zamanı geldi" : `${kalan.toLocaleString("tr-TR")} km kaldı`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
