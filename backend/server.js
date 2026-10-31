import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import neo4j from "neo4j-driver";

const app = express();
const port = Number(process.env.PORT || 3000);
const databaseName = process.env.MONGODB_DB || "popcornpicks";
const tmdbUrl = (process.env.TMDB_API_URL || "https://api.themoviedb.org/3").replace(/\/$/, "");
const configuredTmdbAttempts = Number(process.env.TMDB_MAX_ATTEMPTS || 3);
const configuredTmdbRetryDelay = Number(process.env.TMDB_RETRY_DELAY_MS || 300);
const tmdbMaxAttempts = Number.isFinite(configuredTmdbAttempts)
  ? Math.max(1, Math.floor(configuredTmdbAttempts))
  : 3;
const tmdbRetryDelayMs = Number.isFinite(configuredTmdbRetryDelay)
  ? Math.max(0, configuredTmdbRetryDelay)
  : 300;
const tmdbRetryableCodes = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"]);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const tmdbRequest = async (path, params = {}) => {
  const url = new URL(`${tmdbUrl}${path}`);
  url.search = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY || "",
    language: "en-US",
    ...params,
  }).toString();
  for (let attempt = 1; attempt <= tmdbMaxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const responseType = response.headers.get("content-type") || "unknown";
        const error = new Error(`TMDB returned HTTP ${response.status} (${responseType}).`);
        if (response.status < 500 && response.status !== 429) throw error;
        throw error;
      } else {
        const body = await response.json();
        if (body.success === false) {
          throw new Error(body.status_message || "TMDB request failed.");
        }
        return body;
      }
    } catch (error) {
      const code = error?.cause?.code || error?.code;
      const isTimeout = error?.name === "TimeoutError";
      const isRetryable = isTimeout || tmdbRetryableCodes.has(code) ||
        error?.message?.startsWith("TMDB returned HTTP 5") ||
        error?.message?.startsWith("TMDB returned HTTP 429");
      if (!isRetryable || attempt === tmdbMaxAttempts) {
        if (isTimeout) {
          throw new Error("TMDB did not respond within 15 seconds. Check the server's network access.");
        }
        if (tmdbRetryableCodes.has(code)) {
          throw new Error(`The server could not connect to TMDB (${code}). Check firewall, proxy, VPN, and DNS settings.`);
        }
        throw error;
      }
      await wait(tmdbRetryDelayMs * attempt);
    }
  }
};
const tmdbImageUrl = (path) =>
  path ? `https://image.tmdb.org/t/p/w500${path}` : null;
const neo4jNumber = (value) =>
  value && typeof value.toNumber === "function" ? value.toNumber() : value;

app.use(cors());
app.use(express.json());

app.use((error, _req, res, next) => {
  if (
    error?.status === 400 &&
    (error.type === "entity.parse.failed" ||
      (error instanceof SyntaxError && "body" in error))
  ) {
    return res.status(400).json({ error: "Request body must contain valid JSON." });
  }
  return next(error);
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  dob: { type: String, required: true },
  age: { type: Number, required: true, min: 0, max: 130 },
  passwordHash: { type: String, required: true },
  languages: { type: [String], default: [] },
  genres: { type: [String], default: [] },
}, { timestamps: true });
const User = mongoose.model("User", userSchema);
const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  movieId: { type: String, required: true },
  action: { type: String, enum: ["liked", "disliked", "unwatched"], required: true },
  movie: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
feedbackSchema.index({ userId: 1, movieId: 1 }, { unique: true });
const Feedback = mongoose.model("Feedback", feedbackSchema);

const neo4jDriver = process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD
  ? neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  )
  : null;

const signToken = (user) =>
  jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Authentication required." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub);
    if (!req.user) return res.status(401).json({ error: "User not found." });
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired authentication token." });
  }
};

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, dob, password } = req.body;
    if (!name || !email || !dob || !password || password.length < 8) {
      return res.status(400).json({ error: "Name, email, date of birth, and an 8-character password are required." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });
    const birthDate = new Date(`${dob}T00:00:00Z`);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      return res.status(400).json({ error: "Date of birth must be a valid date in the past." });
    }
    const today = new Date();
    const age = today.getUTCFullYear() - birthDate.getUTCFullYear() -
      (today < new Date(Date.UTC(today.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate())) ? 1 : 0);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      dob,
      age,
      passwordHash: await bcrypt.hash(password, 12),
    });
    return res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Registration failed:", error);
    return res.status(500).json({ error: "Unable to create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    return res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ error: "Unable to sign in." });
  }
});

const normalise = (value) => String(value).trim().toLowerCase();
const tmdbLanguages = new Map([
  ["english", "en"], ["hindi", "hi"], ["telugu", "te"], ["tamil", "ta"],
  ["malayalam", "ml"], ["kannada", "kn"], ["japanese", "ja"], ["korean", "ko"],
  ["spanish", "es"],
]);
const tmdbGenres = new Map([
  ["action", 28], ["adventure", 12], ["animation", 16], ["comedy", 35],
  ["crime", 80], ["documentary", 99], ["drama", 18], ["fantasy", 14],
  ["horror", 27], ["mystery", 9648], ["romance", 10749], ["science-fiction", 878],
  ["sci-fi", 878], ["thriller", 53],
]);
const tmdbGenreNames = new Map([
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"],
  [80, "Crime"], [99, "Documentary"], [18, "Drama"], [14, "Fantasy"],
  [27, "Horror"], [9648, "Mystery"], [10749, "Romance"], [878, "Science Fiction"],
  [53, "Thriller"],
]);
const mapTmdbMovie = (movie, source = "tmdb") => ({
  id: String(movie.id),
  title: movie.title,
  releaseDate: movie.release_date || null,
  year: Number(movie.release_date?.slice(0, 4)) || null,
  rating: movie.vote_average ?? null,
  posterUrl: tmdbImageUrl(movie.poster_path),
  genres: (movie.genre_ids || []).map((id) => tmdbGenreNames.get(id)).filter(Boolean).join(", "),
  language: movie.original_language || "",
  plot: movie.overview || "Overview unavailable.",
  source,
});

app.post("/api/movies", auth, async (req, res) => {
  try {
    const languages = Array.isArray(req.body.languages) ? req.body.languages.map(normalise) : [];
    const genres = Array.isArray(req.body.genres) ? req.body.genres.map(normalise) : [];
    const currentYear = new Date().getFullYear();
    const year = currentYear;
    const birthYear = Number(String(req.user.dob).slice(0, 4));
    if (!languages.length || !genres.length) {
      return res.status(400).json({ error: "Select at least one language and one genre." });
    }
    if (!Number.isInteger(birthYear) || birthYear < 1880 || birthYear > year) {
      return res.status(400).json({ error: "The account has an invalid birth date." });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { languages, genres } },
      { new: true, runValidators: true },
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "Authenticated user was not found." });
    }
    if (!process.env.TMDB_API_KEY) {
      return res.status(503).json({
        error: "Preferences were saved, but TMDB_API_KEY is not configured on the server.",
      });
    }

    const requestedLanguages = languages
      .map((language) => tmdbLanguages.get(language))
      .filter(Boolean);
    const requestedGenres = genres
      .map((genre) => tmdbGenres.get(genre))
      .filter(Boolean);
    const candidateRequests = requestedLanguages.flatMap((language) =>
      requestedGenres.map((genre) =>
        tmdbRequest("/discover/movie", {
          with_original_language: language,
          with_genres: String(genre),
          include_adult: "false",
          sort_by: "popularity.desc",
          "vote_count.gte": "10",
          page: "1",
        }),
      ),
    );
    const candidateResults = await Promise.allSettled(candidateRequests);
    const candidatePages = candidateResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);
    const failedRequests = candidateResults.filter((result) => result.status === "rejected");
    if (failedRequests.length) {
      console.error(`TMDB movie lookup had ${failedRequests.length} failed request(s).`);
    }
    if (!candidatePages.length) {
      throw failedRequests[0]?.reason || new Error("TMDB returned no movie results.");
    }
    const unique = new Map(
      candidatePages
        .flatMap((page) => page.results || [])
        .filter((movie) => {
          const movieYear = Number(movie.release_date?.slice(0, 4));
          return movieYear >= birthYear && movieYear <= year;
        })
        .map((movie) => [movie.id, mapTmdbMovie(movie)]),
    );
    const movies = [...unique.values()].slice(0, 10);
    return res.json({
      movies,
      preferencesSaved: true,
      preferences: {
        languages: updatedUser.languages,
        genres: updatedUser.genres,
      },
    });
  } catch (error) {
    console.error("Movie lookup failed:", error);
    const message = error instanceof Error ? error.message : "Unknown TMDB error.";
    return res.status(502).json({
      error: `Unable to retrieve movies from TMDB. ${message}`,
    });
  }
});

app.post("/api/feedback", auth, async (req, res) => {
  const { movie, action } = req.body;
  if (!movie?.id || !["liked", "disliked", "unwatched"].includes(action)) {
    return res.status(400).json({ error: "A movie and valid feedback action are required." });
  }

  try {
    const feedback = await Feedback.findOneAndUpdate(
      { userId: req.user.id, movieId: movie.id },
      { $set: { action, movie } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    let graphSync = "not-configured";

    if (neo4jDriver) {
      graphSync = "synced";
      const session = neo4jDriver.session();
      try {
        await session.run(
          `MERGE (u:User {userId: $userId})
           MERGE (m:Movie {movieId: $movieId})
           SET m.title = $title, m.year = $year, m.rating = $rating,
               m.genres = $genres, m.languages = $languages,
               m.posterUrl = $posterUrl, m.plot = $plot
           WITH u, m
           OPTIONAL MATCH (u)-[old:LIKED|DISLIKED|UNWATCHED]->(m)
           DELETE old
           WITH u, m
           FOREACH (_ IN CASE WHEN $action = 'LIKED' THEN [1] ELSE [] END |
             CREATE (u)-[:LIKED]->(m))
           FOREACH (_ IN CASE WHEN $action = 'DISLIKED' THEN [1] ELSE [] END |
             CREATE (u)-[:DISLIKED]->(m))
           FOREACH (_ IN CASE WHEN $action = 'UNWATCHED' THEN [1] ELSE [] END |
             CREATE (u)-[:UNWATCHED]->(m))
           RETURN u`,
          {
            userId: req.user.id.toString(),
            movieId: movie.id,
            title: movie.title || "",
            year: movie.year || "",
            rating: movie.rating || 0,
            genres: typeof movie.genres === "string"
              ? movie.genres.split(",").map((genre) => genre.trim()).filter(Boolean)
              : movie.genres || [],
            languages: typeof movie.language === "string"
              ? movie.language.split(",").map((language) => language.trim()).filter(Boolean)
              : movie.languages || [],
            posterUrl: movie.posterUrl || null,
            plot: movie.plot || "",
            action: action.toUpperCase(),
          },
        );
      } catch (error) {
        graphSync = "failed";
        console.error("Neo4j feedback synchronization failed:", error);
      } finally {
        try {
          await session.close();
        } catch (error) {
          console.error("Neo4j feedback session close failed:", error);
        }
      }
    }

    return res.status(201).json({
      feedbackId: feedback.id,
      action,
      graphSync,
    });
  } catch (error) {
    console.error("Feedback save failed:", error);
    return res.status(500).json({ error: "Unable to save movie feedback." });
  }
});

app.get("/api/recommendations", auth, async (req, res) => {
  if (!neo4jDriver) {
    return res.status(503).json({
      error: "Neo4j is not configured. Add NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD.",
    });
  }

  const session = neo4jDriver.session();
  try {
    const allowedLanguages = (req.user.languages || [])
      .map(normalise)
      .map((language) => tmdbLanguages.get(language))
      .filter(Boolean);
    const allowedGenres = (req.user.genres || [])
      .map(normalise)
      .map((genre) => tmdbGenres.get(genre))
      .map((genreId) => tmdbGenreNames.get(genreId))
      .filter(Boolean);
    let result;
    try {
      result = await session.run(
      `MATCH (u:User {userId: $userId})
       OPTIONAL MATCH (u)-[:LIKED]->(liked:Movie)
       WITH u, collect(DISTINCT liked) AS likedMovies
       OPTIONAL MATCH (u)-[:DISLIKED]->(disliked:Movie)
       WITH u, likedMovies, collect(DISTINCT disliked) AS dislikedMovies
       MATCH (candidate:Movie)
       WHERE size(likedMovies) > 0
         AND NOT candidate IN likedMovies
         AND NOT (u)-[:LIKED]->(candidate)
         AND NOT (u)-[:DISLIKED]->(candidate)
         AND NOT (u)-[:UNWATCHED]->(candidate)
         AND any(language IN coalesce(candidate.languages, [])
                 WHERE language IN $allowedLanguages)
         AND any(genre IN coalesce(candidate.genres, [])
                 WHERE genre IN $allowedGenres)
       OPTIONAL MATCH (other:User)-[:LIKED]->(sharedLiked:Movie)
       WHERE other <> u
         AND sharedLiked IN likedMovies
         AND (other)-[:LIKED]->(candidate)
       WITH candidate, likedMovies, dislikedMovies,
            count(DISTINCT other) AS collaborativeUsers
       WITH candidate,
            reduce(
              contentScore = 0,
              likedMovie IN likedMovies |
              contentScore +
              size([
                genre IN coalesce(candidate.genres, [])
                WHERE genre IN coalesce(likedMovie.genres, [])
              ])
            ) -
            reduce(
              dislikePenalty = 0,
              dislikedMovie IN dislikedMovies |
              dislikePenalty +
              size([
                genre IN coalesce(candidate.genres, [])
                WHERE genre IN coalesce(dislikedMovie.genres, [])
              ])
            ) AS contentScore,
            collaborativeUsers
       RETURN candidate.movieId AS id,
              candidate.title AS title,
              candidate.year AS year,
              candidate.rating AS rating,
              candidate.posterUrl AS posterUrl,
              candidate.genres AS genres,
              candidate.languages AS languages,
              candidate.plot AS plot,
              (contentScore + collaborativeUsers * 2) AS score
       ORDER BY score DESC, rating DESC
       LIMIT 20`,
      {
        userId: req.user.id.toString(),
        allowedLanguages,
        allowedGenres,
        },
      );
    } catch (error) {
      console.error("Neo4j recommendation query failed:", error);
      result = { records: [] };
    }

    const movies = result.records.map((record) => ({
      id: record.get("id"),
      title: record.get("title"),
      year: neo4jNumber(record.get("year")),
      rating: neo4jNumber(record.get("rating")),
      posterUrl: record.get("posterUrl"),
      genres: (record.get("genres") || []).join(", "),
      language: (record.get("languages") || []).join(", "),
      plot: record.get("plot") || "Overview unavailable.",
      recommendationScore: neo4jNumber(record.get("score")),
      source: "neo4j",
    }));
    if (movies.length < 20 && process.env.TMDB_API_KEY) {
      const feedback = await Feedback.find({ userId: req.user.id })
        .select("movieId -_id")
        .lean();
      const excludedIds = new Set(feedback.map((item) => item.movieId));
      const requestedLanguages = (req.user.languages || [])
        .map(normalise)
        .map((language) => tmdbLanguages.get(language))
        .filter(Boolean);
      const requestedGenres = (req.user.genres || [])
        .map(normalise)
        .map((genre) => tmdbGenres.get(genre))
        .filter(Boolean);
      const birthYear = Number(String(req.user.dob).slice(0, 4));
      const currentYear = new Date().getFullYear();
      const existingIds = new Set(movies.map((movie) => movie.id));
      try {
        const pages = await Promise.all(
          requestedLanguages.flatMap((language) =>
            requestedGenres.map((genre) =>
              tmdbRequest("/discover/movie", {
                with_original_language: language,
                with_genres: String(genre),
                include_adult: "false",
                sort_by: "vote_average.desc",
                "vote_count.gte": "50",
                page: "1",
              }),
            ),
          ),
        );
        for (const movie of pages
          .flatMap((page) => page.results || [])
          .filter((candidate) => {
            const movieYear = Number(candidate.release_date?.slice(0, 4));
            return (
              !excludedIds.has(String(candidate.id)) &&
              !existingIds.has(String(candidate.id)) &&
              movieYear >= birthYear &&
              movieYear <= currentYear
            );
          })) {
          if (movies.length >= 20) break;
          const mappedMovie = mapTmdbMovie(movie, "tmdb");
          movies.push(mappedMovie);
          existingIds.add(mappedMovie.id);
        }
      } catch (error) {
        console.error("TMDB recommendation fallback failed:", error);
      }
    }
    return res.json({
      movies,
      personalizedCount: movies.filter((movie) => movie.source === "neo4j").length,
      message: movies.length
        ? undefined
        : "Like at least one movie and make sure movie feedback has been saved before requesting recommendations.",
    });
  } catch (error) {
    console.error("Recommendation query failed:", error);
    return res.status(502).json({ error: "Unable to generate recommendations." });
  } finally {
    try {
      await session.close();
    } catch (error) {
      console.error("Neo4j recommendation session close failed:", error);
    }
  }
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);
  return res.status(500).json({ error: "Internal server error." });
});

mongoose.connect(process.env.MONGOURI, { dbName: databaseName })
  .then(() => {
    console.log(`MongoDB connected to database "${mongoose.connection.name}"`);
    return app.listen(port, () => console.log(`PopcornPicks API listening on ${port}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exitCode = 1;
  });
