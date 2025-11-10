// SVG-иконка
const downloadIcon = `
  <svg width="28" height="28" style="background:rgba(0,0,0,.55);border-radius:50%;" fill="#fff" viewBox="0 0 24 24">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4m-9 8h10" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>
`;

const style = document.createElement("style");
style.textContent = `
.imgdl-btn {
  position: absolute !important;
  display: none;
  z-index: 1000000;
  cursor: pointer;
  opacity: 0.96;
  pointer-events: auto;
}
.imgdl-btn.visible { display: block !important; }
`;
document.head.appendChild(style);

let lastImg = null;

const clickDownload = document.createElement("div");
clickDownload.className = "imgdl-btn";
clickDownload.innerHTML = downloadIcon;
clickDownload.title = "Скачать это изображение";
document.body.appendChild(clickDownload);

clickDownload.addEventListener("mousedown", function (ev) {
  ev.stopPropagation();
  ev.preventDefault();
  if (clickDownload.__imgSrc) {
    // Отправляем команду в background
    chrome.runtime.sendMessage({
      action: "downloadImage",
      url: clickDownload.__imgSrc,
    });
  }
});

document.addEventListener("mousemove", function (e) {
  const img = e.target;
  if (img.tagName === "IMG" && img.offsetWidth > 50 && img.offsetHeight > 50) {
    const rect = img.getBoundingClientRect();
    clickDownload.style.left =
      window.scrollX + rect.right - clickDownload.offsetWidth - 6 + "px";
    clickDownload.style.top = window.scrollY + rect.top + 6 + "px";
    clickDownload.__imgSrc = img.src;
    lastImg = img;
    clickDownload.classList.add("visible");
  }
});

document.addEventListener("mouseout", function (e) {
  // Проверяем уход именно с картинки
  if (e.target === lastImg) {
    // Если курсор НЕ на кнопке
    if (e.relatedTarget !== clickDownload) {
      clickDownload.classList.remove("visible");
      clickDownload.__imgSrc = null;
      lastImg = null;
    }
    // Если курсор на кнопке -- ничего не делаем
  }
  // Также, если уходим с самой кнопки и не возвращаемся на lastImg — тоже скрываем кнопку для чистоты
  if (e.target === clickDownload) {
    return;
  }
});
