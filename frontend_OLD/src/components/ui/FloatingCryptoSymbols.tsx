import React from 'react';
import { motion } from 'framer-motion';

const symbols = ['₿', 'Ξ', '◊', '⟡', '◈'];

export function FloatingCryptoSymbols() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {symbols.map((symbol, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl font-bold opacity-5 text-emerald-400"
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 100,
          }}
          animate={{
            y: -100,
            x: Math.random() * window.innerWidth,
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: index * 4,
          }}
        >
          {symbol}
        </motion.div>
      ))}
    </div>
  );
}