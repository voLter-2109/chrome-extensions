const showNewTabWithImage = document.getElementById("showSelectImage");
const selectImage = document.getElementById("selectImage");

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
    execScript(tab);
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

/*
/** Слушаем сообщения  и рендерим превью в окошке расширения
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "selectedImages") {
    const container = document.querySelector(".preview");
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

/**
 * Добавляем обработчик движения мыши с задержкой (debounce)
 */
function trackMouseHover() {
  /**
   * получаем родительский элемент передаваемого элемента (рекурсия)
   * @param targetElement {Node}
   * @param iter {number} начальное кол-во итераций
   */
  const getParentNode = (targetElement, iter = 0, foundDivs = []) => {
    // Остановимся не более чем через 5 итераций или при отсутствии родителя
    if (iter > 5 || !targetElement.parentNode) {
      // Если не нашли ни одного div — вернём null
      if (foundDivs.length === 0) return null;
      // Если не нашли div с нужным классом — вернём второй div, если есть, иначе самый ближайший
      return foundDivs.length > 1 ? foundDivs[1] : foundDivs[0];
    }

    const parent = targetElement.parentNode;

    if (parent.tagName === "DIV") {
      foundDivs.push(parent);
      // Проверяем наличие "post" или "content" в классе
      if (
        parent.className &&
        (parent.className.includes("post") ||
          parent.className.includes("content"))
      ) {
        return parent;
      }
    }

    // Идём дальше по цепочке родителей
    return getParentNode(parent, ++iter, foundDivs);
  };

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

  let targetElements = null;
  let allImgs = [];

  // Основная функция обработки движения мыши
  const handleMouseMove = debounce((event) => {
    if (event.target && event.target.tagName !== "IMG") {
      if (targetElements && targetElements.length) {
        for (let i of targetElements) {
          if (i && i.tagName === "IMG") {
            i.style.border = "none";
          }
        }
      }
      return null;
    }

    function clearBorders() {
      if (!lastImgs || !lastImgs.length) return;
      lastImgs.forEach((i) => {
        i.style.border = "";
      });
      lastImgs = [];
    }

    targetElements = event.target;
    const par = getParentNode(targetElements);

    if (par) {
      const className = par.className.split(" ")[0]; // берем первый класс

      if (className) {
        // ищем всех родителей
        const allParents = Array.from(
          document.querySelectorAll(`div.${className}`)
        );
        allParents.forEach((parentDiv) => {
          allImgs.push(...parentDiv.querySelectorAll("img"));
        });
      }

      if (allImgs && allImgs.length) {
        // выделяем цветом
        for (let i of allImgs) {
          if (i && i.tagName === "IMG") {
            i.style.border = "2px solid red";
          }
        }

        // потом убираем дубликаты
        const nI = [...new Set(allImgs.map((i) => i.currentSrc))];
        chrome.runtime.sendMessage({
          action: "selectedImages",
          selectedImages: nI,
        });
      }
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
function execScript(tab) {
  // Выполнить функцию на странице указанной вкладки
  // и передать результат ее выполнения в функцию onResult
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: grabImages,
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
function grabImages() {
  // joireactor
  // const images = document.querySelectorAll(".post_content  .image  img");
  const images = document.querySelectorAll(".post-content .image  img");
  console.log("images", images);
  const ar = Array.from(images).map((image) => {
    const ur = image.getAttribute("src");
    const baseUrl = ur.split("/pics")[0].match("https:")
      ? ur.split("/pics")[0]
      : `https:${ur.split("/pics")[0]}`;
    return new URL(ur, baseUrl).href;
  });
  return ar;
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
  if (!frames || !frames.length) {
    alert("Could not retrieve images from specified page");
    return;
  }
  // Объединить списки URL из каждого фрейма в один массив
  const imageUrls = frames
    .map((frame) => frame.result)
    .reduce((r1, r2) => r1.concat(r2));
  openImagesPage(imageUrls);

  console.log("imageUrls", imageUrls);
}

function openImagesPage(urls) {
  console.log(urls);
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
