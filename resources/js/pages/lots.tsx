import LotsList from '@/components/lots-list';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Панель управления',
        href: '/dashboard',
    },
    {
        title: 'Лоты',
        href: '/lots',
    },
];

export default function Lots() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Лоты государственных закупок" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                <LotsList />
            </div>
        </AppLayout>
    );
}
