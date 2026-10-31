
import { useState } from "react";
import sunset from "../assets/sunset2.png";
import DoctorStrangePortal from "./DoctorStrangePortal";
import GenreSelection from "./GenreSelection";
import telugu from "../assets/places/telugu1.png";
import hindi from "../assets/places/hindi1.png";
import english from "../assets/places/english1.png";
import tamil from "../assets/places/tamil1.png";
import korea from "../assets/places/korea1.png";
import japan from "../assets/places/japan1.png";
// import layer from "../assets/layer1.png";

const Selection = ({
  token,
  selectedLanguages: initialSelectedLanguages = [],
  onLanguagesChange,
  onMoviesFound,
  onMoviesReady,
  initialShowGenres = false,
}) => {
  const [selectedLanguages, setSelectedLanguages] = useState(
    initialSelectedLanguages
  );
  const [showGenres, setShowGenres] = useState(initialShowGenres);

  const handleLanguageToggle = (language, selected) => {
    setSelectedLanguages((current) => {
      const next = selected
        ? [...new Set([...current, language])]
        : current.filter((item) => item !== language);
      onLanguagesChange?.(next);
      return next;
    });
  };

  if (showGenres) {
    return (
      <GenreSelection
        token={token}
        selectedLanguages={selectedLanguages}
        onMoviesFound={onMoviesFound}
        onMoviesReady={onMoviesReady}
        onBack={() => setShowGenres(false)}
      />
    );
  }

  return (
    <main
      className="relative isolate min-h-screen w-full overflow-hidden bg-[#24150F] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${sunset})` }}
    >
   
      <div className="absolute inset-0 bg-black/50" />

      <h1 className="absolute left-1/2 top-8 z-20 w-full -translate-x-1/2 px-4 text-center font-serif text-3xl font-semibold text-[#ffe4a3] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:top-10 sm:text-4xl">
        Select language you want to watch
      </h1>

         {/* Top-left portal */}
      <div className="absolute left-62 top-34 z-10 h-[100px] w-[100px]">
        <DoctorStrangePortal
          radius={49}
          particleCount={50}
          portalName="Telugu"
          image={telugu}
          onSelectionChange={(selected) => handleLanguageToggle("Telugu", selected)}
        />
      </div>

      {/* Center portal */}
      <div className="absolute left-185 top-[45%] z-10 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2">
        <DoctorStrangePortal
          radius={77}
          particleCount={80}
          portalName="Hindi"
          image={hindi}
          onSelectionChange={(selected) => handleLanguageToggle("Hindi", selected)}
        />
      </div>

      {/* Top-right portal */}
      <div className="absolute right-64 top-41 z-10 h-[100px] w-[100px]">
        <DoctorStrangePortal
          radius={47}
          particleCount={50}
          portalName="English"
          image={english}
          onSelectionChange={(selected) => handleLanguageToggle("English", selected)}
        />
      </div>

      <div className="absolute left-55 top-110 z-10 h-[100px] w-[100px]">
        <DoctorStrangePortal
          radius={49}
          particleCount={50}
          portalName="Tamil"
          image={tamil}
          onSelectionChange={(selected) => handleLanguageToggle("Tamil", selected)}
        />
      </div>
      <div className="absolute right-105 top-94 z-10 h-[100px] w-[100px]">
        <DoctorStrangePortal
          radius={44}
          particleCount={50}
          portalName="Korea"
          image={korea}
          onSelectionChange={(selected) => handleLanguageToggle("Korea", selected)}
        />
      </div>
      <div className="absolute right-41 top-121 z-10 h-[100px] w-[100px]">
        <DoctorStrangePortal
          radius={48}
          particleCount={50}
          portalName="Japan"
          image={japan}
          onSelectionChange={(selected) => handleLanguageToggle("Japan", selected)}
        />
      </div>
      <button
        type="button"
        onClick={() => setShowGenres(true)}
        disabled={selectedLanguages.length === 0}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-amber-300/70 bg-amber-800/95 px-7 py-3 font-serif text-base text-amber-50 shadow-lg transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue to genres
      </button>
      {/* <img src={layer} alt="Layer" className="absolute  z-0 w-full bottom-0" /> */}
    </main>
  );
};

export default Selection;
