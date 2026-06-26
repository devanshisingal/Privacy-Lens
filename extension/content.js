console.log("[PrivacyLens Extension] Content script loaded.");

// Get userId from background script
chrome.runtime.sendMessage({ type: "GET_USER_ID" }, (response) => {
  if (response && response.userId) {
    const extUserId = response.userId;
    console.log("[PrivacyLens Extension] Synced user ID from extension storage:", extUserId);
    
    // Save to page's localStorage
    localStorage.setItem("privacylens_user_id", extUserId);
    
    // Dispatch a custom event so the React application knows the ID is ready / synced
    window.dispatchEvent(new CustomEvent("privacylens_id_synced", { detail: extUserId }));
  }
});

// Periodically check if the page's localStorage userId has changed (e.g. if the user manually switched)
// and sync it back to extension storage.
let lastUserId = localStorage.getItem("privacylens_user_id");
setInterval(() => {
  const currentUserId = localStorage.getItem("privacylens_user_id");
  if (currentUserId && currentUserId !== lastUserId) {
    lastUserId = currentUserId;
    console.log("[PrivacyLens Extension] User switched ID on webpage, syncing to extension:", currentUserId);
    chrome.runtime.sendMessage({ type: "SET_USER_ID", userId: currentUserId });
  }
}, 1000);
