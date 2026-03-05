export interface User {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    permissions: string[];
    email_verified_at?: string;
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface PageProps {
    auth: { user: User | null };
    flash: { success: string | null; error: string | null };
    app: { timezone: string; name: string };
    inventoryMode: boolean;
    warrantyPendingCount: number;
    poPendingApprovalCount: number;
    [key: string]: unknown;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
    products_count?: number;
}

export interface Product {
    id: number;
    category_id: number | null;
    category?: Category;
    name: string;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    cost_price: number;
    selling_price: number;
    tax_rate: number;
    is_vat_exempt: boolean;
    stock_quantity: number;
    low_stock_threshold: number;
    is_assembled: boolean;
    is_component: boolean;
    has_warranty: boolean;
    warranty_months: number | null;
    is_active: boolean;
    assembly_components?: AssemblyComponent[];
}

export interface AssemblyComponent {
    id: number;
    assembly_product_id: number;
    component_product_id: number;
    quantity_needed: number;
    component_product?: Product;
}

export interface Warranty {
    id: number;
    sale_id: number;
    sale_item_id: number;
    product_id: number;
    receipt_number: string;
    customer_name: string | null;
    warranty_months: number;
    serial_number: string | null;
    expires_at: string | null;
    status: 'pending' | 'active' | 'checking' | 'confirmed' | 'sent_to_supplier' | 'expired';
    notes: string | null;
    check_reason: string | null;
    supplier_id: number | null;
    supplier?: Supplier;
    tracking_number: string | null;
    product?: Product;
    sale?: Sale;
    created_at: string;
    updated_at: string;
}

export interface Sale {
    id: number;
    receipt_number: string;
    official_receipt_number: string | null;
    user_id: number;
    user?: User;
    customer_id: number | null;
    customer?: Customer;
    customer_name: string | null;
    customer_phone: string | null;
    payment_method: 'cash' | 'online' | 'credit';
    bank_account_id: number | null;
    bank_account?: BankAccount;
    cash_drawer_session_id: number | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    amount_tendered: number | null;
    change_amount: number | null;
    status: 'completed' | 'voided' | 'refunded';
    notes: string | null;
    items?: SaleItem[];
    returns?: SaleReturn[];
    sold_at: string;
}

export interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
}

export interface BankAccount {
    id: number;
    name: string;
    type: 'cash_drawer' | 'gcash' | 'maya' | 'bdo' | 'other';
    account_number: string | null;
    description: string | null;
    balance: number;
    is_active: boolean;
    ledger_entries_count?: number;
}

export interface BankAccountLedgerEntry {
    id: number;
    bank_account_id: number;
    bank_account?: BankAccount;
    type: 'in' | 'out';
    amount: number;
    running_balance: number;
    description: string;
    category: 'sale' | 'isp_collection' | 'vendo_collection' | 'expense'
        | 'transfer' | 'adjustment' | 'debt_payment' | 'other';
    reference_type: string | null;
    reference_id: number | null;
    performed_by: number | null;
    performer?: User;
    transacted_at: string;
}

export interface CustomerDebt {
    id: number;
    customer_name: string;
    customer_phone: string | null;
    sale_id: number | null;
    sale?: Sale;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: 'unpaid' | 'partial' | 'paid';
    due_date: string | null;
    notes: string | null;
    payments?: DebtPayment[];
}

export interface DebtPayment {
    id: number;
    customer_debt_id: number;
    customer_debt?: CustomerDebt;
    bank_account_id: number | null;
    bank_account?: BankAccount;
    payment_method: 'cash' | 'online';
    amount: number;
    received_by: number | null;
    notes: string | null;
    paid_at: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface CustomerDebtSummary {
    customer_name: string;
    customer_phone: string | null;
    total_debt: number;
    total_paid: number;
    outstanding_balance: number;
    debt_count: number;
}

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CashDrawerSession {
    id: number;
    user_id: number;
    user?: User;
    opening_balance: number;
    closing_balance: number | null;
    expected_cash: number | null;
    cash_sales_total: number;
    difference: number | null;
    total_transactions: number;
    opening_notes: string | null;
    closing_notes: string | null;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CashDrawerTransfer {
    id: number;
    cash_drawer_session_id: number;
    bank_account_id: number;
    bank_account?: BankAccount;
    performed_by: number;
    performer?: User;
    direction: 'drawer_to_bank' | 'bank_to_drawer';
    amount: number;
    notes: string | null;
    created_at: string;
}

export interface CashDrawerExpense {
    id: number;
    cash_drawer_session_id: number;
    performed_by: number;
    performer?: User;
    category: 'food' | 'transport' | 'supplies' | 'maintenance' | 'utilities' | 'other';
    amount: number;
    description: string;
    created_at: string;
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    product_id: number | null;
    product?: Product;
    product_name: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: number;
    subtotal: number;
    notes: string | null;
}

export interface Supplier {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    purchase_orders_count?: number;
    created_at: string;
    updated_at: string;
}

export interface InventorySession {
    id: number;
    started_by: number;
    starter?: User;
    ended_by: number | null;
    ender?: User | null;
    started_at: string;
    ended_at: string | null;
    status: 'active' | 'completed';
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface StockAdjustment {
    id: number;
    product_id: number;
    product?: Product;
    user_id: number;
    user?: User;
    inventory_session_id: number | null;
    inventorySession?: InventorySession | null;
    type: 'manual' | 'inventory_count' | 'sale' | 'purchase' | 'assembly_build' | 'return';
    before_qty: number;
    change_qty: number;
    after_qty: number;
    reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrder {
    id: number;
    po_number: string;
    supplier_id: number | null;
    supplier?: Supplier;
    supplier_name: string;
    supplier_phone: string | null;
    supplier_email: string | null;
    supplier_address: string | null;
    status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
    notes: string | null;
    subtotal: number;
    shipping_fee: number;
    total: number;
    ordered_at: string | null;
    received_at: string | null;
    created_by: number;
    creator?: User;
    items?: PurchaseOrderItem[];
    created_at: string;
    updated_at: string;
}

export interface AssemblyBuild {
    id: number;
    product_id: number;
    product?: Product;
    quantity: number;
    built_by: number;
    builder?: User;
    component_snapshot: Array<{
        component_id: number;
        name: string;
        sku: string | null;
        qty_used: number;
        cost_at_build: number;
        line_cost: number;
    }>;
    total_cost: number;
    unit_cost: number;
    built_at: string;
    created_at: string;
    updated_at: string;
}

export interface SaleReturn {
    id: number;
    return_number: string;
    sale_id: number;
    sale?: Sale;
    processed_by: number;
    processedBy?: User;
    customer_id: number | null;
    customer_name: string | null;
    type: 'refund' | 'exchange';
    refund_method: 'cash' | 'online' | null;
    bank_account_id: number | null;
    bank_account?: BankAccount;
    total_refund: number;
    tax_refund: number;
    reason: string | null;
    notes: string | null;
    items?: SaleReturnItem[];
    returned_at: string;
    created_at: string;
    updated_at: string;
}

export interface SaleReturnItem {
    id: number;
    sale_return_id: number;
    sale_item_id: number;
    sale_item?: SaleItem;
    product_id: number;
    product_name: string;
    product_sku: string | null;
    quantity_returned: number;
    unit_price: number;
    cost_price: number;
    refund_amount: number;
    restock: boolean;
}

export interface ZReport {
    date: string;
    sales: {
        total_transactions: number;
        total_revenue: number;
        total_cost: number;
        gross_profit: number;
        total_discount: number;
        total_tax_collected: number;
        net_revenue: number;
        average_sale: number;
    };
    sales_by_method: Array<{
        method: string;
        count: number;
        total: number;
    }>;
    voids: { count: number; total: number };
    returns: { count: number; total: number; tax_refund: number };
    cash_drawer: {
        session_id: number;
        cashier: string;
        opening_balance: number;
        closing_balance: number | null;
        cash_sales: number;
        change_given: number;
        transfers_out: number;
        transfers_in: number;
        petty_cash_expenses: number;
        cash_debt_payments: number;
        online_debt_payments: number;
        expected_cash: number;
        variance: number | null;
        status: string;
        opened_at: string;
        closed_at: string | null;
    } | null;
    account_movements: Array<{
        id: number;
        name: string;
        type: string;
        inflows: number;
        outflows: number;
        balance: number;
    }>;
    top_products: Array<{
        name: string;
        qty_sold: number;
        revenue: number;
    }>;
}