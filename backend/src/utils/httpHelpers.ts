// Rotate between several modern User-Agent strings
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
];

/**
 * Get randomized User-Agent string
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

/**
 * Get request headers for web scraping with anti-bot detection
 */
export function getScrapingHeaders(url: string): Record<string, string> {
  const userAgent = getRandomUserAgent();
  
  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
  };

  // Add Referer for specific sites to appear more legitimate
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes("amazon")) {
      headers["Referer"] = "https://www.google.com/";
    } else if (domain.includes("zalando")) {
      headers["Referer"] = "https://www.google.com/";
    } else if (domain.includes("casasbahia")) {
      headers["Referer"] = "https://www.google.com/";
    }
  } catch {
    // Invalid URL, skip referer
  }

  return headers;
}

/**
 * Fetch with automatic retries and anti-bot headers
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries: number = 2
): Promise<Response> {
  const headers = getScrapingHeaders(url);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers as Record<string, string> || {}),
        },
      });
      
      // If we get a 403, wait and retry with a different User-Agent
      if (response.status === 403 && attempt < maxRetries) {
        console.warn(`[fetchWithRetry] Got 403, retrying ${url} (attempt ${attempt + 1}/${maxRetries})`);
        await delay(1000 * (attempt + 1)); // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`[fetchWithRetry] Request failed, retrying ${url}:`, error);
      await delay(1000 * (attempt + 1));
    }
  }
  
  throw new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
