"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import type { MarkerData } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] flex items-center justify-center text-sm text-slate-400 font-mono">
      Harita yükleniyor...
    </div>
  ),
});

type AracKisa = { arac_id: string; plaka: string };

export default function KonumPage() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [araclar, setAraclar] = useState<AracKisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    arac_id: "",
    enlem: "",
    boylam: "",
    hiz_kmh: "",
  });

  async function loadData() {
    setLoading(true);

    const { data: a } = await supabase.from("araclar").select("arac_id, plaka").order("plaka");
    setAraclar(a ?? []);

    // Son 500 konum kaydını çekip her araç için en güncel olanı seçiyoruz.
    const { data: konumlar } = await supabase
      .from("konum_takip")
      .select("arac_id, enlem, boylam, hiz_kmh, kayit_zamani, araclar(plaka)")
      .order("kayit_zamani", { ascending: false })
      .limit(500);

    const enGuncel = new Map<string, MarkerData>();
    (konumlar ?? []).forEach((k: any) => {
      if (!enGuncel.has(k.arac_id)) {
        enGuncel.set(k.arac_id, {
          plaka: k.araclar?.plaka ?? "—",
          lat: Number(k.enlem),
          lng: Number(k.boylam),
          hiz: k.hiz_kmh,
          zaman: k.kayit_zamani,
        });
      }
    });

    setMarkers(Array.from(enGuncel.values()));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("konum_takip").insert({
      arac_id: form.arac_id,
      enlem: Number(form.enlem),
      boylam: Number(form.boylam),
      hiz_kmh: form.hiz_kmh ? Number(form.hiz_kmh) : null,
      kayit_zamani: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      setError("Kaydedilemedi: " + error.message);
      return;
    }

    setForm({ arac_id: "", enlem: "", boylam: "", hiz_kmh: "" });
    setShowForm(false);
    loadData();
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Konum</h1>
          <p className="text-sm text-slate-500">
            Araçların en son bildirdiği GPS konumu
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Vazgeç" : "+ Test konumu ekle"}
        </button>
      </div>

      <div className="card p-3 mb-4 text-xs text-slate-500">
        Bu ekran <code className="font-mono">konum_takip</code> tablosundaki en güncel kayıtları
        gösterir. Gerçek kullanımda araçlardaki GPS/telemetri cihazı bu tabloya periyodik olarak
        kayıt ekler (Supabase REST API veya bir entegrasyon üzerinden). Cihaz entegrasyonu
        kurulana kadar aşağıdaki formla manuel test verisi ekleyebilirsin.
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Araç</label>
            <select required className="input" value={form.arac_id}
              onChange={(e) => setForm({ ...form, arac_id: e.target.value })}>
              <option value="">Seçiniz</option>
              {araclar.map((a) => <option key={a.arac_id} value={a.arac_id}>{a.plaka}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Enlem (lat)</label>
            <input required type="number" step="0.000001" className="input" value={form.enlem}
              onChange={(e) => setForm({ ...form, enlem: e.target.value })} placeholder="41.015137" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Boylam (lng)</label>
            <input required type="number" step="0.000001" className="input" value={form.boylam}
              onChange={(e) => setForm({ ...form, boylam: e.target.value })} placeholder="28.979530" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Hız (km/s)</label>
            <input type="number" className="input" value={form.hiz_kmh}
              onChange={(e) => setForm({ ...form, hiz_kmh: e.target.value })} />
          </div>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {error && <span className="text-xs text-red">{error}</span>}
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-2">
          {loading ? (
            <div className="h-[560px] flex items-center justify-center text-sm text-slate-400">
              Yükleniyor...
            </div>
          ) : markers.length === 0 ? (
            <div className="h-[560px] flex items-center justify-center text-sm text-slate-400 text-center px-8">
              Henüz konum verisi yok. Yukarıdaki formla bir test kaydı ekleyebilirsin.
            </div>
          ) : (
            <MapView markers={markers} />
          )}
        </div>

        <div className="card overflow-hidden self-start">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-display text-base">Son bildirimler</h2>
          </div>
          {markers.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500 text-center">Kayıt yok.</div>
          ) : (
            <ul>
              {markers.map((m) => (
                <li key={m.plaka} className="px-5 py-3 border-b border-line last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{m.plaka}</span>
                    <span className="badge badge-ok">{m.hiz ?? 0} km/s</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {m.zaman ? new Date(m.zaman).toLocaleString("tr-TR") : "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
