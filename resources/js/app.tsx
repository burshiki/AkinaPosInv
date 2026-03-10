import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ConfirmProvider } from '@/Components/app/confirm-dialog';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // SW registration failed - app continues normally
        });
    });
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ConfirmProvider>
                <App {...props} />
            </ConfirmProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
