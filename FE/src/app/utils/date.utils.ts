// Định dạng ngày theo giờ địa phương (yyyy-MM-dd), tránh lệch ngày do toISOString() dùng UTC
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// "2026-10-08" -> "Thứ năm, 08/10/2026" (kèm "Hôm nay"/"Ngày mai" nếu phù hợp)
export function formatDayTitle(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const label = date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const today = new Date();
  if (isoDate === toIsoDate(today)) return 'Hôm nay - ' + label;
  if (isoDate === toIsoDate(addDays(today, 1))) return 'Ngày mai - ' + label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
