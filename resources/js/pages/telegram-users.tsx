import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCheck, UserX, Users, Activity, Calendar, MessageCircle } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Панель управления',
        href: '/dashboard',
    },
    {
        title: 'Пользователи Telegram',
        href: '/telegram-users',
    },
];

interface TelegramUser {
    id: number;
    chat_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    language_code: string | null;
    is_bot: boolean;
    is_active: boolean;
    first_interaction_at: string | null;
    last_interaction_at: string | null;
    interactions_count: number;
    created_at: string;
    updated_at: string;
}

interface PaginatedUsers {
    data: TelegramUser[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Stats {
    total: number;
    active: number;
    recent: number;
    total_interactions: number;
}

interface TelegramUsersProps {
    users: PaginatedUsers;
    stats: Stats;
    filters: {
        search?: string;
        active?: boolean;
    };
}

export default function TelegramUsers({ users, stats, filters }: TelegramUsersProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/telegram-users', { search: searchTerm }, { preserveState: true });
    };

    const toggleActive = (userId: number, isActive: boolean) => {
        const action = isActive ? 'deactivate' : 'activate';
        router.post(`/telegram-users/${userId}/${action}`, {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDisplayName = (user: TelegramUser) => {
        if (user.first_name) {
            return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
        }
        return user.username || `User ${user.chat_id}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Пользователи Telegram" />
            
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Статистика */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Активные</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% от всех
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Активны за 7 дней</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.recent}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.total > 0 ? Math.round((stats.recent / stats.total) * 100) : 0}% от всех
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Всего взаимодействий</CardTitle>
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_interactions}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.total > 0 ? Math.round(stats.total_interactions / stats.total) : 0} в среднем
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Поиск */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск по имени, username, Chat ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button type="submit">Найти</Button>
                            {searchTerm && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSearchTerm('');
                                        router.get('/telegram-users');
                                    }}
                                >
                                    Сбросить
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Таблица пользователей */}
                <Card>
                    <CardHeader>
                        <CardTitle>Пользователи ({users.total})</CardTitle>
                        <CardDescription>
                            Список всех пользователей Telegram бота
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">ID</TableHead>
                                        <TableHead>Chat ID</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Имя</TableHead>
                                        <TableHead className="text-center">Статус</TableHead>
                                        <TableHead className="text-center">Взаимодействий</TableHead>
                                        <TableHead>Первое взаимодействие</TableHead>
                                        <TableHead>Последнее взаимодействие</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center text-muted-foreground">
                                                Пользователи не найдены
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.data.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">{user.id}</TableCell>
                                                <TableCell className="font-mono text-sm">{user.chat_id}</TableCell>
                                                <TableCell>
                                                    {user.username ? (
                                                        <span className="text-blue-600">@{user.username}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getDisplayName(user)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                                        {user.is_active ? 'Активен' : 'Неактивен'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline">{user.interactions_count}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(user.first_interaction_at)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(user.last_interaction_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleActive(user.id, user.is_active)}
                                                    >
                                                        {user.is_active ? (
                                                            <>
                                                                <UserX className="mr-2 h-4 w-4" />
                                                                Деактивировать
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="mr-2 h-4 w-4" />
                                                                Активировать
                                                            </>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Пагинация */}
                        {users.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Страница {users.current_page} из {users.last_page}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={users.current_page <= 1}
                                        onClick={() =>
                                            router.get('/telegram-users', {
                                                ...filters,
                                                page: users.current_page - 1,
                                            })
                                        }
                                    >
                                        Назад
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={users.current_page >= users.last_page}
                                        onClick={() =>
                                            router.get('/telegram-users', {
                                                ...filters,
                                                page: users.current_page + 1,
                                            })
                                        }
                                    >
                                        Далее
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
