"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SurucuKisa = { surucu_id: string; ad: string; soyad: string };
type AracKisa = { arac_id: string; plaka: string };

type IsKaydi = {
  id: string;
  surucu_id: string | null;
  arac_id: string | null;
  gidilen_firma: string;
  tarih: string;
  aciklama: string | null;
  suruculer: { ad: string; soyad: string } | null;
  araclar: { plaka: string } | null;
};

const BOS_FORM = {
  surucu_id: "",
  arac_id: "",
  gidilen_firma: "",
  tarih: "",
  aciklama: "",
};

export default function IsKayitlariPage() {
  const [kayitlar, setKayitlar] = useState<IsKaydi[]>([]);
  const [surucular, setSurucular] = useState<SurucuKisa[]>([]);
  const [araclar, setAraclar] = useState<AracKisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(BOS_FORM);

  async function loadData() {
    setLoading(true);
    const [{ data: k }, { data: s }, { data: a }] = await Promise.all([
      supabase
        .from("is_kayitlari")
        .select("id, surucu_id, arac_id, gidilen_firma, tarih, aciklama, suruculer(ad,soyad), araclar(plaka)")
        .order("tarih", { ascending: false })
        .limit(200),
      supabase.from("suruculer").select("surucu_id, ad, soyad").order("ad"),
      supabase.from("araclar").select("arac_id, plaka").order("plaka"),
    ]);
    setKayitlar((k as any) ?? []);
    setSurucular(s ?? []);
    setAraclar(a ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleEditClick(k: IsKaydi) {
    setEditingId(k.id);
    setForm({
      surucu_id: k.surucu_id ?? "",
      arac_id: k.arac_id ?? "",
      gidilen_firma: k.gidilen_firma,
      tarih: k.tarih,
      aciklama: k.aciklama ?? "",
    });
    setShowForm(true);
    setError(null);
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
      arac_id: form.arac_id || null,
      gidilen_firma: form.gidilen_firma,
      tarih: form.tarih,
      aciklama: form.aciklama || null,
    };

    const { error } = editingId
      ? await supabase.from("is_kayitlari").update(payload).eq("id", editingId)
      : await supabase.from("is_kayitlari").insert(payload);

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    handleCancel();
    loadData();
  }

  async function handleDelete(k: IsKaydi) {
    if (!confirm(`${k.gidilen_firma} ziyaretini silmek istediğine emin misin?`)) return;
    setDeletingId(k.id);
    const { error } = await supabase.from("is_kayitlari").delete().eq("id", k.id);
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
          <h1 className="font-display text-2xl mb-1">Gidilen İşler</h1>
          <p className="text-sm text-slate-500">Sürücülerin hangi firmaya, ne zaman gittiği</p>
        </div>
        <button className="btn-primary" onClick={handleNewClick}>
          {showForm ? "Vazgeç" : "+ Kayıt ekle"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            {editingId ? "Kaydı düzenle" : "Yeni kayıt"}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Sürücü</label>
            <select required className="input" value={form.surucu_id}
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
            <label className="text-xs text-slate-500 block mb-1">Araç (opsiyonel)</label>
            <select className="input" value={form.arac_id}
              onChange={(e) => setForm({ ...form, arac_id: e.target.value })}>
              <option value="">Belirtilmedi</option>
              {araclar.map((a) => <option key={a.arac_id} value={a.arac_id}>{a.plaka}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Açıklama</label>
            <input className="input" value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })} placeholder="Yapılan iş / ziyaret amacı" />
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
              <th className="px-5 py-3 font-normal">Araç</th>
              <th className="px-5 py-3 font-normal">Açıklama</th>
              <th className="px-5 py-3 font-normal text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {kayitlar.map((k) => (
              <tr key={k.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3 text-slate-600">{new Date(k.tarih).toLocaleDateString("tr-TR")}</td>
                <td className="px-5 py-3 text-slate-700">
                  {k.suruculer ? `${k.suruculer.ad} ${k.suruculer.soyad}` : "—"}
                </td>
                <td className="px-5 py-3 text-slate-700">{k.gidilen_firma}</td>
                <td className="px-5 py-3 font-mono text-slate-600">{k.araclar?.plaka ?? "—"}</td>
                <td className="px-5 py-3 text-slate-500 max-w-[220px] truncate" title={k.aciklama ?? ""}>
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
        {!loading && kayitlar.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Henüz kayıt yok.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center animate-pulse">Yükleniyor...</div>}
      </div>
    </div>
  );
}
