/* tailwind.config.ts */
import type { Config } from 'tailwindcss';


export default {
content: [
'./app/**/*.{ts,tsx}',
'./components/**/*.{ts,tsx}',
],
theme: {
extend: {
colors: {
brand: 'hsl(var(--color-brand))',
ocean: 'hsl(var(--color-ocean))',
sand: 'hsl(var(--color-sand))',
},
borderRadius: {
'2xl': '1.5rem',
},
},
},
darkMode: 'class',
plugins: [],
} satisfies Config;