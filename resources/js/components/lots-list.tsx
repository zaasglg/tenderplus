import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Calendar, Building, RefreshCw, Database, Filter } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useLots } from '@/hooks/use-lots';
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';
import type { Lot, LotStatus } from '@/types';

interface LotTableRowProps {
    lot: any;
    index: number;
    formatCurrency: (a: number) => string;
    formatDate: (dateString: string) => string;
    formatDateWithRelative: (dateString: string) => string;
    getStatusName: (statusId: number) => string;
}

function LotTableRow({ lot, index, formatCurrency, formatDate, formatDateWithRelative, getStatusName }: LotTableRowProps) {
    const handleLotClick = () => {
        router.visit(`/lots/${lot.id}`);
    };

    const getStatusBadgeVariant = (statusId: number) => {
        switch (statusId) {
            case 210: return 'default'; // Опубликован
            case 220: return 'secondary'; // Прием заявок
            case 230: return 'outline'; // Рассмотрение заявок
            case 240: return 'destructive'; // Отменен
            case 250: return 'default'; // Определен победитель
            default: return 'secondary';
        }
    };

    return (
        <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <TableCell className="font-medium text-sm w-20">
                {lot.lotNumber || lot.lot_number || '-'}
            </TableCell>
            <TableCell>
                <div className="space-y-1">
                    <div 
                        className="font-medium text-sm leading-tight text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer hover:underline line-clamp-2"
                        onClick={handleLotClick}
                        title={lot.nameRu || lot.name_ru || 'Без названия'}
                    >
                        {lot.nameRu || lot.name_ru || 'Без названия'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate" title={`Заказчик: ${lot.customerNameRu || lot.customer_name_ru || 'Не указан'}`}>
                        Заказчик: {lot.customerNameRu || lot.customer_name_ru || 'Не указан'}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-sm font-mono w-32">
                {lot.customerBin || lot.customer_bin || '-'}
            </TableCell>
            <TableCell className="text-right font-medium w-32">
                <div className="text-sm">
                    {formatCurrency(lot.amount || 0)}
                </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground w-40">
                <div className="flex items-center gap-1" title={`Последнее обновление: ${lot.lastUpdateDate || lot.last_update_date || lot.indexDate || lot.index_date || 'не указано'}`}>
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">
                        {lot.lastUpdateDate || lot.last_update_date ? 
                            formatDateWithRelative(lot.lastUpdateDate || lot.last_update_date) : 
                            (lot.indexDate || lot.index_date ? formatDateWithRelative(lot.indexDate || lot.index_date) : '-')
                        }
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <Badge 
                    variant={getStatusBadgeVariant(lot.refLotStatusId || lot.ref_lot_status_id)} 
                    className="text-xs whitespace-nowrap"
                >
                    {getStatusName(lot.refLotStatusId || lot.ref_lot_status_id)}
                </Badge>
            </TableCell>
            <TableCell>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLotClick}
                    className="h-8 w-8 p-0"
                >
                    <Eye className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

interface LotsListProps {
    className?: string;
}

export default function LotsList({ className }: LotsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [lotStatuses, setLotStatuses] = useState<LotStatus[]>([]);
    const [openAnalyses, setOpenAnalyses] = useState<Set<number>>(new Set());
    const [fullMode, setFullMode] = useState(false);
    const [fullModeLoading, setFullModeLoading] = useState(false);
    const [showOnlyActive, setShowOnlyActive] = useState(true); // По умолчанию показываем только активные
    
    const { 
        lots, 
        loading, 
        error, 
        currentPage, 
        totalLots, 
        hasNextPage, 
        fetchLots, 
        searchLots, 
        refresh 
    } = useLots({});

    // Загружаем справочник статусов при монтировании компонента
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const response = await goszakupProxyApi.getLotStatuses();
                setLotStatuses(response.data || []);
            } catch (error) {
                console.error('Error fetching lot statuses:', error);
            }
        };
        fetchStatuses();
    }, []);

    // Фильтруем лоты по поиску и активности
    let filteredLots = searchLots(searchTerm);
    
    // Фильтруем только активные лоты (не завершенные)
    if (showOnlyActive) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        filteredLots = filteredLots.filter(lot => {
            const statusId = lot.refLotStatusId || lot.ref_lot_status_id;
            
            // Активные статусы: 210 (Опубликован), 220 (Прием заявок), 230 (Рассмотрение заявок)
            // Исключаем: 240 (Отменен), 250 (Определен победитель), 260 (Завершен)
            const isActiveStatus = statusId && (statusId === 210 || statusId === 220 || statusId === 230);
            
            if (!isActiveStatus) return false;
            
            // Проверяем дату последнего обновления - если лот не обновлялся больше 30 дней, скорее всего он не активен
            const lastUpdateDate = lot.lastUpdateDate || lot.last_update_date || lot.indexDate || lot.index_date;
            if (lastUpdateDate) {
                const lotDate = new Date(lastUpdateDate);
                // Показываем только лоты обновленные за последние 30 дней
                return lotDate >= thirtyDaysAgo;
            }
            
            // Если даты нет, показываем лот (на всякий случай)
            return true;
        });
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'KZT',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU');
    };

    const formatDateWithRelative = (dateString: string) => {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const formattedDate = date.toLocaleDateString('ru-RU');
        
        if (diffDays === 0) {
            return `${formattedDate} (сегодня)`;
        } else if (diffDays === 1) {
            return `${formattedDate} (вчера)`;
        } else if (diffDays < 7) {
            return `${formattedDate} (${diffDays} дн. назад)`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${formattedDate} (${weeks} нед. назад)`;
        } else {
            return formattedDate;
        }
    };

    // Функция для загрузки всех лотов
    const handleFullModeToggle = async () => {
        if (fullMode) {
            // Выключаем полный режим - возвращаемся к обычной загрузке
            setFullMode(false);
            fetchLots(1);
        } else {
            // Включаем полный режим - загружаем все лоты
            setFullModeLoading(true);
            try {
                const response = await goszakupProxyApi.getAllLots({
                    max_lots: 2000,
                    limit: 100,
                    page: 1
                });
                
                // Здесь можно обновить состояние лотов, но это зависит от архитектуры useLots
                // Для простоты пока просто переключаем режим
                setFullMode(true);
                
                // Можно добавить уведомление о количестве загруженных лотов
                console.log(`Загружено ${response.fetched_from_api} лотов за ${response.pages_fetched} запросов`);
                
            } catch (error) {
                console.error('Error loading all lots:', error);
            } finally {
                setFullModeLoading(false);
            }
        }
    };

    const getStatusBadgeVariant = (statusId: number) => {
        switch (statusId) {
            case 210: return 'default'; // Опубликован
            case 220: return 'secondary'; // Прием заявок
            case 230: return 'outline'; // Рассмотрение заявок
            case 240: return 'destructive'; // Отменен
            case 250: return 'default'; // Определен победитель
            default: return 'secondary';
        }
    };

    const getStatusName = (statusId: number) => {
        const status = lotStatuses.find(s => s.id === statusId);
        return status ? status.name_ru : `Статус ${statusId}`;
    };

    if (error) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center py-10">
                    <div className="text-center">
                        {(() => {
                            const err: any = error;
                            return (
                                <>
                                    <p className="text-sm text-muted-foreground mb-4">{typeof err === 'string' ? err : (err?.message || 'Ошибка сервера при загрузке лотов')}</p>
                                    {/* Временно выводим стек ошибки, если есть */}
                                    {err && typeof err === 'object' && err.stack && (
                                        <pre className="text-xs text-red-500 text-left overflow-x-auto max-w-md mx-auto my-2">{err.stack}</pre>
                                    )}
                                </>
                            );
                        })()}
                        <Button onClick={refresh} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Попробовать снова
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={`space-y-4 ${className || ''}`}>
            {/* Поиск и контролы */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск по наименованию, заказчику, БИН..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={showOnlyActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowOnlyActive(!showOnlyActive)}
                            >
                                <Filter className="h-4 w-4 mr-2" />
                                {showOnlyActive ? 'Только активные' : 'Все лоты'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refresh}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Обновить
                            </Button>
                            <Button
                                variant={fullMode ? "default" : "outline"}
                                size="sm"
                                onClick={handleFullModeToggle}
                                disabled={fullModeLoading}
                            >
                                <Database className={`h-4 w-4 mr-2 ${fullModeLoading ? 'animate-spin' : ''}`} />
                                {fullMode ? 'Обычный режим' : 'Все лоты'}
                            </Button>
                        </div>
                    </div>
                    {filteredLots.length > 0 && (
                        <div className="mt-3 text-sm text-muted-foreground">
                            Найдено лотов: {filteredLots.length}
                            {showOnlyActive && ' (только активные)'}
                            {searchTerm && ` по запросу "${searchTerm}"`}
                            {totalLots && ` из ${totalLots} всего`}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Таблица лотов */}
            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-6 w-20" />
                                        <Skeleton className="h-6 w-24" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredLots.length > 0 ? (
                <Card className="w-full">
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">№ лота</TableHead>
                                    <TableHead className="min-w-64">Наименование объявления</TableHead>
                                    <TableHead className="w-32">БИН заказчика</TableHead>
                                    <TableHead className="w-32 text-right">Сумма, тг.</TableHead>
                                    <TableHead className="w-40">Дата обновления</TableHead>
                                    <TableHead className="w-28">Статус</TableHead>
                                    <TableHead className="w-20">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLots.map((lot, index) => (
                                    <LotTableRow 
                                        key={lot.id} 
                                        lot={lot} 
                                        index={index}
                                        formatCurrency={formatCurrency} 
                                        formatDate={formatDate}
                                        formatDateWithRelative={formatDateWithRelative}
                                        getStatusName={getStatusName}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            ) : (
                !searchTerm ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-10">
                            <div className="text-center">
                                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-lg font-medium mb-2">Нет лотов для отображения</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Попробуйте обновить данные или изменить фильтры
                                </p>
                                <Button onClick={refresh} variant="outline">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Обновить
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="flex items-center justify-center py-10">
                            <div className="text-center">
                                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-lg font-medium mb-2">Ничего не найдено</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    По запросу "{searchTerm}" ничего не найдено
                                </p>
                                <Button onClick={() => setSearchTerm('')} variant="outline">
                                    Очистить поиск
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            )}

            {/* Пагинация */}
            {!loading && !searchTerm && filteredLots.length > 0 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => fetchLots(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        Назад
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Страница {currentPage}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => fetchLots(currentPage + 1)}
                        disabled={!hasNextPage}
                    >
                        Далее
                    </Button>
                </div>
            )}


        </div>
    );
}
