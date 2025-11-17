import type { GoszakupApiResponse, Lot, LotStatus, TradeMethod } from '@/types';

const GOSZAKUP_API_BASE = 'https://ows.goszakup.gov.kz/v3';
const API_TOKEN = 'aaef3e09312a34aa05e02c12b49ee7d8';

class GoszakupApiClient {
    private baseURL: string;
    private token: string;

    constructor() {
        this.baseURL = GOSZAKUP_API_BASE;
        this.token = API_TOKEN;
    }

    private async makeRequest<T>(endpoint: string): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Получить список лотов
    async getLots(page = 1, limit = 100): Promise<GoszakupApiResponse<Lot>> {
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots?page=${page}&limit=${limit}`);
    }

    // Получить список лотов с фильтрами
    async getLotsWithFilters(params: {
        page?: number;
        limit?: number;
        keywords?: string;
        statusIds?: number[];
        tradeMethodIds?: number[];
        customerBin?: string;
        amountFrom?: number;
        amountTo?: number;
        dateFrom?: string;
        dateTo?: string;
    } = {}): Promise<GoszakupApiResponse<Lot>> {
        const queryParams = new URLSearchParams();
        
        // Базовые параметры
        queryParams.append('page', (params.page || 1).toString());
        queryParams.append('limit', (params.limit || 500).toString()); // Увеличиваем лимит
        
        // Фильтры
        if (params.statusIds && params.statusIds.length > 0) {
            queryParams.append('RefLotStatusId', params.statusIds.join(','));
        }
        
        if (params.tradeMethodIds && params.tradeMethodIds.length > 0) {
            queryParams.append('RefTradeMethodsId', params.tradeMethodIds.join(','));
        }
        
        if (params.customerBin) {
            queryParams.append('CustomerBin', params.customerBin);
        }
        
        if (params.amountFrom) {
            queryParams.append('AmountFrom', params.amountFrom.toString());
        }
        
        if (params.amountTo) {
            queryParams.append('AmountTo', params.amountTo.toString());
        }
        
        if (params.dateFrom) {
            queryParams.append('LastUpdateDateFrom', params.dateFrom);
        }
        
        if (params.dateTo) {
            queryParams.append('LastUpdateDateTo', params.dateTo);
        }
        
        const response = await this.makeRequest<GoszakupApiResponse<Lot>>(`/lots?${queryParams.toString()}`);
        
        // Если есть ключевые слова, фильтруем на клиенте
        if (params.keywords && response.data) {
            const keywords = params.keywords.toLowerCase();
            response.data = response.data.filter((lot: Lot) => {
                const searchText = [
                    lot.name_ru || '',
                    lot.name_kz || '',
                    lot.description_ru || '',
                    lot.description_kz || ''
                ].join(' ').toLowerCase();
                
                return searchText.includes(keywords);
            });
        }
        
        return response;
    }

    // Получить все активные лоты (для мониторинга)
    async getActiveLots(keywords?: string): Promise<GoszakupApiResponse<Lot>> {
        return this.getLotsWithFilters({
            statusIds: [210, 220, 230], // Опубликован, Прием заявок, Рассмотрение заявок
            keywords,
            limit: 500,
            page: 1
        });
    }

    // Получить лоты по номеру объявления
    async getLotsByAnnouncementNumber(annoNumber: string): Promise<GoszakupApiResponse<Lot>> {
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots/number-anno/${annoNumber}`);
    }

    // Получить лоты по БИН заказчика
    async getLotsByCustomerBin(bin: string): Promise<GoszakupApiResponse<Lot>> {
        return this.makeRequest<GoszakupApiResponse<Lot>>(`/lots/bin/${bin}`);
    }

    // Получить лот по ID
    async getLotById(id: number): Promise<Lot> {
        return this.makeRequest<Lot>(`/lots/${id}`);
    }

    // Справочники
    async getLotStatuses(): Promise<GoszakupApiResponse<LotStatus>> {
        return this.makeRequest<GoszakupApiResponse<LotStatus>>('/refs/ref_lots_status');
    }

    async getTradeMethods(): Promise<GoszakupApiResponse<TradeMethod>> {
        return this.makeRequest<GoszakupApiResponse<TradeMethod>>('/refs/ref_trade_methods');
    }
}

export const goszakupApi = new GoszakupApiClient();
