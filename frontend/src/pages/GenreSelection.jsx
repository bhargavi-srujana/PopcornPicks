import { useState } from 'react';

import image from '../assets/islands/image2.png';
import action from '../assets/islands/action.png';
import comedy from '../assets/islands/comedy.png';
import drama from '../assets/islands/drama.png';
import horror from '../assets/islands/horror.png';
import romance from '../assets/islands/romance.png';
import thriller from '../assets/islands/thriller.png';
import sciFi from '../assets/islands/sci-fi.png';
import fantasy from '../assets/islands/fantasy.png';
import mystery from '../assets/islands/mystery.png';

const genres = [
  { name: 'Action', src: action, position: 'left-10 top-15', width: 'w-[250px]' },
  { name: 'Comedy', src: comedy, position: 'left-20 top-90', width: 'w-[220px]' },
  { name: 'Drama', src: drama, position: 'right-20 top-12', width: 'w-[200px]' },
  { name: 'Horror', src: horror, position: 'left-250 top-40', width: 'w-[200px]' },
  { name: 'Romance', src: romance, position: 'right-150 top-70', width: 'w-[320px]' },
  { name: 'Thriller', src: thriller, position: 'left-90 top-120', width: 'w-[270px]' },
  { name: 'Sci-Fi', src: sciFi, position: 'right-80 top-120', width: 'w-[280px]' },
  { name: 'Fantasy', src: fantasy, position: 'right-10 top-80', width: 'w-[250px]' },
  { name: 'Mystery', src: mystery, position: 'left-90 top-40', width: 'w-[220px]' },
];

const GenreSelection = ({
  token,
  selectedLanguages,
  onMoviesFound,
  onMoviesReady,
  onBack,
}) => {
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]);

  const toggleGenre = (name) => {
    setSelectedGenres((prev) =>
      prev.includes(name)
        ? prev.filter((genre) => genre !== name)
        : [...prev, name]
    );
  };

  const findMovies = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/movies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          languages: selectedLanguages,
          genres: selectedGenres,
        }),
      });
      const responseText = await response.text();
      let body = {};
      try {
        body = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error("The movie service returned an invalid response.");
      }
      if (!response.ok) {
        throw new Error(body.error || "Unable to find movies.");
      }
      setMovies(body.movies);
      onMoviesFound?.(body.movies);
      if (!body.movies?.length) {
        setError("No matching movies were found. Try another language or genre.");
      } else {
        onMoviesReady?.();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative isolate min-h-screen w-full overflow-hidden
                 bg-[#24150F] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${image})` }}
    >
      {/* Dark background overlay */}
      <div className="absolute inset-0 bg-black/70" />

      <button
        type="button"
        onClick={onBack}
        className="absolute left-5 top-5 z-20 rounded-lg border border-amber-300/70 bg-black/40 px-4 py-2 font-serif text-sm text-amber-100 shadow-lg transition hover:bg-amber-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        Back to languages
      </button>

      <h1 className="absolute left-1/2 top-8 z-20 w-full -translate-x-1/2 px-4 text-center font-serif text-3xl font-semibold text-amber-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:top-10 sm:text-4xl">
        Select your favourite genre
      </h1>

      {/* Genre islands */}
      {genres.map((genre) => {
        const isSelected = selectedGenres.includes(genre.name);

        return (
          <button
            key={genre.name}
            type="button"
            aria-label={`Select ${genre.name}`}
            aria-pressed={isSelected}
            onClick={() => toggleGenre(genre.name)}
            className={`absolute ${genre.position} z-10
                        cursor-pointer border-0 bg-transparent p-0
                        transition-transform duration-300
                        hover:scale-105 focus-visible:outline
                        focus-visible:outline-2
                        focus-visible:outline-amber-400`}
          >
            <img
              src={genre.src}
              alt={genre.name}
              draggable="false"
              className={`${genre.width} block h-auto
                          transition-[filter,opacity] duration-500 ease-in-out
                          ${
                            isSelected
                              ? 'grayscale-0 opacity-100'
                              : 'grayscale opacity-60'
                          }`}
            />
          </button>
        );
      })}

      <button
        type="button"
        onClick={findMovies}
        disabled={!selectedGenres.length || loading}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-amber-300/70 bg-amber-800/95 px-7 py-3 font-serif text-base text-amber-50 shadow-lg transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Finding movies..." : "Show me movies"}
      </button>

      {error && (
        <p role="alert" className="absolute bottom-24 left-1/2 z-20 w-full -translate-x-1/2 px-4 text-center text-red-200">
          {error}
        </p>
      )}

      {movies.length > 0 && (
        <section className="absolute inset-x-4 top-24 z-30 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-xl bg-[#24150F]/95 p-4">
          <h2 className="mb-4 text-center font-serif text-2xl text-amber-200">
            Movies for you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {movies.map((movie) => (
              <article key={movie.id} className="overflow-hidden rounded-lg bg-black/40">
                {movie.posterUrl && (
                  <img
                    src={movie.posterUrl}
                    alt=""
                    className="h-64 w-full object-cover"
                  />
                )}
                <div className="p-3 text-amber-50">
                  <h3 className="font-serif text-lg">{movie.title}</h3>
                  <p className="text-sm text-amber-100/70">
                    {movie.year || movie.releaseDate}
                  </p>
                  <p className="mt-2 text-sm text-amber-100/80">{movie.plot}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default GenreSelection;
