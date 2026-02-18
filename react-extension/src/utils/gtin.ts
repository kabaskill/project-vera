/**
 * GTIN/EAN validation utilities
 * Supports GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN), GTIN-14
 */

export function validateGtin(gtin: string): boolean {
  if (!gtin || typeof gtin !== 'string') return false;
  
  const cleaned = gtin.replace(/\D/g, '');
  
  if (![8, 12, 13, 14].includes(cleaned.length)) {
    return false;
  }
  
  return validateLuhnChecksum(cleaned);
}

function validateLuhnChecksum(digits: string): boolean {
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]!, 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

export function cleanGtin(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const cleaned = String(value).replace(/\D/g, '');
  
  if (validateGtin(cleaned)) {
    return cleaned;
  }
  
  return null;
}

export function extractGtinFromText(text: string): string | null {
  const patterns = [
    /\b(\d{14})\b/,
    /\b(\d{13})\b/,
    /\b(\d{12})\b/,
    /\b(\d{8})\b/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && validateGtin(match[1])) {
      return match[1];
    }
  }
  
  return null;
}
