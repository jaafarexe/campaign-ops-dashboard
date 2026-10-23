/**
 * Formatters and helpers for Arabic presentation
 */

export function formatArabicDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatNumberArabic(num: number | undefined): string {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('ar-EG').format(num);
}

export function calculateDuration(cutIn: string, cutOut: string): string {
  const parseSeconds = (t: string) => {
    const parts = t.trim().split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    } else if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    return 0;
  };

  const startSec = parseSeconds(cutIn);
  const endSec = parseSeconds(cutOut);
  const diff = endSec - startSec;

  if (diff <= 0) return 'غير محدد';
  const m = Math.floor(diff / 60);
  const s = diff % 60;

  if (m === 0) return `${s} ثانية`;
  if (s === 0) return `${m} دقيقة`;
  return `${m} د و ${s} ث`;
}

export function getYouTubeEmbedOrUrl(url: string, cutIn?: string): string {
  if (!url) return '';
  try {
    // If cutIn is provided (e.g. 01:23), compute start parameter in seconds
    let startSec = 0;
    if (cutIn) {
      const parts = cutIn.trim().split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2) {
        startSec = (parts[0] || 0) * 60 + (parts[1] || 0);
      }
    }

    if (startSec > 0) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${startSec}s`;
    }
    return url;
  } catch {
    return url;
  }
}
