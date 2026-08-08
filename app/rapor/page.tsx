"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type YakitSatiri = {
  arac_id: string;
  tarih: string;
  km_bilgisi: number | null;
  litre: number;
  toplam_tutar: number;
};

type Arac = { arac_id: string; plaka: string; firma: string | null };

type AylikOzet = {
  ay: string; // "2026-03"
  ayEtiket: string; // "Mart 2026"
  toplamKm: number;
  toplamLitre: number;
  toplamTutar: number;
};

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function ayEtiketOlustur(ayKey: string) {
  const [y, m] = ayKey.split("-");
  return `${AY_ADLARI[Number(m) - 1]} ${y}`;
}

function raporYazdir(ozetler: AylikOzet[], firmaEtiketi: string) {
  const pencere = window.open("", "_blank", "width=700,height=800");
  if (!pencere) return;

  const satirlar = ozetler
    .map(
      (o) => `
      <tr>
        <td>${o.ayEtiket}</td>
        <td style="text-align:right">${o.toplamKm.toLocaleString("tr-TR")} km</td>
        <td style="text-align:right">${o.toplamLitre.toFixed(1)} L</td>
        <td style="text-align:right">${o.toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td>
        <td style="text-align:right">${o.toplamKm > 0 ? ((o.toplamLitre / o.toplamKm) * 100).toFixed(1) : "—"} L/100km</td>
      </tr>`
    )
    .join("");

  const genelKm = ozetler.reduce((s, o) => s + o.toplamKm, 0);
  const genelLitre = ozetler.reduce((s, o) => s + o.toplamLitre, 0);
  const genelTutar = ozetler.reduce((s, o) => s + o.toplamTutar, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <title>Aylık Yakıt ve Km Raporu</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #101827; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { font-size: 12px; color: #64748b; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; border-bottom: 2px solid #101827; padding: 8px 6px; }
        td { padding: 8px 6px; border-bottom: 1px solid #E4E7EC; }
        tfoot td { font-weight: bold; border-top: 2px solid #101827; border-bottom: none; }
        .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h1>Aylık Yakıt ve Kilometre Raporu</h1>
      <div class="sub">3D InCerTa — Araç Takip Sistemi · ${firmaEtiketi} · Oluşturulma: ${new Date().toLocaleString("tr-TR")}</div>
      <table>
        <thead>
          <tr><th>Ay</th><th style="text-align:right">Toplam Km</th><th style="text-align:right">Toplam Litre</th><th style="text-align:right">Toplam Tutar</th><th style="text-align:right">Ort. Tüketim</th></tr>
        </thead>
        <tbody>${satirlar}</tbody>
        <tfoot>
          <tr>
            <td>GENEL TOPLAM</td>
            <td style="text-align:right">${genelKm.toLocaleString("tr-TR")} km</td>
            <td style="text-align:right">${genelLitre.toFixed(1)} L</td>
            <td style="text-align:right">${genelTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td>
            <td style="text-align:right">${genelKm > 0 ? ((genelLitre / genelKm) * 100).toFixed(1) : "—"} L/100km</td>
          </tr>
        </tfoot>
      </table>
      <div class="footer">Bu rapor, yakıt kayıtlarındaki ardışık km bilgilerinden hesaplanmıştır.</div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;
  pencere.document.write(html);
  pencere.document.close();
}

export default function RaporPage() {
  const [aylikOzetler, setAylikOzetler] = useState<AylikOzet[]>([]);
  const [loading, setLoading] = useState(true);
  const [aktifFirma, setAktifFirma] = useState<string>("HEPSİ");
  const [filolar, setFilolar] = useState<string[]>([]);

  async function loadData(firmaFiltre: string) {
    setLoading(true);

    const [{ data: yakit }, { data: araclar }] = await Promise.all([
      supabase
        .from("yakit_kayitlari")
        .select("arac_id, tarih, km_bilgisi, litre, toplam_tutar")
        .order("tarih", { ascending: true }),
      supabase.from("araclar").select("arac_id, plaka, firma"),
    ]);

    const aracMap = new Map<string, Arac>();
    (araclar ?? []).forEach((a) => aracMap.set(a.arac_id, a));

    const tumFirmalar = Array.from(new Set((araclar ?? []).map((a) => a.firma).filter(Boolean))) as string[];
    setFilolar(tumFirmalar.sort());

    const filtreliYakit = (yakit ?? []).filter((y: YakitSatiri) => {
      if (firmaFiltre === "HEPSİ") return true;
      const arac = aracMap.get(y.arac_id);
      return arac?.firma === firmaFiltre;
    });

    // Araç bazlı grupla, km sıralı hale getir
    const gruplu = new Map<string, YakitSatiri[]>();
    filtreliYakit.forEach((y: YakitSatiri) => {
      if (!gruplu.has(y.arac_id)) gruplu.set(y.arac_id, []);
      gruplu.get(y.arac_id)!.push(y);
    });

    const ayMap = new Map<string, AylikOzet>();

    gruplu.forEach((satirlar) => {
      const sirali = [...satirlar].sort(
        (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
      );
      for (let i = 1; i < sirali.length; i++) {
        const onceki = sirali[i - 1];
        const simdiki = sirali[i];
        if (onceki.km_bilgisi == null || simdiki.km_bilgisi == null) continue;
        const kmFark = simdiki.km_bilgisi - onceki.km_bilgisi;
        if (kmFark <= 0) continue;

        const tarih = new Date(simdiki.tarih);
        const ayKey = `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, "0")}`;

        if (!ayMap.has(ayKey)) {
          ayMap.set(ayKey, { ay: ayKey, ayEtiket: ayEtiketOlustur(ayKey), toplamKm: 0, toplamLitre: 0, toplamTutar: 0 });
        }
        const kayit = ayMap.get(ayKey)!;
        kayit.toplamKm += kmFark;
        kayit.toplamLitre += Number(simdiki.litre);
        kayit.toplamTutar += Number(simdiki.toplam_tutar);
      }
    });

    const sonuc = Array.from(ayMap.values()).sort((a, b) => a.ay.localeCompare(b.ay));
    setAylikOzetler(sonuc);
    setLoading(false);
  }

  useEffect(() => {
    loadData(aktifFirma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktifFirma]);

  const genelToplamlar = useMemo(() => {
    return {
      km: aylikOzetler.reduce((s, o) => s + o.toplamKm, 0),
      litre: aylikOzetler.reduce((s, o) => s + o.toplamLitre, 0),
      tutar: aylikOzetler.reduce((s, o) => s + o.toplamTutar, 0),
    };
  }, [aylikOzetler]);

  const grafikVerisi = aylikOzetler.map((o) => ({ ay: o.ayEtiket, Km: Math.round(o.toplamKm) }));

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl mb-1">Aylık Rapor</h1>
          <p className="text-sm text-slate-500">Ay bazında toplam yakıt ve kat edilen kilometre</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => raporYazdir(aylikOzetler, aktifFirma === "HEPSİ" ? "Tüm filo" : aktifFirma)}
          disabled={aylikOzetler.length === 0}
        >
          Raporu yazdır / PDF al
        </button>
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

      {!loading && aylikOzetler.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          Aylık rapor oluşturmak için en az iki km bilgili yakıt kaydı olan araç gerekiyor.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-xl">
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-2">Toplam km</div>
              <div className="odometer text-lg font-semibold inline-block">
                {genelToplamlar.km.toLocaleString("tr-TR")}
              </div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-2">Toplam litre</div>
              <div className="odometer text-lg font-semibold inline-block">
                {genelToplamlar.litre.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="card p-5">
              <div className="text-xs text-slate-500 mb-2">Toplam tutar</div>
              <div className="odometer text-lg font-semibold inline-block">
                {genelToplamlar.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
              </div>
            </div>
          </div>

          <div className="card p-5 mb-6">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
              Aylık Kilometre
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={grafikVerisi} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" vertical={false} />
                <XAxis dataKey="ay" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E7EC" }}
                  formatter={(v: number) => [`${v.toLocaleString("tr-TR")} km`, "Km"]}
                />
                <Bar dataKey="Km" fill="#157A6E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-line">
                  <th className="px-5 py-3 font-normal">Ay</th>
                  <th className="px-5 py-3 font-normal">Toplam km</th>
                  <th className="px-5 py-3 font-normal">Toplam litre</th>
                  <th className="px-5 py-3 font-normal">Toplam tutar</th>
                  <th className="px-5 py-3 font-normal">Ort. tüketim</th>
                </tr>
              </thead>
              <tbody>
                {aylikOzetler.map((o) => (
                  <tr key={o.ay} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-slate-700">{o.ayEtiket}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{o.toplamKm.toLocaleString("tr-TR")}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">{o.toplamLitre.toFixed(1)}</td>
                    <td className="px-5 py-3 font-mono">{o.toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td>
                    <td className="px-5 py-3 text-slate-600">
                      {o.toplamKm > 0 ? ((o.toplamLitre / o.toplamKm) * 100).toFixed(1) : "—"} L/100km
                    </td>
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
