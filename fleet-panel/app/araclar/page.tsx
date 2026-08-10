"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { excelIndir } from "@/lib/excelIndir";

type Arac = {
  arac_id: string;
  plaka: string;
  marka: string;
  model: string;
  model_yili: number | null;
  yakit_tipi: string;
  guncel_km: number | null;
  durum: string;
  sorumlu_surucu_id: string | null;
  firma: string | null;
  son_bakim_km: number | null;
  bakim_araligi_km: number | null;
};

type SurucuKisa = { surucu_id: string; ad: string; soyad: string };

const YAKIT_TIPLERI = ["BENZIN", "DIZEL", "LPG", "ELEKTRIK", "HIBRIT"];
const DURUMLAR = ["AKTIF", "BAKIMDA", "ARIZALI", "HURDA", "SATILDI"];

const DURUM_BADGE: Record<string, string> = {
  AKTIF: "badge-ok",
  BAKIMDA: "badge-warn",
  ARIZALI: "badge-danger",
  HURDA: "badge-idle",
  SATILDI: "badge-idle",
};

const BOS_FORM = {
  plaka: "",
  marka: "",
  model: "",
  model_yili: "",
  yakit_tipi: "BENZIN",
  durum: "AKTIF",
  guncel_km: "",
  sorumlu_surucu_id: "",
  firma: "",
  son_bakim_km: "",
  bakim_araligi_km: "10000",
};

export default function AraclarPage() {
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [personel, setPersonel] = useState<SurucuKisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yonetimYapabilir, setYonetimYapabilir] = useState(true); // sürücü rolü değilse true

  const [form, setForm] = useState(BOS_FORM);

  async function loadData() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (userId) {
      const { data: kendiKayit } = await supabase
        .from("suruculer")
        .select("rol")
        .eq("kullanici_id", userId)
        .maybeSingle();
      // araclar/suruculer tablosunda ekleme/silme sadece gerçek Yönetici'ye
      // (suruculer'de hiç kaydı olmayana) açık — Muhasebe/Finans da salt okunur
      if (kendiKayit) {
        setYonetimYapabilir(false);
      } else {
        setYonetimYapabilir(true);
      }
    }

    const [{ data: a, error }, { data: p }] = await Promise.all([
      supabase
        .from("araclar")
        .select("arac_id, plaka, marka, model, model_yili, yakit_tipi, guncel_km, durum, sorumlu_surucu_id, firma, son_bakim_km, bakim_araligi_km")
        .order("plaka", { ascending: true }),
      supabase.from("suruculer").select("surucu_id, ad, soyad").order("ad"),
    ]);
    if (!error) setAraclar(a ?? []);
    setPersonel(p ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function bakimDurumu(a: Arac): { label: string; cls: string } | null {
    if (!a.son_bakim_km || !a.bakim_araligi_km || !a.guncel_km) return null;
    const hedefKm = a.son_bakim_km + a.bakim_araligi_km;
    const kalan = hedefKm - a.guncel_km;
    if (kalan <= 0) return { label: "Bakım zamanı geldi", cls: "badge-danger" };
    if (kalan <= 1000) return { label: `${kalan.toLocaleString("tr-TR")} km kaldı`, cls: "badge-warn" };
    return { label: "Uygun", cls: "badge-ok" };
  }

  function personelAdi(surucuId: string | null) {
    if (!surucuId) return "—";
    const p = personel.find((x) => x.surucu_id === surucuId);
    return p ? `${p.ad} ${p.soyad}` : "—";
  }

  function handleEditClick(a: Arac) {
    setEditingId(a.arac_id);
    setForm({
      plaka: a.plaka,
      marka: a.marka,
      model: a.model,
      model_yili: a.model_yili ? String(a.model_yili) : "",
      yakit_tipi: a.yakit_tipi,
      durum: a.durum,
      guncel_km: a.guncel_km ? String(a.guncel_km) : "",
      sorumlu_surucu_id: a.sorumlu_surucu_id ?? "",
      firma: a.firma ?? "",
      son_bakim_km: a.son_bakim_km ? String(a.son_bakim_km) : "",
      bakim_araligi_km: a.bakim_araligi_km ? String(a.bakim_araligi_km) : "10000",
    });
    setShowForm(true);
    setError(null);
  }

  function handleQrYazdir(a: Arac) {
    const url = `${window.location.origin}/yakit?arac=${a.arac_id}`;
    const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
    const pencere = window.open("", "_blank", "width=380,height=520");
    if (!pencere) return;
    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8" />
        <title>QR - ${a.plaka}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 32px; color: #101827; }
          h1 { font-family: monospace; font-size: 22px; letter-spacing: 0.05em; margin: 0 0 4px; }
          .sub { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          img { border: 1px solid #e4e7eb; border-radius: 8px; }
          .not { margin-top: 20px; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>${a.plaka}</h1>
        <div class="sub">3D İnCerTa — Yakıt kaydı için okut</div>
        <img src="${qrImgSrc}" width="280" height="280" />
        <div class="not">Bu kodu okutunca doğrudan bu aracın yakıt kayıt formu açılır.</div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    pencere.document.write(html);
    pencere.document.close();
  }

  function handleExcelExport() {
    const veri = araclar.map((a) => ({
      Plaka: a.plaka,
      Marka: a.marka,
      Model: a.model,
      Yıl: a.model_yili ?? "",
      Yakıt: a.yakit_tipi,
      "Güncel Km": a.guncel_km ?? 0,
      Firma: a.firma ?? "",
      "Zimmetli Personel": personelAdi(a.sorumlu_surucu_id),
      Durum: a.durum,
    }));
    excelIndir(veri, "araclar", "Araçlar");
  }

  function handleNewClick() {
    setEditingId(null);
    setForm(BOS_FORM);
    setShowForm((s) => (editingId ? true : !s));
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(BOS_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      plaka: form.plaka.toUpperCase(),
      marka: form.marka,
      model: form.model,
      model_yili: form.model_yili ? Number(form.model_yili) : null,
      yakit_tipi: form.yakit_tipi,
      durum: form.durum,
      guncel_km: form.guncel_km ? Number(form.guncel_km) : 0,
      sorumlu_surucu_id: form.sorumlu_surucu_id || null,
      firma: form.firma || null,
      son_bakim_km: form.son_bakim_km ? Number(form.son_bakim_km) : null,
      bakim_araligi_km: form.bakim_araligi_km ? Number(form.bakim_araligi_km) : 10000,
    };

    const { error } = editingId
      ? await supabase.from("araclar").update(payload).eq("arac_id", editingId)
      : await supabase.from("araclar").insert(payload);

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    handleCancel();
    loadData();
  }

  async function handleDelete(a: Arac) {
    if (!confirm(`${a.plaka} plakalı aracı silmek istediğine emin misin? Bağlı yakıt/muayene/konum kayıtları da silinecek.`)) return;
    setDeletingId(a.arac_id);
    const { error } = await supabase.from("araclar").delete().eq("arac_id", a.arac_id);
    setDeletingId(null);
    if (error) {
      alert("Silinemedi: " + error.message);
      return;
    }
    loadData();
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Araçlar</h1>
          <p className="text-sm text-slate-500">3D İnCerTa'daki tüm araçlar</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExcelExport}
            disabled={araclar.length === 0}
            className="text-sm text-slate-600 border border-line rounded-md px-4 py-2.5 hover:bg-paper disabled:opacity-40"
          >
            Excel'e aktar
          </button>
          {yonetimYapabilir && (
            <button className="btn-primary" onClick={handleNewClick}>
              {showForm ? "Vazgeç" : "+ Araç ekle"}
            </button>
          )}
        </div>
      </div>

      {showForm && yonetimYapabilir && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            {editingId ? "Aracı düzenle" : "Yeni araç"}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Plaka</label>
            <input required className="input" value={form.plaka}
              onChange={(e) => setForm({ ...form, plaka: e.target.value })} placeholder="34 ABC 123" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Marka</label>
            <input required className="input" value={form.marka}
              onChange={(e) => setForm({ ...form, marka: e.target.value })} placeholder="Ford" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Model</label>
            <input required className="input" value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Transit" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Model yılı</label>
            <input type="number" className="input" value={form.model_yili}
              onChange={(e) => setForm({ ...form, model_yili: e.target.value })} placeholder="2022" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Yakıt tipi</label>
            <select className="input" value={form.yakit_tipi}
              onChange={(e) => setForm({ ...form, yakit_tipi: e.target.value })}>
              {YAKIT_TIPLERI.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Durum</label>
            <select className="input" value={form.durum}
              onChange={(e) => setForm({ ...form, durum: e.target.value })}>
              {DURUMLAR.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Güncel km</label>
            <input type="number" className="input" value={form.guncel_km}
              onChange={(e) => setForm({ ...form, guncel_km: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Firma</label>
            <input className="input" value={form.firma}
              onChange={(e) => setForm({ ...form, firma: e.target.value })} placeholder="örn. 3D İnCerTa" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Son bakım km</label>
            <input type="number" className="input" value={form.son_bakim_km}
              onChange={(e) => setForm({ ...form, son_bakim_km: e.target.value })} placeholder="örn. 78000" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Bakım aralığı (km)</label>
            <input type="number" className="input" value={form.bakim_araligi_km}
              onChange={(e) => setForm({ ...form, bakim_araligi_km: e.target.value })} placeholder="10000" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Zimmetli personel</label>
            <select className="input" value={form.sorumlu_surucu_id}
              onChange={(e) => setForm({ ...form, sorumlu_surucu_id: e.target.value })}>
              <option value="">Atanmamış</option>
              {personel.map((p) => (
                <option key={p.surucu_id} value={p.surucu_id}>{p.ad} {p.soyad}</option>
              ))}
            </select>
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
              <th className="px-5 py-3 font-normal">Plaka</th>
              <th className="px-5 py-3 font-normal">Marka / Model</th>
              <th className="px-5 py-3 font-normal">Yıl</th>
              <th className="px-5 py-3 font-normal">Yakıt</th>
              <th className="px-5 py-3 font-normal">Km</th>
              <th className="px-5 py-3 font-normal">Firma</th>
              <th className="px-5 py-3 font-normal">Zimmetli</th>
              <th className="px-5 py-3 font-normal">Bakım</th>
              <th className="px-5 py-3 font-normal">Durum</th>
              <th className="px-5 py-3 font-normal text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {araclar.map((a) => (
              <tr key={a.arac_id} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-mono">{a.plaka}</td>
                <td className="px-5 py-3 text-slate-700">{a.marka} {a.model}</td>
                <td className="px-5 py-3 text-slate-600">{a.model_yili ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{a.yakit_tipi}</td>
                <td className="px-5 py-3 font-mono text-slate-600">
                  {a.guncel_km?.toLocaleString("tr-TR") ?? 0}
                </td>
                <td className="px-5 py-3 text-slate-600">{a.firma ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{personelAdi(a.sorumlu_surucu_id)}</td>
                <td className="px-5 py-3">
                  {(() => {
                    const b = bakimDurumu(a);
                    return b ? <span className={`badge ${b.cls}`}>{b.label}</span> : <span className="text-slate-300 text-xs">—</span>;
                  })()}
                </td>
                <td className="px-5 py-3">
                  <span className={`badge ${DURUM_BADGE[a.durum] ?? "badge-idle"}`}>{a.durum}</span>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => handleQrYazdir(a)} className="text-xs text-amber hover:opacity-70 mr-4">
                    QR
                  </button>
                  {yonetimYapabilir && (
                    <>
                      <button onClick={() => handleEditClick(a)} className="text-xs text-slate-500 hover:text-ink mr-4">
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        disabled={deletingId === a.arac_id}
                        className="text-xs text-red hover:opacity-70 disabled:opacity-40"
                      >
                        {deletingId === a.arac_id ? "Siliniyor..." : "Sil"}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && araclar.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Henüz araç eklenmemiş.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center animate-pulse">Yükleniyor...</div>}
      </div>
    </div>
  );
}
