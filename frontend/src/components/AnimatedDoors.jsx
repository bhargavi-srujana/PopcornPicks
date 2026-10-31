
import { useCallback, useEffect, useRef, useState } from "react";
import { Lottie } from "lottie-react";
import doorsAnimation from "../assets/door.json";

const DOOR_DURATION_MS =
  ((doorsAnimation.op - (doorsAnimation.ip ?? 0)) / doorsAnimation.fr) * 1000;

export default function AnimatedDoors({ play = false, onComplete, onPlayingChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const startedRef = useRef(false);
  const firedRef = useRef(false);
  const callbacksRef = useRef({ onComplete, onPlayingChange });

  useEffect(() => {
    callbacksRef.current = { onComplete, onPlayingChange };
  });

  const fireComplete = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    callbacksRef.current.onComplete?.();
  }, []);

  useEffect(() => {
    if (!play || startedRef.current) return;
    startedRef.current = true;
    setIsPlaying(true);
    callbacksRef.current.onPlayingChange?.(true);
  }, [play]);

  useEffect(() => {
    if (!isPlaying) return;
    // Safety net: if the animation's completion event never arrives,
    // continue using the animation's real duration (5s + margin).
    const timeout = setTimeout(fireComplete, DOOR_DURATION_MS + 800);
    return () => clearTimeout(timeout);
  }, [isPlaying, fireComplete]);

  return (
    <div className="relative z-50 flex flex-col items-center translate-y-[44%] translate-x-[-152%]">
      <div className="w-[270px]">
        <Lottie
          src={doorsAnimation}
          autoplay={isPlaying}
          loop={false}
          style={{ width: "100%", height: 300 }}
          subscriptions={{
            complete: () => fireComplete(),
          }}
        />
      </div>

    </div>
  );
}
