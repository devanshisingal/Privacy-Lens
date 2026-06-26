const TRACKER_SIGNATURES = [
  "google-analytics.com",
  "doubleclick.net",
  "facebook.com/tr",
  "hotjar.com",
  "criteo.com",
  "taboola.com",
  "outbrain.com",
  "scorecardresearch.com",
  "quantserve.com",
  "googlesyndication.com"
];

let pageMetadata = {}; // tabId -> { domain, trackers: Set }

async function getOrCreateUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["userId"], (result) => {
      if (result.userId) {
        resolve(result.userId);
      } else {
        const newId = "user_" + Math.random().toString(36).substring(2, 15);
        chrome.storage.local.set({ userId: newId }, () => resolve(newId));
      }
    });
  });
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const isTracker = TRACKER_SIGNATURES.some(sig => details.url.includes(sig));
    
    if (isTracker) {
      if (!pageMetadata[details.tabId]) {
        pageMetadata[details.tabId] = { trackers: new Set(), domain: "" };
      }
      
      const trackerName = TRACKER_SIGNATURES.find(sig => details.url.includes(sig));
      pageMetadata[details.tabId].trackers.add(trackerName);

      const count = pageMetadata[details.tabId].trackers.size;
      chrome.action.setBadgeText({ text: count.toString(), tabId: details.tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: details.tabId });
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    // Reset on new page load
    try {
      const url = new URL(tab.url);
      if (url.protocol.startsWith("http")) {
        pageMetadata[tabId] = { domain: url.hostname, trackers: new Set() };
        chrome.action.setBadgeText({ text: "", tabId });
      }
    } catch(e) {}
  }

  if (changeInfo.status === "complete" && tab.url) {
    if (!tab.url.startsWith("http")) return;
    try {
      const domain = new URL(tab.url).hostname;
      if (domain === "localhost" || domain === "127.0.0.1") return;

      const userId = await getOrCreateUserId();
      const trackersDetected = pageMetadata[tabId]?.trackers ? Array.from(pageMetadata[tabId].trackers) : [];

      // Send to backend
      const response = await fetch("http://localhost:3000/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, userId, realTrackers: trackersDetected })
      });

      if (response.ok) {
        const data = await response.json();
        const currentRisk = data.predictions?.risk?.score || 0;
        
        // Show notification if trackers detected
        if (trackersDetected.length > 0) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png', // Generic icon
            title: 'PrivacyLens Observatory',
            message: `Detected ${trackersDetected.length} active trackers on ${domain}.\nYour algorithmic risk score is now ${currentRisk}.`
          });
        }
      }
    } catch (err) {
      console.error("PrivacyLens tracking error:", err);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete pageMetadata[tabId];
});