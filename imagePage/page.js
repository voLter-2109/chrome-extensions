const progressBar = document.getElementById("progressBar");
const statusBar = document.getElementById("status");
const downloadBtn = document.getElementById("downloadBtn");
const selectAll = document.getElementById("selectAll");

function handleProgressBar(total, current) {
  if (!total || !current) {
    progressBar.value = 0;
    statusBar.textContent = `Готово)`;
    return;
  }

  const progressPercent = Math.round((current / total) * 100);
  progressBar.value = progressPercent;
  statusBar.textContent = `Status Loading: ${current} on ${total}`;
}

// Обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "createNewTab") {
    sendResponse({
      response: "createNewTab",
    });
    return addImagesToContainer(request.urls);
  }

  if (request.action === "changeProgressBar") {
    sendResponse({
      response: "changeProgressBar",
    });
    return handleProgressBar(request.total, request.current);
  }

  if (request.action === "unDisabledOneBtn") {
    sendResponse({
      response: "unDisabledOneBtn",
    });
    return (downloadBtn.disabled = false);
  }

  if (request.action === "finishLoading") {
    const items = document.querySelectorAll(".container input");
    for (let item of items) {
      item.checked = false;
    }
    sendResponse({
      response: "finishLoading",
    });
  }

  sendResponse({
    response: "not Found",
  });
  return true;
});

/**
 * Функция, генерирует HTML-разметку
 * списка изображений
 * @param {} urls - Массив путей к изображениям
 */
function addImagesToContainer(urls) {
  console.log(urls);
  if (!urls || !urls.length) {
    return;
  }
  const container = document.querySelector(".container");
  urls.forEach((url) => addImageNode(container, url));
}

/**
 * Функция создает элемент DIV для каждого изображения
 * и добавляет его в родительский DIV.
 * Создаваемый блок содержит само изображение и флажок
 * чтобы его выбрать
 * @param {*} container - родительский DIV
 * @param {*} url - URL изображения
 */
function addImageNode(container, url) {
  const div = document.createElement("div");
  div.className = "imageDiv";
  container.appendChild(div);

  const img = document.createElement("img");
  img.src = url;
  div.appendChild(img);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("url", url);
  div.appendChild(checkbox);

  const saveOneBtn = document.createElement("button");
  saveOneBtn.setAttribute("type", "button");
  saveOneBtn.className = "downloadOnes";
  saveOneBtn.textContent = "save";
  saveOneBtn.setAttribute("url", url);
  saveOneBtn.addEventListener("click", () => {
    chrome.downloads.download({ url: url });
  });
  div.appendChild(saveOneBtn);
}

/**
 * Обработчик события "onChange" флажка Select All
 * Включает/выключает все флажки картинок
 */
selectAll.addEventListener("change", (event) => {
  const items = document.querySelectorAll(".container input");
  for (let item of items) {
    item.checked = event.target.checked;
  }
});

/**
 * Функция возвращает список URL всех выбранных картинок
 * @returns Array Массив путей к картинкам
 */
function getSelectedUrls() {
  const urls = Array.from(document.querySelectorAll(".container input"))
    .filter((item) => item.checked)
    .map((item) => item.getAttribute("url"));
  console.log("urls getSelectedUrls", urls);
  if (!urls || !urls.length) {
    throw new Error("Please, select at least one image");
  }
  return urls;
}

const statusLoading = {
  start: "Start",
  pause: "Pause",
  cancel: "Cancel",
  def: null,
};

/**
 * Обработчик события "onClick" кнопки Download.
 * собирает все выбранные картинки в url и скачивает их
 */
downloadBtn.addEventListener("click", () => {
  const urls = getSelectedUrls();
  console.log("click downloadBtn", urls);
  downloadBtn.disabled = true;
  chrome.runtime.sendMessage({
    action: statusLoading.start,
    urls: urls,
  });
});

// UI управление
document.getElementById("pauseBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: statusLoading.pause });
});

document.getElementById("resumeBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: statusLoading.start });
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: statusLoading.cancel, urls: [] });
});
