const apiKey = import.meta.env.VITE_API_KEY;
const apiAccessToken = import.meta.env.VITE_API_ACCESS_TOKEN;
const apiUrl = `http://www.omdbapi.com/?apikey=${apiKey}`;

const offlineBanner = document.querySelector("#offline-banner");

function updateOfflineBanner() {
  if (navigator.onLine) {
    offlineBanner.style.backgroundColor = "#016936";
    offlineBanner.textContent = "Internet connection restored.";

    setTimeout(() => {
      offlineBanner.hidden = true;
    }, 3000);
  } else {
    offlineBanner.style.backgroundColor = "#b42318";
    offlineBanner.textContent =
      "You’re offline. Check your internet connection.";
    offlineBanner.hidden = false;
  }
}

updateOfflineBanner();
window.addEventListener("offline", updateOfflineBanner);
window.addEventListener("online", updateOfflineBanner);

const btnModalSkip = document.querySelector("#modal-skip-btn");
const btnModalNext = document.querySelector("#modal-next-btn");
const genreSelectionModal = document.querySelector("#genre-selection-modal");
const genreSelectionForm = document.querySelector("#genre-selection-form");
const genreSelectionError = document.querySelector("#genre-selection-error");
let genreSelectionErrorTimeout;

genreSelectionModal.showModal();
genreSelectionModal.addEventListener("cancel", (e) => e.preventDefault());

const searchForm = document.querySelector("#search-form");
const movieSearch = document.querySelector("#movie-search");
const movieList = document.querySelector("#movie-list");
const clearBtn = document.getElementById("clearSearch");

const loadingContainer = document.querySelector("#loading");
const notFoundContainer = document.querySelector("#not-found-state");

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!movieSearch) return;

  getMovie();
});

async function getMovie() {
  movieList.style.display = "none";
  notFoundContainer.style.display = "none";

  // Show Loading State
  loadingContainer.style.display = "block";
  try {
    const res = await fetch(`${apiUrl}&t=${movieSearch.value}`);

    if (!res.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await res.json();

    // If not movie were found
    if (data.Response === "False") {
      loadingContainer.style.display = "none";
      notFoundContainer.style.display = "block";

      throw new Error("No movie was found matching your search.");
    }

    // Hide Loading state
    loadingContainer.style.display = "none";

    // Show List
    movieList.style.display = "grid";

    renderMovie(data);
  } catch (err) {
    // Hide Loading State
    loadingContainer.style.display = "none";
    console.error("Fetch error:", err);
  }
}

function renderMovie(movie) {
  movieList.innerHTML = `

    <li id="movie" class="movie">
      <img src="${movie.Poster}" alt="" class="poster" />
      <div class="description">
        <header>
          <h1 class="title">${movie.Title}</h1>
          <div class="ratings-container">
            <img src="images/star.svg" class="ratings-icon"/>
            <span class="ratings">${movie.Ratings[0].Value.split("/")[0]}</span>
          </div>
        </header>
        <div class="details">
          <p class="duration">${movie.Runtime}</p>
          <p class="type">${movie.Genre}</p>
          <button class="btn-add-watchlist">
            <img src="images/plus.svg" />
            Watchlist
          </button>
        </div>
        <p class="plot">${movie.Plot}</p>
      </div>
    </li>
    `;
}

// Toggle the clear button visibility based on input content
function toggleClearButton() {
  if (movieSearch.value.length > 0) {
    clearBtn.classList.add("is-visible");
  } else {
    clearBtn.classList.remove("is-visible");
  }
}

movieSearch.addEventListener("input", toggleClearButton);

// Handle the clear action when button is clicked
clearBtn.addEventListener("click", function () {
  movieSearch.value = "";
  toggleClearButton();
  movieSearch.focus();
});

btnModalSkip.addEventListener("click", () => {
  genreSelectionModal.close();
});

// Get Genres
async function getAvailableGenres() {
  const response = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list`,
    {
      headers: {
        Authorization: `Bearer ${apiAccessToken}`,
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch genres list");
  }

  const data = await response.json();

  return data;
}

// Get the available genres and insert them into the Genre Selection Modal Form
getAvailableGenres().then((data) => {
  const genres = data.genres;

  let genresHTML = ``;

  genres.forEach((genre) => {
    genresHTML += `
      <input type="checkbox" name="genre" value="${genre.name.toLowerCase()}" data-id="${genre.id}" id="${genre.name.toLowerCase()}" />
      <label for="${genre.name.toLowerCase()}">${genre.name}</label>
    `;
  });
  genreSelectionForm.innerHTML = genresHTML;
});

btnModalNext.addEventListener("click", () => {
  const selectedGenres = [];

  const genreSelectionModalInputs = document.querySelectorAll(
    "#genre-selection-form input:checked",
  );

  if (genreSelectionModalInputs.length === 0) {
    genreSelectionError.hidden = false;
    clearTimeout(genreSelectionErrorTimeout);
    genreSelectionErrorTimeout = setTimeout(() => {
      genreSelectionError.hidden = true;
    }, 2000);
    return;
  }

  clearTimeout(genreSelectionErrorTimeout);
  genreSelectionError.hidden = true;

  genreSelectionModalInputs.forEach((input) =>
    selectedGenres.push(input.dataset.id),
  );

  // Get movies based on selected genres
  loadingContainer.style.display = "block";
  getMoviesByGenres(selectedGenres)
    .then((movies) => {
      console.log(movies);
    })
    .catch((error) => console.error(error));

  // Close the Modal
  genreSelectionModal.close();
});

async function getMoviesByGenres(genreIds) {
  const params = new URLSearchParams({
    with_genres: genreIds.join("|"),
    sort_by: "popularity.desc",
    page: 1,
    include_adult: false,
  });

  const response = await fetch(
    `https://api.themoviedb.org/3/discover/movie?${params}`,
    {
      headers: {
        Authorization: `Bearer ${apiAccessToken}`,
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch movies");
  }

  const data = await response.json();

  return data.results;
}
