import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

// Goszakup API Types
export interface GoszakupApiResponse<T> {
    total: number;
    next_page: string | null;
    limit: number;
    data: T[];
}

export interface Lot {
    id: number;
    lot_number: number;
    ref_lot_status_id: number;
    last_update_date: string;
    union_lots: boolean;
    count: number;
    amount: number;
    name_ru: string;
    name_kz: string;
    description_ru: string;
    description_kz: string;
    customer_id: number;
    customer_bin: string;
    customer_name_ru: string;
    customer_name_kz: string;
    trd_buy_number_anno: string;
    trd_buy_id: number;
    dumping: boolean;
    dumping_lot_price: number;
    psd_sign: number;
    consulting_services: boolean;
    point_list: number[];
    singl_org_sign: boolean;
    is_light_industry: boolean;
    is_construction_work: boolean;
    disable_person_id: boolean;
    ref_trade_methods_id: number;
    index_date: string;
    system_id: number;
}

export interface LotStatus {
    id: number;
    name_ru: string;
    name_kz: string;
}

export interface TradeMethod {
    id: number;
    name_ru: string;
    name_kz: string;
}
