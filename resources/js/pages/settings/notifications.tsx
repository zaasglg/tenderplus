import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Bell, 
    BellRing, 
    TrendingUp, 
    Clock, 
    CheckCircle, 
    XCircle,
    BarChart3,
    RefreshCw,
    Send
} from 'lucide-react';

interface NotificationStats {
    total_notifications: number;
    total_lots: number;
    last_check: string;
    status: 'active' | 'inactive';
    today_stats: {
        notifications: number;
        lots: number;
    };
}

export default function NotificationDashboard() {
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchStats = async () => {
        try {
            setLoading(true);
            // Здесь будет реальный API вызов
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setStats({
                total_notifications: 15,
                total_lots: 245,
                last_check: '2025-08-06 12:45:00',
                status: 'active',
                today_stats: {
                    notifications: 3,
                    lots: 12
                }
            });
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const triggerManualCheck = async () => {
        try {
            const response = await fetch('/api/lots/check-new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                alert('Проверка запущена!');
                setTimeout(fetchStats, 2000); // Обновляем статистику через 2 секунды
            } else {
                alert('Ошибка запуска проверки');
            }
        } catch (error) {
            alert('Ошибка: ' + error);
        }
    };

    useEffect(() => {
        fetchStats();
        
        // Автообновление каждые 30 секунд
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-muted rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Мониторинг уведомлений</h3>
                    <p className="text-sm text-muted-foreground">
                        Статистика автоматических уведомлений о новых лотах
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchStats}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={triggerManualCheck}
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Проверить сейчас
                    </Button>
                </div>
            </div>

            {/* Статус системы */}
            <Alert className={stats?.status === 'active' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {stats?.status === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                    <div className="flex items-center justify-between">
                        <span>
                            Система мониторинга: {' '}
                            <Badge variant={stats?.status === 'active' ? 'default' : 'destructive'}>
                                {stats?.status === 'active' ? 'Активна' : 'Неактивна'}
                            </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Последняя проверка: {stats?.last_check}
                        </span>
                    </div>
                </AlertDescription>
            </Alert>

            {/* Основная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Сегодня уведомлений</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.today_stats.notifications || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            +2 с вчерашнего дня
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Лотов найдено сегодня</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.today_stats.lots || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            По критериям "Лоты для меня"
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего уведомлений</CardTitle>
                        <BellRing className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_notifications || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            За все время
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего лотов</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_lots || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Обработано системой
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Настройки мониторинга */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Расписание проверок
                    </CardTitle>
                    <CardDescription>
                        Текущие настройки автоматической проверки новых лотов
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-lg font-semibold text-green-600">Каждые 30 мин</div>
                            <div className="text-sm text-muted-foreground">Интервал проверки</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-lg font-semibold">8:00 - 20:00</div>
                            <div className="text-sm text-muted-foreground">Рабочие часы</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <div className="text-lg font-semibold">Пн - Вс</div>
                            <div className="text-sm text-muted-foreground">Рабочие дни</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Критерии фильтрации */}
            <Card>
                <CardHeader>
                    <CardTitle>Активные фильтры "Лоты для меня"</CardTitle>
                    <CardDescription>
                        Критерии для отбора лотов для уведомлений
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium mb-2">Ключевые слова:</h4>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">порошок</Badge>
                            <Badge variant="secondary">стиральный порошок</Badge>
                            <Badge variant="secondary">автомат</Badge>
                            <Badge variant="secondary">полуавтомат</Badge>
                            <Badge variant="secondary">ручная стирка</Badge>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-sm font-medium mb-2">Статусы лотов:</h4>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Прием заявок</Badge>
                            <Badge variant="outline">Опубликован</Badge>
                            <Badge variant="outline">Открытый конкурс</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Последнее обновление */}
            <div className="text-xs text-muted-foreground text-center">
                Последнее обновление: {lastUpdate.toLocaleString('ru-RU')}
            </div>
        </div>
    );
}
