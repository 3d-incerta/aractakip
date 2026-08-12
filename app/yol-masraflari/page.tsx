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

// Muhasebe Sorumlusu faturalandıramaz — sadece Yönetici ve Muhasebe ve
// Finans Müdürü nihai faturalama onayı verebilir
function sonrakiDurumlarGetir(durum: string, rol: string | null) {
  // Hem Muhasebe Sorumlusu hem Muhasebe ve Finans Müdürü faturalandırabilir
  return SONRAKI_DURUMLAR[durum] ?? [];
}

const KDV_ORANI = 0.20; // %20 — tutar KDV dahil kabul edilir

function kdvAyristir(tutarKdvDahil: number) {
  const matrah = tutarKdvDahil / (1 + KDV_ORANI);
  const kdv = tutarKdvDahil - matrah;
  return { matrah, kdv };
}

function belgeYazdir(k: Masraf) {
  const { matrah, kdv } = kdvAyristir(Number(k.tutar));
  const pencere = window.open("", "_blank", "width=480,height=760");
  if (!pencere) return;

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8" />
      <title>Masraf Onay Belgesi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 28px; color: #101827; max-width: 400px; margin: 0 auto; }
        h1 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 2px; text-align:center; }
        .sub { font-size: 11px; color: #64748b; margin-bottom: 20px; text-align:center; }
        .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px; }
        .row span:first-child { color: #64748b; }
        .kdv-blok { margin-top: 12px; padding: 12px; background: #f6f7f9; border-radius: 8px; }
        .kdv-blok .row { border-bottom: none; padding: 3px 0; font-size: 12.5px; }
        .toplam { font-size: 17px; font-weight: bold; padding: 12px 0; border-top: 2px solid #101827; margin-top: 8px; display:flex; justify-content:space-between; }
        .durum-etiket { display:inline-block; margin-top:16px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight:600; text-align:center; width:100%; box-sizing:border-box; }
        .footer { margin-top: 26px; font-size: 10px; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <h1>Masraf Onay Belgesi</h1>
      <div class="sub">3D İnCerTa — Muhasebe &amp; Finans</div>

      <div class="row"><span>Sürücü</span><span><b>${k.suruculer ? `${k.suruculer.ad} ${k.suruculer.soyad}` : "—"}</b></span></div>
      <div class="row"><span>Gidilen firma</span><span>${k.gidilen_firma}</span></div>
      <div class="row"><span>Tarih</span><span>${new Date(k.tarih).toLocaleDateString("tr-TR")}</span></div>
      ${k.fatura_no ? `<div class="row"><span>Fatura no</span><span>${k.fatura_no}</span></div>` : ""}
      ${k.fatura_tarihi ? `<div class="row"><span>Fatura tarihi</span><span>${new Date(k.fatura_tarihi).toLocaleDateString("tr-TR")}</span></div>` : ""}

      <div class="kdv-blok">
        <div class="row"><span>Matrah</span><span>${matrah.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</span></div>
        <div class="row"><span>KDV (%20)</span><span>${kdv.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</span></div>
      </div>

      <div class="toplam"><span>Genel Toplam</span><span>${Number(k.tutar).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺</span></div>

      <div class="durum-etiket" style="background:${k.durum === "FATURALANDI" ? "#e6f4f1" : k.durum === "REDDEDILDI" ? "#fbe9e9" : "#fef3d9"}; color:${k.durum === "FATURALANDI" ? "#157a6e" : k.durum === "REDDEDILDI" ? "#b32d2d" : "#92600f"}">
        ${DURUM_ETIKET[k.durum] ?? k.durum}
      </div>

      ${k.aciklama ? `<div style="margin-top:14px; font-size:12.5px; color:#475467;"><b style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:4px;">Açıklama</b>${k.aciklama.replace(/</g, "&lt;")}</div>` : ""}

      <div class="footer">Belge No: MSF-${k.id.slice(0, 8).toUpperCase()} · Oluşturulma: ${new Date().toLocaleString("tr-TR")}</div>

      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;
  pencere.document.write(html);
  pencere.document.close();
}

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
  const [surucuMu, setSurucuMu] = useState(false); // yönetici/muhasebe/finans değilse true
  const [kendiSurucuId, setKendiSurucuId] = useState<string | null>(null);
  const [kendiRol, setKendiRol] = useState<string | null>(null); // null = Yönetici; "MUHASEBE" | "FINANS" | "SURUCU"

  const [form, setForm] = useState(BOS_FORM);

  async function loadData() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    let benimSurucuId: string | null = null;
    let yetkiliMi = true; // yönetici/muhasebe/finans mı?

    if (userId) {
      const { data: kendiKayit } = await supabase
        .from("suruculer")
        .select("surucu_id, rol")
        .eq("kullanici_id", userId)
        .maybeSingle();
      if (kendiKayit) {
        benimSurucuId = kendiKayit.surucu_id;
        setKendiRol(kendiKayit.rol);
        yetkiliMi = kendiKayit.rol === "MUHASEBE" || kendiKayit.rol === "FINANS";
      } else {
        setKendiRol(null);
      }
    }
    setKendiSurucuId(benimSurucuId);
    setSurucuMu(!yetkiliMi && !!benimSurucuId);

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
  const faturalananTutar = gorunenler.filter((k) => k.durum === "FATURALANDI").reduce((s, k) => s + Number(k.tutar), 0);

  const firmaOzeti = useMemo(() => {
    const harita = new Map<string, number>();
    gorunenler.forEach((k) => {
      harita.set(k.gidilen_firma, (harita.get(k.gidilen_firma) ?? 0) + Number(k.tutar));
    });
    return Array.from(harita.entries())
      .map(([firma, tutar]) => ({ firma, tutar }))
      .sort((a, b) => b.tutar - a.tutar);
  }, [gorunenler]);

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
    setForm(surucuMu ? { ...BOS_FORM, surucu_id: kendiSurucuId ?? "" } : BOS_FORM);
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
      surucu_id: surucuMu ? kendiSurucuId : (form.surucu_id || null),
      gidilen_firma: form.gidilen_firma,
      tarih: form.tarih,
      tutar: Number(form.tutar),
      durum: surucuMu ? "BEKLEMEDE" : form.durum,
      fatura_tarihi: surucuMu ? null : (form.fatura_tarihi || null),
      fatura_no: surucuMu ? null : (form.fatura_no || null),
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
      {!surucuMu && (
        <div className="lux-hero mb-8">
          <div className="relative">
            <div className="lux-eyebrow mb-3">Muhasebe &amp; Finans</div>
            <h1 className="font-lux text-3xl text-white mb-2">Yol Masrafları</h1>
            <p className="text-slate-300 text-sm max-w-md">
              Onay akışı: Beklemede → Onaylandı → Faturalandı
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        {surucuMu && (
          <div>
            <h1 className="font-display text-2xl mb-1">Yol Masrafları</h1>
            <p className="text-sm text-slate-500">
              Girdiğin masraflar onay için Muhasebe / Muhasebe ve Finans Müdürüne gider
            </p>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto">
          {!surucuMu && (
            <button
              onClick={handleExcelExport}
              disabled={gorunenler.length === 0}
              className="text-sm text-slate-600 border border-line rounded-md px-4 py-2.5 hover:bg-paper disabled:opacity-40"
            >
              Excel'e aktar
            </button>
          )}
          <button className="btn-primary" onClick={handleNewClick}>
            {showForm ? "Vazgeç" : "+ Masraf ekle"}
          </button>
        </div>
      </div>

      {!surucuMu && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 max-w-2xl">
          <div className="lux-stat-card">
            <div className="lux-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="lux-stat-value text-2xl">
              {bekleyenTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
              <span className="text-sm align-top ml-1">₺</span>
            </div>
            <div className="lux-stat-label">Onay bekleyen</div>
          </div>
          <div className="lux-stat-card">
            <div className="lux-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
              </svg>
            </div>
            <div className="lux-stat-value text-2xl">
              {faturalananTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
              <span className="text-sm align-top ml-1">₺</span>
            </div>
            <div className="lux-stat-label">Faturalanan (bu görünüm)</div>
          </div>
          <div className="lux-stat-card">
            <div className="lux-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinejoin="round" />
                <path d="M15 4v5h5M8 13h8M8 17h5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="lux-stat-value text-2xl">
              {toplamTutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
              <span className="text-sm align-top ml-1">₺</span>
            </div>
            <div className="lux-stat-label">
              Görünen toplam · KDV: {kdvAyristir(toplamTutar).kdv.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
            </div>
          </div>
        </div>
      )}

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

          {!surucuMu && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Sürücü</label>
              <select className="input" value={form.surucu_id}
                onChange={(e) => setForm({ ...form, surucu_id: e.target.value })}>
                <option value="">Seçiniz</option>
                {surucular.map((s) => <option key={s.surucu_id} value={s.surucu_id}>{s.ad} {s.soyad}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Gidilen firma</label>
            <input required className="input" value={form.gidilen_firma}
              onChange={(e) => setForm({ ...form, gidilen_firma: e.target.value })} placeholder="Müşteri/firma adı" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tarih</label>
            <input required type="date" className="input" value={form.tarih}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tutar (₺)</label>
            <input required type="number" step="0.01" className="input" value={form.tutar}
              onChange={(e) => setForm({ ...form, tutar: e.target.value })} />
          </div>

          {!surucuMu && (
            <>
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
            </>
          )}

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

      {!surucuMu && firmaOzeti.length > 0 && (
        <div className="lux-section overflow-hidden mb-6">
          <div className="lux-section-header">
            <span className="lux-dot" />
            <h2 className="font-lux text-base">Firma Bazlı Gider Özeti</h2>
          </div>
          <div className="flex flex-wrap gap-3 p-5">
            {firmaOzeti.map((f) => (
              <div key={f.firma} className="border border-line rounded-lg px-4 py-2.5 bg-paper">
                <div className="text-xs text-slate-500">{f.firma}</div>
                <div className="font-mono font-semibold text-ink">
                  {f.tutar.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="lux-section overflow-hidden">
        <div className="lux-section-header">
          <span className="lux-dot" />
          <h2 className="font-lux text-base">Masraf Kayıtları</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-line">
              <th className="px-5 py-3 font-normal">Tarih</th>
              {!surucuMu && <th className="px-5 py-3 font-normal">Sürücü</th>}
              <th className="px-5 py-3 font-normal">Gidilen firma</th>
              <th className="px-5 py-3 font-normal">Tutar</th>
              <th className="px-5 py-3 font-normal">Durum</th>
              <th className="px-5 py-3 font-normal">Açıklama</th>
              {!surucuMu && <th className="px-5 py-3 font-normal text-right">İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {gorunenler.map((k) => (
              <tr key={k.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3 text-slate-600">{new Date(k.tarih).toLocaleDateString("tr-TR")}</td>
                {!surucuMu && (
                  <td className="px-5 py-3 text-slate-700">
                    {k.suruculer ? `${k.suruculer.ad} ${k.suruculer.soyad}` : "—"}
                  </td>
                )}
                <td className="px-5 py-3 text-slate-700">{k.gidilen_firma}</td>
                <td className="px-5 py-3 font-mono">{Number(k.tutar).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`badge ${DURUM_BADGE[k.durum] ?? "badge-idle"}`}>{DURUM_ETIKET[k.durum] ?? k.durum}</span>
                    {!surucuMu && sonrakiDurumlarGetir(k.durum, kendiRol).map((sonraki) => (
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
                {!surucuMu && (
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => belgeYazdir(k)} className="text-xs text-amber hover:opacity-70 mr-4">
                      Belge
                    </button>
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
                )}
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
