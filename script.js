const catalog = [
  {
    id: "arcane",
    title: "Аркейн",
    type: "series",
    year: 2021,
    duration: "1 сезон",
    genre: "Анимация · Фэнтези · Экшн",
    rating: 9.0,
    summary:
      "История сестер Джинкс и Ви на улицах Пилтовера и Зауна с уникальным визуальным стилем.",
    accent: "#6f7cf7",
  },
  {
    id: "dark",
    title: "Тьма",
    type: "series",
    year: 2017,
    duration: "3 сезона",
    genre: "Триллер · Мистика",
    rating: 8.7,
    summary:
      "Немецкий город, исчезновения детей и клубок временных петель, где каждая линия имеет значение.",
    accent: "#16222a",
  },
  {
    id: "dune",
    title: "Дюна",
    type: "movie",
    year: 2021,
    duration: "155 мин",
    genre: "Фантастика · Эпос",
    rating: 8.3,
    summary:
      "Наследник дома Атридесов Пол должен выжить на Арракисе и обрести свою судьбу среди песков.",
    accent: "#c89d4f",
  },
  {
    id: "rrr",
    title: "RRR",
    type: "movie",
    year: 2022,
    duration: "187 мин",
    genre: "Приключения · Экшн",
    rating: 8.0,
    summary:
      "Фантазия на тему дружбы и свободы: два героя в борьбе против колонизаторов в 1920-х Индии.",
    accent: "#f86624",
  },
  {
    id: "better-call-saul",
    title: "Лучше звоните Солу",
    type: "series",
    year: 2015,
    duration: "6 сезонов",
    genre: "Драма · Криминал",
    rating: 8.9,
    summary:
      "Путь Джимми Макгилла к образу Сола Гудмана в мире адвокатских интриг и моральных границ.",
    accent: "#f2c94c",
  },
  {
    id: "blade-runner",
    title: "Бегущий по лезвию 2049",
    type: "movie",
    year: 2017,
    duration: "164 мин",
    genre: "Неонуар · Фантастика",
    rating: 8.0,
    summary:
      "Офицер К раскрывает тайну, способную погрузить остатки общества в хаос, и ищет Рика Декарда.",
    accent: "#5ad1e0",
  },
  {
    id: "queen-gambit",
    title: "Ход королевы",
    type: "series",
    year: 2020,
    duration: "7 серий",
    genre: "Драма · Биография",
    rating: 8.5,
    summary:
      "Юная шахматистка Бет Хармон покоряет мир, борясь с зависимостью и стереотипами 60-х.",
    accent: "#d96b8a",
  },
  {
    id: "loki",
    title: "Локи",
    type: "series",
    year: 2021,
    duration: "2 сезона",
    genre: "Фантастика · Приключения",
    rating: 8.2,
    summary:
      "Бог озорства сталкивается с Управлением временными изменениями и спасает временную линию.",
    accent: "#80d44c",
  },
  {
    id: "romcom",
    title: "Терминал",
    type: "movie",
    year: 2004,
    duration: "128 мин",
    genre: "Драма · Романтика",
    rating: 7.4,
    summary:
      "Виктор Наворски застревает в аэропорту Джона Кеннеди и обретает в нем свой новый мир.",
    accent: "#f47b4f",
  },
];

const state = loadState();
const searchField = document.querySelector("#search");
const typeFilter = document.querySelector("#type-filter");
const sortSelect = document.querySelector("#sort");
const catalogContainer = document.querySelector("#catalog");
const template = document.querySelector("#card-template");
const statsChip = document.querySelector("#saved-stats");

function loadState() {
  try {
    const raw = localStorage.getItem("maxstream-state");
    if (!raw) return { ratings: {}, reviews: {} };
    const parsed = JSON.parse(raw);
    return {
      ratings: parsed.ratings || {},
      reviews: parsed.reviews || {},
    };
  } catch (error) {
    console.warn("State load error", error);
    return { ratings: {}, reviews: {} };
  }
}

function persistState() {
  localStorage.setItem("maxstream-state", JSON.stringify(state));
  updateStats();
}

function updateStats() {
  const rated = Object.keys(state.ratings).length;
  const reviewed = Object.keys(state.reviews).length;
  const label = reviewed > 0 ? `${reviewed} сохраненных отзывов` : "0 сохраненных отзывов";
  statsChip.textContent = label;
  statsChip.setAttribute("aria-label", `Сохранено ${reviewed} отзывов и ${rated} оценок`);
}

function buildStars(rating) {
  const stars = document.createElement("div");
  stars.className = "stars";
  for (let i = 1; i <= 10; i += 1) {
    const star = document.createElement("span");
    star.textContent = "★";
    if (i <= rating) star.classList.add("active");
    stars.append(star);
  }
  return stars;
}

function renderCards(items) {
  catalogContainer.innerHTML = "";
  items.forEach((item) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".card");
    const poster = node.querySelector(".poster");
    const badge = node.querySelector("[data-type]");
    const duration = node.querySelector("[data-duration]");
    const title = node.querySelector("[data-title]");
    const meta = node.querySelector("[data-meta]");
    const genre = node.querySelector("[data-genre]");
    const summary = node.querySelector("[data-summary]");
    const score = node.querySelector("[data-score]");
    const starsContainer = node.querySelector("[data-stars]");
    const ratingInput = node.querySelector("[data-rating-input]");
    const reviewArea = node.querySelector("[data-review]");
    const saveButton = node.querySelector("[data-save]");
    const clearButton = node.querySelector("[data-clear]");
    const hint = node.querySelector("[data-hint]");

    poster.style.backgroundImage = `radial-gradient(circle at 30% 20%, ${item.accent}55, transparent 40%), linear-gradient(120deg, ${item.accent}33, #0a0a0a)`;
    badge.textContent = item.type === "movie" ? "Фильм" : "Сериал";
    duration.textContent = item.duration;
    title.textContent = item.title;
    meta.textContent = `${item.year} · ${item.type === "movie" ? "Фильм" : "Сериал"}`;
    genre.textContent = item.genre;
    summary.textContent = item.summary;
    score.textContent = item.rating.toFixed(1);

    const savedRating = state.ratings[item.id] || 0;
    const savedReview = state.reviews[item.id] || "";
    const initialRating = savedRating || 7;
    ratingInput.value = initialRating;
    reviewArea.value = savedReview;
    hint.textContent = savedRating || savedReview ? "Сохранено локально" : "Не сохранено";

    starsContainer.replaceChildren(buildStars(initialRating));

    ratingInput.addEventListener("input", () => {
      starsContainer.replaceChildren(buildStars(Number(ratingInput.value)));
    });

    saveButton.addEventListener("click", () => {
      const rating = Number(ratingInput.value);
      const review = reviewArea.value.trim();
      state.ratings[item.id] = rating;
      if (review) {
        state.reviews[item.id] = review;
      } else {
        delete state.reviews[item.id];
      }
      hint.textContent = review ? "Отзыв сохранен локально" : "Оценка сохранена";
      starsContainer.replaceChildren(buildStars(rating));
      persistState();
    });

    clearButton.addEventListener("click", () => {
      delete state.ratings[item.id];
      delete state.reviews[item.id];
      ratingInput.value = 7;
      reviewArea.value = "";
      hint.textContent = "Не сохранено";
      starsContainer.replaceChildren(buildStars(7));
      persistState();
    });

    card.style.borderColor = `${item.accent}33`;
    catalogContainer.appendChild(node);
  });
  updateStats();
}

function applyFilters() {
  const query = searchField.value.toLowerCase();
  const type = typeFilter.value;
  const sortBy = sortSelect.value;

  const filtered = catalog
    .filter((item) => {
      const matchesType = type === "all" ? true : item.type === type;
      const matchesQuery = query
        ? `${item.title} ${item.genre}`.toLowerCase().includes(query)
        : true;
      return matchesType && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "newest") return b.year - a.year;
      return a.title.localeCompare(b.title, "ru");
    });

  renderCards(filtered);
}

searchField.addEventListener("input", applyFilters);
typeFilter.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);

applyFilters();
