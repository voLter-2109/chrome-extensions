// Обработчик сообщений из контент-скриптов
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (
    request.action === "start download" &&
    request.urls &&
    request.urls.length
  ) {
    startDownload(request.urls);
  }
});

// Основная функция загрузки
async function startDownload(urls) {
  for (let i = 0; i < urls.length; i++) {
    if (i === urls.length - 1) {
      chrome.runtime.sendMessage({
        action: "finishLoading",
      });
    }
    try {
      // Выполняем загрузку
      await chrome.downloads.download({ url: urls[i] });
    } catch (error) {
      console.error(`Ошибка загрузки: ${urls[i]}`, error);
    }
  }
}

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
