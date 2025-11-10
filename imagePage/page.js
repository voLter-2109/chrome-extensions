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

  const checkLoadingZip = document.getElementById("checkLoadingZip");

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

  function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function startDownload(urls) {
    for (let i = 0; i < urls.length; i++) {
      try {
        await chrome.downloads.download({
          url: urls[i],
          conflictAction: "uniquify",
        });
        // Ждём   секунды между скачиваниями, КРОМЕ последнего
        if (i < urls.length - 1) {
          await delay(500);
        }
      } catch (error) {
        console.error(`Ошибка загрузки: ${urls[i]}`, error);
      }
    }

    toggleCheckedSelectItem(false);
    return toggleDisabledBtn();
  }

  async function downloadImagesAsZip(urls, statusEl = null) {
    const zip = new JSZip();
    let counter = 1;

    // Функция статуса
    const setStatus = (msg) => {
      if (statusEl) statusEl.textContent = msg;
      console.log(msg);
    };

    // Загрузка всех картинок
    for (const url of urls) {
      try {
        setStatus(`Скачивается (${counter}/${urls.length})`);
        const response = await fetch(url);
        const blob = await response.blob();
        const ext = url.split(".").pop().split(/\#|\?/)[0];
        const fileName = `image${counter}.${ext || "jpg"}`;
        zip.file(fileName, blob);
        counter++;
      } catch (e) {
        setStatus(`Ошибка загрузки: ${url}`);
        console.error("Ошибка при загрузке", url, e);
      }
    }

    // Индикатор упаковки ZIP
    setStatus("Упаковка в ZIP...");
    const content = await zip.generateAsync(
      { type: "blob" },
      // onUpdate - покажет прогресс %
      ({ percent }) => {
        let p = Math.round(percent);
        setStatus(`Упаковка в ZIP: ${p}%`);
      }
    );

    // Скачивание
    setStatus("Скачивание ZIP...");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = new Date().getTime();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);

    setStatus("Готово!");

    // Сообщаем о завершении массовой загрузки
    toggleCheckedSelectItem(false);
    return toggleDisabledBtn();
  }

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

    if (urls.length && checkLoadingZip.checked)
      downloadImagesAsZip(urls, document.getElementById("status"));
    if (urls.length && !checkLoadingZip.checked) startDownload(urls);
  });

  // Получение активной вкладки текущего окна
  function getActiveTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        if (tabs.length > 0) {
          resolve(tabs[0]);
        } else {
          reject("No active tabs");
        }
      });
    });
  }

  window.addEventListener("DOMContentLoaded", async () => {
    // 1. Получаем параметры текущего URL (location.search)
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get("uuid");
    if (!uuid) return; // Ничего не делать, если uuid не найден

    const tab = await getActiveTab();

    // 2. Достаем данные из storage по uuid
    chrome.storage.local.get([uuid], function (result) {
      const data = result[uuid];

      if (data && Array.isArray(data.urls) && data.urls.length) {
        addImagesToContainer(data.urls);

        chrome.storage.local.get([uuid], function (result) {
          chrome.storage.local.set({
            [uuid]: {
              ...(result[uuid] || {}),
              windowId: tab.windowId,
            },
          });
        });
      }
    });
  });
})();
