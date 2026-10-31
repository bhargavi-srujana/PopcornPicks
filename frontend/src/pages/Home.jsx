
import { useState } from "react";
import landing from "../assets/landing1.png";
import branch from "../assets/branch.svg";
import cat from "../assets/cat.svg";
import AnimatedDoors from "../components/AnimatedDoors";

const Home = ({
  onDoorsComplete,
  onAuthSuccess,
  pushing = false,
}) => {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [doorsTriggered, setDoorsTriggered] = useState(false);
  const [doorsPlaying, setDoorsPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload =
        mode === "signup"
          ? { name: name.trim(), email: email.trim(), dob, password }
          : { email: email.trim(), password };

      const response = await fetch(
        `/api/auth/${mode === "signup" ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      let body = {};
      if (responseText) {
        try {
          body = JSON.parse(responseText);
        } catch {
          throw new Error(
            "The authentication server returned an invalid response. Please restart the backend and try again."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          body.error ||
            (mode === "signup"
              ? "Unable to create account."
              : "Unable to sign in.")
        );
      }

      onAuthSuccess?.(body);
      setDoorsTriggered(true);
    } catch (submitError) {
      setError(
        submitError.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full rounded-md border border-[#D9B28B]/40 " +
    "bg-[#160D09]/40 px-3 py-2.5 text-sm text-[#FFF0DA] " +
    "placeholder:text-[#D0AE8D]/65 outline-none " +
    "transition duration-300 focus:border-[#F5BE70] " +
    "focus:bg-[#160D09]/60 " +
    "focus:shadow-[0_0_12px_rgba(245,190,112,0.12)]";

  const passwordFieldClass =
    "w-full rounded-md border border-[#D9B28B]/40 " +
    "bg-[#160D09]/40 pl-3 pr-11 py-2.5 text-sm text-[#FFF0DA] " +
    "placeholder:text-[#D0AE8D]/65 outline-none " +
    "transition duration-300 focus:border-[#F5BE70] " +
    "focus:bg-[#160D09]/60 " +
    "focus:shadow-[0_0_12px_rgba(245,190,112,0.12)]";

  return (
    <main
      className={`pp-camera relative isolate min-h-screen w-full overflow-hidden
        bg-[#24150F] bg-cover bg-center bg-no-repeat
        ${pushing ? "is-push" : ""}
        ${doorsTriggered || doorsPlaying ? "doors-playing" : ""}`}
      style={{ backgroundImage: `url(${landing})` }}
    >
      {/* Stronger cinematic gradient from the right edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(90deg, " +
            "rgba(36,21,15,0) 30%, " +
            "rgba(36,21,15,0.10) 43%, " +
            "rgba(28,16,11,0.35) 55%, " +
            "rgba(22,12,8,0.68) 68%, " +
            "rgba(18,10,7,0.88) 82%, " +
            "rgba(18,10,7,0.94) 100%)",
        }}
      />

      {/* Soft shadow concentrated behind the form */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[45%]"
        style={{
          background:
            "linear-gradient(90deg, rgba(18,10,7,0.08), rgba(18,10,7,0.22))",
        }}
      />

      {/* Decorative branch */}
      <img
        src={branch}
        alt=""
        className="pointer-events-none absolute left-0 top-0 z-10 w-[min(30rem,40vw)]"
      />

      {/* Cat */}
      <img
        src={cat}
        alt=""
        className="pointer-events-none absolute bottom-32 left-[22%] z-10 w-20"
      />

      {/* Theatre door animation */}
      <div className="absolute inset-y-0 left-200 z-20 flex w-[58%] items-center justify-center">
        <AnimatedDoors
          play={doorsTriggered}
          onPlayingChange={setDoorsPlaying}
          onComplete={onDoorsComplete}
        />
      </div>

      {/* Authentication interface: no solid outer card */}
      <section
        className="
          absolute right-[4%] top-1/2 z-40
          w-[350px] max-w-[calc(100vw-2rem)]
          -translate-y-1/2
          max-h-[94vh] overflow-y-auto overscroll-contain
          px-2 py-4 sm:right-[5%] sm:px-3
        "
      >
        {/* Heading */}
        <header className="mb-5 text-center">
          

          <h1 className="font-serif text-[27px] italic leading-tight text-[#F5D1A6]">
            {mode === "signup"
              ? "Before the story begins..."
              : "Welcome back..."}
          </h1>

          <div className="my-3 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-[#D6A15C]/50" />
            <span className="text-xs text-[#E6B778]">✦</span>
            <span className="h-px w-12 bg-[#D6A15C]/50" />
          </div>

          
        </header>

        {/* Sign Up / Sign In */}
        <div className="mb-5 grid grid-cols-2 rounded-lg border border-[#D9B28B]/30 bg-black/20 p-1">
          {["signup", "signin"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={`rounded-md py-2 font-serif text-sm transition-all duration-300 ${
                mode === tab
                  ? "bg-gradient-to-r from-[#B9470A] to-[#DB640D] text-[#FFF0D9] shadow-[0_0_14px_rgba(219,100,13,0.18)]"
                  : "text-[#D9B99A] hover:bg-white/5"
              }`}
            >
              {tab === "signup" ? "Sign Up" : "Sign In"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Name: signup only */}
          {mode === "signup" && (
            <div>
              <label
                htmlFor="guest-name"
                className="mb-1.5 block font-serif text-sm text-[#EAD0B3]"
              >
                Name
              </label>

              <input
                id="guest-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={60}
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={doorsTriggered || submitting}
                className={fieldClass}
              />
            </div>
          )}

          {/* Email */}
          {(mode === "signup" || mode === "signin") && (
            <div>
              <label
                htmlFor="guest-email"
                className="mb-1.5 block font-serif text-sm text-[#EAD0B3]"
              >
                Email
              </label>

              <input
                id="guest-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={doorsTriggered || submitting}
                className={fieldClass}
              />
            </div>
          )}

          {/* Date of birth: signup only */}
          {mode === "signup" && (
            <div>
              <label
                htmlFor="guest-dob"
                className="mb-1.5 block font-serif text-sm text-[#EAD0B3]"
              >
                Date of birth
              </label>

              <input
                id="guest-dob"
                name="dob"
                type="date"
                autoComplete="bday"
                max={new Date().toLocaleDateString("en-CA")}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                disabled={doorsTriggered || submitting}
                className={`${fieldClass} [color-scheme:dark]`}
              />
            </div>
          )}

          {/* Password with Show / Hide */}
          <div>
            <label
              htmlFor="guest-password"
              className="mb-1.5 block font-serif text-sm text-[#EAD0B3]"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="guest-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={mode === "signup" ? 8 : undefined}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={doorsTriggered || submitting}
                className={passwordFieldClass}
              />

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={doorsTriggered || submitting}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#D9B99A] transition hover:text-[#FFD797] disabled:opacity-50"
              >
                {showPassword ? (
                  /* Eye with slash */
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15 15 0 01-3.1 3.8" />
                    <path d="M6.2 6.2C3.9 7.7 2 12 2 12s3.5 7 10 7a10 10 0 004-.8" />
                  </svg>
                ) : (
                  /* Open eye */
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm password with independent Show / Hide */}
          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block font-serif text-sm text-[#EAD0B3]"
              >
                Confirm password
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={doorsTriggered || submitting}
                  className={passwordFieldClass}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                  disabled={doorsTriggered || submitting}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#D9B99A] transition hover:text-[#FFD797] disabled:opacity-50"
                >
                  {showConfirmPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15 15 0 01-3.1 3.8" />
                      <path d="M6.2 6.2C3.9 7.7 2 12 2 12s3.5 7 10 7a10 10 0 004-.8" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <p
              role="alert"
              className="rounded-md border border-[#F4AC53]/20 bg-black/20 px-3 py-2 text-xs leading-relaxed text-[#FFC6A3]"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={doorsTriggered || submitting}
            className="
              group w-full rounded-lg border border-[#F4AC53]/60
              bg-gradient-to-r from-[#B84708] via-[#D95B09] to-[#B84708]
              px-4 py-3 font-serif text-sm text-[#FFF1DC]
              shadow-[0_0_15px_rgba(222,105,25,0.16)]
              transition-all duration-300
              hover:brightness-110
              hover:shadow-[0_0_24px_rgba(255,142,42,0.28)]
              disabled:cursor-not-allowed disabled:opacity-60
            "
          >
            <span className="flex items-center justify-center gap-3">
              {submitting
                ? mode === "signup"
                  ? "Creating account..."
                  : "Signing in..."
                : doorsTriggered
                  ? "Opening the doors..."
                  : mode === "signup"
                    ? "Create Account"
                    : "Enter"}

              {!doorsTriggered && (
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              )}
            </span>
          </button>
        </form>

       
      </section>

      {/* Existing cinematic lighting and transition layers */}
      <div aria-hidden="true" className="pp-doorlight" />
      <div aria-hidden="true" className="pp-dim" />
    </main>
  );
};

export default Home;
