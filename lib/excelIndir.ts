import * as XLSX from "xlsx";

/**
 * Herhangi bir veri dizisini .xlsx dosyası olarak indirir.
 * rows: düz obje dizisi (her key bir sütun başlığı olur)
 * dosyaAdi: uzantısız dosya adı (örn. "araclar-2026-08-08")
 * sayfaAdi: Excel sekme adı (opsiyonel)
 */
export function excelIndir(rows: Record<string, any>[], dosyaAdi: string, sayfaAdi = "Sayfa1") {
  if (!rows || rows.length === 0) return;

  const sheet = XLSX.utils.json_to_sheet(rows);

  // Sütun genişliklerini içeriğe göre otomatik ayarla
  const genislikler = Object.keys(rows[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  sheet["!cols"] = genislikler;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sayfaAdi);

  const tarih = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${dosyaAdi}-${tarih}.xlsx`);
}
