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
    has_variants: boolean;
    is_active: boolean;
    assembly_components?: AssemblyComponent[];
    variants?: ProductVariant[];
}

export interface AssemblyComponent {
    id: number;
    assembly_product_id: number;
    component_product_id: number;
    quantity_needed: number;
    component_product?: Product;
}

export interface WarrantyBatchRow {
    warranty_id:   number;
    serial_number: string;
    notes:         string;
    selected:      boolean;
}

export interface WarrantyClaim {
    id: number;
    warranty_id: number;
    claim_number: string;
    issue_description: string | null;
    status: 'open' | 'confirmed' | 'in_repair' | 'resolved' | 'no_defect';
    resolution_type: 'repair' | 'replacement' | 'refund' | null;
    supplier_id: number | null;
    supplier?: Supplier;
    tracking_number: string | null;
    received_serial_number: string | null;
    resolution_notes: string | null;
    resolved_at: string | null;
    // Defective unit tracking (only set for from-stock replacements)
    defective_status: 'pending' | 'sent' | 'received' | null;
    defective_supplier_id: number | null;
    defective_supplier?: Supplier;
    defective_tracking_number: string | null;
    defective_received_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Warranty {
    id: number;
    parent_warranty_id: number | null;
    parent_warranty?: Warranty;
    child_warranty?: Warranty;
    sale_id: number;
    sale_item_id: number;
    product_id: number;
    receipt_number: string;
    customer_name: string | null;
    warranty_months: number;
    serial_number: string | null;
    activated_at: string | null;
    expires_at: string | null;
    status: 'pending_serial' | 'active' | 'replaced' | 'void';
    notes: string | null;
    product?: Product;
    sale?: Sale;
    claims?: WarrantyClaim[];
    open_claims_count?: number;
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
    discount_type: 'amount' | 'percent';
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
    discount_amount: number;
    discount_type: 'amount' | 'percent' | null;
}

export interface BankAccount {
    id: number;
    name: string;
    bank_name: string | null;
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
    loyalty_points: number;
    loyalty_tier: 'standard' | 'silver' | 'gold';
    sales?: Sale[];
    loyalty_transactions?: LoyaltyTransaction[];
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface LoyaltyTransaction {
    id: number;
    customer_id: number;
    sale_id: number | null;
    type: 'earn' | 'redeem';
    points: number;
    balance_after: number;
    description: string | null;
    created_at: string;
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

export interface CashDrawerReceipt {
    id: number;
    cash_drawer_session_id: number;
    performed_by: number;
    performer?: User;
    category: 'isp_collection' | 'wifi_vendo_collection' | 'other';
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
    status: 'draft' | 'approved' | 'partially_received' | 'received' | 'cancelled';
    payment_status: 'unpaid' | 'partially_paid' | 'paid';
    notes: string | null;
    subtotal: number;
    shipping_fee: number;
    total: number;
    approved_at: string | null;
    received_at: string | null;
    created_by: number;
    creator?: User;
    approved_by: number | null;
    approver?: User;
    items?: PurchaseOrderItem[];
    bill?: Bill;
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

export interface Employee {
    id: number;
    user_id: number | null;
    user?: User;
    employee_number: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    full_name: string;
    daily_rate: number;
    position: string | null;
    department: string | null;
    pay_type: 'monthly' | 'daily';
    basic_salary: number;
    standard_work_days: number;
    monthly_divisor: number;
    hired_at: string;
    separated_at: string | null;
    sss_number: string | null;
    philhealth_number: string | null;
    pagibig_number: string | null;
    tin: string | null;
    tax_status: string;
    phone: string | null;
    address: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    payroll_records?: PayrollRecord[];
    payslips?: PayslipRecord[];
}

export interface PayrollPeriod {
    id: number;
    name: string;
    period_start: string;
    period_end: string;
    status: 'draft' | 'locked' | 'paid';
    created_by: number;
    created_by_user?: User;
    approved_by: number | null;
    approved_by_user?: User;
    approved_at: string | null;
    paid_at: string | null;
    notes: string | null;
    payroll_records?: PayrollRecord[];
    payroll_records_count?: number;
    created_at: string;
    updated_at: string;
}

export interface AttendanceRecord {
    id: number;
    employee_id: number;
    employee?: Employee;
    payroll_period_id: number;
    days_present: number;
    days_absent: number;
    days_late: number;
    overtime_hours: number;
    late_deduction: number;
    regular_holidays_not_worked: number;
    regular_holidays_worked: number;
    special_holidays_worked: number;
    regular_holidays_restday_worked: number;
    special_holidays_restday_worked: number;
    notes: string | null;
    recorded_by: number;
}

export interface PayrollRecord {
    id: number;
    payroll_period_id: number;
    payroll_period?: PayrollPeriod;
    employee_id: number;
    employee?: Employee;
    basic_pay: number;
    overtime_pay: number;
    holiday_pay: number;
    allowances: number;
    gross_pay: number;
    sss_employee: number;
    philhealth_employee: number;
    pagibig_employee: number;
    bir_withholding_tax: number;
    sss_employer: number;
    sss_ec: number;
    philhealth_employer: number;
    pagibig_employer: number;
    late_deduction: number;
    other_deductions: number;
    other_deductions_notes: string | null;
    cash_advance: number;
    loan_deduction: number;
    total_deductions: number;
    net_pay: number;
    pay_type: 'monthly' | 'daily';
    basic_salary_snapshot: number;
    days_present: number;
    days_absent: number;
    overtime_hours: number;
    status: 'draft' | 'confirmed' | 'paid';
    paid_at: string | null;
    computed_by: number;
    disbursement_source: 'cash_drawer' | 'bank_account' | null;
    disbursement_id: number | null;
    disbursement_notes: string | null;
    payslip?: PayslipRecord;
    created_at: string;
    updated_at: string;
}

export interface PayslipRecord {
    id: number;
    payroll_record_id: number;
    payroll_record?: PayrollRecord;
    employee_id: number;
    employee?: Employee;
    payroll_period_id: number;
    payroll_period?: PayrollPeriod;
    payslip_number: string;
    generated_at: string;
    generated_by: number;
    generated_by_user?: User;
    created_at: string;
    updated_at: string;
}

export interface HolidayEntry {
    id: number;
    date: string;
    name: string;
    type: 'regular' | 'special_non_working' | 'special_working';
    year: number;
}

// Product Variants
export interface ProductAttribute {
    id: number;
    name: string;
    sort_order: number;
    values?: ProductAttributeValue[];
}

export interface ProductAttributeValue {
    id: number;
    product_attribute_id: number;
    value: string;
    sort_order: number;
    attribute?: ProductAttribute;
}

export interface ProductVariant {
    id: number;
    product_id: number;
    sku: string | null;
    barcode: string | null;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    is_active: boolean;
    attribute_values?: ProductAttributeValue[];
    created_at: string;
    updated_at: string;
}

// Promotions
export interface Promotion {
    id: number;
    name: string;
    description: string | null;
    type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
    value: number;
    buy_quantity: number | null;
    get_quantity: number | null;
    min_purchase: number | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    applies_to: 'all' | 'product' | 'category';
    customer_tier: 'standard' | 'silver' | 'gold' | null;
    usage_limit: number | null;
    usage_count: number;
    items?: PromotionItem[];
    created_at: string;
    updated_at: string;
}

export interface PromotionItem {
    id: number;
    promotion_id: number;
    item_type: 'product' | 'category';
    item_id: number;
}

// Leave Management
export interface LeaveType {
    id: number;
    name: string;
    default_days_per_year: number;
    is_paid: boolean;
    is_active: boolean;
    /** Minimum months of service required to avail this leave (null = no restriction) */
    min_service_months: number | null;
    /** Whether unused days must be converted to cash at year-end (SIL rule) */
    is_cash_convertible: boolean;
}

export interface LeaveRequest {
    id: number;
    employee_id: number;
    employee?: Employee;
    leave_type_id: number;
    leave_type?: LeaveType;
    start_date: string;
    end_date: string;
    days_count: number;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: number | null;
    approver?: User;
    approved_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    leave_type?: LeaveType;
    year: number;
    total_days: number;
    used_days: number;
    cash_converted_days: number;
    remaining_days: number;
}

// Recurring Deductions
export interface EmployeeRecurringDeduction {
    id: number;
    employee_id: number;
    type: 'cash_advance' | 'loan' | 'other';
    description: string;
    total_amount: number;
    amount_per_period: number;
    amount_remaining: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Inventory Lots (FIFO)
export interface InventoryLot {
    id: number;
    product_id: number;
    variant_id: number | null;
    cost_price: number;
    quantity_received: number;
    quantity_remaining: number;
    reference_type: string | null;
    reference_id: number | null;
    batch_number: string | null;
    expiry_date: string | null;
    created_at: string;
}

export interface Bill {
    id: number;
    bill_number: string;
    supplier_id: number | null;
    supplier?: Supplier;
    supplier_name: string;
    purchase_order_id: number | null;
    purchase_order?: PurchaseOrder;
    recurring_bill_template_id: number | null;
    category: 'purchase_order' | 'rent' | 'utilities' | 'internet' | 'supplies' | 'other';
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'voided';
    bill_date: string;
    due_date: string;
    notes: string | null;
    created_by: number;
    creator?: User;
    items?: BillItem[];
    payments?: BillPayment[];
    created_at: string;
    updated_at: string;
}

export interface BillItem {
    id: number;
    bill_id: number;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
}

export interface BillPayment {
    id: number;
    bill_id: number;
    payment_method: 'cash' | 'check' | 'bank_transfer' | 'online';
    amount: number;
    bank_account_id: number | null;
    bank_account?: BankAccount;
    cash_drawer_session_id: number | null;
    check_number: string | null;
    check_date: string | null;
    reference_number: string | null;
    paid_by: number;
    payer?: User;
    notes: string | null;
    paid_at: string;
    created_at: string;
    updated_at: string;
}

export interface RecurringBillTemplate {
    id: number;
    name: string;
    supplier_id: number | null;
    supplier?: Supplier;
    supplier_name: string | null;
    category: 'rent' | 'utilities' | 'internet' | 'supplies' | 'other';
    amount: number;
    frequency: 'monthly' | 'quarterly' | 'annually';
    day_of_month: number;
    due_day_of_month: number;
    start_date: string;
    end_date: string | null;
    next_generate_date: string;
    is_active: boolean;
    notes: string | null;
    created_by: number;
    creator?: User;
    created_at: string;
    updated_at: string;
}