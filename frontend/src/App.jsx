import { useCallback, useEffect, useRef, useState } from "react";
import Home from "./pages/Home";
import Selection from "./pages/Selection";
import SwipeMovies from "./pages/SwipeMovies";

// ms after the doors finish opening:
// 1150 golden flash fills · 1550 selection revealed under the flash · 2400 settled
const TIMING = { flashIn: 1150, reveal: 1550, done: 2400 };

const App = () => {
  // home → push (camera) → flashIn → reveal → done
  const [phase, setPhase] = useState("home");
  const [auth, setAuth] = useState(null);
  const [movies, setMovies] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [showSwipe, setShowSwipe] = useState(false);
  const [returnToGenres, setReturnToGenres] = useState(false);
  const startedRef = useRef(false);
  const timersRef = useRef([]);

  const handleDoorsComplete = useCallback(() => {
    if (startedRef.current) return; // no repeated transitions
    startedRef.current = true;

    setPhase("push");

    const schedule = (fn, ms) => timersRef.current.push(setTimeout(fn, ms));
    schedule(() => setPhase("flashIn"), TIMING.flashIn);
    schedule(() => setPhase("reveal"), TIMING.reveal);
    schedule(() => setPhase("done"), TIMING.done);
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    []
  );

  // no scrolling while the transition runs
  useEffect(() => {
    if (phase === "home" || phase === "done") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const flashClass =
    phase === "flashIn" ? " is-on" : phase === "reveal" ? " is-off" : "";

  return (
    <div className="pp-app" data-phase={phase}>
      {phase !== "done" && (
        <Home
          onDoorsComplete={handleDoorsComplete}
          onAuthSuccess={setAuth}
          pushing={phase !== "home"}
        />
      )}

      {!showSwipe && (phase === "reveal" || phase === "done") && (
        <div
          className={`selection-layer is-in${
            phase === "done" ? " is-interactive" : ""
          }`}
        >
          <Selection
            token={auth?.token}
            selectedLanguages={selectedLanguages}
            onLanguagesChange={setSelectedLanguages}
            onMoviesFound={setMovies}
            onMoviesReady={() => {
              setReturnToGenres(false);
              setShowSwipe(true);
            }}
            initialShowGenres={returnToGenres}
          />
        </div>
      )}

      {showSwipe && (
        <SwipeMovies
          token={auth?.token}
          movies={movies}
          onBackToGenres={() => {
            setReturnToGenres(true);
            setShowSwipe(false);
          }}
        />
      )}

      <div className={`pp-flash${flashClass}`} aria-hidden="true" />
    </div>
  );
};

export default App;
