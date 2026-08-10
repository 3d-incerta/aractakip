"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { excelIndir } from "@/lib/excelIndir";

type AracKisa = { arac_id: string; plaka: string; marka?: string; model?: string };

type Yakit = {
  yakit_id: number;
  arac_id: string;
  tarih: string;
  yakit_turu: string;
  litre: number;
  birim_fiyat: number;
  toplam_tutar: number;
  km_bilgisi: number | null;
  istasyon_adi: string | null;
  yapilan_is: string | null;
  fis_gorseli_url: string | null;
  araclar: { plaka: string } | null;
};

const YAKIT_TIPLERI = ["BENZIN", "DIZEL", "LPG", "ELEKTRIK"];

const BOS_FORM = {
  arac_id: "",
  tarih: "",
  yakit_turu: "BENZIN",
  litre: "",
  birim_fiyat: "",
  km_bilgisi: "",
  istasyon_adi: "",
  yapilan_is: "",
};

function raporYazdir(k: Yakit, plaka: string) {
  const pencere = window.open("", "_blank", "width=480,height=800");
  if (!pencere) return;

  const tarihStr = new Date(k.tarih).toLocaleString("tr-TR");
  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <title>Yakıt Fişi Raporu — ${plaka}</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 24px; color: #101827; max-width: 380px; margin: 0 auto; }
        h1 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 2px; }
        .sub { font-size: 11px; color: #64748b; margin-bottom: 18px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px; }
        .row span:first-child { color: #64748b; }
        .total { font-size: 16px; font-weight: bold; padding: 10px 0; border-top: 2px solid #101827; margin-top: 6px; }
        .is-notu { margin-top: 16px; padding: 10px; background: #f6f7f9; border-radius: 6px; font-size: 12.5px; }
        .is-notu b { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
        .fis-gorsel { margin-top: 16px; }
        .fis-gorsel b { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px; }
        .fis-gorsel img { width: 100%; border-radius: 6px; border: 1px solid #e4e7eb; }
        .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>Yakıt Fişi Raporu</h1>
      <div class="sub">3D İnCerTa — Araç Takip Sistemi</div>

      <div class="row"><span>Plaka</span><span><b>${plaka}</b></span></div>
      <div class="row"><span>Tarih</span><span>${tarihStr}</span></div>
      <div class="row"><span>Yakıt türü</span><span>${k.yakit_turu}</span></div>
      <div class="row"><span>Litre</span><span>${Number(k.litre).toFixed(2)} L</span></div>
      <div class="row"><span>Birim fiyat</span><span>${Number(k.birim_fiyat).toFixed(2)} ₺</span></div>
      <div class="row"><span>Kilometre</span><span>${k.km_bilgisi != null ? k.km_bilgisi.toLocaleString("tr-TR") + " km" : "—"}</span></div>
      <div class="row"><span>İstasyon</span><span>${k.istasyon_adi ?? "—"}</span></div>

      <div class="row total"><span>Toplam Tutar</span><span>${Number(k.toplam_tutar).toFixed(2)} ₺</span></div>

      ${k.yapilan_is ? `<div class="is-notu"><b>Yapılan İş</b>${k.yapilan_is.replace(/</g, "&lt;")}</div>` : ""}
      ${k.fis_gorseli_url ? `<div class="fis-gorsel"><b>Fiş Görseli</b><img src="${k.fis_gorseli_url}" /></div>` : ""}

      <div class="footer">Fiş No: YKT-${k.yakit_id} · Oluşturulma: ${new Date().toLocaleString("tr-TR")}</div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;
  pencere.document.write(html);
  pencere.document.close();
}

function YakitIcerik() {
  const searchParams = useSearchParams();
  const [kayitlar, setKayitlar] = useState<Yakit[]>([]);
  const [araclar, setAraclar] = useState<AracKisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sonKayit, setSonKayit] = useState<Yakit | null>(null);

  const [form, setForm] = useState(BOS_FORM);
  const [fisDosyasi, setFisDosyasi] = useState<File | null>(null);
  const [fisOnizleme, setFisOnizleme] = useState<string | null>(null);
  const [mevcutFisUrl, setMevcutFisUrl] = useState<string | null>(null);
  const [buyutulmusGorsel, setBuyutulmusGorsel] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [{ data: y }, { data: a }] = await Promise.all([
      supabase
        .from("yakit_kayitlari")
        .select("yakit_id, arac_id, tarih, yakit_turu, litre, birim_fiyat, toplam_tutar, km_bilgisi, istasyon_adi, yapilan_is, fis_gorseli_url, araclar(plaka)")
        .order("tarih", { ascending: false })
        .limit(100),
      supabase.from("araclar").select("arac_id, plaka").order("plaka"),
    ]);
    setKayitlar((y as any) ?? []);
    setAraclar(a ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // QR koddan gelindiyse (?arac=<id>) formu o araç seçili olarak otomatik aç
  useEffect(() => {
    const aracIdParam = searchParams.get("arac");
    if (aracIdParam && araclar.some((a) => a.arac_id === aracIdParam)) {
      setForm((f) => ({ ...f, arac_id: aracIdParam }));
      setShowForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [araclar]);

  function toDatetimeLocal(value: string) {
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function handleFisSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    setFisDosyasi(dosya);
    setFisOnizleme(URL.createObjectURL(dosya));
  }

  function handleEditClick(k: Yakit) {
    setEditingId(k.yakit_id);
    setForm({
      arac_id: k.arac_id,
      tarih: toDatetimeLocal(k.tarih),
      yakit_turu: k.yakit_turu,
      litre: String(k.litre),
      birim_fiyat: String(k.birim_fiyat),
      km_bilgisi: k.km_bilgisi ? String(k.km_bilgisi) : "",
      istasyon_adi: k.istasyon_adi ?? "",
      yapilan_is: k.yapilan_is ?? "",
    });
    setMevcutFisUrl(k.fis_gorseli_url);
    setFisDosyasi(null);
    setFisOnizleme(null);
    setShowForm(true);
    setError(null);
  }

  function handleExcelExport() {
    const veri = kayitlar.map((k) => ({
      Plaka: k.araclar?.plaka ?? "",
      Tarih: new Date(k.tarih).toLocaleDateString("tr-TR"),
      Tür: k.yakit_turu,
      Litre: Number(k.litre),
      "Birim Fiyat": Number(k.birim_fiyat),
      Toplam: Number(k.toplam_tutar),
      Km: k.km_bilgisi ?? "",
      İstasyon: k.istasyon_adi ?? "",
      "Yapılan İş": k.yapilan_is ?? "",
    }));
    excelIndir(veri, "yakit-kayitlari", "Yakıt");
  }

  function handleNewClick() {
    setEditingId(null);
    setForm(BOS_FORM);
    setSonKayit(null);
    setFisDosyasi(null);
    setFisOnizleme(null);
    setMevcutFisUrl(null);
    setShowForm((s) => (editingId ? true : !s));
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(BOS_FORM);
    setFisDosyasi(null);
    setFisOnizleme(null);
    setMevcutFisUrl(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Km geriye gitmesin: bu araç için kayıtlı en yüksek km'den düşük girilemez
    if (form.km_bilgisi) {
      const yeniKm = Number(form.km_bilgisi);
      const { data: enYuksekKayit } = await supabase
        .from("yakit_kayitlari")
        .select("km_bilgisi")
        .eq("arac_id", form.arac_id)
        .not("km_bilgisi", "is", null)
        .neq("yakit_id", editingId ?? -1)
        .order("km_bilgisi", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enYuksekKayit?.km_bilgisi && yeniKm < enYuksekKayit.km_bilgisi) {
        setSaving(false);
        setError(
          `Km geriye gidemez — bu araç için kayıtlı en son km ${enYuksekKayit.km_bilgisi.toLocaleString("tr-TR")}. Girdiğin değer ondan düşük.`
        );
        return;
      }
    }

    let fisUrl = mevcutFisUrl;

    if (fisDosyasi) {
      setUploading(true);
      const uzanti = fisDosyasi.name.split(".").pop();
      const dosyaYolu = `${form.arac_id}/${Date.now()}.${uzanti}`;
      const { error: yuklemeHatasi } = await supabase.storage
        .from("yakit-fisleri")
        .upload(dosyaYolu, fisDosyasi);
      setUploading(false);

      if (yuklemeHatasi) {
        setSaving(false);
        setError("Fiş görseli yüklenemedi: " + yuklemeHatasi.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("yakit-fisleri").getPublicUrl(dosyaYolu);
      fisUrl = publicUrlData.publicUrl;
    }

    const payload = {
      arac_id: form.arac_id,
      tarih: form.tarih,
      yakit_turu: form.yakit_turu,
      litre: Number(form.litre),
      birim_fiyat: Number(form.birim_fiyat),
      km_bilgisi: form.km_bilgisi ? Number(form.km_bilgisi) : null,
      istasyon_adi: form.istasyon_adi || null,
      yapilan_is: form.yapilan_is || null,
      fis_gorseli_url: fisUrl,
    };

    const query = editingId
      ? supabase.from("yakit_kayitlari").update(payload).eq("yakit_id", editingId).select("*, araclar(plaka)").single()
      : supabase.from("yakit_kayitlari").insert(payload).select("*, araclar(plaka)").single();

    const { data, error } = await query;

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    // Aracın güncel km'sini bu kayıttaki km ile senkron tut (geriye gitmeden)
    if (form.km_bilgisi) {
      await supabase
        .from("araclar")
        .update({ guncel_km: Number(form.km_bilgisi) })
        .eq("arac_id", form.arac_id)
        .lt("guncel_km", Number(form.km_bilgisi));
    }

    setSonKayit(data as any);
    handleCancel();
    loadData();
  }

  async function handleDelete(k: Yakit) {
    if (!confirm(`${k.araclar?.plaka ?? "Bu"} aracın yakıt kaydını silmek istediğine emin misin?`)) return;
    setDeletingId(k.yakit_id);
    const { error } = await supabase.from("yakit_kayitlari").delete().eq("yakit_id", k.yakit_id);
    setDeletingId(null);
    if (error) {
      alert("Silinemedi: " + error.message);
      return;
    }
    if (sonKayit?.yakit_id === k.yakit_id) setSonKayit(null);
    loadData();
  }

  const toplamTutar = kayitlar.reduce((s, k) => s + Number(k.toplam_tutar ?? 0), 0);
  const toplamLitre = kayitlar.reduce((s, k) => s + Number(k.litre ?? 0), 0);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Yakıt</h1>
          <p className="text-sm text-slate-500">Son 100 yakıt alım kaydı</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExcelExport}
            disabled={kayitlar.length === 0}
            className="text-sm text-slate-600 border border-line rounded-md px-4 py-2.5 hover:bg-paper disabled:opacity-40"
          >
            Excel'e aktar
          </button>
          <button className="btn-primary" onClick={handleNewClick}>
            {showForm ? "Vazgeç" : "+ Yakıt kaydı ekle"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-2">Toplam litre</div>
          <div className="odometer text-xl font-semibold inline-block">
            {toplamLitre.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-2">Toplam tutar</div>
          <div className="odometer text-xl font-semibold inline-block">
            {toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
          </div>
        </div>
      </div>

      {sonKayit && (
        <div className="card p-4 mb-6 border-l-4 border-l-amber flex items-center justify-between">
          <div className="text-sm">
            <span className="font-mono font-semibold">{sonKayit.araclar?.plaka}</span>
            <span className="text-slate-500"> için kayıt kaydedildi. Fiş raporunu şimdi hazırlayabilirsin.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => raporYazdir(sonKayit, sonKayit.araclar?.plaka ?? "—")}
              className="btn-primary"
            >
              Fiş raporunu yazdır / PDF al
            </button>
            <button onClick={() => setSonKayit(null)} className="text-xs text-slate-400 hover:text-ink">
              Kapat
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            {editingId ? "Yakıt kaydını düzenle" : "Yeni yakıt kaydı"}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Araç</label>
            <select required className="input" value={form.arac_id}
              onChange={(e) => setForm({ ...form, arac_id: e.target.value })}>
              <option value="">Seçiniz</option>
              {araclar.map((a) => <option key={a.arac_id} value={a.arac_id}>{a.plaka}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tarih</label>
            <input required type="datetime-local" className="input" value={form.tarih}
              max={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Yakıt türü</label>
            <select className="input" value={form.yakit_turu}
              onChange={(e) => setForm({ ...form, yakit_turu: e.target.value })}>
              {YAKIT_TIPLERI.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Litre</label>
            <input required type="number" step="0.01" className="input" value={form.litre}
              onChange={(e) => setForm({ ...form, litre: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Birim fiyat (₺)</label>
            <input required type="number" step="0.01" className="input" value={form.birim_fiyat}
              onChange={(e) => setForm({ ...form, birim_fiyat: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Km bilgisi</label>
            <input type="number" className="input" value={form.km_bilgisi}
              onChange={(e) => setForm({ ...form, km_bilgisi: e.target.value })} placeholder="örn. 84250" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">İstasyon</label>
            <input className="input" value={form.istasyon_adi}
              onChange={(e) => setForm({ ...form, istasyon_adi: e.target.value })} placeholder="Shell, BP, ..." />
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs text-slate-500 block mb-1">Yapılan iş / not</label>
            <textarea className="input" rows={3} value={form.yapilan_is}
              onChange={(e) => setForm({ ...form, yapilan_is: e.target.value })}
              placeholder="örn. Lastik havası kontrol edildi, ön fren balatası değişti..." />
          </div>

          <div className="sm:col-span-3">
            <label className="text-xs text-slate-500 block mb-1">Fiş görseli</label>
            <div className="flex items-center gap-4">
              <label className="text-sm border border-line rounded-md px-4 py-2.5 cursor-pointer hover:bg-paper">
                {fisDosyasi ? "Farklı görsel seç" : "Fotoğraf çek / dosya seç"}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFisSecildi} />
              </label>
              {(fisOnizleme || mevcutFisUrl) && (
                <img
                  src={fisOnizleme ?? mevcutFisUrl ?? ""}
                  alt="Fiş önizleme"
                  className="h-16 w-16 object-cover rounded-md border border-line cursor-pointer"
                  onClick={() => setBuyutulmusGorsel(fisOnizleme ?? mevcutFisUrl)}
                />
              )}
              {uploading && <span className="text-xs text-slate-400">Yükleniyor...</span>}
            </div>
          </div>

          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Kaydet"}
            </button>
            <button type="button" onClick={handleCancel} className="text-sm text-slate-500 hover:text-ink">
              Vazgeç
            </button>
            {error && <span className="text-xs text-red">{error}</span>}
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-line">
              <th className="px-5 py-3 font-normal">Fiş</th>
              <th className="px-5 py-3 font-normal">Plaka</th>
              <th className="px-5 py-3 font-normal">Tarih</th>
              <th className="px-5 py-3 font-normal">Km</th>
              <th className="px-5 py-3 font-normal">Litre</th>
              <th className="px-5 py-3 font-normal">Toplam</th>
              <th className="px-5 py-3 font-normal">Yapılan iş</th>
              <th className="px-5 py-3 font-normal text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {kayitlar.map((k) => (
              <tr key={k.yakit_id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  {k.fis_gorseli_url ? (
                    <img
                      src={k.fis_gorseli_url}
                      alt="Fiş"
                      className="h-9 w-9 object-cover rounded border border-line cursor-pointer"
                      onClick={() => setBuyutulmusGorsel(k.fis_gorseli_url)}
                    />
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono">{k.araclar?.plaka ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">
                  {new Date(k.tarih).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-5 py-3 font-mono text-slate-600">
                  {k.km_bilgisi != null ? k.km_bilgisi.toLocaleString("tr-TR") : "—"}
                </td>
                <td className="px-5 py-3 font-mono text-slate-600">{Number(k.litre).toFixed(2)}</td>
                <td className="px-5 py-3 font-mono">{Number(k.toplam_tutar).toFixed(2)} ₺</td>
                <td className="px-5 py-3 text-slate-500 max-w-[160px] truncate" title={k.yapilan_is ?? ""}>
                  {k.yapilan_is || "—"}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => raporYazdir(k, k.araclar?.plaka ?? "—")}
                    className="text-xs text-amber hover:opacity-70 mr-4"
                  >
                    Rapor
                  </button>
                  <button onClick={() => handleEditClick(k)} className="text-xs text-slate-500 hover:text-ink mr-4">
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(k)}
                    disabled={deletingId === k.yakit_id}
                    className="text-xs text-red hover:opacity-70 disabled:opacity-40"
                  >
                    {deletingId === k.yakit_id ? "Siliniyor..." : "Sil"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && kayitlar.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Henüz yakıt kaydı yok.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center">Yükleniyor...</div>}
      </div>

      {buyutulmusGorsel && (
        <div
          className="fixed inset-0 bg-navy/60 flex items-center justify-center p-6 z-50"
          onClick={() => setBuyutulmusGorsel(null)}
        >
          <img src={buyutulmusGorsel} alt="Fiş büyük görünüm" className="max-h-[85vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default function YakitPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Yükleniyor...</div>}>
      <YakitIcerik />
    </Suspense>
  );
}
