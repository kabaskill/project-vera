import { universalExtractor } from '../utils/extractor';
import type { ExtractedProduct } from '../types/product';

// Prevent double injection
if (window.__veraInjected) {
  console.log('[Vera] Already injected, skipping');
} else {
  window.__veraInjected = true;
  
  console.log('[Vera] Content script loaded on:', window.location.href);

  let lastDetectedUrl: string | null = null;
  let floatingButton: HTMLElement | null = null;
  let currentProduct: ExtractedProduct | null = null;

  /**
   * Create floating button to open extension
   */
  function createFloatingButton(product: ExtractedProduct) {
    // Remove existing button
    if (floatingButton) {
      floatingButton.remove();
    }

    currentProduct = product;

    // Create button container
    floatingButton = document.createElement('div');
    floatingButton.id = 'vera-floating-btn';
    floatingButton.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      animation: veraFadeIn 0.3s ease-out;
    `;

    // Add animation styles
    if (!document.getElementById('vera-btn-styles')) {
      const style = document.createElement('style');
      style.id = 'vera-btn-styles';
      style.textContent = `
        @keyframes veraFadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes veraFadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.8); }
        }
        #vera-floating-btn:hover #vera-tooltip {
          opacity: 1;
          transform: translateY(0);
        }
      `;
      document.head.appendChild(style);
    }

    const price = product.price.toFixed(2);
    const currency = product.currency || 'BRL';

    floatingButton.innerHTML = `
      <div style="position: relative;">
        <!-- Tooltip -->
        <div id="vera-tooltip" style="
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: 8px;
          background: hsl(0 0% 10%);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          white-space: nowrap;
          opacity: 0;
          transform: translateY(4px);
          transition: all 0.2s ease;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          <div style="font-weight: 600;">${product.name.substring(0, 40)}${product.name.length > 40 ? '...' : ''}</div>
          <div style="color: hsl(160 84% 50%);">${currency} ${price}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Click to compare prices</div>
        </div>
        
        <!-- Main Button -->
        <button id="vera-main-btn" style="
          background: linear-gradient(135deg, hsl(160 84% 39%), hsl(160 70% 35%));
          color: white;
          border: none;
          padding: 0 20px;
          height: 40px;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.5)'" 
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(16, 185, 129, 0.4)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Track with Vera
        </button>
      </div>
    `;

    document.body.appendChild(floatingButton);

    // Add click handler
    const mainBtn = floatingButton.querySelector('#vera-main-btn');
    mainBtn?.addEventListener('click', () => {
      openExtensionWithProduct(product);
    });
  }

  /**
   * Send product to background, auto-track it, and open extension popup
   */
  async function openExtensionWithProduct(product: ExtractedProduct) {
    try {
      // Send product to background and auto-track it
      await chrome.runtime.sendMessage({
        action: 'setCurrentProductAndTrack',
        product: {
          ...product,
          detectedAt: new Date().toISOString(),
        },
      });
      
      console.log('[Vera] Auto-tracking product:', product.name);
    } catch (error) {
      console.error('[Vera] Failed to open extension:', error);
    }
  }

  /**
   * Remove the floating button
   */
  function removeFloatingButton() {
    if (floatingButton) {
      floatingButton.style.animation = 'veraFadeOut 0.3s ease-out';
      setTimeout(() => {
        floatingButton?.remove();
        floatingButton = null;
        currentProduct = null;
      }, 300);
    }
  }

  /**
   * Extract product from current page
   */
  async function detectProduct() {
    const currentUrl = window.location.href;
    
    // Skip if same URL as last detection
    if (currentUrl === lastDetectedUrl && floatingButton) {
      return;
    }

    // Remove button if URL changed
    if (currentUrl !== lastDetectedUrl) {
      removeFloatingButton();
    }

    try {
      const product = universalExtractor.extract(document, currentUrl);
      
      if (product) {
        console.log('[Vera] Product detected:', product.name);
        lastDetectedUrl = currentUrl;
        
        // Show floating button
        createFloatingButton(product);
      } else {
        // No product found, remove button if exists
        removeFloatingButton();
        lastDetectedUrl = null;
      }
    } catch (error) {
      console.error('[Vera] Detection error:', error);
    }
  }

  // Detect on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(detectProduct, 1000);
    });
  } else {
    setTimeout(detectProduct, 1000);
  }

  // Listen for page changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      lastDetectedUrl = null;
      setTimeout(detectProduct, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    (async () => {
      try {
        switch (request.action) {
          case 'detect':
            const product = universalExtractor.extract(document, window.location.href);
            sendResponse({ 
              success: !!product, 
              data: product,
              url: window.location.href 
            });
            break;
            
          case 'ping':
            sendResponse({ 
              status: 'ok', 
              url: window.location.href,
              hasProduct: !!currentProduct
            });
            break;
            
          case 'getCurrentProduct':
            sendResponse({
              success: !!currentProduct,
              product: currentProduct,
            });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    })();
    
    return true;
  });
}

// Add TypeScript global declaration
declare global {
  interface Window {
    __veraInjected?: boolean;
  }
}
