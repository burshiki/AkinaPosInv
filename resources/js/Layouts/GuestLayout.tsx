import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <div className="mb-6">
                <Link href="/" className="text-2xl font-bold text-primary">
                    Akina POS
                </Link>
            </div>
            <div className="w-full max-w-md overflow-hidden rounded-lg border bg-card p-6 shadow-sm">
                {children}
            </div>
        </div>
    );
}
