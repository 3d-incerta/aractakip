import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Env değişkenleri eksikken createClient() build sırasında (prerender
  // aşamasında) hata fırlatıp tüm build'i çökertir. Bunun yerine sahte bir
  // URL ile devam ediyoruz; asıl sorun (env değişkenlerinin hosting
  // panelinde tanımlanmamış olması) konsolda görünür ve uygulama açılır,
  // sadece Supabase istekleri başarısız olur.
  console.warn(
    "Supabase ortam değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Hosting panelinde (Netlify/Vercel) Environment Variables kısmına eklenip yeniden deploy edilmeli."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
