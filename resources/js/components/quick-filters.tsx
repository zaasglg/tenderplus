import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import type { LotsFilterValues } from '@/components/lots-filter';

interface QuickFilter {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    filters: LotsFilterValues;
    color: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface QuickFiltersProps {
    onApplyFilter: (filters: LotsFilterValues, filterName: string) => void;
    activeFilter?: string;
}

export default function QuickFilters({ onApplyFilter, activeFilter }: QuickFiltersProps) {
    const quickFilters: QuickFilter[] = [
        {
            id: 'for-me',
            name: 'Лоты для меня',
            description: 'Поиск по стиральным порошкам с активными статусами',
            icon: Heart,
            filters: {
                // Поиск по ключевым словам
                keywords: 'порошок',
                // Статусы: запрос ценовых предложений, открытый конкурс, рассмотрение дополнительных заявок,
                // опубликован прием заявок, опубликован дополнение заявок, опубликован,
                // опубликован прием ценовых предложений
                // status_names: 'запрос ценовых предложений,открытый конкурс,рассмотрение дополнительных заявок,опубликован прием заявок,опубликован дополнение заявок,опубликован,опубликован прием ценовых предложений'
            },
            color: 'default'
        }
    ];

    return (
        <Card className="mb-4">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Быстрые фильтры</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    {quickFilters.map((filter) => {
                        const Icon = filter.icon;
                        const isActive = activeFilter === filter.id;
                        
                        return (
                            <Button
                                key={filter.id}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => onApplyFilter(filter.filters, filter.id)}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{filter.name}</span>
                            </Button>
                        );
                    })}
                </div>
                
                {activeFilter && (
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Активный фильтр:</span>
                            <Badge variant="secondary" className="text-xs">
                                {quickFilters.find(f => f.id === activeFilter)?.name}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => onApplyFilter({}, '')}
                            >
                                Сбросить
                            </Button>
                        </div>
                        {activeFilter === 'for-me' && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                <p><strong>Ключевые слова:</strong> порошок, стиральный порошок, автомат, полуавтомат, ручная стирка</p>
                                <p><strong>Статусы:</strong> активные лоты с приемом заявок</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
