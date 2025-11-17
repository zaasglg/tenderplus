// Components
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthLayout title="Подтверждение email" description="Пожалуйста, подтвердите свой email адрес, нажав на ссылку, которую мы только что отправили вам.">
            <Head title="Подтверждение email" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Новая ссылка для подтверждения была отправлена на email адрес, который вы указали при регистрации.
                </div>
            )}

            <form onSubmit={submit} className="space-y-6 text-center">
                <Button disabled={processing} variant="secondary">
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Отправить письмо повторно
                </Button>

                <TextLink href={route('logout')} method="post" className="mx-auto block text-sm">
                    Выйти
                </TextLink>
            </form>
        </AuthLayout>
    );
}
