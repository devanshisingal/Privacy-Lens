document.addEventListener('DOMContentLoaded', async () => {
  // Query active tab
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    if (!tabs[0]) return;
    
    // Get background page
    const bgPage = chrome.extension.getBackgroundPage();
    if (bgPage && bgPage.pageMetadata && bgPage.pageMetadata[tabs[0].id]) {
      const metadata = bgPage.pageMetadata[tabs[0].id];
      const trackerCount = metadata.trackers ? metadata.trackers.size : 0;
      document.getElementById('trackerCount').innerText = trackerCount.toString();
    }
    
    // Get latest risk score from backend
    try {
      const userId = await new Promise((resolve) => {
        chrome.storage.local.get(["userId"], (result) => resolve(result.userId));
      });
      
      const response = await fetch(`http://localhost:3000/api/risk?userId=${userId || 'user_devanshi1896'}`);
      if (response.ok) {
        const data = await response.json();
        document.getElementById('riskScore').innerText = data.score.toString();
      }
    } catch (e) {
      console.log("Could not fetch risk score", e);
    }
  });
});
