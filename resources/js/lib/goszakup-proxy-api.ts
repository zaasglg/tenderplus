/**
 * Утилиты для работы с Goszakup API через Laravel backend
 * 
 * Поскольку прямые запросы к API Гос.закупок могут быть заблокированы CORS,
 * рекомендуется проксировать запросы через Laravel backend
 */

import type { GoszakupApiResponse, Lot, LotStatus, TradeMethod } from '@/types';

const APP_BASE_URL = window.location.origin;

class GoszakupProxyClient {
    private baseURL: string;

    constructor() {
        this.baseURL = `${APP_BASE_URL}/api/goszakup`;
    }

    private async makeRequest<T>(endpoint: string): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Proxy API request failed:', error);
            throw error;
        }
    }

    // Получить список лотов через Laravel proxy
    async getLots(page = 1, limit = 100): Promise<GoszakupApiResponse<Lot>> {
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots?page=${page}&limit=${limit}`);
    }

    // Получить лоты по номеру объявления
    async getLotsByAnnouncementNumber(annoNumber: string): Promise<GoszakupApiResponse<Lot>> {
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots/announcement/${annoNumber}`);
    }

    // Получить лоты по БИН заказчика
    async getLotsByCustomerBin(bin: string): Promise<GoszakupApiResponse<Lot>> {
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots/customer/${bin}`);
    }

    // Получить статусы лотов
    async getLotStatuses(): Promise<GoszakupApiResponse<LotStatus>> {
        return this.makeRequest<GoszakupApiResponse<LotStatus>>(`/refs/lot-statuses`);
    }

    // Получить способы закупки
    async getTradeMethods(): Promise<GoszakupApiResponse<TradeMethod>> {
        return this.makeRequest<GoszakupApiResponse<TradeMethod>>(`/refs/trade-methods`);
    }

    // Получить лот по ID
    async getLotById(id: number): Promise<Lot> {
        return this.makeRequest<Lot>(`/lots/${id}`);
    }

    // Получить список лотов с фильтрами через Laravel proxy
    async getLotsWithFilters(params: {
        page?: number;
        limit?: number;
        keywords?: string;
        status_id?: number;
        status_names?: string;
        trade_method_id?: number;
        customer_bin?: string;
        amount_from?: number;
        amount_to?: number;
        date_from?: string;
        date_to?: string;
    } = {}): Promise<GoszakupApiResponse<Lot>> {
        const queryParams = new URLSearchParams();
        
        // Базовые параметры
        queryParams.append('page', (params.page || 1).toString());
        queryParams.append('limit', (params.limit || 500).toString()); // Увеличиваем лимит
        
        // Фильтры
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && key !== 'page' && key !== 'limit') {
                queryParams.append(key, value.toString());
            }
        });
        
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots?${queryParams.toString()}`);
    }

    // Получить все активные лоты (для мониторинга)
    async getActiveLots(keywords?: string): Promise<GoszakupApiResponse<Lot>> {
        return this.getLotsWithFilters({
            status_names: 'опубликован,прием заявок,рассмотрение заявок',
            keywords,
            limit: 500,
            page: 1
        });
    }

    // Получить ВСЕ лоты с автоматической пагинацией
    async getAllLots(params: {
        page?: number;
        limit?: number;
        keywords?: string;
        status_names?: string;
        max_lots?: number;
    } = {}): Promise<GoszakupApiResponse<Lot> & { fetched_from_api?: number; pages_fetched?: number }> {
        const queryParams = new URLSearchParams();
        
        // Базовые параметры
        queryParams.append('page', (params.page || 1).toString());
        queryParams.append('limit', (params.limit || 100).toString());
        queryParams.append('max_lots', (params.max_lots || 2000).toString());
        
        // Фильтры
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && !['page', 'limit', 'max_lots'].includes(key)) {
                queryParams.append(key, value.toString());
            }
        });
        
        return this.makeRequest<GoszakupApiResponse<Lot> & { fetched_from_api?: number; pages_fetched?: number }>(`/lots/all?${queryParams.toString()}`);
    }

    // ИИ анализ лота
    async analyzeLot(lot: any): Promise<any> {
        const url = `${this.baseURL}/ai/analyze-lot`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    lot_data: lot
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Lot analysis request failed:', error);
            throw error;
        }
    }
}

export const goszakupProxyApi = new GoszakupProxyClient();
