import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    ArrowLeft, 
    Calendar, 
    Building, 
    FileText, 
    Users, 
    ClipboardList,
    Award,
    Handshake,
    Bell
} from 'lucide-react';

interface LotDetailsData {
    id: string;
    lotNumber: string;
    nameRu: string;
    nameKz?: string;
    descriptionRu?: string;
    amount: number;
    customerBin: string;
    customerNameRu: string;
    refLotStatusId: number;
    lastUpdateDate: string;
    trdBuyNumberAnno: string;
    // Дополнительные поля для детальной страницы
    startDate?: string;
    endDate?: string;
    publicationDate?: string;
    tradeMethod?: string;
    category?: string;
}

const getStatusText = (statusId: number | string | undefined): string => {
    const id = typeof statusId === 'string' ? parseInt(statusId) : statusId;
    switch (id) {
        case 200: return 'Создан';
        case 210: return 'Опубликован';
        case 220: return 'Прием заявок';
        case 230: return 'Рассмотрение заявок';
        case 240: return 'Отменен';
        case 250: return 'Определен победитель';
        case 260: return 'Заключен договор';
        case 270: return 'Исполнен';
        case 280: return 'Расторгнут';
        case 290: return 'Архив';
        case 300: return 'Несостоявшийся';
        case 310: return 'Повторно объявлен';
        case 320: return 'Приостановлен';
        case 330: return 'Возобновлен';
        case 340: return 'На согласовании';
        case 350: return 'Отклонен';
        case 360: return 'Подписан';
        case 370: return 'На доработке';
        case 380: return 'Ожидает подписания';
        default: return id ? `Статус ${id}` : 'Неизвестно';
    }
};

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

export default function LotDetailsPage({ id }: { id: string }) {
    const [lot, setLot] = useState<LotDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => {
        router.visit('/lots');
    };

    useEffect(() => {
        const fetchLotDetails = async () => {
            if (!id) return;
            
            setLoading(true);
            try {
                // Здесь должен быть запрос к API для получения деталей лота
                // Пока используем заглушку
                setTimeout(() => {
                    setLot({
                        id: id,
                        lotNumber: '1',
                        nameRu: 'Вода в бутылях 19 литров',
                        nameKz: '19 литрлік бөтелкедегі су',
                        descriptionRu: 'Поставка питьевой воды в бутылях объемом 19 литров для нужд государственного учреждения',
                        amount: 2500000,
                        customerBin: '123456789012',
                        customerNameRu: 'КГУ "Управление здравоохранения города Алматы"',
                        refLotStatusId: 210,
                        lastUpdateDate: '2025-08-11',
                        trdBuyNumberAnno: '15205989-1',
                        startDate: '2025-08-11 09:00:00',
                        endDate: '2025-08-13 09:00:00',
                        publicationDate: '2025-08-11 02:49:15',
                        tradeMethod: 'Запрос ценовых предложений',
                        category: 'Продукты питания и напитки'
                    });
                    setLoading(false);
                }, 1000);
            } catch (err) {
                setError('Ошибка загрузки данных лота');
                setLoading(false);
            }
        };

        fetchLotDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !lot) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Назад
                    </Button>
                </div>
                <Card>
                    <CardContent className="flex items-center justify-center py-10">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                {error || 'Лот не найден'}
                            </p>
                            <Button onClick={handleBack} variant="outline">
                                Вернуться к списку
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Заголовок страницы */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Просмотр объявления № {lot.trdBuyNumberAnno}</h1>
                </div>
            </div>

            {/* Основная информация */}
            <Card>
                <CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Номер объявления</label>
                                <div className="text-base bg-gray-100 p-2 rounded">{lot.trdBuyNumberAnno}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Наименование объявления</label>
                                <div className="text-base bg-gray-100 p-2 rounded">{lot.nameRu}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Статус объявления</label>
                                <div className="text-base bg-gray-100 p-2 rounded">
                                    <Badge variant="outline">{getStatusText(lot.refLotStatusId)}</Badge>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Дата публикации объявления</label>
                                <div className="text-base bg-gray-100 p-2 rounded">{lot.publicationDate}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Срок начала приема заявок</label>
                                <div className="text-base bg-gray-100 p-2 rounded">{lot.startDate}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Срок окончания приема заявок</label>
                                <div className="text-base bg-gray-100 p-2 rounded">{lot.endDate}</div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Табы */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-8">
                    <TabsTrigger value="general">Общие сведения</TabsTrigger>
                    <TabsTrigger value="lots">Лоты</TabsTrigger>
                    <TabsTrigger value="docs">Документация</TabsTrigger>
                    <TabsTrigger value="protocols">Протоколы</TabsTrigger>
                    <TabsTrigger value="winners">Информация о победителях</TabsTrigger>
                    <TabsTrigger value="contracts">Договоры</TabsTrigger>
                    <TabsTrigger value="appeals">Апелляции</TabsTrigger>
                    <TabsTrigger value="other">Прочее</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Общая информация</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Заказчик</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">{lot.customerNameRu}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">БИН заказчика</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">{lot.customerBin}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Способ закупки</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">{lot.tradeMethod}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Категория</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">{lot.category}</div>
                                </div>
                            </div>
                            
                            {lot.descriptionRu && (
                                <div>
                                    <label className="text-sm font-medium">Описание</label>
                                    <div className="text-sm bg-gray-50 p-3 rounded leading-relaxed">{lot.descriptionRu}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="lots" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Информация о лоте</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Номер лота</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">{lot.lotNumber}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Наименование лота</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">{lot.nameRu}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Планируемая сумма</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded font-semibold text-green-600">
                                        {formatCurrency(lot.amount)}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Статус лота</label>
                                    <div className="text-sm bg-gray-50 p-2 rounded">
                                        <Badge variant="outline">{getStatusText(lot.refLotStatusId)}</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="docs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Документация</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Документы будут доступны после загрузки</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="protocols" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Протоколы</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Протоколы будут опубликованы после завершения процедур</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="winners" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Информация о победителях</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Информация о победителях появится после определения результатов</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contracts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Договоры</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Договоры будут доступны после их заключения</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appeals" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Апелляции</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Информация об апелляциях отсутствует</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="other" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Дополнительная информация</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Дополнительная информация отсутствует</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
