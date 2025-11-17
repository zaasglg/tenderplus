import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Eye, Calendar, Building, Megaphone, RefreshCw } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Панель управления',
        href: '/dashboard',
    },
    {
        title: 'Объявления',
        href: '/announcements',
    },
];

export default function Announcements() {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Объявления о государственных закупках" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                {/* Поиск */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Megaphone className="h-5 w-5" />
                                    Объявления о государственных закупках
                                </CardTitle>
                                <CardDescription>
                                    Список опубликованных объявлений о проведении закупок
                                </CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Обновить
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск по названию, номеру объявления или организатору..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Информационная карточка */}
                <Card>
                    <CardContent className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Объявления о закупках</h3>
                            <p className="text-muted-foreground mb-4 max-w-md">
                                Здесь будет отображаться список объявлений о проведении государственных закупок 
                                с информацией о статусах, сроках и условиях участия.
                            </p>
                            <div className="flex justify-center gap-2">
                                <Badge variant="outline">Опубликованы</Badge>
                                <Badge variant="outline">Прием заявок</Badge>
                                <Badge variant="outline">На рассмотрении</Badge>
                                <Badge variant="outline">Завершены</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
