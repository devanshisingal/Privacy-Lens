async function getOrCreateUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["userId"], (result) => {
      if (result.userId) {
        resolve(result.userId);
      } else {
        const newId = "user_" + Math.random().toString(36).substring(2, 15);
        chrome.storage.local.set({ userId: newId }, () => {
          resolve(newId);
        });
      }
    });
  });
}

// Listen for messages from the content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_USER_ID") {
    getOrCreateUserId().then((userId) => {
      sendResponse({ userId });
    });
    return true; // Keep message channel open for async response
  }
  if (request.type === "SET_USER_ID") {
    const newId = request.userId || "user_" + Math.random().toString(36).substring(2, 15);
    chrome.storage.local.set({ userId: newId }, () => {
      sendResponse({ userId: newId });
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener(
  async (tabId, changeInfo, tab) => {

    if (changeInfo.status !== "complete")
      return;

    if (!tab.url)
      return;

    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:")
    ) {
      return;
    }

    try {

      const url = new URL(tab.url);

      const domain = url.hostname;

      if (
        !domain ||
        domain === "localhost" ||
        domain === "newtab"
      ) {
        return;
      }

      const userId = await getOrCreateUserId();

      const response = await fetch(
        "http://localhost:3000/api/history",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            domain,
            userId
          })
        }
      );

      if (!response.ok) {
        console.error(
          "Backend returned:",
          response.status
        );
      }

    } catch (err) {
      console.error(
        "PrivacyLens tracking error:",
        err
      );
    }
  }
);