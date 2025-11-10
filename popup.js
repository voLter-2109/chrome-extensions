(function () {
  "use strict";

  const showNewTabWithImage = document.getElementById("showSelectImage");
  const selectImage = document.getElementById("selectImage");
  const container = document.getElementById("preview");
  const vipergirls = document.getElementById("vipergirls");
  const selectSelector = document.getElementById("selectSelector");
  const scrollSelectImage = document.getElementById("scrollSelectImage");
  const getImageArray = document.getElementById("getImageArray");

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

  // Обработчик первой кнопки
  showNewTabWithImage.addEventListener("click", async () => {
    try {
      const tab = await getActiveTab();
      execScript(tab, "joyreactor", null);
    } catch (error) {
      alert(error);
    }
  });

  // Обработчик первой кнопки
  vipergirls.addEventListener("click", async () => {
    try {
      const tab = await getActiveTab();
      execScript(tab, "vipergirls", null);
    } catch (error) {
      alert(error);
    }
  });

  // Заготовка для второй кнопки
  selectImage.addEventListener("click", async () => {
    try {
      const tab = await getActiveTab();

      if (!tab) return alert("There are no active tabs");
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: trackMouseHover,
        })
        .then((res) => {
          console.log(res.results);
        });
    } catch (error) {
      alert(error);
    }
  });

  selectSelector.addEventListener("click", async () => {
    try {
      const tab = await getActiveTab();

      if (!tab) return alert("There are no active tabs");

      let selector = prompt("What's your selector?");

      if (selector !== null && selector.trim() !== "") {
        execScript(tab, "any", selector);
      } else console.log("don`t select selector");
    } catch (error) {
      alert(error);
    }
  });

  getImageArray.addEventListener("click", async () => {
    try {
      const tab = await getActiveTab();

      if (!tab) return alert("There are no active tabs");

      let array = prompt("What's your selector?");
      if (array && array.length) {
        openImagesPage(array);
      }
    } catch (error) {
      alert(error);
    }
  });

  // “Подписка” на изменения истории
  document.addEventListener("DOMContentLoaded", renderHistory);
  chrome.storage.onChanged.addListener((changes, area) => {
    chrome.runtime.sendMessage({ action: "test", data: "change" });
    if (area === "local") renderHistory();
  });

  // Фокусирует вкладку с полным совпадением url или создаёт новую
  function openOrFocusTab(url) {
    chrome.tabs.query({}, function (tabs) {
      // Ищем вкладку с ПОЛНЫМ совпадением url (строгое сравнение)
      const tab = tabs.find((t) => t.url === url);

      if (tab) {
        chrome.tabs.update(tab.id, { active: true }, function () {
          chrome.windows.update(tab.windowId, { focused: true });
        });
      } else {
        chrome.tabs.create({ url });
      }
    });
  }

  function renderHistory() {
    const historyDiv = document.querySelector(".bodyHistory");
    historyDiv.innerHTML = "loading...";

    // получаем все элементы
    chrome.storage.local.get(null, (allData) => {
      const items = Object.values(allData).filter((d) => d && d.urls.length);

      if (!items.length) {
        historyDiv.innerHTML = "history is empty";
        return;
      }

      // Кнопка для полной очистки
      const clearBtn = document.createElement("button");
      clearBtn.textContent = "clear all";
      clearBtn.onclick = function () {
        chrome.storage.local.clear(function () {
          if (chrome.runtime.lastError) {
            console.error(
              "Error clearing local storage:",
              chrome.runtime.lastError
            );
          } else {
            console.log("Local storage cleared successfully.");
          }
        });
      };

      historyDiv.innerHTML = null;

      // Отрисовка истории
      const list = document.createElement("ul");
      items.sort((a, b) => b.date - a.date);

      for (const item of items) {
        const row = document.createElement("li");

        const a = document.createElement("div");
        a.innerHTML = `${item.date}`;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          openOrFocusTab(item.site_name);
        });

        const del = document.createElement("button");
        del.textContent = "x";
        del.title = "delete";
        del.onclick = () => {
          chrome.storage.local.remove(item.uuid, renderHistory);
        };

        row.appendChild(a);
        row.appendChild(del);
        list.appendChild(row);
      }
      // Очищаем и добавляем список
      historyDiv.appendChild(list);
      historyDiv.appendChild(clearBtn);
    });
  }

  /*
/** Слушаем сообщения  и рендерим превью в окошке расширения
 */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "selectedImages") {
      container.innerHTML = "";
      request.selectedImages.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.style.maxWidth = "80px";
        img.style.margin = "5px";
        container.appendChild(img);
      });
    }
  });

  // навешивает слежение за селектором
  function trackUniqueImageUrls(selector) {
    const container = document.querySelector(selector);
    if (!container) {
      console.error("Элемент не найден по селектору:", selector);
      return;
    }

    const imageUrls = [];

    // Функция проверки новых <img>
    const updateImageUrls = () => {
      const imgs = container.querySelectorAll("img");
      imgs.forEach((img) => {
        const url = img.src;
        if (url && !imageUrls.includes(url)) {
          imageUrls.push(url);
          console.log("Новый url добавлен:", url);
        }
      });
    };

    // Сразу обрабатываем уже имеющиеся <img>
    updateImageUrls();

    // Отслеживаем изменения детей
    const observer = new MutationObserver((mutationsList) => {
      mutationsList.forEach(() => {
        updateImageUrls();
      });
    });

    observer.observe(container, { childList: true, subtree: true });

    // Для доступа к текущему массиву можно вернуть геттер или сам массив
    return {
      getUrls: () => [...imageUrls], // Копия массива
      disconnect: () => observer.disconnect(), // Остановить слежение
    };
  }

  /**
   * Добавляем обработчик движения мыши с задержкой (debounce)
   */
  function trackMouseHover() {
    /**
     * функция задержки
     * @param func {callback}
     * @param delay {number}
     */
    function debounce(func, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }

    // Основная функция обработки движения мыши
    const handleMouseMove = debounce((event) => {
      if (event.target && event.target.tagName === "IMG") {
        chrome.runtime.sendMessage({
          action: "selectedImages",
          selectedImages: [
            ...document.querySelectorAll(`.${event.target.classList[0]}`),
          ].map((i) => i.src),
        });
        return null;
      }

      return null;
    }, 100); // Задержка в миллисекундах

    // Добавляем обработчик на всю страницу
    document.addEventListener("mouseover", handleMouseMove);
  }

  /**
   * Выполняет функцию grabImages() на веб-странице указанной
   * вкладки и во всех ее фреймах,
   * @param tab {Tab} Объект вкладки браузера
   */
  function execScript(tab, siteName, selector) {
    // Выполнить функцию на странице указанной вкладки
    // и передать результат ее выполнения в функцию onResult
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: grabImages,
        args: [siteName, selector],
      })
      .then((injectionResults) => {
        onResult(injectionResults);
      });
  }

  async function blobUrlToBase64(blobUrl) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Получает список абсолютных путей всех картинок
   * на удаленной странице
   *
   *  @return Array Массив URL
   */
  async function grabImages(siteName, selector) {
    function returnData(urls) {
      const uuid = self.crypto.randomUUID();
      return {
        uuid,
        urls: urls,
        windowId: null,
        totalImage: urls.length,
        date: new Date().getTime(),
        main_site_name: window.location.origin,
        site_name: `/imagePage/page.html?uuid=${uuid}`,
      };
    }

    // joireactor
    if (siteName === "joyreactor") {
      const images = document.querySelectorAll(".post-content .image  img");
      const ar = [...new Set(Array.from(images).map((i) => i.src))].map(
        (image) => {
          const baseUrl = image.split("/pics")[0].match("https:")
            ? image.split("/pics")[0]
            : `https:${image.split("/pics")[0]}`;
          return new URL(image, baseUrl).href;
        }
      );
      return returnData(ar);
    }

    if (siteName === "vipergirls") {
      const images = document.querySelectorAll(
        ".postdetails .postcontent  img"
      );
      const ar = [...new Set(Array.from(images).map((i) => i.src))].map(
        (image, index) => {
          function fixImageUrl(image) {
            if (image.includes("/thumbs/")) {
              return image
                .replace("/thumbs/", "/images/")
                .replace("t1.", "img1.");
            } else if (image.includes("/t/")) {
              return image.replace("/t/", "/i/");
            } else if (image.includes("/th/")) {
              return `${image.replace("/th/", "/i/")}/babyblossom-${
                index < 10 ? "0" + index : index
              }.jpg`;
            }
            return image;
          }
          return new URL(fixImageUrl(image)).href;
        }
      );
      return returnData(ar);
    }

    if (siteName === "any") {
      let node;
      let match = selector.match(
        /document\.querySelector(All)?\(["'`](.+?)["'`]\)/
      );

      if (match) {
        // Приходит полный вызов — достаём селектор через RegExp
        if (match[1]) {
          node = document.querySelectorAll(match[2]);
        }
      } else {
        node = document.querySelectorAll(selector); // тут исправлено: просто селектор
      }

      if (Boolean(node.length)) {
        function fixImageUrl(image) {
          if (image.includes("/604/")) {
            return image.replace("/604/", "/1280/");
          }
          if (image.includes("=540")) {
            return image.replace("=540", "=1280");
          }
          if (image.includes("_300px")) {
            return image.replace("_300px", "");
          }
          return image;
        }

        function getImageUrl(i) {
          return (
            i?.href ||
            i?.src ||
            i?.currentSrc ||
            i?.dataset?.src ||
            i?.dataset?.srcset ||
            i?.dataset?.original ||
            i?.dataset?.largeImage ||
            i?.dataset?.lazy ||
            i?.dataset?.url ||
            i?.style?.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1] ||
            (typeof i.getAttribute === "function" &&
              (i.getAttribute("href") ||
                i.getAttribute("src") ||
                i.getAttribute("data-src") ||
                i.getAttribute("data-original") ||
                i.getAttribute("data-srcset") ||
                i.getAttribute("data-large-image") ||
                i.getAttribute("data-lazy") ||
                i.getAttribute("data-url"))) ||
            (i?.srcset ? i.srcset.split(",")[0].split(" ")[0] : undefined) ||
            null
          );
        }

        const elements = node.length !== undefined ? Array.from(node) : [node];
        const imageUrls = [
          ...new Set(
            elements.map((i) => {
              return getImageUrl(i);
            })
          ),
        ];

        //  асинхронное преобразование:
        const results = await Promise.all(
          imageUrls.map(async (image) => {
            const src = typeof image === "string" ? image : image?.src;
            if (!src) return null;
            if (src.includes("blob:https")) {
              try {
                return await blobUrlToBase64(src);
              } catch (e) {
                console.error(e);
                return null;
              }
            } else {
              try {
                return new URL(fixImageUrl(src), window.location.href).href;
              } catch {
                return null;
              }
            }
          })
        );

        console.log(results);
        // Фильтрация невалидных значений
        return returnData(results.filter((r) => !!r));
      }
    }

    return null;
  }

  /**
   * Выполняется после того как вызовы grabImages
   * выполнены во всех фреймах удаленной web-страницы.
   * Функция объединяет результаты в строку и копирует
   * список путей к изображениям в буфер обмена
   *
   * @param {[]InjectionResult} frames Массив результатов
   * функции grabImages
   */
  function onResult(frames) {
    // Если результатов нет
    if (!frames && !frames[0].results && !frames[0].results.urls?.length) {
      alert("Could not retrieve images from specified page");
      return;
    }
    // Объединить списки URL из каждого фрейма в один массив
    const date = frames[0].result;

    if (date) {
      openImagesPage(date);
    }
  }

  function saveUniqueByUrl(date) {
    chrome.storage.local.get(null, function (allData) {
      // Проверяем, есть ли объект с точно таким же url (например, date.url или date.site_name)
      const duplicateItem = Object.values(allData).find(
        (item) =>
          item &&
          Array.isArray(item.urls) &&
          JSON.stringify(item.urls) === JSON.stringify(date.urls)
      );

      if (duplicateItem) {
        // Такой url уже есть, ничего не сохраняем
        const openOrNot = confirm(
          "Дублирование: запись с таким url уже есть в истории. Открыть заново?"
        );
        if (openOrNot) {
          chrome.runtime.sendMessage({
            action: "test",
            data: "ok open new tab",
          });
          return openOrFocusTab(duplicateItem.site_name);
        }

        return;
      } else {
        // Сохраняем, если дубля нет
        chrome.storage.local.set({ [date.uuid]: date }, () => {
          // 2. Можно (не обязательно) подождать, если нужно
          return setTimeout(() => {
            console.log("Запись успешно добавлена в историю.");
            chrome.runtime.sendMessage({ action: "test", data: "timeout" });
            openOrFocusTab(date.site_name);
          }, 300);
        });
      }
    });
  }

  function openImagesPage(date) {
    // Создать новую вкладку браузера с HTML-страницей интерфейса
    // Сохраняйте: chrome.storage.local.set({ ["tab_" + tab.id]: urls });
    // Получайте: chrome.storage.local.get(["tab_" + tab.id]);
    // chrome.storage.local.remove("tab_" + tab.id);
    return saveUniqueByUrl(date);
  }
})();
