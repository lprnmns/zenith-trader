import React from 'react';

// Lightweight floating background decoration with crypto symbols.
// Renders absolutely positioned, non-interactive glyphs that drift upward.
// No external CSS framework needed beyond Tailwind utilities and a keyframe in index.css.

type SymbolSpec = {
	char: string;
	size: number; // rem
	leftPct: number; // 0..100
	duration: number; // seconds
	delay: number; // seconds
	opacity: number; // 0..1
};

function makeSpecs(count = 18): SymbolSpec[] {
	const glyphs = ['₿', 'Ξ', '◎', 'ʟ', '₮', '₳', 'Ƀ', '∑', '₽', '₴'];
	const specs: SymbolSpec[] = [];
	for (let i = 0; i < count; i++) {
		const char = glyphs[i % glyphs.length];
		const size = 1.2 + Math.random() * 2.6; // 1.2rem .. 3.8rem
		const leftPct = Math.floor(Math.random() * 100);
		const duration = 18 + Math.random() * 22; // 18s .. 40s
		const delay = Math.random() * -duration; // negative delay to desync starts
		const opacity = 0.06 + Math.random() * 0.14; // 0.06 .. 0.2
		specs.push({ char, size, leftPct, duration, delay, opacity });
	}
	return specs;
}

export function FloatingCryptoSymbols() {
	const specs = React.useMemo(() => makeSpecs(22), []);
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
			{specs.map((s, idx) => (
				<span
					key={idx}
					className="crypto-float-symbol absolute bottom-[-10vh] text-white will-change-transform"
					style={{
						left: `${s.leftPct}%`,
						fontSize: `${s.size}rem`,
						opacity: s.opacity,
						animationDuration: `${s.duration}s`,
						animationDelay: `${s.delay}s`,
					}}
				>
					{s.char}
				</span>
			))}
		</div>
	);
}

export default FloatingCryptoSymbols;