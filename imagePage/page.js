const downloadBtn = document.getElementById("downloadBtn");
const selectAllBtn = document.getElementById("selectAllBtn");
const container = document.querySelector(".container");

const db = {
  totalImage: 0,
  selectImage: 0,
};

const totalImage = document.getElementById("totalImage");
const selectImage = document.getElementById("selectImage");

/**
 * создаем разметку для каждого изображения
 * и добавляет его в родительский container.
 * Создаваемый блок содержит само изображение и check
 * @param {*} url - URL изображения
 */
function addImageNode(url) {
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

  // обработчик изменения чекбокса
  checkbox.addEventListener("change", function () {
    if (checkbox.checked) {
      db.selectImage += 1;
    } else {
      db.selectImage -= 1;
    }

    if (db.totalImage !== db.selectImage) {
      selectAllBtn.textContent = "Select all";
    } else {
      selectAllBtn.textContent = "Remove all";
    }

    selectImage.textContent = db.selectImage;
  });

  const saveOneBtn = document.createElement("button");
  saveOneBtn.setAttribute("type", "button");
  saveOneBtn.className = "downloadOnes";
  saveOneBtn.textContent = "save";
  saveOneBtn.setAttribute("url", url);
  saveOneBtn.addEventListener("click", () => {
    chrome.downloads.download({ url: url });
  });
  div.appendChild(saveOneBtn);

  return null;
}

/**
 * Функция, генерирует HTML-разметку на новой открытой вкладке
 * на основе списка изображений
 * @param {} urls - Массив путей к изображениям
 */
function addImagesToContainer(urls) {
  if (!Array.isArray(urls)) {
    return console.log("incorrect data");
  }

  if (!urls || !urls.length) {
    return console.log("array urls empty");
  }

  db.totalImage = urls.length;
  totalImage.textContent = db.totalImage;
  try {
    urls.forEach((url) => addImageNode(url));
  } catch (e) {
    console.log(e.message);
  }
  return null;
}

/**
 * toggle disabled на кнопку скачивания
 * @returns
 */
function toggleDisabledBtn() {
  return (downloadBtn.disabled = !downloadBtn.disabled);
}
/**
 *
 * @returns ReactNode[]
 */
function getAllImage() {
  return document.querySelectorAll(".container input[type='checkbox']");
}

/**
 * снимает или удаляет все отметки на фотографиях
 * @param {boolean} statusCheck
 * @returns null
 */
function toggleCheckedSelectItem(statusCheck) {
  const items = getAllImage();
  for (let item of items) {
    if (item.checked !== statusCheck) {
      item.checked = statusCheck;
      // => Триггерим событие вручную!
      item.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

/**
 * Функция возвращает список URL всех выбранных картинок
 * @returns {string[]} Array Массив путей к картинкам
 */
function getSelectedUrls() {
  const urls = Array.from(getAllImage())
    .filter((item) => item.checked)
    .map((item) => item.getAttribute("url"));

  if (!urls || !urls.length) {
    throw new Error("Please, select at least one image");
  }
  toggleDisabledBtn();
  return urls;
}

/**
 * Обработчик события "onChange" флажка Select All
 * Включает/выключает все флажки картинок
 */
selectAllBtn.addEventListener("click", () => {
  if (db.totalImage === db.selectImage) {
    return toggleCheckedSelectItem(false);
  }

  return toggleCheckedSelectItem(true);
});

/**
 * Обработчик события "onClick" кнопки Download.
 * собирает все выбранные картинки в url и скачивает их
 */
downloadBtn.addEventListener("click", () => {
  const urls = getSelectedUrls();

  if (urls.length)
    chrome.runtime.sendMessage({
      action: "start download",
      urls: urls,
    });
});

// Обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addImagesToContainer on new tab") {
    return addImagesToContainer(request.urls);
  }

  if (request.action === "finishLoading") {
    toggleCheckedSelectItem(false);
    return toggleDisabledBtn();
  }
});
