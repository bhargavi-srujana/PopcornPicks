import { useState } from "react";
import image from "../assets/background.png";
import "./SwipeMovies.css";

const SwipeMovies = ({ token, movies = [], onBackToGenres }) => {
  const [index, setIndex] = useState(0);
  const [deck, setDeck] = useState(movies);
  const [swipeDeck] = useState(movies);
  const [isRecommended, setIsRecommended] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await fetch("/api/recommendations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load recommendations.");
      if (!body.movies?.length) {
        throw new Error(body.message || "No recommendations are available yet.");
      }
      setDeck(body.movies);
      setIndex(0);
      setIsRecommended(true);
      setError("");
    } catch (recommendationError) {
      setError(recommendationError.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const submitFeedback = async (action) => {
    const movie = deck[index];
    if (!movie) return;

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movie, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save feedback.");
      setError("");
      setDetailsOpen(false);
      setIndex((current) => current + 1);
    } catch (feedbackError) {
      setError(feedbackError.message);
    }
  };

  const returnToSwipeMovies = () => {
    setDeck(swipeDeck);
    setIndex(0);
    setIsRecommended(false);
    setError("");
  };

  const movie = deck[index];
  const recommendationGrid = isRecommended && deck.length > 0;

  return (
    <main
      className="swipe-page relative isolate min-h-screen w-full overflow-hidden text-amber-50"
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="swipe-page__veil" />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-5 pb-8 pt-7 my-5 sm:px-8">
        <header className="swipe-heading text-center">
          <button
            type="button"
            className="swipe-navigation__back"
            onClick={onBackToGenres}
          >
            Back to genres
          </button>
          <p className="swipe-kicker">Popcorn Picks</p>
          <h1>{recommendationGrid ? "Your next favourite awaits." : "Your movie journey begins."}</h1>
          <p>Swipe to discover your kind of cinema.</p>
          <span className="swipe-heading__star">✦</span>
        </header>

        {recommendationGrid ? (
          <>
            <button type="button" className="swipe-navigation__back swipe-navigation__back--recommendations" onClick={returnToSwipeMovies}>
              Back to swipe movies
            </button>
            <div className="mt-8 grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deck.map((recommendedMovie) => (
                <article key={recommendedMovie.id} className="group overflow-hidden rounded-3xl border border-amber-100/15 bg-black/40 shadow-2xl backdrop-blur-sm">
                  {recommendedMovie.posterUrl ? (
                    <img src={recommendedMovie.posterUrl} alt="" className="h-80 w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-80 items-center justify-center bg-amber-950/60 text-amber-200/70">No poster available</div>
                  )}
                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                        {recommendedMovie.source === "neo4j" ? "Taste match" : "Curated pick"}
                      </span>
                      <span className="text-sm font-semibold text-amber-300">★ {recommendedMovie.rating ?? "N/A"}</span>
                    </div>
                    <h2 className="font-serif text-2xl leading-tight text-amber-100">{recommendedMovie.title}</h2>
                    <p className="mt-2 text-sm text-amber-200/65">{recommendedMovie.year || "Year unavailable"}</p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-amber-200/60">{recommendedMovie.genres || "Various genres"}</p>
                    <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-amber-50/70">{recommendedMovie.plot}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : movie ? (
          <>
            <div className="swipe-stage" aria-label="Movie swipe selection">
              {/* <div className="swipe-hint swipe-hint--left">
                <span>↙</span>
                <strong>Swipe Left</strong>
                <small>Not for me</small>
              </div>
              <div className="swipe-hint swipe-hint--right">
                <span>↘</span>
                <strong>Swipe Right</strong>
                <small>Add to my picks</small>
              </div> */}

              <div className="movie-stack">
                {deck[index + 2] && <div className="movie-card movie-card--back" />}
                {deck[index + 1] && <div className="movie-card movie-card--middle" style={{ backgroundImage: `url(${deck[index + 1].posterUrl})` }} />}
                <article className="movie-card movie-card--active">
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt="" />
                  ) : (
                    <div className="movie-card__empty">No poster available</div>
                  )}
                  <span className="movie-card__heart" aria-hidden="true">♡</span>
                </article>
              </div>
            </div>

            <div className="movie-copy text-center">
              <h2>{movie.title}</h2>
              <p>{movie.genres || "Various genres"} <span>·</span> {movie.year || "Year unavailable"}</p>
              <p className="movie-copy__plot">{movie.plot}</p>
            </div>

            <div className="swipe-actions">
              <button type="button" className="swipe-action swipe-action--pass" onClick={() => submitFeedback("disliked")} aria-label="Pass on this movie">
                <span>×</span><small>Pass</small>
              </button>
              <button type="button" className="swipe-action swipe-action--like" onClick={() => submitFeedback("liked")} aria-label="Like this movie">
                <span>♥</span><small>Like</small>
              </button>
              <button type="button" className="swipe-action swipe-action--details" onClick={() => setDetailsOpen(true)} aria-label="Show movie details">
                <span>i</span><small>Details</small>
              </button>
            </div>

            {detailsOpen && (
              <div className="movie-details" role="dialog" aria-modal="true" aria-label={`${movie.title} details`}>
                <button type="button" className="movie-details__close" onClick={() => setDetailsOpen(false)} aria-label="Close details">×</button>
                <h2>{movie.title}</h2>
                <p>{movie.plot}</p>
                <button type="button" onClick={() => submitFeedback("unwatched")}>Mark as unwatched</button>
              </div>
            )}
          </>
        ) : (
          <div className="swipe-empty">
            <p>{isRecommended ? "No more recommendations are available yet." : "You have reached the end of this deck."}</p>
            {!isRecommended && (
              <button type="button" onClick={loadRecommendations} disabled={loadingRecommendations}>
                {loadingRecommendations ? "Building recommendations..." : "Show recommended movies"}
              </button>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-center text-red-200">{error}</p>}
      </section>
    </main>
  );
};

export default SwipeMovies;
