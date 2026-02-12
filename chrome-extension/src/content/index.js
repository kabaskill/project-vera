/**
 * Content Script - Runs on all pages
 * Extracts product data and communicates with popup/background
 */

(function() {
  'use strict';

  // Prevent double injection
  if (window.__productTrackerInjected) return;
  window.__productTrackerInjected = true;

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract') {
      const result = extractProduct();
      sendResponse(result);
    } else if (request.action === 'ping') {
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  /**
   * Extract product data from current page
   */
  function extractProduct() {
    try {
      const html = document.documentElement.outerHTML;
      const url = window.location.href;
      
      // Check if universalExtractor is available
      if (typeof universalExtractor === 'undefined') {
        console.error('[Content Script] Universal extractor not loaded');
        return { 
          success: false, 
          error: 'Extractor not loaded',
          url: url
        };
      }

      const extractedData = universalExtractor.extract(html, url);
      
      if (!extractedData) {
        return { 
          success: false, 
          error: 'No product data found on this page',
          url: url
        };
      }

      return {
        success: true,
        data: extractedData,
        url: url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Content Script] Extraction error:', error);
      return {
        success: false,
        error: error.message,
        url: window.location.href
      };
    }
  }

  // Auto-extract on page load (for debugging)
  console.log('[Product Tracker] Content script loaded on:', window.location.href);
})();
