"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AracKisa = { arac_id: string; plaka: string };
type SurucuKisa = { surucu_id: string; ad: string; soyad: string };

type Belge = {
  id: string;
  arac_id: string | null;
  surucu_id: string | null;
  tur: string;
  dosya_url: string;
  gecerlilik_tarihi: string | null;
  aciklama: string | null;
  araclar: { plaka: string } | null;
  suruculer: { ad: string; soyad: string } | null;
};

const TUR_ETIKET: Record<string, string> = {
  RUHSAT: "Ruhsat",
  SIGORTA: "Sigorta",
  EHLIYET: "Ehliyet",
  DIGER: "Diğer",
};

const BOS_FORM = {
  hedef: "ARAC", // ARAC | SURUCU
  arac_id: "",
  surucu_id: "",
  tur: "RUHSAT",
  gecerlilik_tarihi: "",
  aciklama: "",
};

function gecerlilikDurumu(tarih: string | null) {
  if (!tarih) return null;
  const kalanGun = Math.ceil((new Date(tarih).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (kalanGun < 0) return { label: "Süresi geçti", cls: "badge-danger" };
  if (kalanGun <= 30) return { label: `${kalanGun} gün kaldı`, cls: "badge-warn" };
  return { label: "Geçerli", cls: "badge-ok" };
}

export default function BelgelerPage() {
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [araclar, setAraclar] = useState<AracKisa[]>([]);
  const [surucular, setSurucular] = useState<SurucuKisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtreTur, setFiltreTur] = useState<string>("HEPSİ");
  const [dosya, setDosya] = useState<File | null>(null);

  const [form, setForm] = useState(BOS_FORM);

  async function loadData() {
    setLoading(true);
    const [{ data: b }, { data: a }, { data: s }] = await Promise.all([
      supabase
        .from("belgeler")
        .select("id, arac_id, surucu_id, tur, dosya_url, gecerlilik_tarihi, aciklama, araclar(plaka), suruculer(ad,soyad)")
        .order("created_at", { ascending: false }),
      supabase.from("araclar").select("arac_id, plaka").order("plaka"),
      supabase.from("suruculer").select("surucu_id, ad, soyad").order("ad"),
    ]);
    setBelgeler((b as any) ?? []);
    setAraclar(a ?? []);
    setSurucular(s ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const gorunenler = useMemo(() => {
    if (filtreTur === "HEPSİ") return belgeler;
    return belgeler.filter((b) => b.tur === filtreTur);
  }, [belgeler, filtreTur]);

  function handleNewClick() {
    setForm(BOS_FORM);
    setDosya(null);
    setShowForm((s) => !s);
    setError(null);
  }

  function handleCancel() {
    setShowForm(false);
    setForm(BOS_FORM);
    setDosya(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dosya) {
      setError("Lütfen bir dosya seç.");
      return;
    }
    setSaving(true);
    setError(null);

    setUploading(true);
    const uzanti = dosya.name.split(".").pop();
    const dosyaYolu = `${form.hedef === "ARAC" ? form.arac_id : form.surucu_id}/${Date.now()}.${uzanti}`;
    const { error: yuklemeHatasi } = await supabase.storage.from("belgeler").upload(dosyaYolu, dosya);
    setUploading(false);

    if (yuklemeHatasi) {
      setSaving(false);
      setError("Dosya yüklenemedi: " + yuklemeHatasi.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("belgeler").getPublicUrl(dosyaYolu);

    const payload = {
      arac_id: form.hedef === "ARAC" ? form.arac_id || null : null,
      surucu_id: form.hedef === "SURUCU" ? form.surucu_id || null : null,
      tur: form.tur,
      dosya_url: publicUrlData.publicUrl,
      gecerlilik_tarihi: form.gecerlilik_tarihi || null,
      aciklama: form.aciklama || null,
    };

    const { error } = await supabase.from("belgeler").insert(payload);
    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    handleCancel();
    loadData();
  }

  async function handleDelete(b: Belge) {
    if (!confirm("Bu belgeyi silmek istediğine emin misin?")) return;
    setDeletingId(b.id);
    const { error } = await supabase.from("belgeler").delete().eq("id", b.id);
    setDeletingId(null);
    if (error) {
      alert("Silinemedi: " + error.message);
      return;
    }
    loadData();
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl mb-1">Belgeler</h1>
          <p className="text-sm text-slate-500">Ruhsat, sigorta, ehliyet gibi taranmış evraklar</p>
        </div>
        <button className="btn-primary" onClick={handleNewClick}>
          {showForm ? "Vazgeç" : "+ Belge ekle"}
        </button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-line">
        {["HEPSİ", "RUHSAT", "SIGORTA", "EHLIYET", "DIGER"].map((t) => (
          <button
            key={t}
            onClick={() => setFiltreTur(t)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              filtreTur === t ? "border-navy text-ink font-medium" : "border-transparent text-slate-500 hover:text-ink"
            }`}
          >
            {t === "HEPSİ" ? "Tümü" : TUR_ETIKET[t]}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            Yeni belge
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Belge türü</label>
            <select className="input" value={form.tur} onChange={(e) => setForm({ ...form, tur: e.target.value })}>
              {Object.entries(TUR_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Kime ait</label>
            <select className="input" value={form.hedef}
              onChange={(e) => setForm({ ...form, hedef: e.target.value, arac_id: "", surucu_id: "" })}>
              <option value="ARAC">Araç</option>
              <option value="SURUCU">Sürücü</option>
            </select>
          </div>
          {form.hedef === "ARAC" ? (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Araç</label>
              <select required className="input" value={form.arac_id}
                onChange={(e) => setForm({ ...form, arac_id: e.target.value })}>
                <option value="">Seçiniz</option>
                {araclar.map((a) => <option key={a.arac_id} value={a.arac_id}>{a.plaka}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Sürücü</label>
              <select required className="input" value={form.surucu_id}
                onChange={(e) => setForm({ ...form, surucu_id: e.target.value })}>
                <option value="">Seçiniz</option>
                {surucular.map((s) => <option key={s.surucu_id} value={s.surucu_id}>{s.ad} {s.soyad}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Geçerlilik tarihi (opsiyonel)</label>
            <input type="date" className="input" value={form.gecerlilik_tarihi}
              onChange={(e) => setForm({ ...form, gecerlilik_tarihi: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Açıklama</label>
            <input className="input" value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className="text-xs text-slate-500 block mb-1">Dosya (fotoğraf / PDF)</label>
            <label className="inline-block text-sm border border-line rounded-md px-4 py-2.5 cursor-pointer hover:bg-paper">
              {dosya ? dosya.name : "Dosya seç"}
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => setDosya(e.target.files?.[0] ?? null)} />
            </label>
            {uploading && <span className="ml-3 text-xs text-slate-400">Yükleniyor...</span>}
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button type="button" onClick={handleCancel} className="text-sm text-slate-500 hover:text-ink">
              Vazgeç
            </button>
            {error && <span className="text-xs text-red">{error}</span>}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {gorunenler.map((b) => {
          const durum = gecerlilikDurumu(b.gecerlilik_tarihi);
          const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(b.dosya_url);
          return (
            <div key={b.id} className="card overflow-hidden">
              <a href={b.dosya_url} target="_blank" rel="noopener noreferrer" className="block bg-paper h-36 flex items-center justify-center">
                {isImage ? (
                  <img src={b.dosya_url} alt={b.tur} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400 font-mono">PDF dosyayı görüntüle</span>
                )}
              </a>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="badge badge-idle">{TUR_ETIKET[b.tur]}</span>
                  {durum && <span className={`badge ${durum.cls}`}>{durum.label}</span>}
                </div>
                <div className="text-sm text-slate-700 mt-2">
                  {b.araclar?.plaka ?? (b.suruculer ? `${b.suruculer.ad} ${b.suruculer.soyad}` : "—")}
                </div>
                {b.aciklama && <div className="text-xs text-slate-500 mt-1">{b.aciklama}</div>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-400">
                    {b.gecerlilik_tarihi ? new Date(b.gecerlilik_tarihi).toLocaleDateString("tr-TR") : "Süresiz"}
                  </span>
                  <button
                    onClick={() => handleDelete(b)}
                    disabled={deletingId === b.id}
                    className="text-xs text-red hover:opacity-70 disabled:opacity-40"
                  >
                    {deletingId === b.id ? "Siliniyor..." : "Sil"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && gorunenler.length === 0 && (
        <div className="card p-10 text-center text-sm text-slate-500">Henüz belge eklenmemiş.</div>
      )}
      {loading && <div className="card p-10 text-center text-sm text-slate-500">Yükleniyor...</div>}
    </div>
  );
}
