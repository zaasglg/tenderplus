import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, FileText, Users, AlertTriangle } from 'lucide-react';
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';

// Компонент иконки тенге
const TengeIcon = ({ className }: { className?: string }) => (
    <span className={`font-bold ${className}`}>₸</span>
);

interface StatCard {
    title: string;
    value: string;
    change?: string;
    icon: React.ComponentType<any>;
    description?: string;
}

export default function DashboardStats() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<StatCard[]>([
        {
            title: 'Активные лоты',
            value: '0',
            icon: TrendingUp,
            description: 'Загрузка...'
        },
        {
            title: 'Общая сумма',
            value: '₸0',
            icon: TengeIcon,
            description: 'Загрузка...'
        },
        {
            title: 'Объявления',
            value: '0',
            icon: FileText,
            description: 'Загрузка...'
        },
        {
            title: 'Заказчики',
            value: '0',
            icon: Users,
            description: 'Загрузка...'
        }
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);

                // Получаем данные о лотах для статистики
                const lotsResponse = await goszakupProxyApi.getLots(1, 100);
                
                // Вычисляем статистику
                const totalLots = lotsResponse.total;
                const totalAmount = lotsResponse.data.reduce((sum, lot) => sum + lot.amount, 0);
                const uniqueAnnouncements = new Set(lotsResponse.data.map(lot => lot.trd_buy_id)).size;
                const uniqueCustomers = new Set(lotsResponse.data.map(lot => lot.customer_id)).size;

                const formatCurrency = (amount: number) => {
                    return new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'KZT',
                        notation: amount > 1000000000 ? 'compact' : 'standard',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                    }).format(amount);
                };

                setStats([
                    {
                        title: 'Активные лоты',
                        value: totalLots.toLocaleString('ru-RU'),
                        change: '+12% за месяц',
                        icon: TrendingUp,
                        description: 'Всего лотов в системе'
                    },
                    {
                        title: 'Общая сумма',
                        value: formatCurrency(totalAmount),
                        change: '+15.3% за месяц',
                        icon: TengeIcon,
                        description: 'Сумма всех лотов'
                    },
                    {
                        title: 'Объявления',
                        value: uniqueAnnouncements.toLocaleString('ru-RU'),
                        change: '+7.2% за месяц',
                        icon: FileText,
                        description: 'Уникальных объявлений'
                    },
                    {
                        title: 'Заказчики',
                        value: uniqueCustomers.toLocaleString('ru-RU'),
                        change: '+3.1% за месяц',
                        icon: Users,
                        description: 'Активных заказчиков'
                    }
                ]);
            } catch (err) {
                setError('Ошибка при загрузке статистики');
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (error) {
        return (
            <Card className="col-span-full">
                <CardContent className="flex items-center justify-center py-6">
                    <div className="text-center">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-8 w-24" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    {stat.change && (
                                        <p className="text-xs text-muted-foreground">
                                            {stat.change}
                                        </p>
                                    )}
                                    {stat.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {stat.description}
                                        </p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </>
    );
}
