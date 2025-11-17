import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';
import type { LotStatus } from '@/types';

export interface LotsFilterValues {
    status_id?: string;
    trade_method_id?: string;
    date_from?: string;
    date_to?: string;
    customer_bin?: string;
    amount_from?: string;
    amount_to?: string;
    is_construction_work?: boolean;
    is_light_industry?: boolean;
    keywords?: string; // Для поиска по ключевым словам
    status_names?: string; // Для фильтрации по именам статусов
}

interface LotsFilterProps {
    onFilterChange: (filters: LotsFilterValues) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    values?: LotsFilterValues; // Внешние значения фильтров
}

export default function LotsFilter({ onFilterChange, isCollapsed = false, onToggleCollapse, values }: LotsFilterProps) {
    const [filters, setFilters] = useState<LotsFilterValues>(values || {});
    const [lotStatuses, setLotStatuses] = useState<LotStatus[]>([]);
    const [loading, setLoading] = useState(false);

    // Синхронизируем внутреннее состояние с внешними значениями
    useEffect(() => {
        if (values) {
            setFilters(values);
        }
    }, [values]);

    // Загружаем статусы лотов
    useEffect(() => {
        const loadStatuses = async () => {
            try {
                setLoading(true);
                const response = await goszakupProxyApi.getLotStatuses();
                setLotStatuses(response.data || []);
            } catch (error) {
                console.error('Ошибка загрузки статусов:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStatuses();
    }, []);

    const handleFilterChange = (key: keyof LotsFilterValues, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        setFilters({});
        onFilterChange({});
    };

    const hasActiveFilters = Object.values(filters).some(value => 
        value !== undefined && value !== '' && value !== false
    );

    if (isCollapsed) {
        return (
            <Card className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <CardTitle className="text-sm">Фильтры</CardTitle>
                            {hasActiveFilters && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                    Активны
                                </span>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
                            Показать
                        </Button>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="mb-4">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <CardTitle className="text-sm">Фильтры лотов</CardTitle>
                    </div>
                    <div className="flex gap-2">
                        {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                <X className="h-3 w-3 mr-1" />
                                Очистить
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
                            Скрыть
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Статус лота */}
                    <div className="space-y-2">
                        <Label htmlFor="status">Статус лота</Label>
                        <Select 
                            value={filters.status_id || 'all'} 
                            onValueChange={(value) => handleFilterChange('status_id', value === 'all' ? undefined : value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все статусы</SelectItem>
                                {lotStatuses.map((status) => (
                                    <SelectItem key={status.id} value={status.id.toString()}>
                                        {status.name_ru}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* БИН заказчика */}
                    <div className="space-y-2">
                        <Label htmlFor="customer_bin">БИН заказчика</Label>
                        <Input
                            id="customer_bin"
                            placeholder="Введите БИН"
                            value={filters.customer_bin || ''}
                            onChange={(e) => handleFilterChange('customer_bin', e.target.value || undefined)}
                        />
                    </div>

                    {/* Ключевые слова */}
                    <div className="space-y-2">
                        <Label htmlFor="keywords">Ключевые слова</Label>
                        <Input
                            id="keywords"
                            placeholder="Поиск по ключевым словам (через запятую)"
                            value={filters.keywords || ''}
                            onChange={(e) => handleFilterChange('keywords', e.target.value || undefined)}
                        />
                    </div>

                    {/* Дата от */}
                    <div className="space-y-2">
                        <Label htmlFor="date_from">Дата обновления от</Label>
                        <Input
                            id="date_from"
                            type="date"
                            value={filters.date_from || ''}
                            onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                        />
                    </div>

                    {/* Дата до */}
                    <div className="space-y-2">
                        <Label htmlFor="date_to">Дата обновления до</Label>
                        <Input
                            id="date_to"
                            type="date"
                            value={filters.date_to || ''}
                            onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                        />
                    </div>

                    {/* Сумма от */}
                    <div className="space-y-2">
                        <Label htmlFor="amount_from">Сумма от (₸)</Label>
                        <Input
                            id="amount_from"
                            type="number"
                            placeholder="0"
                            value={filters.amount_from || ''}
                            onChange={(e) => handleFilterChange('amount_from', e.target.value || undefined)}
                        />
                    </div>

                    {/* Сумма до */}
                    <div className="space-y-2">
                        <Label htmlFor="amount_to">Сумма до (₸)</Label>
                        <Input
                            id="amount_to"
                            type="number"
                            placeholder="0"
                            value={filters.amount_to || ''}
                            onChange={(e) => handleFilterChange('amount_to', e.target.value || undefined)}
                        />
                    </div>
                </div>

                {/* ...удалены чекбоксы 'Строительные работы' и 'Легкая промышленность'... */}
            </CardContent>
        </Card>
    );
}
