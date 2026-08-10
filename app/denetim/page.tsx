"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Denetim = {
  id: number;
  tablo_adi: string;
  islem: string;
  kayit_id: string | null;
  eski_veri: any;
  yeni_veri: any;
  kullanici_email: string | null;
  olusturma_zamani: string;
};

const TABLO_ETIKET: Record<string, string> = {
  araclar: "Araç",
  muayeneler: "Muayene",
  yakit_kayitlari: "Yakıt",
  suruculer: "Personel",
};

const ISLEM_BADGE: Record<string, string> = {
  INSERT: "badge-ok",
  UPDATE: "badge-warn",
  DELETE: "badge-danger",
};

const ISLEM_ETIKET: Record<string, string> = {
  INSERT: "Eklendi",
  UPDATE: "Güncellendi",
  DELETE: "Silindi",
};

function ozetCikar(row: Denetim): string {
  const veri = row.yeni_veri ?? row.eski_veri;
  if (!veri) return "—";
  if (veri.plaka) return veri.plaka;
  if (veri.ad && veri.soyad) return `${veri.ad} ${veri.soyad}`;
  return row.kayit_id ?? "—";
}

export default function DenetimPage() {
  const [kayitlar, setKayitlar] = useState<Denetim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreTablo, setFiltreTablo] = useState<string>("HEPSİ");
  const [filtreIslem, setFiltreIslem] = useState<string>("HEPSİ");
  const [detay, setDetay] = useState<Denetim | null>(null);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("denetim_kayitlari")
      .select("id, tablo_adi, islem, kayit_id, eski_veri, yeni_veri, kullanici_email, olusturma_zamani")
      .order("olusturma_zamani", { ascending: false })
      .limit(300);
    setKayitlar(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const gorunenler = kayitlar.filter((k) => {
    if (filtreTablo !== "HEPSİ" && k.tablo_adi !== filtreTablo) return false;
    if (filtreIslem !== "HEPSİ" && k.islem !== filtreIslem) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl mb-1">Denetim Kaydı</h1>
        <p className="text-sm text-slate-500">Kim, ne zaman, hangi kaydı ekledi / değiştirdi / sildi</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select className="input w-auto" value={filtreTablo} onChange={(e) => setFiltreTablo(e.target.value)}>
          <option value="HEPSİ">Tüm tablolar</option>
          {Object.entries(TABLO_ETIKET).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="input w-auto" value={filtreIslem} onChange={(e) => setFiltreIslem(e.target.value)}>
          <option value="HEPSİ">Tüm işlemler</option>
          <option value="INSERT">Eklendi</option>
          <option value="UPDATE">Güncellendi</option>
          <option value="DELETE">Silindi</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-line">
              <th className="px-5 py-3 font-normal">Tarih</th>
              <th className="px-5 py-3 font-normal">Tablo</th>
              <th className="px-5 py-3 font-normal">İşlem</th>
              <th className="px-5 py-3 font-normal">Kayıt</th>
              <th className="px-5 py-3 font-normal">Kullanıcı</th>
              <th className="px-5 py-3 font-normal text-right">Detay</th>
            </tr>
          </thead>
          <tbody>
            {gorunenler.map((k) => (
              <tr key={k.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-mono text-slate-600 whitespace-nowrap">
                  {new Date(k.olusturma_zamani).toLocaleString("tr-TR")}
                </td>
                <td className="px-5 py-3 text-slate-600">{TABLO_ETIKET[k.tablo_adi] ?? k.tablo_adi}</td>
                <td className="px-5 py-3">
                  <span className={`badge ${ISLEM_BADGE[k.islem] ?? "badge-idle"}`}>
                    {ISLEM_ETIKET[k.islem] ?? k.islem}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-slate-700">{ozetCikar(k)}</td>
                <td className="px-5 py-3 text-slate-500">{k.kullanici_email ?? "—"}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => setDetay(k)} className="text-xs text-slate-500 hover:text-ink">
                    Gör
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && gorunenler.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Kayıt bulunamadı.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center animate-pulse">Yükleniyor...</div>}
      </div>

      {detay && (
        <div
          className="fixed inset-0 bg-navy/40 flex items-center justify-center p-4 z-50"
          onClick={() => setDetay(null)}
        >
          <div
            className="card bg-white max-w-2xl w-full max-h-[80vh] overflow-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-base">
                {TABLO_ETIKET[detay.tablo_adi] ?? detay.tablo_adi} — {ISLEM_ETIKET[detay.islem]}
              </div>
              <button onClick={() => setDetay(null)} className="text-slate-400 hover:text-ink text-sm">
                Kapat
              </button>
            </div>
            <div className="text-xs text-slate-500 mb-3 font-mono">
              {new Date(detay.olusturma_zamani).toLocaleString("tr-TR")} · {detay.kullanici_email ?? "—"}
            </div>
            {detay.eski_veri && (
              <div className="mb-3">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Önceki hâli</div>
                <pre className="bg-paper rounded-md p-3 text-xs overflow-auto">{JSON.stringify(detay.eski_veri, null, 2)}</pre>
              </div>
            )}
            {detay.yeni_veri && (
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Yeni hâli</div>
                <pre className="bg-paper rounded-md p-3 text-xs overflow-auto">{JSON.stringify(detay.yeni_veri, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
