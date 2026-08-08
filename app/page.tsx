"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import StatCard from "@/components/StatCard";

type YaklasanMuayene = {
  plaka: string;
  marka: string;
  model: string;
  gecerlilik_tarihi: string;
  kalan_gun: number;
};

export default function DashboardPage() {
  const [aracSayisi, setAracSayisi] = useState<number | null>(null);
  const [surucuSayisi, setSurucuSayisi] = useState<number | null>(null);
  const [yaklasanSayisi, setYaklasanSayisi] = useState<number | null>(null);
  const [buAyYakit, setBuAyYakit] = useState<number | null>(null);
  const [yaklasanListe, setYaklasanListe] = useState<YaklasanMuayene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [{ count: aracCount }, { count: surucuCount }, { data: yaklasan }] =
        await Promise.all([
          supabase.from("araclar").select("*", { count: "exact", head: true }).eq("durum", "AKTIF"),
          supabase.from("suruculer").select("*", { count: "exact", head: true }).eq("aktif_mi", true),
          supabase.from("v_yaklasan_muayeneler").select("*").order("kalan_gun", { ascending: true }),
        ]);

      setAracSayisi(aracCount ?? 0);
      setSurucuSayisi(surucuCount ?? 0);
      setYaklasanListe((yaklasan as YaklasanMuayene[]) ?? []);
      setYaklasanSayisi((yaklasan ?? []).length);

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
      <h1 className="font-display text-2xl mb-1">Panel</h1>
      <p className="text-sm text-slate-500 mb-6">Filonun genel durumu</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Aktif araç" value={loading ? "—" : aracSayisi ?? 0} />
        <StatCard label="Aktif sürücü" value={loading ? "—" : surucuSayisi ?? 0} />
        <StatCard label="Yaklaşan muayene (30 gün)" value={loading ? "—" : yaklasanSayisi ?? 0} />
        <StatCard
          label="Bu ay yakıt gideri"
          value={loading ? "—" : (buAyYakit ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
          suffix="₺"
        />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-base">Yaklaşan Muayeneler</h2>
        </div>
        {yaklasanListe.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500 text-center">
            {loading ? "Yükleniyor..." : "Önümüzdeki 30 gün içinde muayenesi dolan araç yok."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-line">
                <th className="px-5 py-3 font-normal">Plaka</th>
                <th className="px-5 py-3 font-normal">Araç</th>
                <th className="px-5 py-3 font-normal">Geçerlilik</th>
                <th className="px-5 py-3 font-normal">Kalan gün</th>
              </tr>
            </thead>
            <tbody>
              {yaklasanListe.map((m) => (
                <tr key={m.plaka + m.gecerlilik_tarihi} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-mono">{m.plaka}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {m.marka} {m.model}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(m.gecerlilik_tarihi).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-5 py-3">
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
    </div>
  );
}
