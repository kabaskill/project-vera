/**
 * Popup Script - Handles UI interactions and API communication
 */

(function () {
  "use strict";

  // Hardcoded API URL
  const API_URL = "http://localhost:3000/api/v1/products/extension";

  // State
  let currentProduct = null;
  let currentUrl = null;

  // DOM Elements
  const elements = {
    loading: document.getElementById("loading"),
    productFound: document.getElementById("product-found"),
    noProduct: document.getElementById("no-product"),
    success: document.getElementById("success"),
    error: document.getElementById("error"),
    initial: document.getElementById("initial"),

    // Product elements
    productImg: document.getElementById("product-img"),
    productName: document.getElementById("product-name"),
    productBrand: document.getElementById("product-brand"),
    productPrice: document.getElementById("product-price"),
    productCurrency: document.getElementById("product-currency"),
    productSku: document.getElementById("product-sku"),
    productGtin: document.getElementById("product-gtin"),

    // Error
    errorMessage: document.getElementById("error-message"),

    // Buttons
    btnExtract: document.getElementById("btn-extract"),
    btnTrack: document.getElementById("btn-track"),
    btnRefresh: document.getElementById("btn-refresh"),
    btnView: document.getElementById("btn-view"),
    btnTrackAnother: document.getElementById("btn-track-another"),
    btnRetry: document.getElementById("btn-retry"),
    btnExpand: document.getElementById("btn-expand"),
  };

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    // Auto-extract on popup open
    extractProduct();
  });

  function setupEventListeners() {
    elements.btnExtract.addEventListener("click", extractProduct);
    elements.btnTrack.addEventListener("click", trackProduct);
    elements.btnRefresh.addEventListener("click", extractProduct);
    elements.btnTrackAnother.addEventListener("click", () => showState("initial"));
    elements.btnRetry.addEventListener("click", extractProduct);
    elements.btnExpand.addEventListener("click", openInWindow);
  }

  function showState(stateName) {
    // Hide all states
    Object.values(elements).forEach((el) => {
      if (el && el.classList && el.classList.contains("state")) {
        el.classList.add("hidden");
      }
    });

    // Show requested state
    const stateMap = {
      loading: elements.loading,
      product: elements.productFound,
      noProduct: elements.noProduct,
      success: elements.success,
      error: elements.error,
      initial: elements.initial,
    };

    if (stateMap[stateName]) {
      stateMap[stateName].classList.remove("hidden");
    }
  }

  async function extractProduct() {
    showState("loading");

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        showError("No active tab found");
        return;
      }

      currentUrl = tab.url;

      // Inject content script if needed and extract data
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // This runs in the page context
          if (typeof universalExtractor === "undefined") {
            return { success: false, error: "Extractor not available" };
          }

          const html = document.documentElement.outerHTML;
          const url = window.location.href;
          const data = universalExtractor.extract(html, url);

          if (!data) {
            return { success: false, error: "No product found" };
          }

          return { success: true, data, url };
        },
      });

      const result = results[0]?.result;

      if (!result) {
        showError("Failed to extract product data");
        return;
      }

      if (!result.success) {
        showState("noProduct");
        return;
      }

      currentProduct = result.data;
      currentUrl = result.url;

      displayProduct(result.data);
      showState("product");
    } catch (err) {
      console.error("Extraction error:", err);
      showError("Failed to extract product: " + (err.message || String(err)));
    }
  }

  function displayProduct(product) {
    // Set image
    if (product.imageUrl) {
      elements.productImg.src = product.imageUrl;
      elements.productImg.style.display = "block";
    } else {
      elements.productImg.style.display = "none";
    }

    // Set text content
    elements.productName.textContent = product.name || "Unknown Product";
    elements.productBrand.textContent = product.brand || "";
    elements.productBrand.style.display = product.brand ? "block" : "none";

    // Format price
    if (product.price) {
      elements.productPrice.textContent = product.price.toFixed(2);
      elements.productCurrency.textContent = product.currency || "BRL";
    } else {
      elements.productPrice.textContent = "N/A";
      elements.productCurrency.textContent = "";
    }

    // Set meta info
    elements.productSku.textContent = product.sku ? "SKU: " + product.sku : "";
    elements.productSku.style.display = product.sku ? "inline-block" : "none";

    elements.productGtin.textContent = product.gtin ? "GTIN: " + product.gtin : "";
    elements.productGtin.style.display = product.gtin ? "inline-block" : "none";
  }

  async function trackProduct() {
    if (!currentProduct || !currentUrl) {
      showError("No product to track");
      return;
    }

    showState("loading");

    try {
      // Convert null values to undefined for API compatibility
      // Zod .optional() doesn't accept null, only undefined or the value
      const cleanProduct = {
        name: currentProduct.name,
        price: currentProduct.price,
      };

      if (currentProduct.brand) cleanProduct.brand = currentProduct.brand;
      if (currentProduct.currency) cleanProduct.currency = currentProduct.currency;
      if (currentProduct.gtin) cleanProduct.gtin = currentProduct.gtin;
      if (currentProduct.ean) cleanProduct.ean = currentProduct.ean;
      if (currentProduct.sku) cleanProduct.sku = currentProduct.sku;
      if (currentProduct.imageUrl) cleanProduct.imageUrl = currentProduct.imageUrl;
      if (currentProduct.availability !== undefined)
        cleanProduct.availability = currentProduct.availability;
      if (currentProduct.description) cleanProduct.description = currentProduct.description;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: currentUrl,
          extractedData: cleanProduct,
        }),
      });

      if (!response.ok) {
        let errorMsg = "HTTP " + response.status;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (e) {
          // Ignore parse error
        }
        showError("Server error: " + errorMsg);
        return;
      }

      const data = await response.json();

      if (data.job_id) {
        showState("success");
        // Save job ID for tracking
        chrome.storage.local.set({
          ["job_" + data.job_id]: {
            url: currentUrl,
            product: currentProduct,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        showError("Invalid response from server");
      }
    } catch (err) {
      console.error("Track error:", err);
      showError("Failed to track product: " + (err.message || String(err)));
    }
  }

  function showError(message) {
    elements.errorMessage.textContent = message;
    showState("error");
  }

  function openInWindow() {
    const popupUrl = chrome.runtime.getURL("src/popup/popup.html");
    chrome.windows.create({
      url: popupUrl,
      type: "popup",
      width: 600,
      height: 800,
    });
  }
})();
