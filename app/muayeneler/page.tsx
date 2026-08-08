"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AracKisa = { arac_id: string; plaka: string };

type Muayene = {
  muayene_id: string;
  arac_id: string;
  muayene_tarihi: string;
  gecerlilik_tarihi: string;
  sonuc: string;
  km_bilgisi: number | null;
  maliyet: number | null;
  araclar: { plaka: string } | null;
};

const SONUCLAR = ["GECTI", "KALDI", "SARTLI"];

const BOS_FORM = {
  arac_id: "",
  muayene_tarihi: "",
  gecerlilik_tarihi: "",
  sonuc: "GECTI",
  km_bilgisi: "",
  maliyet: "",
};

function gecerlilikDurumu(gecerlilik: string) {
  const kalanGun = Math.ceil(
    (new Date(gecerlilik).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (kalanGun < 0) return { label: "Süresi geçti", cls: "badge-danger" };
  if (kalanGun <= 30) return { label: `${kalanGun} gün kaldı`, cls: "badge-warn" };
  return { label: "Geçerli", cls: "badge-ok" };
}

export default function MuayenelerPage() {
  const [muayeneler, setMuayeneler] = useState<Muayene[]>([]);
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
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase
        .from("muayeneler")
        .select("muayene_id, arac_id, muayene_tarihi, gecerlilik_tarihi, sonuc, km_bilgisi, maliyet, araclar(plaka)")
        .order("gecerlilik_tarihi", { ascending: true }),
      supabase.from("araclar").select("arac_id, plaka").order("plaka"),
    ]);
    setMuayeneler((m as any) ?? []);
    setAraclar(a ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleEditClick(m: Muayene) {
    setEditingId(m.muayene_id);
    setForm({
      arac_id: m.arac_id,
      muayene_tarihi: m.muayene_tarihi,
      gecerlilik_tarihi: m.gecerlilik_tarihi,
      sonuc: m.sonuc,
      km_bilgisi: m.km_bilgisi ? String(m.km_bilgisi) : "",
      maliyet: m.maliyet ? String(m.maliyet) : "",
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
      arac_id: form.arac_id,
      muayene_tarihi: form.muayene_tarihi,
      gecerlilik_tarihi: form.gecerlilik_tarihi,
      sonuc: form.sonuc,
      km_bilgisi: form.km_bilgisi ? Number(form.km_bilgisi) : null,
      maliyet: form.maliyet ? Number(form.maliyet) : null,
    };

    const { error } = editingId
      ? await supabase.from("muayeneler").update(payload).eq("muayene_id", editingId)
      : await supabase.from("muayeneler").insert(payload);

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    handleCancel();
    loadData();
  }

  async function handleDelete(m: Muayene) {
    if (!confirm(`${m.araclar?.plaka ?? "Bu"} aracın muayene kaydını silmek istediğine emin misin?`)) return;
    setDeletingId(m.muayene_id);
    const { error } = await supabase.from("muayeneler").delete().eq("muayene_id", m.muayene_id);
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
          <h1 className="font-display text-2xl mb-1">Muayeneler</h1>
          <p className="text-sm text-slate-500">Araç muayene kayıtları ve geçerlilik durumu</p>
        </div>
        <button className="btn-primary" onClick={handleNewClick}>
          {showForm ? "Vazgeç" : "+ Muayene ekle"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            {editingId ? "Muayeneyi düzenle" : "Yeni muayene"}
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
            <label className="text-xs text-slate-500 block mb-1">Muayene tarihi</label>
            <input required type="date" className="input" value={form.muayene_tarihi}
              onChange={(e) => setForm({ ...form, muayene_tarihi: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Geçerlilik tarihi</label>
            <input required type="date" className="input" value={form.gecerlilik_tarihi}
              onChange={(e) => setForm({ ...form, gecerlilik_tarihi: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Sonuç</label>
            <select className="input" value={form.sonuc}
              onChange={(e) => setForm({ ...form, sonuc: e.target.value })}>
              {SONUCLAR.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Km bilgisi</label>
            <input type="number" className="input" value={form.km_bilgisi}
              onChange={(e) => setForm({ ...form, km_bilgisi: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Maliyet (₺)</label>
            <input type="number" step="0.01" className="input" value={form.maliyet}
              onChange={(e) => setForm({ ...form, maliyet: e.target.value })} />
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
              <th className="px-5 py-3 font-normal">Muayene tarihi</th>
              <th className="px-5 py-3 font-normal">Geçerlilik</th>
              <th className="px-5 py-3 font-normal">Sonuç</th>
              <th className="px-5 py-3 font-normal">Durum</th>
              <th className="px-5 py-3 font-normal text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {muayeneler.map((m) => {
              const durum = gecerlilikDurumu(m.gecerlilik_tarihi);
              return (
                <tr key={m.muayene_id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-mono">{m.araclar?.plaka ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(m.muayene_tarihi).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(m.gecerlilik_tarihi).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{m.sonuc}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${durum.cls}`}>{durum.label}</span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => handleEditClick(m)} className="text-xs text-slate-500 hover:text-ink mr-4">
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      disabled={deletingId === m.muayene_id}
                      className="text-xs text-red hover:opacity-70 disabled:opacity-40"
                    >
                      {deletingId === m.muayene_id ? "Siliniyor..." : "Sil"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && muayeneler.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Henüz muayene kaydı yok.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center">Yükleniyor...</div>}
      </div>
    </div>
  );
}
