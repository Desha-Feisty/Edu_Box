import { useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api";

/**
 * Custom hook for fetching data with loading, error, and caching support
 * Uses configured api instance with proper auth interceptors
 */
export function useFetch(url, options = {}) {
    const {
        immediate = true,
        deps = [],
        cache = true,
        onSuccess,
        onError,
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);
    const cacheRef = useRef(new Map());

    const fetch = useCallback(async (fetchUrl = url) => {
        if (!fetchUrl) return;

        // Check cache
        if (cache && cacheRef.current.has(fetchUrl)) {
            setData(cacheRef.current.get(fetchUrl));
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.get(fetchUrl);
            const result = response.data;

            if (cache) {
                cacheRef.current.set(fetchUrl, result);
            }

            setData(result);
            onSuccess?.(result);
        } catch (err) {
            const errorMessage = err.response?.data?.errMsg || err.message;
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [url, cache, onSuccess, onError]);

    useEffect(() => {
        if (immediate) {
            fetch();
        }
    }, [fetch, ...deps]);

    const refetch = useCallback(() => {
        if (url) {
            cacheRef.current.delete(url);
            fetch(url);
        }
    }, [fetch, url]);

    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    return { data, loading, error, fetch: refetch, clearCache };
}

/**
 * Custom hook for making POST/PUT/DELETE requests
 */
export function useMutation(mutationFn, options = {}) {
    const { onSuccess, onError } = options;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(
        async (data, config = {}) => {
            setLoading(true);
            setError(null);

            try {
                const result = await mutationFn(data, config);
                onSuccess?.(result);
                return result;
            } catch (err) {
                const errorMessage = err.response?.data?.errMsg || err.message;
                setError(errorMessage);
                onError?.(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [mutationFn, onSuccess, onError]
    );

    return { mutate, loading, error };
}

/**
 * Custom hook for paginated data fetching
 */
export function usePaginatedFetch(url, initialPage = 1) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(initialPage);
    const [hasMore, setHasMore] = useState(true);

    const fetchPage = useCallback(
        async (pageNum = page) => {
            if (!url) return;

            setLoading(true);
            setError(null);

            try {
                const response = await api.get(url, {
                    params: { page: pageNum },
                });

                const result = response.data;

                if (pageNum === 1) {
                    setData(result);
                } else {
                    setData((prev) => ({
                        ...result,
                        data: [...(prev?.data || []), ...result.data],
                    }));
                }

                setHasMore(result.data?.length > 0);
                setPage(pageNum);
            } catch (err) {
                setError(err.response?.data?.errMsg || err.message);
            } finally {
                setLoading(false);
            }
        },
        [url, page]
    );

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            fetchPage(page + 1);
        }
    }, [loading, hasMore, fetchPage, page]);

    const reset = useCallback(() => {
        setPage(initialPage);
        setData(null);
        setHasMore(true);
    }, [initialPage]);

    return { data, loading, error, page, hasMore, fetchPage, loadMore, reset };
}