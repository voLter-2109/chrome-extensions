(function () {
  "use strict";

  const downloadBtn = document.getElementById("downloadBtn");
  const selectAllBtn = document.getElementById("selectAllBtn");
  const container = document.querySelector(".container");

  const preview = document.querySelector(".image-shower-main-window");
  const viewerImgElement = preview.querySelector("#image-shower-img-element");
  const body = document.body;

  const totalImage = document.getElementById("totalImage");
  const selectImage = document.getElementById("selectImage");

  const db = {
    totalImage: 0,
    selectImage: 0,
  };

  // Или, если это по какому-либо действию:
  preview.addEventListener("classChangeOrOpenEvent", () => {
    if (preview.classList.contains("open")) {
      body.classList.add("modal-open");
    } else {
      body.classList.remove("modal-open");
    }
  });

  preview.addEventListener("click", (event) => {
    event.target.classList.remove("open");
  });

  /**
   * создаем разметку для каждого изображения
   * и добавляет его в родительский container.
   * Создаваемый блок содержит само изображение и check
   * @param {*} url - URL изображения
   */
  function addImageNode(url) {
    container.insertAdjacentHTML(
      "beforeend",
      `
    <div class="image-container">
      <img alt="photo" src="${url}" />
      <div class="control-panel-image">
        <div class="checkbox-wrapper-2">
          <input type="checkbox" data-url="${url}" class="image-container-checkbox sc-gJwTLC ikxBAC" />
        </div>
        <button
          data-url="${url}"
          type="button"
          class="download-one-image"
        >download</button>
      </div>
    </div>
    `
    );
    // навешиваем обработчик на все добавленные кнопки
    const btns = container.querySelectorAll(".download-one-image");
    const btn = btns[btns.length - 1];
    btn.addEventListener("click", function () {
      chrome.downloads.download({ url: url });
    });

    // навешиваем обработчик на все добавленные кнопки
    const images = container.querySelectorAll(".image-container img");
    const image = images[images.length - 1];
    image.addEventListener("click", function () {
      preview.classList.add("open");
      viewerImgElement.src = url;
    });

    // навешиваем обработчик на все добавленные чекбокс
    const checkBoxImages = container.querySelectorAll(
      ".image-container-checkbox"
    );
    const checkBoxImage = checkBoxImages[checkBoxImages.length - 1];
    checkBoxImage.addEventListener("change", function (event) {
      if (event.target.checked) db.selectImage += 1;
      else db.selectImage -= 1;

      if (db.selectImage === db.totalImage)
        selectAllBtn.textContent = "Remove all";
      else selectAllBtn.textContent = "Select all";

      selectImage.textContent = db.selectImage;
    });
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

    console.log(urls);
    db.totalImage = urls.length;
    totalImage.textContent = db.totalImage;
    try {
      urls.forEach((url) => {
        addImageNode(url);
      });
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
      .map((item) => item.getAttribute("data-url"));

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

  window.addEventListener("DOMContentLoaded", () => {
    // 1. Получаем параметры текущего URL (location.search)
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get("uuid");
    if (!uuid) return; // Ничего не делать, если uuid не найден

    // 2. Достаем данные из storage по uuid
    chrome.storage.local.get([uuid], function (result) {
      const data = result[uuid];
      if (data && Array.isArray(data.urls) && data.urls.length) {
        addImagesToContainer(data.urls);
      }
    });
  });

  // Обработчик сообщений
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // if (isInitialized) return; // блокируем повтор
    // if (request.action === "addImagesToContainer on new tab") {
    //   isInitialized = true;
    //   return addImagesToContainer(request.urls);
    // }
    if (request.action === "finishLoading") {
      toggleCheckedSelectItem(false);
      return toggleDisabledBtn();
    }
  });
})();
