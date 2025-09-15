export const statusLoading = {
  start: "Start",
  pause: "Pause",
  cancel: "Cancel",
  def: null,
};

// Состояние загрузки
let downloadState = {
  status: statusLoading.def,
  currentIndex: 0,
  totalFiles: 0,
  urls: [],
};

// Обработчик сообщений из контент-скриптов
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("request", request);
  downloadState = {
    ...downloadState,
    status: request.action,
    urls: request?.urls || downloadState.urls,
    totalFiles: request?.urls.length || downloadState.totalFiles,
  };
  console.log("downloadState", downloadState);
  startDownload(request.action);
  sendResponse({
    response: "createNewTab",
  });
  return true;
});

// Сброс состояния
function resetDownloadState() {
  downloadState = {
    status: statusLoading.def,
    currentIndex: 0,
    totalFiles: 0,
    urls: [],
  };

  chrome.runtime.sendMessage({
    action: "changeProgressBar",
    total: 0,
    current: 0,
  });

  chrome.runtime.sendMessage({
    action: "unDisabledOneBtn",
    disabled: false,
  });
}

// _____________________________________
// Добавьте параметр задержки (в миллисекундах)
// const DELAY_MS = 1000; // 1 секунда между итерациями

// async function processDownloads() {
//   for (let i = downloadState.currentIndex; i < downloadState.urls.length; i++) {
//     // Прерывание при изменении статуса
//     if (downloadState.status !== statusLoading.start) break;

//     // Обработка текущего элемента
//     try {
//       chrome.runtime.sendMessage({
//         action: "changeProgressBar",
//         total: downloadState.totalFiles,
//         current: downloadState.currentIndex + 1,
//       });
//       downloadState.currentIndex = i + 1;
//     } catch (error) {
//       console.error(`Ошибка загрузки: ${downloadState.urls[i]}`, error);
//     }

//     // Пауза перед следующей итерацией
//     await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
//   }
// }

// _____________________________________

// Основная функция загрузки
async function startDownload(action) {
  if (!downloadState.status) return;

  if (action === statusLoading.cancel) {
    resetDownloadState();
  }

  if (action === statusLoading.pause) {
    downloadState.status = statusLoading.pause;
  }

  for (let i = downloadState.currentIndex; i < downloadState.urls.length; i++) {
    if (downloadState.status !== statusLoading.start) {
      break;
    }

    try {
      // Выполняем загрузку
      await chrome.downloads.download({ url: downloadState.urls[i] });
      chrome.runtime.sendMessage({
        action: "changeProgressBar",
        total: downloadState.totalFiles,
        current: downloadState.currentIndex + 1,
      });
      downloadState.currentIndex = i + 1;

      if (downloadState.currentIndex === downloadState.urls.length) {
        chrome.runtime.sendMessage({
          action: "unDisabledOneBtn",
          disabled: false,
        });
        chrome.runtime.sendMessage({
          action: "changeProgressBar",
          total: 0,
          current: 0,
        });

        chrome.runtime.sendMessage({
          action: "finishLoading",
        });
      }
    } catch (error) {
      console.error(`Ошибка загрузки: ${downloadState.urls[i]}`, error);
    }
  }
}
