const Constants = {
    // BASE_URL can be configured via environment variable (VITE_ADMIN_API_BASE_URL)
    // If not set, this default will be used
    BASE_URL: import.meta.env.VITE_ADMIN_API_BASE_URL 
        ? `${import.meta.env.VITE_ADMIN_API_BASE_URL}/api/`
        : 'https://devyaniadminapi.corepeelers.com/api/',
    // LOCAL DEVELOPMENT (commented out)
    // BASE_URL: 'http://localhost:8096/api/',
}

export default Constants