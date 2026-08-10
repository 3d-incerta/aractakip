"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { excelIndir } from "@/lib/excelIndir";

type SurucuKisa = { surucu_id: string; ad: string; soyad: string };

type Masraf = {
  id: string;
  surucu_id: string | null;
  gidilen_firma: string;
  tarih: string;
  tutar: number;
  durum: string;
  fatura_tarihi: string | null;
  fatura_no: string | null;
  aciklama: string | null;
  suruculer: { ad: string; soyad: string } | null;
};

const DURUMLAR = ["BEKLEMEDE", "ONAYLANDI", "REDDEDILDI", "FATURALANDI"];

const DURUM_ETIKET: Record<string, string> = {
  BEKLEMEDE: "Beklemede",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
  FATURALANDI: "Faturalandı",
};

const DURUM_BADGE: Record<string, string> = {
  BEKLEMEDE: "badge-idle",
  ONAYLANDI: "badge-warn",
  REDDEDILDI: "badge-danger",
  FATURALANDI: "badge-ok",
};

// Her durumdan hangi durumlara geçilebilir
const SONRAKI_DURUMLAR: Record<string, string[]> = {
  BEKLEMEDE: ["ONAYLANDI", "REDDEDILDI"],
  ONAYLANDI: ["FATURALANDI", "REDDEDILDI"],
  REDDEDILDI: ["BEKLEMEDE"],
  FATURALANDI: [],
};

const BOS_FORM = {
  surucu_id: "",
  gidilen_firma: "",
  tarih: "",
  tutar: "",
  durum: "BEKLEMEDE",
  fatura_tarihi: "",
  fatura_no: "",
  aciklama: "",
};

export default function YolMasraflariPage() {
  const [kayitlar, setKayitlar] = useState<Masraf[]>([]);
  const [surucular, setSurucular] = useState<SurucuKisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string>("HEPSİ");

  const [form, setForm] = useState(BOS_FORM);

  async function loadData() {
    setLoading(true);
    const [{ data: k }, { data: s }] = await Promise.all([
      supabase
        .from("yol_masraflari")
        .select("id, surucu_id, gidilen_firma, tarih, tutar, durum, fatura_tarihi, fatura_no, aciklama, suruculer(ad,soyad)")
        .order("tarih", { ascending: false })
        .limit(200),
      supabase.from("suruculer").select("surucu_id, ad, soyad").order("ad"),
    ]);
    setKayitlar((k as any) ?? []);
    setSurucular(s ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const gorunenler = useMemo(() => {
    if (filtre === "HEPSİ") return kayitlar;
    return kayitlar.filter((k) => k.durum === filtre);
  }, [kayitlar, filtre]);

  const toplamTutar = gorunenler.reduce((s, k) => s + Number(k.tutar), 0);
  const bekleyenTutar = kayitlar.filter((k) => k.durum === "BEKLEMEDE").reduce((s, k) => s + Number(k.tutar), 0);

  function handleEditClick(k: Masraf) {
    setEditingId(k.id);
    setForm({
      surucu_id: k.surucu_id ?? "",
      gidilen_firma: k.gidilen_firma,
      tarih: k.tarih,
      tutar: String(k.tutar),
      durum: k.durum,
      fatura_tarihi: k.fatura_tarihi ?? "",
      fatura_no: k.fatura_no ?? "",
      aciklama: k.aciklama ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  function handleExcelExport() {
    const veri = gorunenler.map((k) => ({
      Tarih: new Date(k.tarih).toLocaleDateString("tr-TR"),
      Sürücü: k.suruculer ? `${k.suruculer.ad} ${k.suruculer.soyad}` : "",
      "Gidilen Firma": k.gidilen_firma,
      Tutar: Number(k.tutar),
      Durum: DURUM_ETIKET[k.durum] ?? k.durum,
      "Fatura No": k.fatura_no ?? "",
      "Fatura Tarihi": k.fatura_tarihi ? new Date(k.fatura_tarihi).toLocaleDateString("tr-TR") : "",
      Açıklama: k.aciklama ?? "",
    }));
    excelIndir(veri, "yol-masraflari", "Yol Masrafları");
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
      surucu_id: form.surucu_id || null,
      gidilen_firma: form.gidilen_firma,
      tarih: form.tarih,
      tutar: Number(form.tutar),
      durum: form.durum,
      fatura_tarihi: form.fatura_tarihi || null,
      fatura_no: form.fatura_no || null,
      aciklama: form.aciklama || null,
    };

    const { error } = editingId
      ? await supabase.from("yol_masraflari").update(payload).eq("id", editingId)
      : await supabase.from("yol_masraflari").insert(payload);

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    handleCancel();
    loadData();
  }

  async function handleDelete(k: Masraf) {
    if (!confirm(`${k.gidilen_firma} masrafını silmek istediğine emin misin?`)) return;
    setDeletingId(k.id);
    const { error } = await supabase.from("yol_masraflari").delete().eq("id", k.id);
    setDeletingId(null);
    if (error) {
      alert("Silinemedi: " + error.message);
      return;
    }
    loadData();
  }

  async function durumDegistir(k: Masraf, yeniDurum: string) {
    const { error } = await supabase.from("yol_masraflari").update({ durum: yeniDurum }).eq("id", k.id);
    if (error) {
      alert("Güncellenemedi: " + error.message);
      return;
    }
    loadData();
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl mb-1">Yol Masrafları</h1>
          <p className="text-sm text-slate-500">Onay akışı: Beklemede → Onaylandı → Faturalandı</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExcelExport}
            disabled={gorunenler.length === 0}
            className="text-sm text-slate-600 border border-line rounded-md px-4 py-2.5 hover:bg-paper disabled:opacity-40"
          >
            Excel'e aktar
          </button>
          <button className="btn-primary" onClick={handleNewClick}>
            {showForm ? "Vazgeç" : "+ Masraf ekle"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-2">Onay bekleyen toplam</div>
          <div className="odometer text-lg font-semibold inline-block">
            {bekleyenTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 mb-2">Görünen toplam</div>
          <div className="odometer text-lg font-semibold inline-block">
            {toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-line">
        {["HEPSİ", ...DURUMLAR].map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              filtre === f ? "border-navy text-ink font-medium" : "border-transparent text-slate-500 hover:text-ink"
            }`}
          >
            {f === "HEPSİ" ? "Tümü" : DURUM_ETIKET[f]}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            {editingId ? "Masrafı düzenle" : "Yeni masraf"}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Sürücü</label>
            <select className="input" value={form.surucu_id}
              onChange={(e) => setForm({ ...form, surucu_id: e.target.value })}>
              <option value="">Seçiniz</option>
              {surucular.map((s) => <option key={s.surucu_id} value={s.surucu_id}>{s.ad} {s.soyad}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Gidilen firma</label>
            <input required className="input" value={form.gidilen_firma}
              onChange={(e) => setForm({ ...form, gidilen_firma: e.target.value })} placeholder="Müşteri/firma adı" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tarih</label>
            <input required type="date" className="input" value={form.tarih}
              onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tutar (₺)</label>
            <input required type="number" step="0.01" className="input" value={form.tutar}
              onChange={(e) => setForm({ ...form, tutar: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Durum</label>
            <select className="input" value={form.durum} onChange={(e) => setForm({ ...form, durum: e.target.value })}>
              {DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_ETIKET[d]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Fatura no (opsiyonel)</label>
            <input className="input" value={form.fatura_no}
              onChange={(e) => setForm({ ...form, fatura_no: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Fatura tarihi (opsiyonel)</label>
            <input type="date" className="input" value={form.fatura_tarihi}
              onChange={(e) => setForm({ ...form, fatura_tarihi: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Açıklama</label>
            <input className="input" value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="örn. otopark, yakıt, konaklama" />
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
              <th className="px-5 py-3 font-normal">Tarih</th>
              <th className="px-5 py-3 font-normal">Sürücü</th>
              <th className="px-5 py-3 font-normal">Gidilen firma</th>
              <th className="px-5 py-3 font-normal">Tutar</th>
              <th className="px-5 py-3 font-normal">Durum</th>
              <th className="px-5 py-3 font-normal">Açıklama</th>
              <th className="px-5 py-3 font-normal text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {gorunenler.map((k) => (
              <tr key={k.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3 text-slate-600">{new Date(k.tarih).toLocaleDateString("tr-TR")}</td>
                <td className="px-5 py-3 text-slate-700">
                  {k.suruculer ? `${k.suruculer.ad} ${k.suruculer.soyad}` : "—"}
                </td>
                <td className="px-5 py-3 text-slate-700">{k.gidilen_firma}</td>
                <td className="px-5 py-3 font-mono">{Number(k.tutar).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`badge ${DURUM_BADGE[k.durum] ?? "badge-idle"}`}>{DURUM_ETIKET[k.durum] ?? k.durum}</span>
                    {SONRAKI_DURUMLAR[k.durum]?.map((sonraki) => (
                      <button
                        key={sonraki}
                        onClick={() => durumDegistir(k, sonraki)}
                        className="text-[11px] text-slate-400 hover:text-ink border border-line rounded px-1.5 py-0.5"
                        title={`${DURUM_ETIKET[sonraki]} yap`}
                      >
                        → {DURUM_ETIKET[sonraki]}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-500 max-w-[180px] truncate" title={k.aciklama ?? ""}>
                  {k.aciklama ?? "—"}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => handleEditClick(k)} className="text-xs text-slate-500 hover:text-ink mr-4">
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(k)}
                    disabled={deletingId === k.id}
                    className="text-xs text-red hover:opacity-70 disabled:opacity-40"
                  >
                    {deletingId === k.id ? "Siliniyor..." : "Sil"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && gorunenler.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Kayıt yok.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center animate-pulse">Yükleniyor...</div>}
      </div>
    </div>
  );
}
