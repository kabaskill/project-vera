/**
 * GTIN/EAN validation utilities
 * Supports GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN), GTIN-14
 */

export function validateGtin(gtin: string): boolean {
  if (!gtin || typeof gtin !== 'string') return false;
  
  // Remove any non-numeric characters
  const cleaned = gtin.replace(/\D/g, '');
  
  // Check length (GTIN can be 8, 12, 13, or 14 digits)
  if (![8, 12, 13, 14].includes(cleaned.length)) {
    return false;
  }
  
  // Validate checksum using Luhn algorithm
  return validateLuhnChecksum(cleaned);
}

export function validateEan(ean: string): boolean {
  // EAN is typically EAN-13, but validation is same as GTIN
  return validateGtin(ean);
}

function validateLuhnChecksum(digits: string): boolean {
  let sum = 0;
  let isEven = false;
  
  // Iterate from right to left
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
  
  // Validate the cleaned GTIN
  if (validateGtin(cleaned)) {
    return cleaned;
  }
  
  return null;
}

export function extractGtinFromText(text: string): string | null {
  // Look for GTIN patterns in text
  // Common patterns: 13-digit EAN, 12-digit UPC, 14-digit GTIN-14
  const patterns = [
    /\b(\d{14})\b/,  // GTIN-14
    /\b(\d{13})\b/,  // EAN-13
    /\b(\d{12})\b/,  // UPC-A
    /\b(\d{8})\b/,   // GTIN-8
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && validateGtin(match[1])) {
      return match[1];
    }
  }
  
  return null;
}

export function formatGtin(gtin: string): string {
  const cleaned = gtin.replace(/\D/g, '');
  
  // Format based on length
  switch (cleaned.length) {
    case 8:
      return cleaned; // GTIN-8
    case 12:
      return cleaned; // GTIN-12 (UPC)
    case 13:
      return cleaned; // GTIN-13 (EAN-13)
    case 14:
      return cleaned; // GTIN-14
    default:
      return cleaned;
  }
}

/**
 * Check if a GTIN is likely valid based on length and prefix
 * This is a quick check before full validation
 */
export function isLikelyGtin(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const cleaned = value.replace(/\D/g, '');
  
  // Check length
  if (![8, 12, 13, 14].includes(cleaned.length)) {
    return false;
  }
  
  // Check if all digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }
  
  // Common GS1 prefixes
  const gs1Prefixes = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const prefix = cleaned.substring(0, 2);
  
  return gs1Prefixes.some(p => cleaned.startsWith(p));
}
