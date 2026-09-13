export const APPEARANCE_KEY = 'warica-appearance-v1';
export type Appearance = 'pop' | 'classic';

// Runs before paint, so a saved classic preference does not flash the pop theme.
export const appearanceScript = `try{document.documentElement.dataset.appearance=localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})==='classic'?'classic':'pop'}catch{}`;
