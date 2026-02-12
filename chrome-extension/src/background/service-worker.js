/**
 * Background Service Worker
 * Handles background tasks, API communication, and job tracking
 */

// Configuration
const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

// Install event - extension installed/updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed:', details.reason);
  
  // Set default API URL
  chrome.storage.local.set({
    apiUrl: DEFAULT_API_URL,
    installedAt: new Date().toISOString()
  });
});

// Message handler for communication with content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'submitProduct':
          const result = await submitProduct(request.data);
          sendResponse({ success: true, data: result });
          break;
          
        case 'checkJobStatus':
          const status = await checkJobStatus(request.jobId);
          sendResponse({ success: true, data: status });
          break;
          
        case 'getTrackedProducts':
          const products = await getTrackedProducts();
          sendResponse({ success: true, data: products });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Background] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep channel open for async
});

/**
 * Submit product data to backend
 */
async function submitProduct(data) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl');
  const url = `${apiUrl}/products/extension`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Check job status
 */
async function checkJobStatus(jobId) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl');
  const url = `${apiUrl}/products/jobs/${jobId}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get tracked products from storage
 */
async function getTrackedProducts() {
  const allData = await chrome.storage.local.get(null);
  const products = [];
  
  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('job_')) {
      products.push({
        jobId: key.replace('job_', ''),
        ...value
      });
    }
  }
  
  return products.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}

// Periodic job status checking (every 5 minutes)
chrome.alarms?.create('checkJobs', { periodInMinutes: 5 });

chrome.alarms?.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkJobs') {
    await updateJobStatuses();
  }
});

/**
 * Update statuses of pending jobs
 */
async function updateJobStatuses() {
  try {
    const products = await getTrackedProducts();
    const pendingJobs = products.filter(p => !p.completed);
    
    for (const job of pendingJobs) {
      try {
        const status = await checkJobStatus(job.jobId);
        
        if (status.status === 'completed' || status.status === 'done') {
          await chrome.storage.local.set({
            [`job_${job.jobId}`]: {
              ...job,
              completed: true,
              productId: status.data?.product_id,
              completedAt: new Date().toISOString()
            }
          });
          
          // Show notification
          chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Product Tracked Successfully',
            message: `We've finished processing ${job.product.name}`
          });
        }
      } catch (error) {
        console.error(`[Background] Failed to check job ${job.jobId}:`, error);
      }
    }
  } catch (error) {
    console.error('[Background] Failed to update job statuses:', error);
  }
}

console.log('[Background] Service worker initialized');
