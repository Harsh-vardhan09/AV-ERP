import React from "react";
import { motion } from "framer-motion";

export const BackgroundBeams = ({ className = "" }) => {
  // 18 widely spaced, organic black wave paths that fan out across the screen
  const beams = Array.from({ length: 18 }, (_, i) => {
    const angleOffset = Math.sin((i / 18) * Math.PI) * 180;
    const waveOffset = Math.cos((i / 18) * Math.PI * 2) * 120;

    // Spread start, control, and end points with non-linear variation so waves fan out cleanly
    const startX = -400 + i * 90;
    const startY = -300 + i * 70 - waveOffset;
    
    const cp1X = 100 + i * 80 + angleOffset;
    const cp1Y = -50 + i * 90 + waveOffset;
    
    const cp2X = 500 + i * 65 - angleOffset;
    const cp2Y = 300 + i * 50 - waveOffset;
    
    const endX = 1600 + i * 85;
    const endY = 600 + i * 75 + angleOffset;

    return {
      id: i,
      d: `M${startX} ${startY} C${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`,
      width: 0.8 + (i % 4) * 0.4,
      duration: 14 + (i % 6) * 3,
      delay: (i % 5) * 0.9,
      opacity: 0.12 + (i % 4) * 0.05,
    };
  });

  return (
    <div
      className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-slate-50 text-black pointer-events-none ${className}`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="w-full h-full text-black opacity-90"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          {beams.map((beam) => (
            <motion.path
              key={beam.id}
              d={beam.d}
              stroke="black"
              strokeWidth={beam.width}
              strokeLinecap="round"
              initial={{ pathLength: 0.3, opacity: beam.opacity * 0.5 }}
              animate={{
                pathLength: [0.3, 1, 0.3],
                opacity: [beam.opacity * 0.5, beam.opacity, beam.opacity * 0.5],
                pathOffset: [0, 1, 0],
              }}
              transition={{
                duration: beam.duration,
                delay: beam.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default BackgroundBeams;
