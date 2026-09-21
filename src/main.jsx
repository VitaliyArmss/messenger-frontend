import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const params = new URLSearchParams(window.location.search);
const redirectPath = params.get('p');

if (redirectPath) {
    if (redirectPath.startsWith('/') && !redirectPath.startsWith('//') && !redirectPath.includes('://')) {
        params.delete('p');
        const newSearch = params.toString();
        const newUrl = redirectPath + (newSearch ? '?' + newSearch : '');
        window.history.replaceState(null, '', newUrl);
    }
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)