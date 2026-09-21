export const API_URL = import.meta.env.VITE_API_URL;
export const HUB_URL = import.meta.env.VITE_HUB_URL;

if (!API_URL) {
    throw new Error('VITE_API_URL не задан. Проверь .env-файлы.');
}
if (!HUB_URL) {
    throw new Error('VITE_HUB_URL не задан. Проверь .env-файлы.');
}