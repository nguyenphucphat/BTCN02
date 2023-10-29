import data from "./data.js";

// DB utility module
const DBProvider = {
  // fetch method
  fetch: function (query) {
    return new Promise((resolve, reject) => {
      let perPage = 10;
      let page = 1;
      const [type, cls, patternParams] = query.split("/");
      var pattern = "";
      var params = "";

      if (patternParams != "") {
        [pattern, params] = patternParams.split("?");

        if (params != "") {
          const paramsArray = params.split("&");

          for (const param of paramsArray) {
            const [key, value] = param.split("=");
            if (key === "per_page") {
              perPage = parseInt(value);
            } else if (key === "page") {
              page = parseInt(value);
            }
          }
        }
      }

      if (type === "search") {
        if (cls in data) {
          const filteredData = data[cls].filter(
            (item) =>
              item.fullTitle.toLowerCase().includes(pattern.toLowerCase()) ||
              item.actorList.some((actor) =>
                actor.name.toLowerCase().includes(pattern.toLowerCase())
              )
          );

          const totalPage = Math.ceil(filteredData.length / perPage);
          const startIndex = (page - 1) * perPage;
          const endIndex = startIndex + perPage;
          const items = filteredData.slice(startIndex, endIndex);

          const result = {
            search: pattern,
            page: page,
            per_page: perPage,
            total_page: totalPage,
            total: filteredData.length,
            items: items,
          };

          resolve(result);
        } else {
          reject("Invalid class");
        }
      } else if (type === "detail") {
        if (cls === "Movies") {
          const movie = data[cls].find((item) => item.id === pattern);
          resolve(movie);
        } else if (cls === "Reviews") {
          const filteredData = data[cls].filter(
            (item) => item.movieId === pattern
          );
          const result = {
            total: filteredData.length,
            items: filteredData,
          };
          resolve(result);
        } else if (cls === "Names") {
          var actor = {};
          actor = data[cls].find((item) => item.id === pattern);
          resolve(actor);
        } else {
          reject("Invalid class");
        }
      } else if (type === "get") {
        if (cls === "Movies") {
          // Sắp xếp mảng phim theo năm giảm dần
          const sortedMovies = data[cls].sort((a, b) => b.year - a.year);

          // Lấy 5 bộ phim mới nhất
          const latestMovies = sortedMovies.slice(0, 5);

          const result = {
            total: latestMovies.length,
            items: latestMovies,
          };
          resolve(result);
        } else {
          const filteredData = data[cls];

          const totalPage = Math.ceil(filteredData.length / perPage);
          const startIndex = (page - 1) * perPage;
          const endIndex = startIndex + perPage;
          const items = filteredData.slice(startIndex, endIndex);

          const result = {
            page: page,
            per_page: perPage,
            total_page: totalPage,
            total: filteredData.length,
            items: items,
          };
          resolve(result);
        }
      } else {
        reject("Invalid type");
      }
    });
  },
};

const searchFilm = Vue.createApp({
  data() {
    return {
      isLoading: false,
      search: "",
      searchResult: [],
      searchCurrentPage: 1,
      searchTotalPage: 0,
      isMain: true,
      isSearch: false,
      lastedMovies: [],
      lastedMoviesCurrentIndex: 0,
      popularMoviesCurrentPage: 1,
      popularMoviesTotalPage: 0,
      popularMovies: [],
      moviesCurrentPage: 1,
      moviesTotalPage: 0,
      movies: [],
      filmDetail: {},
      isFilm: false,
      imDb: "",
      movieDetailId: "",
      reviews: [],
      isActor: false,
      actorDetail: {},
    };
  },
  created() {
    DBProvider.fetch("get/Movies/").then((result) => {
      this.lastedMovies = result.items; // Cập nhật mảng movies với dữ liệu từ kết quả
    });
    this.fetchPopularMovies();
    this.fetchRatingMovies();
  },
  watch: {
    searchResult() {
      return this.searchResult;
    },
    isActor() {
      return this.isActor;
    },
    isMain() {
      return this.isMain;
    },

    isFilm() {
      return this.isFilm;
    },

    isSearch() {
      return this.isSearch;
    },
    popularMoviesCurrentPage() {
      this.fetchPopularMovies();
    },
    moviesCurrentPage() {
      this.fetchRatingMovies();
    },
  },
  computed: {
    displayedSearchPages() {
      const startPage = Math.max(1, this.searchCurrentPage - 2);
      const endPage = Math.min(this.searchTotalPage, startPage + 5);
      const pages = [];
      for (let page = startPage; page <= endPage; page++) {
        pages.push(page);
      }
      return pages;
    },

    runtimeStr() {
      if (this.lastedMovies.length > 0) {
        return this.lastedMovies[this.lastedMoviesCurrentIndex].runtimeStr;
      }
      return "";
    },
    fullTitle() {
      if (this.lastedMovies.length > 0) {
        return this.lastedMovies[this.lastedMoviesCurrentIndex].fullTitle;
      }
      return "";
    },

    imgLink() {
      if (this.lastedMovies.length > 0) {
        return this.lastedMovies[this.lastedMoviesCurrentIndex].image;
      }
      return "";
    },

    displayedPages() {
      const startPage = Math.max(1, this.popularMoviesCurrentPage - 2);
      const endPage = Math.min(this.popularMoviesTotalPage, startPage + 4);
      const pages = [];
      for (let page = startPage; page <= endPage; page++) {
        pages.push(page);
      }
      return pages;
    },

    displayedRatingPages() {
      const startPage = Math.max(1, this.moviesCurrentPage - 2);
      const endPage = Math.min(this.moviesTotalPage, startPage + 4);
      const pages = [];
      for (let page = startPage; page <= endPage; page++) {
        pages.push(page);
      }
      return pages;
    },
  },
  methods: {
    showActor(id) {
      DBProvider.fetch("detail/Names/" + id + "?").then((result) => {
        this.actorDetail = result;
        if (result === undefined) {
          alert("No actor found");
          this.isActor = false;
          this.isMain = true;
        } else {
          this.isActor = true;
          this.isMain = false;
        }
      });

      this.isFilm = false;
      this.isSearch = false;
      this.isActor = true;
    },
    showFilm(movie) {
      this.movieDetailId = movie.id;
      DBProvider.fetch("detail/Movies/" + this.movieDetailId + "?").then(
        (result) => {
          if (result === undefined) {
            alert("No film found");
            this.isFilm = false;
            this.isMain = true;
            return;
          } else {
            this.isFilm = true;
            this.isMain = false;
          }
          this.filmDetail = result;
          this.imDb = result.ratings.imDb;
          this.getReviews();
        }
      );
      this.isSearch = false;
      this.isActor = false;
    },

    getReviews() {
      DBProvider.fetch("detail/Reviews/" + this.movieDetailId + "?").then(
        (result) => {
          this.reviews = result.items[0].items;
        }
      );
    },

    onSearchInput() {
      this.searchCurrentPage = 1;
      this.searchTotalPage = 0;
      this.searchResult = [];
    },

    returnHome() {
      this.isLoading = true;
      setTimeout(() => {
        this.isLoading = false; // Tắt hiệu ứng loading
        this.isMain = true;
        this.isFilm = false;
        this.isSearch = false;
        this.isActor = false;
      }, 1000);
    },
    searchMovie() {
      if (this.search.length > 0) {
        DBProvider.fetch(
          "search/Movies/" +
            this.search +
            "?per_page=6&page=" +
            this.searchCurrentPage
        ).then((result) => {
          this.searchResult = result.items;
          this.searchTotalPage = result.total_page;
          this.isMain = false;
          this.isFilm = false;
          this.isActor = false;
          this.isSearch = true;
        });
      } else return;
    },

    goToSearchPage(page) {
      if (page >= 1 && page <= this.searchTotalPage) {
        this.searchCurrentPage = page;
        this.searchMovie();
      }
    },

    prevSearchPage() {
      this.searchCurrentPage =
        (this.searchCurrentPage - 1 + this.searchTotalPage) %
        (this.searchTotalPage + 1);
      this.searchMovie();
    },

    nextSearchPage() {
      this.searchCurrentPage =
        (this.searchCurrentPage + 1) % this.searchTotalPage;
      this.searchMovie();
    },

    prevLastedMovie() {
      this.lastedMoviesCurrentIndex =
        (this.lastedMoviesCurrentIndex - 1 + this.lastedMovies.length) %
        this.lastedMovies.length;
    },

    nextLastedMovie() {
      this.lastedMoviesCurrentIndex =
        (this.lastedMoviesCurrentIndex + 1) % this.lastedMovies.length;
    },

    fetchPopularMovies() {
      DBProvider.fetch(
        "get/MostPopularMovies/?per_page=3&page=" +
          this.popularMoviesCurrentPage
      ).then((result) => {
        this.popularMovies = result.items;
        this.popularMoviesTotalPage = result.total_page;
      });
    },
    prevPopularPage() {
      this.popularMoviesCurrentPage =
        (this.popularMoviesCurrentPage - 1 + this.popularMoviesTotalPage) %
        (this.popularMoviesTotalPage + 1);
    },

    nextPopularPage() {
      this.popularMoviesCurrentPage =
        (this.popularMoviesCurrentPage + 1) % this.popularMoviesTotalPage;
    },

    goToPage(page) {
      if (page >= 1 && page <= this.popularMoviesTotalPage) {
        this.popularMoviesCurrentPage = page;
      }
    },

    fetchRatingMovies() {
      DBProvider.fetch(
        "get/Top50Movies/?per_page=3&page=" + this.moviesCurrentPage
      ).then((result) => {
        this.movies = result.items;
        this.moviesTotalPage = result.total_page;
      });
    },
    prevRatingPage() {
      this.moviesCurrentPage =
        (this.moviesCurrentPage - 1 + this.moviesTotalPage) %
        (this.moviesTotalPage + 1);
    },

    nextRatingPage() {
      this.moviesCurrentPage =
        (this.moviesCurrentPage + 1) % this.moviesTotalPage;
    },

    goToRatingPage(page) {
      if (page >= 1 && page <= this.moviesTotalPage) {
        this.moviesCurrentPage = page;
      }
    },
  },
});

searchFilm.mount("#container");
