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
    console.log(array);
    if (array && array.length) {
      openImagesPage(array);
    }
  } catch (error) {
    alert(error);
  }
});

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

/**
 * Получает список абсолютных путей всех картинок
 * на удаленной странице
 *
 *  @return Array Массив URL
 */
async function grabImages(siteName, selector) {
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
    return ar;
  }

  if (siteName === "vipergirls") {
    const images = document.querySelectorAll(".postdetails .postcontent  img");
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
    return ar;
  }

  if (siteName === "any") {
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

    function fixImageUrl(image) {
      if (image.includes("/604/")) {
        return image.replace("/604/", "/1280/");
      }
      if (image.includes("_300px")) {
        return image.replace("_300px", "");
      }
      return image;
    }

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
      node = document.querySelector(selector); // тут исправлено: просто селектор
    }

    if (node) {
      const elements = node.length !== undefined ? Array.from(node) : [node];
      const imageUrls = [
        ...new Set(elements.map((i) => i.href || i.dataset.src || i.src)),
      ];

      // Используйте асинхронное преобразование:
      const results = await Promise.all(
        imageUrls.map(async (image) => {
          if (!image) return null;
          if (image.includes("blob:https")) {
            try {
              return await blobUrlToBase64(image);
            } catch (e) {
              console.error(e);
              return null;
            }
          } else {
            try {
              return new URL(fixImageUrl(image), window.location.href).href;
            } catch {
              return null;
            }
          }
        })
      );

      // Фильтрация невалидных значений
      return results.filter((r) => !!r);
    }
  }

  return [];
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
  console.log(frames);
  // Если результатов нет
  if (!frames || !frames.length) {
    alert("Could not retrieve images from specified page");
    return;
  }
  // Объединить списки URL из каждого фрейма в один массив
  const imageUrls = frames
    .map((frame) => frame.result)
    .reduce((r1, r2) => r1.concat(r2));

  if (imageUrls.length > 0) {
    openImagesPage(imageUrls);
  }
}

function openImagesPage(urls) {
  // Создать новую вкладку браузера с HTML-страницей интерфейса
  chrome.tabs.create(
    { url: "/imagePage/page.html", active: false },

    (tab) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "createNewTab", urls: urls },
          (resp) => {
            // сделать вкладку активной
            chrome.tabs.update(tab.id, { active: true });
          }
        );
      }, 300);
    }
  );
}
