const cache = {
    // Cache duration in minutes
    CACHE_DURATION: 15,

    /**
     * Get data from cache
     * @param {string} key - The key to retrieve data from cache
     * @returns {object|null} - The cached data or null if not found or expired
     */
    get: (key) => {
        const cachedItem = localStorage.getItem(key);
        if (!cachedItem) {
            return null;
        }

        const { timestamp, data } = JSON.parse(cachedItem);
        const now = new Date().getTime();

        if (now - timestamp > cache.CACHE_DURATION * 60 * 1000) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    },

    /**
     * Set data to cache
     * @param {string} key - The key to set data in cache
     * @param {object} data - The data to be cached
     */
    set: (key, data) => {
        const timestamp = new Date().getTime();
        const cachedItem = {
            timestamp,
            data
        };
        localStorage.setItem(key, JSON.stringify(cachedItem));
    },

    /**
     * Clear the entire cache
     */
    clear: () => {
        localStorage.clear();
    }
};
