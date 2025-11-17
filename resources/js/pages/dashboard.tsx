import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LotsList from '@/components/lots-list';
import DashboardStats from '@/components/dashboard-stats';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { TrendingUp, FileText, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Панель управления',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Панель управления" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                {/* Статистические карточки */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <DashboardStats />
                </div>
            
            </div>
        </AppLayout>
    );
}
