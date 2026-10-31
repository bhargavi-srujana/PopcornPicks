# PopcornPicks — Project Understanding

**PopcornPicks** is a movie recommendation and review engine. A user tells us which
languages they watch and which genres they like, we fetch candidate movies from an
external movie API, ask "did you enjoy this one?", and then use the accumulated
likes/dislikes to recommend better movies over time. The interest network
(user ↔ movie ↔ user) lives in **Neo4j**, while user accounts and profile/preferences
live in **MongoDB**.

---

## 1. Current state of the repository (audited)

```
PopcornPicks/
├── backend/          ← empty (not yet implemented)
├── frontend/         ← Vite + React 19 + Tailwind CSS v4
│   ├── src/
│   │   ├── main.jsx              # React 19 entry, StrictMode
│   │   ├── App.jsx               # renders <Selection/>; <Home/> is commented out
│   │   ├── index.css             # single `@import "tailwindcss"`
│   │   ├── pages/
│   │   │   ├── Home.jsx          # landing/splash screen
│   │   │   └── Selection.jsx     # language + genre onboarding wizard
│   │   ├── components/
│   │   │   └── AnimatedDoors.jsx # Lottie "open the doors" CTA
│   │   └── assets/               # language/genre art, lobby/landing images, door.json, videos
│   ├── dist/                     # pre-built bundle (committed)
│   ├── vite.config.js            # react + tailwindcss plugins, no proxy configured
│   ├── eslint.config.js          # js.recommended + react-hooks + react-refresh (ignores dist)
│   └── package.json
└── description.md
```

### Stack in use today
| Layer | Choice |
| --- | --- |
| Frontend | React 19.2, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), `lottie-react` |
| Lint | ESLint flat config (`npm run lint`) |
| Routing | **None** — `App.jsx` hard-renders one page instead of using a router |
| Backend | **None yet** (`backend/` is empty) |
| Databases | **Not yet wired** — no Neo4j/Mongo drivers installed |
| Movie data | **Not yet wired** — no fetch/axios calls anywhere |

### Screens that exist

1. **Home (`Home.jsx`)** — cinematic landing page: `landing1.png` background with a
   directional gradient overlay, decorative `branch.svg` / `cat.svg` art, and an
   `AnimatedDoors` Lottie widget on the right (a "Open the doors" button that plays
   `door.json` once and resets on completion). Currently commented out in `App.jsx`.
2. **Selection (`Selection.jsx`)** — two-step, state-machine style onboarding:
   - `step === "language"`: multi-select grid of **9 languages** (English, Hindi,
     Telugu, Tamil, Malayalam, Kannada, Japanese, Korean, Spanish), each with a
     poster-style image; "Next" appears only when ≥1 language is chosen.
   - `step === "genre"`: multi-select chips for **12 genres** (Action, Comedy,
     Drama, Horror, Romance, Thriller, Sci-Fi, Fantasy, Mystery, Animation,
     Adventure, Crime); "Back" returns to step 1; "Start Swiping" appears when
     ≥1 genre is chosen and currently only does `console.log(...)`.
   - Local state: `step`, `selectedLanguages[]`, `selectedGenres[]`; a shared
     `toggle(list, id)` helper adds/removes selections.
   - Visual language: vintage cinema/marquee theme — dark brown `#24150F` lobby
     photo with a `bg-black/80` scrim, amber `#f59e0b`-family headings with text
     shadow, maroon `#8a1a1c` primary buttons with a gold `#f2e3a3` serif label,
     cream inactive tiles that turn maroon when active.

### Known issues / gaps found during the audit
- `npm run lint` fails: `'Home' is defined but never used` in `src/App.jsx:2` (the
  page is commented out of the render tree).
- No router, so no way to move Home → Selection → results without editing code.
- No API base URL / proxy in `vite.config.js`, so the future backend cannot be
  reached yet.
- `index.html` title is still the default `"frontend"`; favicon points at
  `/favicon.svg` which is not in `public/`.
- Preferences are discarded after `console.log` — nothing is persisted.
- `dist/` is committed while also listed in `.gitignore` conventions (only the
  eslint config ignores it).

---

## 2. Intended product flow

```
Landing (doors open)
   └─> Onboarding: pick languages  ─┐
        └─> pick genres ────────────┤
                                    v
                     Backend fetches candidates from Movie API
                     (filtered by language ∩ genre, minus already-seen)
                                    │
                                    v
                     Swipe/feedback loop: "Did you enjoy watching this?"
                        ├── Like   -> REL:like     -> Neo4j
                        ├── Dislike-> REL:dislike  -> Neo4j
                        └── Skip   -> not stored
                                    │
                                    v
                     Recommend more movies:
                       a) content-based: same genres/language as liked movies
                       b) collaborative: people who liked the same movies also liked ...
                       c) cold-start: popularity of chosen languages/genres
                                    │
                                    v
                     Profile page: history, ratings, taste summary
```

Feedback is the core loop: every explicit like/dislike reshapes the Neo4j graph and
therefore the next batch of recommendations.

---

## 3. Planned architecture

### Frontend (React)
- Pages: Home, Selection (languages → genres), Swipe/Recommendations, Profile,
  (optional) Login/Signup.
- Talks only to the PopcornPicks REST API (no direct DB access from the browser).
- Needs: a router (`react-router-dom`), an HTTP client (axios/fetch wrapper),
  and a Vite dev proxy to the backend.

### Backend (Node/Express — to be built in `backend/`)
Responsibilities:
1. **Auth & profiles** — register/login, JWT/session, read/write user profile.
2. **Preference onboarding** — store chosen languages and genres.
3. **Candidate generation** — call the external Movie API
   (TMDB / OMDb / MovieDB style) with `language` + `genre` filters, dedupe against
   seen movies, return a swipe deck.
4. **Feedback ingestion** — record like/dislike/skip per user-movie.
5. **Recommendation engine** — Cypher queries over Neo4j + profile data from MongoDB.
6. **Search / detail** — movie details (poster, overview, rating) for cards.

Suggested endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | account + JWT |
| GET/PUT | `/api/profile` | MongoDB profile (name, languages, genres) |
| GET | `/api/movies?languages=&genres=&exclude=` | swipe deck from Movie API |
| GET | `/api/movies/:id` | details for a card |
| POST | `/api/feedback` | `{ userId, movieId, action: like\|dislike\|skip }` |
| GET | `/api/recommendations` | personalised list from Neo4j |
| GET | `/api/likes` | history for the profile page |

### MongoDB — user profile storage (document model)
```
users: {
  _id, name, email, passwordHash,
  languages: ["english", "tamil", ...],        // from Selection step 1
  genres:    ["thriller", "sci-fi", ...],      // from Selection step 2
  createdAt, lastActive
}
sessions / refreshTokens (if using stateful auth)
optional: movie_cache { tmdbId, title, poster, ... }  // reduce Movie API calls
```
MongoDB holds *identity and stated preferences* — data that is document-shaped and
per-user.

### Neo4j — movie/user liking network (graph model)
```
(:User  { userId, name })
(:Movie { tmdbId, title, year, languages[], genres[] })

(:User)-[:LIKED     { at, rating? }]->(:Movie)
(:User)-[:DISLIKED  { at }]->(:Movie)
(:User)-[:PREFERS   { weight }]->(:Language { name })
(:User)-[:PREFERS   { weight }]->(:Genre    { name })
(:Movie)-[:IN_GENRE]->(:Genre)
(:Movie)-[:IN_LANGUAGE]->(:Language)
(:Movie)-[:SIMILAR_TO { score }]->(:Movie)      // precomputed, optional
```
Recommended Cypher patterns:
- **Cold start** — top movies for the user's `PREFERS` genres/languages:
  `MATCH (m:Movie)-[:IN_GENRE]->(g) WHERE g.name IN $genres ...`
- **Item-based collaborative** — `MATCH (u:User)-[:LIKED]->(m)<-[:LIKED]-(o:User)
  -[:LIKED]->(rec) WHERE u.userId=$id AND NOT ... RETURN rec`
- **Popularity** — count `LIKED` incoming edges, optionally weighted by recency.

Neo4j stores *relationships and behaviour* — what is connected to what, which is
exactly what a graph DB is good at.

### External Movie API
Source of truth for catalogue metadata (posters, overviews, ratings, genre IDs).
The backend normalises API genre IDs ↔ the 12 UI genre slugs in `Selection.jsx`
and maps language codes (`en`, `hi`, `ta`, `te`, `ml`, `kn`, `ja`, `ko`, `es`).

---

## 4. How the pieces map to the code that exists

| Existing code | Role in the final system |
| --- | --- |
| `Selection.jsx` `selectedLanguages` | → `PUT /api/profile` → `users.languages` + `(:User)-[:PREFERS]->(:Language)` |
| `Selection.jsx` `selectedGenres` | → `PUT /api/profile` → `users.genres` + `(:User)-[:PREFERS]->(:Genre)` |
| "Start Swiping" button (`console.log` today) | → navigates to the swipe deck fed by `GET /api/movies` |
| (not yet built) swipe card "did you enjoy?" | → `POST /api/feedback` → `(:User)-[:LIKED|:DISLIKED]->(:Movie)` |
| (not yet built) recommendations screen | → `GET /api/recommendations` → Cypher over Neo4j |
| `Home.jsx` + `AnimatedDoors` | entry/CTA into the onboarding flow |

---

## 5. Suggested next steps

1. Fix lint (`App.jsx` unused `Home`) and add `react-router-dom` with real routes.
2. Scaffold `backend/` (Express + `dotenv`), add `/health`, configure the Vite proxy.
3. Persist the onboarding selection: API client call instead of `console.log`.
4. Connect MongoDB (`mongodb` driver or Mongoose) for `users`.
5. Connect Neo4j (`neo4j-driver`) and create the schema indexes/constraints
   (`CREATE CONSTRAINT FOR (u:User) REQUIRE u.userId IS UNIQUE`, etc.).
6. Integrate the Movie API for the swipe deck, with genre/language mapping.
7. Implement feedback endpoint + the two core recommendation Cypher queries.
8. Build the swipe UI and the profile/history page.

---

*Audit performed against the repository as of commit `2ebd4ca` ("preload images");
`backend/` contains no files, so sections 2–3 describe the intended design rather
than implemented code.*
