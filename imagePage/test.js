(function () {
  "use strict";

  // хтмл контейнер для размещения изображения
  document.body.insertAdjacentHTML(
    "beforeend",
    `
		<div id="image-shower-main-window" hidden="true">
			<div id="image-shower-view-area">
				<img src="" alt="" id="image-shower-img-element">
				<div id="image-shower-controls">
					<button class="image-shower-controls-btn-close"></button>
					<button class="image-shower-controls-btn-fullscreen"></button>
					<button class="image-shower-controls-btn-download"></button>
				</div>
			</div>
		</div>
	`
  );

  // основной контейнер - внешнее модальное окно.
  const viewerMainWindow = document.getElementById("image-shower-main-window");

  // область просмотра и контейнер - "рамка" для размещаемого изображения и контейнера контролов.
  const viewerContentWindow = viewerMainWindow.querySelector(
    "#image-shower-view-area"
  );

  // html элемент 'img' - в него передается ссылка на изображение и размер изображения.
  const viewerImgElement = viewerMainWindow.querySelector(
    "#image-shower-img-element"
  );

  // контейнер - для контролов, обертка для элементов управления просмотром.
  const controllsConteiner = viewerMainWindow.querySelector(
    "#image-shower-controls"
  );

  const btnShowerFullscreen = viewerMainWindow.querySelector(
    ".image-shower-controls-btn-fullscreen"
  );

  const btnShowerClose = controllsConteiner.querySelector(
    ".image-shower-controls-btn-close"
  );

  const btnDownloadImage = viewerMainWindow.querySelector(
    ".image-shower-controls-btn-download"
  );

  btnShowerClose.style.backgroundImage = `url(${chrome.runtime.getURL(
    "/content/img/icon-jris-btn-close.png"
  )})`;

  btnDownloadImage.style.backgroundImage = `url(${chrome.runtime.getURL(
    "/content/img/icon-jris-btn-download.png"
  )})`;

  const urlIconOpenFullscreen = `url(${chrome.runtime.getURL(
    "/content/img/icon-jris-btn-fullscreen-open.png"
  )})`;

  const urlIconCloseFullscreen = `url(${chrome.runtime.getURL(
    "/content/img/icon-jris-btn-fullscreen-close.png"
  )})`;

  const urlIconLoaderIndication = `url(${chrome.runtime.getURL(
    "/content/img/icon-jris-img-loader.gif"
  )})`;

  btnShowerFullscreen.style.backgroundImage = urlIconOpenFullscreen;

  const extensionId = chrome.runtime.id;

  // ссылка на html элемент img - с превью или оригинальным изображением.
  let sourceImage = document.createElement("img");

  // состояние области просмотра
  let fullScreenMode = false;
  let viewerFullSizeMode = false;
  let imageZoommeable = false;
  let imageFullsizeMode = false;

  // рассчитывает размер изображения для размещения в окне просмотра.
  //
  // imgW, imgH - размеры исходного изображения.
  // viewW, viewH - размеры окна просмотра.
  // return {w, h, modified} расчитанный размер и
  // был ли он изменен или оставлен исходный.
  function calculateImageSize(imgW, imgH, viewW, viewH) {
    const differenceH = imgH > viewH ? imgH / viewH : 0;
    const differenceW = imgW > viewW ? imgW / viewW : 0;

    if (differenceW > differenceH) {
      return {
        w: viewW,
        h: imgH / (imgW / viewW),
        modified: true,
      };
    } else if (differenceW < differenceH) {
      return {
        w: imgW / (imgH / viewH),
        h: viewH,
        modified: true,
      };
    } else {
      return {
        w: imgW,
        h: imgH,
        modified: false,
      };
    }
  }

  // Адаптирует размеры и устанавливает изображение в область просмотра.
  // Если изображение быть увеличено - устанавливает флаг imageZoommeable.
  function adaptationImageSizeForViewer() {
    const imgSize = calculateImageSize(
      sourceImage.naturalWidth,
      sourceImage.naturalHeight,
      viewerContentWindow.clientWidth,
      viewerContentWindow.clientHeight
    );
    viewerImgElement.setAttribute("width", imgSize.w);
    viewerImgElement.setAttribute("height", imgSize.h);
    viewerImgElement.src = sourceImage.src;

    // центрирует изображение по ветикали, если его высота меньше высоты области просмотра.
    if (viewerContentWindow.clientHeight > imgSize.h) {
      viewerImgElement.style.marginTop = `${
        (viewerContentWindow.clientHeight - imgSize.h) / 2
      }px`;
    } else {
      viewerImgElement.style.marginTop = 0;
    }
    // если изображение было уменьшено, тогда есть возможность просмотра в оригинальном размере.
    if (imgSize.modified) {
      viewerImgElement.dataset.zoommeable = "magnifiable";
      imageZoommeable = true;
    } else {
      viewerImgElement.dataset.zoommeable = "not";
      imageZoommeable = false;
    }
  }

  // открытие окна просмотра.
  function openViewer() {
    if (fullScreenMode) {
      btnShowerFullscreen.style.backgroundImage = urlIconCloseFullscreen;
    } else {
      btnShowerFullscreen.style.backgroundImage = urlIconOpenFullscreen;
    }
    viewerMainWindow.hidden = false;
    let loaded = false;
    setTimeout(() => {
      if (!loaded)
        viewerContentWindow.style.backgroundImage = urlIconLoaderIndication;
    }, 15);
    sourceImage.onload = () => {
      adaptationImageSizeForViewer();
      loaded = true;
      viewerContentWindow.style.backgroundImage = "";
    };
    sourceImage.onerror = () => {
      console.error("Не удалось загрузить:", sourceImage.src);
    };
  }
  // закрытие окна просмотра.
  function closeViewer() {
    viewerMainWindow.hidden = true;
    viewerImgElement.src = "";
    viewerImgElement.removeAttribute("width");
    viewerImgElement.removeAttribute("height");
    viewerImgElement.setAttribute("data-zoommeable", "not");
    viewerContentWindow.style.backgroundImage = "";
    if (fullScreenMode) closeViewerContentFullscreenMode();
  }

  // открыть окно просмотра в полноэкранном режиме.
  function openViewerContentFullscreenMode() {
    btnShowerFullscreen.style.backgroundImage = urlIconCloseFullscreen;
    viewerContentWindow.setAttribute("data-fullscreen", "open");
    viewerContentWindow.requestFullscreen();
  }
  // отменить полноэкранный режим.
  function closeViewerContentFullscreenMode() {
    document.exitFullscreen();
    viewerContentWindow.removeAttribute("data-fullscreen");
    btnShowerFullscreen.style.backgroundImage = urlIconOpenFullscreen;
  }

  // просмотр изображения в натуральную величину в полноэкранном режиме.
  function openImageFullesreenMode() {
    imageFullsizeMode = true;
    viewerImgElement.setAttribute("height", sourceImage.naturalHeight);
    viewerImgElement.setAttribute("width", sourceImage.naturalWidth);
    viewerImgElement.setAttribute("data-zoommeable", "diminishable");
    controllsConteiner.hidden = true;
    if (!fullScreenMode) openViewerContentFullscreenMode();
  }
  // вернуться в стандартный режим просмотра изображения.
  function closeImageFullsreenMode() {
    imageFullsizeMode = false;
    controllsConteiner.hidden = false;
    // если окно просмотра изначально было открыто
    // фуллскрин - значит так его и оставляем.
    if (viewerFullSizeMode === false) {
      closeViewerContentFullscreenMode();
    } else {
      adaptationImageSizeForViewer();
    }
  }

  // скачать просматриваемое изображение.
  btnDownloadImage.addEventListener("click", (e) => {
    chrome.runtime.sendMessage(
      extensionId,
      { url: sourceImage.src },
      (response) => {
        console.log(response);
      }
    );
  });

  // отслеживание статуса fullscreen
  document.addEventListener("fullscreenchange", (e) => {
    fullScreenMode = !fullScreenMode;
  });

  // ---------------- Управление окном просмотра ------------------

  // автоподгонка размера и положения изображения.
  window.addEventListener("resize", (e) => {
    if (viewerMainWindow.hidden) return;
    if (imageFullsizeMode) return;
    adaptationImageSizeForViewer();
  });

  // закрытие просмотрщика при клике за границами "рамки"
  viewerMainWindow.addEventListener("click", function (event) {
    if (event.target == this) {
      closeViewer();
    }
  });
  // закрытие просмотрщика при клике на кнопке.
  btnShowerClose.addEventListener("click", closeViewer);

  // применить/отменить полноэкранный режим окна просмотра
  btnShowerFullscreen.addEventListener("click", (e) => {
    if (fullScreenMode === true) {
      viewerFullSizeMode = false;
      closeViewerContentFullscreenMode();
    } else {
      viewerFullSizeMode = true;
      openViewerContentFullscreenMode();
    }
  });

  // применить/отменить полноэкранный и полноразмерный показ изображения.
  viewerImgElement.addEventListener("click", (e) => {
    if (!imageZoommeable) return;
    if (imageFullsizeMode === true) {
      closeImageFullsreenMode();
      imageFullsizeMode = false;
    } else {
      imageFullsizeMode = true;
      openImageFullesreenMode();
    }
  });

  // ------------------------- среда обитания -----------------------

  if (
    window.screen.availWidth < 800 &&
    window.screen.availHeight > window.screen.availWidth
  ) {
    controllsConteiner.setAttribute("data-is-mobile", "");
  }

  document.getElementById("contentinner")?.addEventListener(
    "click",
    function (event) {
      if (
        event.target.tagName === "IMG" &&
        (event.target.closest(".image") ||
          event.target.closest(".post_comment_list"))
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        if (
          event.target.parentElement.tagName === "A" &&
          event.target.parentElement.classList.contains("prettyPhotoLink")
        ) {
          sourceImage.src = event.target.parentElement.href;
        } else {
          sourceImage.src = event.target.src;
        }
        openViewer();
      }
    },
    true
  );
  // - конец модуля -
})();
