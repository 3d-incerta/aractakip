"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { excelIndir } from "@/lib/excelIndir";

type Surucu = {
  surucu_id: string;
  ad: string;
  soyad: string;
  ehliyet_no: string | null;
  telefon: string | null;
  kullanici_id: string | null;
  aktif_mi: boolean;
  rol: string;
};

type AracKisa = { arac_id: string; plaka: string; sorumlu_surucu_id: string | null };

const BOS_FORM = {
  ad: "",
  soyad: "",
  ehliyet_no: "",
  telefon: "",
  kullanici_id: "",
  aktif_mi: true,
  rol: "SURUCU",
};

const ROL_ETIKET: Record<string, string> = { SURUCU: "Sürücü", MUHASEBE: "Muhasebe Sorumlusu", FINANS: "Muhasebe ve Finans Müdürü" };
const ROL_BADGE: Record<string, string> = { SURUCU: "badge-idle", MUHASEBE: "badge-warn", FINANS: "badge-warn" };

export default function PersonelPage() {
  const [personel, setPersonel] = useState<Surucu[]>([]);
  const [araclar, setAraclar] = useState<AracKisa[]>([]);
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
      // Yönetici (kaydı yok) ve Muhasebe ve Finans Müdürü tam yetkili;
      // Muhasebe Sorumlusu ve Sürücü salt okunur / kısıtlı
      if (!kendiKayit || kendiKayit.rol === "FINANS") {
        setYonetimYapabilir(true);
      } else {
        setYonetimYapabilir(false);
      }
    }

    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("suruculer").select("surucu_id, ad, soyad, ehliyet_no, telefon, kullanici_id, aktif_mi, rol").order("ad"),
      supabase.from("araclar").select("arac_id, plaka, sorumlu_surucu_id"),
    ]);
    setPersonel(s ?? []);
    setAraclar(a ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function zimmetliAraclar(surucuId: string) {
    return araclar.filter((a) => a.sorumlu_surucu_id === surucuId);
  }

  function handleEditClick(p: Surucu) {
    setEditingId(p.surucu_id);
    setForm({
      ad: p.ad,
      soyad: p.soyad,
      ehliyet_no: p.ehliyet_no ?? "",
      telefon: p.telefon ?? "",
      kullanici_id: p.kullanici_id ?? "",
      aktif_mi: p.aktif_mi,
      rol: p.rol ?? "SURUCU",
    });
    setShowForm(true);
    setError(null);
  }

  function handleExcelExport() {
    const veri = personel.map((p) => ({
      "Ad Soyad": `${p.ad} ${p.soyad}`,
      Telefon: p.telefon ?? "",
      "Ehliyet No": p.ehliyet_no ?? "",
      Rol: ROL_ETIKET[p.rol] ?? p.rol,
      Durum: p.aktif_mi ? "Aktif" : "Pasif",
    }));
    excelIndir(veri, "suruculer", "Sürücüler");
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
      ad: form.ad,
      soyad: form.soyad,
      ehliyet_no: form.ehliyet_no || null,
      telefon: form.telefon || null,
      kullanici_id: form.kullanici_id.trim() || null,
      aktif_mi: form.aktif_mi,
      rol: form.rol,
    };

    const { error } = editingId
      ? await supabase.from("suruculer").update(payload).eq("surucu_id", editingId)
      : await supabase.from("suruculer").insert(payload);

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    handleCancel();
    loadData();
  }

  async function handleDelete(p: Surucu) {
    if (!confirm(`${p.ad} ${p.soyad} adlı personeli silmek istediğine emin misin?`)) return;
    setDeletingId(p.surucu_id);
    const { error } = await supabase.from("suruculer").delete().eq("surucu_id", p.surucu_id);
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
          <h1 className="font-display text-2xl mb-1">Sürücüler</h1>
          <p className="text-sm text-slate-500">
            Sürücü ve muhasebeci kayıtları — rol, panelde görecekleri sayfaları belirler
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExcelExport}
            disabled={personel.length === 0}
            className="text-sm text-slate-600 border border-line rounded-md px-4 py-2.5 hover:bg-paper disabled:opacity-40"
          >
            Excel'e aktar
          </button>
          {yonetimYapabilir && (
            <button className="btn-primary" onClick={handleNewClick}>
              {showForm ? "Vazgeç" : "+ Personel ekle"}
            </button>
          )}
        </div>
      </div>

      {yonetimYapabilir && (
        <div className="card p-3 mb-4 text-xs text-slate-500">
          Panele giriş yapabilmesi için önce Supabase Dashboard &gt; Authentication &gt; Users kısmından
          bir kullanıcı oluşturulmalı, oradaki <code className="font-mono">User UID</code> değeri
          aşağıdaki <b>Kullanıcı ID</b> alanına yapıştırılmalı. <b>Rol = Sürücü</b> ise sadece kendi
          zimmetli aracını görür; <b>Rol = Muhasebe Sorumlusu</b> veya <b>Muhasebe ve Finans Müdürü</b> ise tüm filonun analiz/rapor/masraf
          ekranlarını görür. Kullanıcı ID boş bırakılırsa panele giriş yapamaz.
        </div>
      )}

      {showForm && yonetimYapabilir && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            {editingId ? "Personeli düzenle" : "Yeni personel"}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Ad</label>
            <input required className="input" value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Soyad</label>
            <input required className="input" value={form.soyad}
              onChange={(e) => setForm({ ...form, soyad: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Rol</label>
            <select className="input" value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              <option value="SURUCU">Sürücü</option>
              <option value="MUHASEBE">Muhasebe Sorumlusu</option>
              <option value="FINANS">Muhasebe ve Finans Müdürü</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Telefon</label>
            <input className="input" value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: e.target.value })} placeholder="05xx xxx xx xx" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Ehliyet no</label>
            <input className="input" value={form.ehliyet_no}
              onChange={(e) => setForm({ ...form, ehliyet_no: e.target.value })} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-600 mt-6">
              <input type="checkbox" checked={form.aktif_mi}
                onChange={(e) => setForm({ ...form, aktif_mi: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs text-slate-500 block mb-1">
              Kullanıcı ID (Supabase Auth User UID)
            </label>
            <input className="input font-mono text-xs" value={form.kullanici_id}
              onChange={(e) => setForm({ ...form, kullanici_id: e.target.value })}
              placeholder="ör. 8f14e45f-ceea-4a1d-..." />
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
              <th className="px-5 py-3 font-normal">Ad Soyad</th>
              <th className="px-5 py-3 font-normal">Rol</th>
              <th className="px-5 py-3 font-normal">Telefon</th>
              <th className="px-5 py-3 font-normal">Zimmetli araç</th>
              <th className="px-5 py-3 font-normal">Giriş hesabı</th>
              <th className="px-5 py-3 font-normal">Durum</th>
              {yonetimYapabilir && <th className="px-5 py-3 font-normal text-right">İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {personel.map((p) => {
              const zimmetli = zimmetliAraclar(p.surucu_id);
              return (
                <tr key={p.surucu_id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-slate-700">{p.ad} {p.soyad}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${ROL_BADGE[p.rol] ?? "badge-idle"}`}>
                      {ROL_ETIKET[p.rol] ?? p.rol}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.telefon ?? "—"}</td>
                  <td className="px-5 py-3">
                    {zimmetli.length === 0 ? (
                      <span className="text-slate-400 text-xs">Atanmamış</span>
                    ) : (
                      zimmetli.map((a) => (
                        <span key={a.arac_id} className="badge badge-ok font-mono mr-1">{a.plaka}</span>
                      ))
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${p.kullanici_id ? "badge-ok" : "badge-idle"}`}>
                      {p.kullanici_id ? "Bağlı" : "Bağlı değil"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${p.aktif_mi ? "badge-ok" : "badge-idle"}`}>
                      {p.aktif_mi ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  {yonetimYapabilir && (
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => handleEditClick(p)} className="text-xs text-slate-500 hover:text-ink mr-4">
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.surucu_id}
                        className="text-xs text-red hover:opacity-70 disabled:opacity-40"
                      >
                        {deletingId === p.surucu_id ? "Siliniyor..." : "Sil"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && personel.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-500 text-center">Henüz personel eklenmemiş.</div>
        )}
        {loading && <div className="px-5 py-10 text-sm text-slate-500 text-center animate-pulse">Yükleniyor...</div>}
      </div>
    </div>
  );
}
