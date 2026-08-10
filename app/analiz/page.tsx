"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type YakitSatiri = { arac_id: string; km_bilgisi: number | null; litre: number };
type Arac = { arac_id: string; plaka: string; firma: string | null };

type AracTuketim = {
  plaka: string;
  firma: string | null;
  toplamKm: number;
  toplamLitre: number;
  tuketim100km: number;
  dolumSayisi: number;
};

export default function AnalizPage() {
  const [aracTuketim, setAracTuketim] = useState<AracTuketim[]>([]);
  const [loading, setLoading] = useState(true);
  const [aktifFirma, setAktifFirma] = useState<string>("HEPSİ");

  async function loadData() {
    setLoading(true);
    const [{ data: yakit }, { data: araclar }] = await Promise.all([
      supabase.from("yakit_kayitlari").select("arac_id, km_bilgisi, litre").order("km_bilgisi", { ascending: true }),
      supabase.from("araclar").select("arac_id, plaka, firma"),
    ]);

    const aracMap = new Map<string, Arac>();
    (araclar ?? []).forEach((a) => aracMap.set(a.arac_id, a));

    const gruplu = new Map<string, YakitSatiri[]>();
    (yakit ?? []).forEach((y: YakitSatiri) => {
      if (y.km_bilgisi == null) return;
      if (!gruplu.has(y.arac_id)) gruplu.set(y.arac_id, []);
      gruplu.get(y.arac_id)!.push(y);
    });

    const sonuc: AracTuketim[] = [];
    gruplu.forEach((satirlar, aracId) => {
      const arac = aracMap.get(aracId);
      if (!arac) return;
      const siraliKm = [...satirlar].sort((a, b) => (a.km_bilgisi ?? 0) - (b.km_bilgisi ?? 0));
      if (siraliKm.length < 2) return;

      const ilkKm = siraliKm[0].km_bilgisi ?? 0;
      const sonKm = siraliKm[siraliKm.length - 1].km_bilgisi ?? 0;
      const toplamKm = sonKm - ilkKm;
      // İlk dolum, dönem başlangıcından önceki tüketimi temsil ettiği için hariç tutulur
      const toplamLitre = siraliKm.slice(1).reduce((s, r) => s + Number(r.litre), 0);

      if (toplamKm <= 0) return;

      sonuc.push({
        plaka: arac.plaka,
        firma: arac.firma,
        toplamKm,
        toplamLitre,
        tuketim100km: (toplamLitre / toplamKm) * 100,
        dolumSayisi: siraliKm.length,
      });
    });

    sonuc.sort((a, b) => b.tuketim100km - a.tuketim100km);
    setAracTuketim(sonuc);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filolar = useMemo(() => {
    const set = new Set<string>();
    aracTuketim.forEach((a) => { if (a.firma) set.add(a.firma); });
    return Array.from(set).sort();
  }, [aracTuketim]);

  const gorunenler = useMemo(() => {
    if (aktifFirma === "HEPSİ") return aracTuketim;
    return aracTuketim.filter((a) => a.firma === aktifFirma);
  }, [aracTuketim, aktifFirma]);

  const grafikVerisi = gorunenler.map((a) => ({
    plaka: a.plaka,
    "L/100km": Number(a.tuketim100km.toFixed(1)),
  }));

  const ortalama = gorunenler.length
    ? gorunenler.reduce((s, a) => s + a.tuketim100km, 0) / gorunenler.length
    : 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl mb-1">Yakıt Tüketim Analizi</h1>
        <p className="text-sm text-slate-500">Km bazlı gerçek tüketim — araç ve firma karşılaştırması</p>
      </div>

      {filolar.length > 0 && (
        <div className="flex items-center gap-1 mb-6 border-b border-line">
          {["HEPSİ", ...filolar].map((f) => (
            <button
              key={f}
              onClick={() => setAktifFirma(f)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                aktifFirma === f ? "border-navy text-ink font-medium" : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              {f === "HEPSİ" ? "Tüm filo" : f}
            </button>
          ))}
        </div>
      )}

      {!loading && gorunenler.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Anlamlı bir tüketim hesaplamak için en az iki km bilgili yakıt kaydı gereken araç yok.
          Yakıt kayıtlarına km bilgisi girildikçe burada otomatik hesaplanacak.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-2">Ortalama tüketim</div>
              <div className="odometer text-xl font-semibold inline-block">
                {ortalama.toFixed(1)} <span className="text-sm opacity-70">L/100km</span>
              </div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-2">Analiz edilen araç</div>
              <div className="odometer text-xl font-semibold inline-block">{gorunenler.length}</div>
            </div>
          </div>

          <div className="card p-5 mb-6">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
              Araç Bazlı L/100km
            </div>
            <ResponsiveContainer width="100%" height={Math.max(220, gorunenler.length * 34)}>
              <BarChart data={grafikVerisi} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis dataKey="plaka" type="category" tick={{ fontSize: 11, fill: "#101827" }} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E7EC" }}
                  formatter={(v: number) => [`${v} L/100km`, "Tüketim"]}
                />
                <Bar dataKey="L/100km" fill="#1F2937" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-line">
                  <th className="px-5 py-3 font-normal">Plaka</th>
                  <th className="px-5 py-3 font-normal">Firma</th>
                  <th className="px-5 py-3 font-normal">Kat edilen km</th>
                  <th className="px-5 py-3 font-normal">Toplam litre</th>
                  <th className="px-5 py-3 font-normal">Tüketim</th>
                  <th className="px-5 py-3 font-normal">Dolum sayısı</th>
                </tr>
              </thead>
              <tbody>
                {gorunenler.map((a) => (
                  <tr key={a.plaka} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-mono">{a.plaka}</td>
                    <td className="px-5 py-3 text-slate-600">{a.firma ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{a.toplamKm.toLocaleString("tr-TR")}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{a.toplamLitre.toFixed(1)}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${a.tuketim100km > ortalama ? "badge-warn" : "badge-ok"}`}>
                        {a.tuketim100km.toFixed(1)} L/100km
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{a.dolumSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
