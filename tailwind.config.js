/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./index.html"],
  safelist: [
    'from-rose-500', 'to-pink-600',
    'from-orange-500', 'to-rose-500',
    'from-amber-500', 'to-orange-600',
    'from-sky-400', 'to-blue-600',
    'from-indigo-600', 'to-fuchsia-600',
    'from-fuchsia-500', 'to-sky-400',
    'bg-rose-400', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-emerald-500', 'bg-fuchsia-500',
    'text-rose-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400', 'text-fuchsia-400',
    'border-rose-400', 'border-amber-400', 'border-sky-400', 'border-fuchsia-400'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
