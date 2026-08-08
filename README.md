# Filo — Araç Takip Paneli

Next.js 14 + Supabase ile hazırlanmış kurumsal araç takip, muayene ve yakıt yönetim paneli.

## 1) Yerelde çalıştırma

```bash
npm install
cp .env.local.example .env.local
# .env.local içine Supabase Project URL ve anon key değerlerini yapıştır
npm run dev
```

`http://localhost:3000` adresinde açılır.

## 2) Giriş yapacak kullanıcı oluşturma

Bu panelde kayıt (sign-up) ekranı yok — kullanıcılar Supabase tarafından oluşturulur:

1. Supabase Dashboard → **Authentication → Users → Add user**
2. E-posta ve şifre belirle (otomatik onaylı olarak ekle)
3. Bu bilgilerle `/login` sayfasından giriş yapılabilir

## 3) Vercel'e yayınlama

1. Bu projeyi bir GitHub reposuna yükle
2. [vercel.com](https://vercel.com) → **New Project** → reponu seç
3. **Environment Variables** kısmına ekle:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy** butonuna bas — birkaç dakika içinde canlı bağlantı hazır olur

## Konum (GPS) ekranı

`/konum` sayfası `konum_takip` tablosundaki en güncel kayıtları Leaflet + OpenStreetMap ile
haritada gösterir. Gerçek konum verisi, araçlardaki bir GPS/telemetri cihazının Supabase REST
API'sine (`konum_takip` tablosuna insert) periyodik veri göndermesiyle oluşur — bu panel o
entegrasyonu içermez, sadece veriyi görselleştirir. Cihaz bağlanana kadar sayfadaki "Test konumu
ekle" formuyla manuel kayıt girilebilir.

## Notlar

- Veritabanı şeması ve RLS politikaları `arac_takip_sistemi_supabase.sql` dosyasındadır; Supabase SQL Editor'de çalıştırılmış olmalı.
- Şu an RLS politikaları "authenticated" (giriş yapmış herhangi bir kullanıcı) bazlı — şube/rol bazlı kısıtlama gerekiyorsa Supabase tarafında policy'ler güncellenmeli.
- `toplam_tutar` veritabanında otomatik hesaplanan (generated) bir alan olduğu için yakıt kaydı eklerken gönderilmez.
