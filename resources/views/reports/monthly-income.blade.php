<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monthly Income Report — {{ $report['period']['start'] }} to {{ $report['period']['end'] }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; background: #fff; padding: 10mm 12mm; }

        .sheet-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
        .sheet-header .title { font-size: 16pt; font-weight: bold; }
        .sheet-header .meta  { text-align: right; font-size: 8pt; line-height: 1.6; }

        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .summary-card { border: 1px solid #ccc; border-radius: 4px; padding: 7px 10px; text-align: center; }
        .summary-card .val { font-size: 13pt; font-weight: bold; }
        .summary-card .lbl { font-size: 8pt; color: #666; margin-top: 2px; }

        .section-title { font-size: 9pt; font-weight: bold; background: #e8e8e8; border-left: 4px solid #444; padding: 3px 6px; margin: 12px 0 5px; }

        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
        .income-block { border: 1px solid #b7dfb7; border-radius: 4px; }
        .expense-block { border: 1px solid #f5b7b7; border-radius: 4px; }
        .block-header { padding: 5px 10px; font-weight: bold; font-size: 9pt; }
        .income-block .block-header  { background: #e8f5e9; color: #2e7d32; }
        .expense-block .block-header { background: #fdecea; color: #c62828; }
        .line-row { display: flex; justify-content: space-between; padding: 3px 10px; font-size: 8.5pt; border-bottom: 1px solid #f0f0f0; }
        .line-row:last-child { border-bottom: none; }
        .line-row .lbl { color: #555; }
        .line-row.sub .lbl { padding-left: 12px; color: #777; }
        .line-row.total { font-weight: bold; border-top: 2px solid #ccc; background: #f9f9f9; }
        .income-block .line-row.total .val { color: #2e7d32; }
        .expense-block .line-row.total .val { color: #c62828; }

        .net-income-box { display: flex; justify-content: space-between; align-items: center; border-radius: 5px; padding: 10px 14px; margin-bottom: 14px; }
        .net-income-box.positive { border: 2px solid #81c784; background: #f1f8f1; color: #1b5e20; }
        .net-income-box.negative { border: 2px solid #e57373; background: #fdf2f2; color: #7f0000; }
        .net-income-box .label { font-size: 12pt; font-weight: bold; }
        .net-income-box .amount { font-size: 16pt; font-weight: bold; font-family: monospace; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        thead th { background: #333; color: #fff; text-align: left; padding: 4px 6px; font-size: 8.5pt; }
        thead th.right { text-align: right; }
        tbody tr:nth-child(even) { background: #f9f9f9; }
        tbody tr { border-bottom: 1px solid #ddd; }
        tbody td { padding: 3.5px 6px; font-size: 8.5pt; vertical-align: middle; }
        tbody td.right  { text-align: right; }
        tbody td.mono   { font-family: monospace; font-size: 8pt; }
        tbody td.red    { color: #c62828; font-weight: bold; }
        tbody td.orange { color: #e65100; }
        tfoot td { padding: 5px 6px; font-weight: bold; font-size: 9pt; border-top: 2px solid #333; background: #f0f0f0; }
        tfoot td.right { text-align: right; }

        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8pt; font-weight: bold; }
        .badge-unpaid  { background: #fdecea; color: #c62828; border: 1px solid #f5c6c6; }
        .badge-partial { background: #fff8e1; color: #f57f17; border: 1px solid #ffe082; }
        .overdue { color: #c62828; font-weight: bold; }

        .signature-block { margin-top: 24px; display: flex; gap: 60px; }
        .sig-line { flex: 1; text-align: center; }
        .sig-line .line { border-bottom: 1px solid #333; height: 28px; margin-bottom: 3px; }
        .sig-line .label { font-size: 8pt; color: #555; }

        .sheet-footer { margin-top: 14px; border-top: 1px solid #ccc; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8pt; color: #888; }

        @media print {
            body { padding: 8mm 10mm; }
            .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .two-col { page-break-inside: avoid; }
            .net-income-box { page-break-inside: avoid; }
        }
    </style>
</head>
<body onload="window.print()">

    <div class="no-print" style="margin-bottom:10px; text-align:right;">
        <button onclick="window.print()" style="padding:6px 16px; font-size:12px; cursor:pointer;">🖨 Print</button>
        <button onclick="window.close()" style="padding:6px 16px; font-size:12px; margin-left:6px; cursor:pointer;">✕ Close</button>
    </div>

    {{-- Header --}}
    <div class="sheet-header">
        <div>
            <div class="title">Monthly Income Report</div>
            <div style="font-size:10px; margin-top:3px; color:#555;">Income, expenses &amp; accounts payable summary</div>
        </div>
        <div class="meta">
            <div><strong>Period:</strong> {{ \Carbon\Carbon::parse($report['period']['start'])->format('d M Y') }} — {{ \Carbon\Carbon::parse($report['period']['end'])->format('d M Y') }}</div>
            <div><strong>Printed:</strong> {{ now()->format('d M Y  H:i') }}</div>
            <div><strong>Printed by:</strong> {{ auth()->user()->name }}</div>
        </div>
    </div>

    {{-- Summary stat cards --}}
    <div class="summary-grid">
        <div class="summary-card">
            <div class="val">{{ number_format($report['sales']['summary']['total_revenue'], 2) }}</div>
            <div class="lbl">Sales Revenue</div>
        </div>
        <div class="summary-card">
            <div class="val">{{ number_format($report['income']['total'], 2) }}</div>
            <div class="lbl">Total Income</div>
        </div>
        <div class="summary-card" style="background:#fdecea; border-color:#f5c6c6;">
            <div class="val" style="color:#c62828;">{{ number_format($report['expenses']['total'], 2) }}</div>
            <div class="lbl">Total Expenses</div>
        </div>
    </div>

    {{-- Net Income / Loss --}}
    @php $net = $report['net_income']; @endphp
    <div class="net-income-box {{ $net >= 0 ? 'positive' : 'negative' }}">
        <span class="label">{{ $net >= 0 ? 'Net Income' : 'Net Loss' }}</span>
        <span class="amount">{{ number_format(abs($net), 2) }}{{ $net < 0 ? ' (Loss)' : '' }}</span>
    </div>

    {{-- Income & Expenses side by side --}}
    <div class="section-title">Income &amp; Expenses</div>
    <div class="two-col">
        {{-- Income --}}
        <div class="income-block">
            <div class="block-header">▲ Income</div>
            <div class="line-row">
                <span class="lbl">Sales Revenue</span>
                <span class="val">{{ number_format($report['income']['sales_revenue'], 2) }}</span>
            </div>
            <div class="line-row">
                <span class="lbl">Debt Payments Collected</span>
                <span class="val">{{ number_format($report['income']['debt_payments'], 2) }}</span>
            </div>
            @if($report['income']['cash_receipts']['total'] > 0)
                <div class="line-row">
                    <span class="lbl">Cash Receipts</span>
                    <span class="val">{{ number_format($report['income']['cash_receipts']['total'], 2) }}</span>
                </div>
                @foreach($report['income']['cash_receipts']['by_category'] as $c)
                    <div class="line-row sub">
                        <span class="lbl">{{ $c['category'] }}</span>
                        <span class="val">{{ number_format($c['total'], 2) }}</span>
                    </div>
                @endforeach
            @endif
            @if($report['income']['bank_inflows']['total'] > 0)
                <div class="line-row">
                    <span class="lbl">Bank Inflows</span>
                    <span class="val">{{ number_format($report['income']['bank_inflows']['total'], 2) }}</span>
                </div>
                @foreach($report['income']['bank_inflows']['by_account'] as $a)
                    <div class="line-row sub">
                        <span class="lbl">{{ $a['account_name'] }}</span>
                        <span class="val">{{ number_format($a['total'], 2) }}</span>
                    </div>
                @endforeach
            @endif
            <div class="line-row total">
                <span class="lbl">Total Income</span>
                <span class="val">{{ number_format($report['income']['total'], 2) }}</span>
            </div>
        </div>

        {{-- Expenses --}}
        <div class="expense-block">
            <div class="block-header">▼ Expenses</div>
            @if($report['expenses']['bills_paid']['total'] > 0)
                <div class="line-row">
                    <span class="lbl">Bills Paid</span>
                    <span class="val">{{ number_format($report['expenses']['bills_paid']['total'], 2) }}</span>
                </div>
                @foreach($report['expenses']['bills_paid']['by_category'] as $c)
                    <div class="line-row sub">
                        <span class="lbl">{{ $c['category'] }}</span>
                        <span class="val">{{ number_format($c['total'], 2) }}</span>
                    </div>
                @endforeach
            @endif
            @if($report['expenses']['cash_expenses']['total'] > 0)
                <div class="line-row">
                    <span class="lbl">Cash Drawer Expenses</span>
                    <span class="val">{{ number_format($report['expenses']['cash_expenses']['total'], 2) }}</span>
                </div>
                @foreach($report['expenses']['cash_expenses']['by_category'] as $c)
                    <div class="line-row sub">
                        <span class="lbl">{{ $c['category'] }}</span>
                        <span class="val">{{ number_format($c['total'], 2) }}</span>
                    </div>
                @endforeach
            @endif
            @if($report['expenses']['bank_outflows']['total'] > 0)
                <div class="line-row">
                    <span class="lbl">Bank Outflows</span>
                    <span class="val">{{ number_format($report['expenses']['bank_outflows']['total'], 2) }}</span>
                </div>
                @foreach($report['expenses']['bank_outflows']['by_account'] as $a)
                    <div class="line-row sub">
                        <span class="lbl">{{ $a['account_name'] }}</span>
                        <span class="val">{{ number_format($a['total'], 2) }}</span>
                    </div>
                @endforeach
            @endif
            <div class="line-row">
                <span class="lbl">Internal Use (Stock Consumed)</span>
                <span class="val">{{ number_format($report['expenses']['internal_use_cost'], 2) }}</span>
            </div>
            <div class="line-row total">
                <span class="lbl">Total Expenses</span>
                <span class="val">{{ number_format($report['expenses']['total'], 2) }}</span>
            </div>
        </div>
    </div>

    {{-- Sales Daily Breakdown --}}
    <div class="section-title">Daily Sales Breakdown</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th class="right">Transactions</th>
                <th class="right">Revenue</th>
                <th class="right">Cost</th>
                <th class="right">Profit</th>
            </tr>
        </thead>
        <tbody>
            @forelse($report['sales']['daily'] as $d)
                <tr>
                    <td class="mono">{{ \Carbon\Carbon::parse($d['date'])->format('d M Y') }}</td>
                    <td class="right">{{ $d['count'] }}</td>
                    <td class="right mono">{{ number_format($d['revenue'], 2) }}</td>
                    <td class="right mono">{{ number_format($d['cost'], 2) }}</td>
                    <td class="right mono">{{ number_format($d['profit'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="5" style="text-align:center; color:#888; padding:10px;">No sales in this period.</td></tr>
            @endforelse
        </tbody>
        @if(count($report['sales']['daily']) > 0)
        <tfoot>
            <tr>
                <td>Total</td>
                <td class="right">{{ $report['sales']['summary']['total_sales'] }}</td>
                <td class="right mono">{{ number_format($report['sales']['summary']['total_revenue'], 2) }}</td>
                <td class="right mono">{{ number_format($report['sales']['summary']['total_cost'], 2) }}</td>
                <td class="right mono">{{ number_format($report['sales']['summary']['total_profit'], 2) }}</td>
            </tr>
        </tfoot>
        @endif
    </table>

    {{-- Accounts Payable --}}
    @if($report['accounts_payable']['count'] > 0)
    <div class="section-title" style="margin-top:16px;">Accounts Payable — Outstanding Bills</div>

    {{-- AP summary --}}
    <div class="summary-grid" style="margin-bottom:8px;">
        <div class="summary-card">
            <div class="val">{{ $report['accounts_payable']['count'] }}</div>
            <div class="lbl">Outstanding Bills</div>
        </div>
        <div class="summary-card">
            <div class="val">{{ count($report['accounts_payable']['by_supplier']) }}</div>
            <div class="lbl">Suppliers with Balance</div>
        </div>
        <div class="summary-card" style="background:#fdecea; border-color:#f5c6c6;">
            <div class="val" style="color:#c62828;">{{ number_format($report['accounts_payable']['total'], 2) }}</div>
            <div class="lbl">Total Balance Owed</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:90px">Bill #</th>
                <th>Supplier</th>
                <th>Category</th>
                <th style="width:80px">Bill Date</th>
                <th style="width:80px">Due Date</th>
                <th style="width:52px">Status</th>
                <th class="right" style="width:80px">Total</th>
                <th class="right" style="width:80px">Paid</th>
                <th class="right" style="width:80px">Balance</th>
            </tr>
        </thead>
        <tbody>
            @php $today = now()->toDateString(); @endphp
            @foreach($report['accounts_payable']['bills'] as $b)
                @php $overdue = $b['due_date'] && $b['due_date'] < $today; @endphp
                <tr>
                    <td class="mono">{{ $b['bill_number'] }}</td>
                    <td>{{ $b['supplier_name'] }}</td>
                    <td style="color:#666;">{{ $b['category'] ?? '—' }}</td>
                    <td class="mono">{{ $b['bill_date'] ? \Carbon\Carbon::parse($b['bill_date'])->format('d M Y') : '—' }}</td>
                    <td class="mono {{ $overdue ? 'overdue' : '' }}">
                        {{ $b['due_date'] ? \Carbon\Carbon::parse($b['due_date'])->format('d M Y') : '—' }}
                        @if($overdue) ⚠ @endif
                    </td>
                    <td>
                        <span class="badge {{ $b['status'] === 'partial' ? 'badge-partial' : 'badge-unpaid' }}">
                            {{ ucfirst($b['status']) }}
                        </span>
                    </td>
                    <td class="right mono">{{ number_format($b['total_amount'], 2) }}</td>
                    <td class="right mono">{{ number_format($b['paid_amount'], 2) }}</td>
                    <td class="right mono red">{{ number_format($b['balance'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="8" class="right">Total Outstanding:</td>
                <td class="right" style="color:#c62828;">{{ number_format($report['accounts_payable']['total'], 2) }}</td>
            </tr>
        </tfoot>
    </table>
    @else
    <div class="section-title" style="margin-top:16px;">Accounts Payable — Outstanding Bills</div>
    <p style="color:#888; font-size:10.5px; padding:8px 0;">No outstanding bills.</p>
    @endif

    <div class="signature-block">
        <div class="sig-line"><div class="line"></div><div class="label">Prepared by (Name &amp; Signature)</div></div>
        <div class="sig-line"><div class="line"></div><div class="label">Approved by (Name &amp; Signature)</div></div>
        <div class="sig-line"><div class="line"></div><div class="label">Date</div></div>
    </div>

    <div class="sheet-footer">
        <span>Monthly Income Report — {{ $report['period']['start'] }} to {{ $report['period']['end'] }}</span>
        <span>Confidential — Internal Use Only</span>
    </div>
</body>
</html>
