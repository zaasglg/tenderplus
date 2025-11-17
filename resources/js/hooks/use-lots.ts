import { useState, useEffect, useCallback } from 'react';
import { goszakupApi } from '@/lib/goszakup-api';
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';
import type { LotsFilterValues } from '@/components/lots-filter';

interface UseLotsOptions {
    autoFetch?: boolean;
    initialPage?: number;
    pageSize?: number;
    useProxy?: boolean;
    filters?: LotsFilterValues;
}

    // lots: any[];
// ...existing code...

interface UseLotsResult {
    lots: any[];
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalLots: number;
    hasNextPage: boolean;
    fetchLots: (page?: number, customFilters?: any) => Promise<void>;
    searchLots: (searchTerm: string) => any[];
    refresh: () => void;
}

export function useLots({ filters }: { filters?: any } = {}): UseLotsResult {
    const [lots, setLots] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalLots, setTotalLots] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);

    const fetchLots = async (page = 1, customFilters = filters || {}) => {
        setLoading(true);
        setError(null);
        try {
            // Используем getLotsWithFilters вместо getLots для поддержки фильтров
            const response: any = await goszakupProxyApi.getLotsWithFilters({ 
                page, 
                limit: 100,
                ...customFilters 
            });
            console.log('API Response:', response); // Для отладки
            
            // Исправляем структуру данных согласно API ответу
            setLots(response.data || []);
            setTotalLots(response.total || 0);
            setHasNextPage(!!response.next_page);
            setCurrentPage(response.page || page);
        } catch (e: any) {
            console.error('Error fetching lots:', e);
            setError(e.message || 'Ошибка загрузки лотов');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Загружаем лоты при первом рендере или при изменении фильтров
        fetchLots(1, filters || {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(filters || {})]);

    // Дополнительный эффект для первоначальной загрузки
    useEffect(() => {
        if (lots.length === 0 && !loading && !error) {
            fetchLots(1, {});
        }
    }, []);

    const searchLots = (searchTerm: string) => {
        if (!searchTerm) return lots;
        const lower = searchTerm.toLowerCase();
        return lots.filter(lot =>
            (lot.nameRu || '').toLowerCase().includes(lower) ||
            (lot.customerNameRu || '').toLowerCase().includes(lower) ||
            (lot.trdBuyNumberAnno || '').toLowerCase().includes(lower)
        );
    };

    const refresh = () => fetchLots(currentPage, filters || {});

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
