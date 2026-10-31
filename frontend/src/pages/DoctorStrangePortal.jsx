
import { useEffect, useRef, useState } from "react";
import "./DoctorStrangePortal.css";

const TAU = Math.PI * 2;
const random = (min, max) => min + Math.random() * (max - min);

export default function DoctorStrangePortal({
  radius = 42,
  particleCount = 50,
  portalName = "Portal",
  image,
  onSelectionChange,
}) {
  const canvasRef = useRef(null);
  const targetRef = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frameId;
    let progress = 0;
    let lastFrame = 0;
    let lastTime = performance.now();

    const particles = Array.from(
      { length: Math.max(0, Math.floor(particleCount)) },
      () => ({
        angle: random(0, TAU),
        speed: random(0.2, 0.8),
        distance: random(0, 1),
        size: random(0.5, 1.2),
        length: random(2, 6),
        life: random(0, 1),
      })
    );

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    function drawRing(cx, cy, r, time) {
      if (r < 1) return;

      ctx.beginPath();
      const points = 120;

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * TAU;

        const wobble =
          Math.sin(angle * 13 + time * 0.001) * 0.004 +
          Math.sin(angle * 29 - time * 0.0015) * 0.003 +
          Math.sin(angle * 47 + time * 0.002) * 0.002;

        const actualR = r * (1 + wobble);
        const x = cx + Math.cos(angle) * actualR;
        const y = cy + Math.sin(angle) * actualR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();

      ctx.save();
      ctx.strokeStyle = "#ff8b24";
      ctx.lineWidth = Math.max(1.2, r * 0.025);
      ctx.shadowColor = "#ff7b18";
      ctx.shadowBlur = 7;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.strokeStyle = "#ffd58a";
      ctx.lineWidth = Math.max(0.7, r * 0.008);
      ctx.stroke();
    }

    function draw(now) {
      frameId = requestAnimationFrame(draw);

      // Limit canvas rendering to approximately 30 FPS.
      if (now - lastFrame < 33) return;
      lastFrame = now;

      const dt = Math.min((now - lastTime) / 16.67, 2);
      lastTime = now;

      const target = targetRef.current ? 1 : 0;
      const amount = 1 - Math.exp(-0.09 * dt);

      progress += (target - progress) * amount;

      if (Math.abs(target - progress) < 0.001) {
        progress = target;
      }

      ctx.clearRect(0, 0, width, height);

      if (progress < 0.002 || !width || !height) return;

      const cx = width / 2;
      const cy = height / 2;
      const currentRadius = radius * progress;

      drawRing(cx, cy, currentRadius, now);

      if (currentRadius < 3) return;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (const p of particles) {
        // Particles orbit around the circumference.
        p.angle += p.speed * 0.012 * dt;
        p.life += p.speed * 0.012 * dt;

        if (p.life >= 1) {
          p.life = 0;
          p.angle = random(0, TAU);
          p.distance = random(0, 1);
        }

        const a = p.angle;

        const wobble =
          Math.sin(a * 13 + now * 0.002) *
          currentRadius *
          0.008;

        const r =
          currentRadius +
          wobble +
          (p.distance - 0.5) * currentRadius * 0.035;

        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;

        ctx.globalAlpha =
          Math.sin(p.life * Math.PI) * progress * 0.9;

        ctx.strokeStyle =
          p.size > 1 ? "#ffe7ad" : "#ff982e";

        ctx.lineWidth = p.size;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - Math.sin(a) * p.length,
          y + Math.cos(a) * p.length
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [radius, particleCount]);

  function togglePortal() {
    const next = !targetRef.current;
    targetRef.current = next;
    setOpen(next);
    onSelectionChange?.(next);
  }

  return (
    <div
      className={`destination-portal ${open ? "is-open" : ""}`}
      style={{
        width: radius* 2 + 20,
        height: radius*2 + 20,
      }}
    >
      {/* Destination image, revealed only when the portal opens */}
      {image && (
        <img
          src={image}
          alt={portalName}
          className="portal-destination-image"
          draggable="false"
        />
      )}

      {/* Canvas draws the animated magical ring */}
      <canvas
        ref={canvasRef}
        className="portal-canvas"
        aria-hidden="true"
      />

      {/* One control per destination */}
      <button
        type="button"
        className="portal-trigger"
        onClick={togglePortal}
        aria-expanded={open}
      >
        {portalName}
      </button>
    </div>
  );
}
