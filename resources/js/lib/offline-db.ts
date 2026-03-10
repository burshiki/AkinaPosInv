const DB_NAME = 'akina-pos-offline';
const DB_VERSION = 1;

const STORES = {
    PRODUCTS: 'products',
    PENDING_SALES: 'pending_sales',
    CART: 'cart_state',
} as const;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
                const store = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
                store.createIndex('sku', 'sku', { unique: false });
                store.createIndex('barcode', 'barcode', { unique: false });
                store.createIndex('category_id', 'category_id', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.PENDING_SALES)) {
                const store = db.createObjectStore(STORES.PENDING_SALES, {
                    keyPath: 'offline_id',
                    autoIncrement: true,
                });
                store.createIndex('created_at', 'created_at', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.CART)) {
                db.createObjectStore(STORES.CART, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ── Product Cache ──

export async function cacheProducts(products: Array<Record<string, unknown>>): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORES.PRODUCTS);

    // Clear and repopulate
    store.clear();
    for (const product of products) {
        store.put(product);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getCachedProducts(): Promise<Array<Record<string, unknown>>> {
    const db = await openDB();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getCachedProductByBarcode(barcode: string): Promise<Record<string, unknown> | undefined> {
    const db = await openDB();
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    const index = store.index('barcode');

    return new Promise((resolve, reject) => {
        const request = index.get(barcode);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ── Pending Sales Queue ──

export async function queueOfflineSale(saleData: Record<string, unknown>): Promise<number> {
    const db = await openDB();
    const tx = db.transaction(STORES.PENDING_SALES, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_SALES);

    const entry = {
        ...saleData,
        created_at: new Date().toISOString(),
        synced: false,
    };

    return new Promise((resolve, reject) => {
        const request = store.add(entry);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
}

export async function getPendingSales(): Promise<Array<Record<string, unknown>>> {
    const db = await openDB();
    const tx = db.transaction(STORES.PENDING_SALES, 'readonly');
    const store = tx.objectStore(STORES.PENDING_SALES);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function removePendingSale(offlineId: number): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORES.PENDING_SALES, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_SALES);

    return new Promise((resolve, reject) => {
        const request = store.delete(offlineId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getPendingSalesCount(): Promise<number> {
    const db = await openDB();
    const tx = db.transaction(STORES.PENDING_SALES, 'readonly');
    const store = tx.objectStore(STORES.PENDING_SALES);

    return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ── Cart Persistence ──

export async function saveCartState(cartData: Record<string, unknown>): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORES.CART, 'readwrite');
    const store = tx.objectStore(STORES.CART);

    return new Promise((resolve, reject) => {
        const request = store.put({ key: 'current_cart', ...cartData });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getCartState(): Promise<Record<string, unknown> | undefined> {
    const db = await openDB();
    const tx = db.transaction(STORES.CART, 'readonly');
    const store = tx.objectStore(STORES.CART);

    return new Promise((resolve, reject) => {
        const request = store.get('current_cart');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function clearCartState(): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORES.CART, 'readwrite');
    const store = tx.objectStore(STORES.CART);

    return new Promise((resolve, reject) => {
        const request = store.delete('current_cart');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
