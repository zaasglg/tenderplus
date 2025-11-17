import { useState, useEffect, useCallback } from 'react';
import { goszakupApi } from '@/lib/goszakup-api';
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';
import type { Lot, GoszakupApiResponse } from '@/types';

interface UseLotsOptions {
    autoFetch?: boolean;
    initialPage?: number;
    pageSize?: number;
    useProxy?: boolean;
}

interface UseLotsReturn {
    lots: Lot[];
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalLots: number;
    hasNextPage: boolean;
    fetchLots: (page?: number) => Promise<void>;
    searchLots: (searchTerm: string) => Lot[];
    refresh: () => Promise<void>;
}

export function useLots({
    autoFetch = true,
    initialPage = 1,
    pageSize = 100, // Увеличиваем до 100 записей
    useProxy = true
}: UseLotsOptions = {}): UseLotsReturn {
    const [lots, setLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalLots, setTotalLots] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);

    const fetchLots = useCallback(async (page = currentPage) => {
        try {
            setLoading(true);
            setError(null);
            
            let response: GoszakupApiResponse<Lot>;
            
            if (useProxy) {
                response = await goszakupProxyApi.getLots(page, pageSize);
            } else {
                response = await goszakupApi.getLots(page, pageSize);
            }
            
            // Проверяем, что data является массивом
            const lotsData = Array.isArray(response.data) ? response.data : [];
            
            setLots(lotsData);
            setTotalLots(response.total || 0);
            setCurrentPage(page);
            setHasNextPage(!!response.next_page);
        } catch (err) {
            const errorMessage = useProxy 
                ? 'Ошибка при загрузке лотов через сервер'
                : 'Ошибка при прямом обращении к API. Попробуйте использовать прокси.';
            setError(err instanceof Error ? err.message : errorMessage);
            console.error('Error fetching lots:', err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, useProxy]);

    const searchLots = useCallback((searchTerm: string): Lot[] => {
        if (!searchTerm.trim()) {
            return lots;
        }

        const term = searchTerm.toLowerCase();
        return lots.filter(lot =>
            lot.name_ru.toLowerCase().includes(term) ||
            lot.name_kz.toLowerCase().includes(term) ||
            lot.customer_name_ru.toLowerCase().includes(term) ||
            lot.customer_name_kz.toLowerCase().includes(term) ||
            lot.trd_buy_number_anno.includes(searchTerm) ||
            lot.customer_bin.includes(searchTerm)
        );
    }, [lots]);

    const refresh = useCallback(() => {
        return fetchLots(currentPage);
    }, [fetchLots, currentPage]);

    useEffect(() => {
        if (autoFetch) {
            fetchLots(initialPage);
        }
    }, [autoFetch, initialPage, fetchLots]);

    return {
        lots,
        loading,
        error,
        currentPage,
        totalLots,
        hasNextPage,
        fetchLots,
        searchLots,
        refresh,
    };
}
