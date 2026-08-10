"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Giriş başarısız: e-posta veya şifre hatalı.");
      return;
    }
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Logo size={40} />
          </div>
          <div className="font-lux text-2xl text-white">3D InCerTa</div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-1">
            Araç Takip Sistemi
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card bg-white p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">E-posta</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Şifre</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-xs text-red">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-5">
          Hesabın yok mu? Yöneticinden Supabase panelinden bir kullanıcı oluşturmasını iste.
        </p>
      </div>
    </div>
  );
}
