chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadImage" && request.url) {
    const url = request.url;
    chrome.downloads.download(
      {
        url: url,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.warn("Download error:", chrome.runtime.lastError.message);
        }
      }
    );
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTabId") {
    if (sender && sender.tab) {
      sendResponse(sender.tab.id);
    } else {
      sendResponse(null);
    }
  }

  if (request.action === "test") {
    console.log(request);
  }
});
