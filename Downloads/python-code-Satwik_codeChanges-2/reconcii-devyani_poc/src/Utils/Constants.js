// Auto-detect localhost
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const Constants = {
    // BASE_URL - auto-detect localhost vs staging
    BASE_URL: isLocalhost
        ? 'http://localhost:8034/api/'
        : (import.meta.env.VITE_ADMIN_API_BASE_URL 
            ? `${import.meta.env.VITE_ADMIN_API_BASE_URL}/api/`
            : 'https://devyaniadminapi.corepeelers.com/api/'),
}

export default Constants