import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, Send, Check, X, Search } from 'lucide-react';

export default function TelegramSettings() {
    const [settings, setSettings] = useState({
        bot_token: '',
        chat_id: '',
        notifications_enabled: false,
        keywords: 'Прошок',
    });
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [checkLoading, setCheckLoading] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [checkResult, setCheckResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Здесь будет API запрос для сохранения настроек
            await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация запроса
            console.log('Settings saved:', settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = async () => {
        setTestLoading(true);
        setTestResult(null);
        
        try {
            const response = await fetch('/api/telegram/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Тестовое сообщение от TenderPlus! 🚀'
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                setTestResult({
                    success: true,
                    message: result.message || 'Тестовое уведомление отправлено успешно!'
                });
            } else {
                setTestResult({
                    success: false,
                    message: result.message || 'Ошибка при отправке уведомления'
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Ошибка подключения к серверу'
            });
        } finally {
            setTestLoading(false);
        }
    };

    const handleCheckNewLots = async () => {
        setCheckLoading(true);
        setCheckResult(null);
        
        try {
            const response = await fetch('/api/lots/check-new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                setCheckResult({
                    success: true,
                    message: result.message || 'Проверка выполнена! Если найдены новые лоты, уведомления отправлены.'
                });
            } else {
                setCheckResult({
                    success: false,
                    message: result.message || 'Ошибка при проверке новых лотов'
                });
            }
        } catch (error) {
            setCheckResult({
                success: false,
                message: 'Ошибка подключения к серверу'
            });
        } finally {
            setCheckLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Настройки Telegram</h1>
                <p className="text-muted-foreground">
                    Настройка уведомлений о новых лотах в Telegram
                </p>
            </div>

            <div className="grid gap-6">
                {/* Основные настройки */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Настройки бота
                        </CardTitle>
                        <CardDescription>
                            Конфигурация Telegram бота для отправки уведомлений
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bot_token">Токен бота</Label>
                            <Input
                                id="bot_token"
                                type="password"
                                placeholder="123456789:AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQr"
                                value={settings.bot_token}
                                onChange={(e) => setSettings(prev => ({ ...prev, bot_token: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Получите токен у @BotFather в Telegram
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="chat_id">ID чата</Label>
                            <Input
                                id="chat_id"
                                placeholder="-1001234567890"
                                value={settings.chat_id}
                                onChange={(e) => setSettings(prev => ({ ...prev, chat_id: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                ID чата или канала для отправки уведомлений
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="keywords">Ключевые слова для поиска</Label>
                            <Input
                                id="keywords"
                                placeholder="программное обеспечение,разработка,ПО,софт"
                                value={settings.keywords}
                                onChange={(e) => setSettings(prev => ({ ...prev, keywords: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Слова через запятую для поиска релевантных лотов
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="notifications_enabled"
                                checked={settings.notifications_enabled}
                                onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, notifications_enabled: checked }))}
                            />
                            <Label htmlFor="notifications_enabled">Включить уведомления</Label>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleTestNotification}
                                disabled={testLoading || !settings.bot_token || !settings.chat_id}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {testLoading ? 'Отправка...' : 'Тест'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleCheckNewLots}
                                disabled={checkLoading || !settings.bot_token || !settings.chat_id}
                            >
                                <Search className="h-4 w-4 mr-2" />
                                {checkLoading ? 'Проверка...' : 'Проверить лоты'}
                            </Button>
                        </div>

                        {testResult && (
                            <div className={`flex items-center gap-2 p-3 rounded-md border ${
                                testResult.success 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                                {testResult.success ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                                <span className="text-sm">{testResult.message}</span>
                            </div>
                        )}

                        {checkResult && (
                            <div className={`flex items-center gap-2 p-3 rounded-md border ${
                                checkResult.success 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                                {checkResult.success ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                                <span className="text-sm">{checkResult.message}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Статус мониторинга */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="h-5 w-5" />
                            Статус мониторинга
                        </CardTitle>
                        <CardDescription>
                            Информация о работе системы мониторинга лотов
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                                <div className="text-2xl font-bold text-green-600">Активен</div>
                                <div className="text-sm text-muted-foreground">Статус мониторинга</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <div className="text-2xl font-bold">30 мин</div>
                                <div className="text-sm text-muted-foreground">Интервал проверки</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <div className="text-2xl font-bold">8:00-20:00</div>
                                <div className="text-sm text-muted-foreground">Время работы</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium">Критерии фильтрации "Лоты для меня":</h4>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">Порошок</Badge>
                                <Badge variant="secondary">Стиральный порошок</Badge>
                                <Badge variant="secondary">Автомат</Badge>
                                <Badge variant="secondary">Полуавтомат</Badge>
                                <Badge variant="secondary">Ручная стирка</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Инструкция */}
                <Card>
                    <CardHeader>
                        <CardTitle>Как настроить уведомления</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-3 text-sm">
                            <li>
                                <strong>Создайте бота:</strong> Найдите @BotFather в Telegram, отправьте команду /newbot и следуйте инструкциям
                            </li>
                            <li>
                                <strong>Получите токен:</strong> Скопируйте токен бота из сообщения BotFather
                            </li>
                            <li>
                                <strong>Добавьте бота в чат:</strong> Создайте группу или используйте личный чат с ботом
                            </li>
                            <li>
                                <strong>Получите Chat ID:</strong> Отправьте сообщение боту, затем перейдите по ссылке: 
                                <code className="bg-muted px-1 py-0.5 rounded text-xs ml-1">
                                    https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                                </code>
                            </li>
                            <li>
                                <strong>Введите настройки:</strong> Вставьте токен и Chat ID в поля выше
                            </li>
                            <li>
                                <strong>Включите уведомления:</strong> Переключите тумблер и нажмите "Сохранить"
                            </li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
