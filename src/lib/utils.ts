import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(text: string): string {
  const mapping: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };
  let str = text || '';
  Object.keys(mapping).forEach(key => {
    str = str.replace(new RegExp(key, 'g'), mapping[key]);
  });
  return str.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function formatWaPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '90' + digits.substring(1);
  }
  if (digits.startsWith('90')) {
    return digits;
  }
  return '90' + digits;
}

export function openWhatsApp(phone: string, message: string): void {
  const formatted = formatWaPhone(phone);
  if (!formatted) return;
  const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

export function formatCurrency(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) || 0 : val || 0;
  return num.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

