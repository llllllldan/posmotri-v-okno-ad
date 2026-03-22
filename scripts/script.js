/* КОНФИГ */
const preloaderWaitindTime = 1200;
const cardsOnPage = 5;
const BASE_URL = 'https://v-content.practicum-team.ru';
const endpoint = `${BASE_URL}/api/videos?pagination[pageSize]=${cardsOnPage}&`;

/* ЭЛЕМЕНТЫ СТРАНИЦЫ */
const cardsList = document.querySelector('.content__list');
const cardsContainer = document.querySelector('.content__list-container');
const videoContainer = document.querySelector('.result__video-container');
const videoElement = document.querySelector('.result__video');
const form = document.querySelector('.search-form');

/* ТЕМПЛЕЙТЫ */
const cardTmp = document.querySelector('.cards-list-item-template');
const preloaderTmp = document.querySelector('.preloader-template');
const videoNotFoundTmp = document.querySelector('.error-template');
const moreButtonTmp = document.querySelector('.more-button-template');

let cardsOnPageState = [];

init();

function init() {
  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);
  loadVideos(endpoint);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  cardsList.textContent = '';

  const oldButton = cardsContainer.querySelector('.more-button');
  if (oldButton) oldButton.remove();

  const error = videoContainer.querySelector('.error');
  if (error) error.remove();

  showPreloader(preloaderTmp, videoContainer);
  showPreloader(preloaderTmp, cardsContainer);

  const formData = serializeFormData(form);
  const requestUrl = generateFilterRequest(
    endpoint,
    formData.city,
    formData.timeArray
  );

  loadVideos(requestUrl);
});

async function loadVideos(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    cardsOnPageState = data.results;

    if (!data.results.length) {
      throw new Error('not-found');
    }

    appendCards({
      baseUrl: BASE_URL,
      dataArray: data.results,
      cardTmp,
      container: cardsList,
    });

    setVideo({
      baseUrl: BASE_URL,
      video: videoElement,
      videoUrl: data.results[0].video.url,
      posterUrl: data.results[0].poster.url,
    });
    const firstCard = document.querySelector('.content__card-link');
    if (firstCard) {
      firstCard.classList.add('content__card-link_current');
    }

    await waitForReadyVideo(videoElement);
    await delay(preloaderWaitindTime);
    removePreloader(videoContainer);
    removePreloader(cardsContainer);

    cardsContainer.classList.add('custom-scrollbar');

    chooseCurrentVideo();

    showMoreCards(data, url);
  } catch (err) {
    if (err.message === 'not-found') {
      showError(videoContainer, videoNotFoundTmp, 'Нет подходящих видео =(');
    } else {
      showError(videoContainer, videoNotFoundTmp, 'Ошибка получения данных :(');
    }

    removePreloader(videoContainer);
    removePreloader(cardsContainer);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForReadyVideo(video) {
  return new Promise((resolve) => {
    video.oncanplaythrough = resolve;
  });
}

function showPreloader(tmp, parent) {
  const node = tmp.content.cloneNode(true);
  parent.append(node);
}

function removePreloader(parent) {
  const preloader = parent.querySelector('.preloader');
  if (preloader) preloader.remove();
}

function appendCards({ baseUrl, dataArray, cardTmp, container }) {
  dataArray.forEach((el) => {
    const node = cardTmp.content.cloneNode(true);

    const link = node.querySelector('.content__card-link');
    link.id = el.id;

    node.querySelector('.content__video-card-title').textContent = el.city;
    node.querySelector('.content__video-card-description').textContent =
      el.description;

    const img = node.querySelector('.content__video-card-thumbnail');
    img.src = `${baseUrl}${el.thumbnail.url}`;
    img.alt = el.description;

    container.append(node);
  });
}

function setVideo({ baseUrl, video, videoUrl, posterUrl }) {
  video.src = `${baseUrl}${videoUrl}`;
  video.poster = `${baseUrl}${posterUrl}`;
}

function chooseCurrentVideo() {
  const cards = document.querySelectorAll('.content__card-link');

  cards.forEach((card) => {
    card.onclick = async (e) => {
      e.preventDefault();

      cards.forEach((c) =>
        c.classList.remove('content__card-link_current')
      );

      card.classList.add('content__card-link_current');

      showPreloader(preloaderTmp, videoContainer);

      const videoData = cardsOnPageState.find(
        (v) => String(v.id) === String(card.id)
      );

      setVideo({
        baseUrl: BASE_URL,
        video: videoElement,
        videoUrl: videoData.video.url,
        posterUrl: videoData.poster.url,
      });

      await waitForReadyVideo(videoElement);
      await delay(preloaderWaitindTime);

      removePreloader(videoContainer);
    };
  });
}

function showError(container, template, message) {
  const node = template.content.cloneNode(true);
  node.querySelector('.error__title').textContent = message;
  container.append(node);
}

function serializeFormData(form) {
  const city = form.querySelector('input[name="city"]').value;

  const checkboxes = form.querySelectorAll('input[name="time"]');
  const checkedValuesArray = [];

  checkboxes.forEach((item) => {
    if (item.checked) checkedValuesArray.push(item.value);
  });

  return {
    city,
    timeArray: checkedValuesArray,
  };
}

function generateFilterRequest(endpoint, city, timeArray) {
  let url = endpoint;

  if (city) {
    url += `filters[city][$containsi]=${city}&`;
  }

  if (timeArray.length) {
    timeArray.forEach((time) => {
      url += `filters[time_of_day][$eqi]=${time}&`;
    });
  }

  return url;
}


function showMoreCards(data, initialEndpoint) {
  if (data.pagination.page === data.pagination.pageCount) return;

  const buttonNode = moreButtonTmp.content.cloneNode(true);
  cardsContainer.append(buttonNode);

  const button = cardsContainer.querySelector('.more-button');

  button.addEventListener('click', async () => {
    let nextPage = data.pagination.page + 1;

    const url = `${initialEndpoint}pagination[page]=${nextPage}&`;

    try {
      const response = await fetch(url);
      const newData = await response.json();

      button.remove();

      cardsOnPageState = cardsOnPageState.concat(newData.results);

      appendCards({
        baseUrl: BASE_URL,
        dataArray: newData.results,
        cardTmp,
        container: cardsList,
      });

      chooseCurrentVideo();

      showMoreCards(newData, initialEndpoint);
    } catch (err) {
      console.error(err);
    }
  });
}
