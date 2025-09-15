const grabBtn = document.getElementById("grabBtn");
const checkImageTag = document.getElementById("testBtn");

grabBtn.addEventListener("click", () => {
  // Получить активную вкладку браузера
  chrome.tabs.query({ active: true }, function (tabs) {
    var tab = tabs[0];
    // и если она есть, то выполнить на ней скрипт
    if (tab) {
      execScript(tab);
    } else {
      alert("There are no active tabs");
    }
  });
});

// на первом шаге выбираем основной блок с картинкой
checkImageTag.addEventListener("click", () => {
  // Получить активную вкладку браузера
  chrome.tabs.query({ active: true }, function (tabs) {
    var tab = tabs[0];
    // и если она есть, то выполнить на ней скрипт
    if (tab) {
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: trackMouseHover,
        })
        .then((res) => {
          console.log(res.results);
        });
    } else {
      alert("There are no active tabs");
    }
  });
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
  const getParentNode = (targetElement, iter = 0) => {
    let iteration = iter;

    if (iteration > 5) {
      console.log("div not found getParentNode");
      return null;
    }

    if (targetElement.parentNode.tagName !== "DIV") {
      iteration = ++iteration;
      return getParentNode(targetElement.parentNode, iteration);
    } else {
      return targetElement.parentNode;
    }
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
      return console.log("mouse over not image tag");
    }

    targetElements = event.target;
    const par = getParentNode(targetElements);
    if (par) {
      const cn = par.getAttribute("class")?.split(" ")[0];
      par.setAttribute("select-image", true);
      const img = Array.from(document.querySelectorAll(`.${cn} img`));
      targetElements = img;

      if (img && img.length) {
        for (let i of img) {
          if (i && i.tagName === "IMG") {
            i.style.border = "2px solid black";
          }
        }
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
