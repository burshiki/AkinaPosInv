<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stock Transactions Report — {{ now()->format('d M Y') }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #111;
            background: #fff;
            padding: 10mm 12mm;
        }

        /* ── Header ── */
        .sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #111;
            padding-bottom: 6px;
            margin-bottom: 10px;
        }
        .sheet-header .title { font-size: 17px; font-weight: bold; }
        .sheet-header .meta  { text-align: right; font-size: 10px; line-height: 1.6; }

        /* ── Active filters banner ── */
        .filters-bar {
            background: #f5f5f5;
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 4px 10px;
            font-size: 10px;
            color: #444;
            margin-bottom: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        .filters-bar span strong { color: #111; }

        /* ── Table ── */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }
        thead th {
            background: #333;
            color: #fff;
            text-align: left;
            padding: 4px 6px;
            font-size: 10.5px;
        }
        thead th.right  { text-align: right; }
        thead th.center { text-align: center; }

        tbody tr:nth-child(even) { background: #f9f9f9; }
        tbody tr { border-bottom: 1px solid #ddd; }
        tbody td {
            padding: 3.5px 6px;
            vertical-align: middle;
            font-size: 10.5px;
        }
        tbody td.right  { text-align: right; }
        tbody td.center { text-align: center; }
        tbody td.mono   { font-family: monospace; font-size: 10px; }

        /* change colours */
        .pos { color: #16a34a; font-weight: bold; }
        .neg { color: #dc2626; font-weight: bold; }
        .neu { color: #888; }

        /* type badge */
        .badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 9.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: .3px;
        }
        .badge-sale     { background: #fee2e2; color: #991b1b; }
        .badge-purchase { background: #e0f2fe; color: #075985; }
        .badge-manual   { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .badge-inventory_count { background: #ede9fe; color: #5b21b6; }
        .badge-default  { background: #e5e7eb; color: #374151; }

        /* ── Totals row ── */
        tfoot td {
            padding: 5px 6px;
            font-weight: bold;
            font-size: 11px;
            border-top: 2px solid #333;
            background: #f0f0f0;
        }
        tfoot td.right { text-align: right; }

        /* ── Signature block ── */
        .signature-block {
            margin-top: 24px;
            display: flex;
            gap: 60px;
        }
        .sig-line { flex: 1; text-align: center; }
        .sig-line .line { border-bottom: 1px solid #333; height: 28px; margin-bottom: 3px; }
        .sig-line .label { font-size: 9.5px; color: #555; }

        /* ── Footer ── */
        .sheet-footer {
            margin-top: 14px;
            border-top: 1px solid #ccc;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #888;
        }

        @media print {
            body { padding: 8mm 10mm; }
            .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
        }
    </style>
</head>
<body onload="window.print()">

    <!-- Buttons -->
    <div class="no-print" style="margin-bottom:10px; text-align:right;">
        <button onclick="window.print()" style="padding:6px 16px; font-size:12px; cursor:pointer;">🖨 Print</button>
        <button onclick="window.close()" style="padding:6px 16px; font-size:12px; margin-left:6px; cursor:pointer;">✕ Close</button>
    </div>

    <!-- Header -->
    <div class="sheet-header">
        <div>
            <div class="title">Stock Transactions Report</div>
            <div style="font-size:10px; margin-top:3px; color:#555;">{{ $adjustments->count() }} record(s)</div>
        </div>
        <div class="meta">
            <div><strong>Printed:</strong> {{ now()->format('d M Y  H:i') }}</div>
            <div><strong>Printed by:</strong> {{ auth()->user()->name }}</div>
        </div>
    </div>

    <!-- Active Filters -->
    <div class="filters-bar">
        @if($filters['search'] ?? null)
            <span><strong>Product:</strong> {{ $filters['search'] }}</span>
        @endif
        @if($filters['type'] ?? null)
            <span><strong>Type:</strong> {{ ucfirst(str_replace('_', ' ', $filters['type'])) }}</span>
        @endif
        @if($filters['reason'] ?? null)
            <span><strong>Reason:</strong> {{ $filters['reason'] }}</span>
        @endif
        @if($filters['date_from'] ?? null)
            <span><strong>From:</strong> {{ \Carbon\Carbon::parse($filters['date_from'])->format('d M Y') }}</span>
        @endif
        @if($filters['date_to'] ?? null)
            <span><strong>To:</strong> {{ \Carbon\Carbon::parse($filters['date_to'])->format('d M Y') }}</span>
        @endif
        @if(empty(array_filter($filters)))
            <span>No filters applied — showing all transactions</span>
        @endif
    </div>

    @php
        $grandTotal = $adjustments->sum(function ($a) {
            return abs($a->change_qty) * abs((float)($a->product->cost_price ?? 0));
        });
    @endphp

    <!-- Table -->
    <table>
        <thead>
            <tr>
                <th style="width:28px" class="center">#</th>
                <th style="width:90px">Date</th>
                <th>Product</th>
                <th style="width:85px" class="mono">SKU</th>
                <th style="width:80px" class="center">Type</th>
                <th style="width:52px" class="right">Before</th>
                <th style="width:60px" class="right">Change</th>
                <th style="width:52px" class="right">After</th>
                <th style="width:72px" class="right">Cost/Unit</th>
                <th style="width:80px" class="right">Total Cost</th>
                <th>Reason</th>
                <th style="width:80px">By</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($adjustments as $i => $a)
                @php
                    $costUnit  = abs((float)($a->product->cost_price ?? 0));
                    $qty       = abs($a->change_qty);
                    $totalCost = $costUnit * $qty;
                    $typeCls   = match($a->type) {
                        'sale'            => 'badge-sale',
                        'purchase'        => 'badge-purchase',
                        'manual'          => 'badge-manual',
                        'inventory_count' => 'badge-inventory_count',
                        default           => 'badge-default',
                    };
                    $changeClass = $a->change_qty > 0 ? 'pos' : ($a->change_qty < 0 ? 'neg' : 'neu');
                    $changeSign  = $a->change_qty > 0 ? '+' : '';
                @endphp
                <tr>
                    <td class="center" style="color:#999">{{ $i + 1 }}</td>
                    <td style="white-space:nowrap">{{ \Carbon\Carbon::parse($a->created_at)->format('d M Y H:i') }}</td>
                    <td>{{ $a->product->name ?? "#{$a->product_id}" }}</td>
                    <td class="mono">{{ $a->product->sku ?? '—' }}</td>
                    <td class="center"><span class="badge {{ $typeCls }}">{{ str_replace('_', ' ', $a->type) }}</span></td>
                    <td class="right">{{ $a->before_qty }}</td>
                    <td class="right {{ $changeClass }}">{{ $changeSign }}{{ $a->change_qty }}</td>
                    <td class="right" style="font-weight:bold">{{ $a->after_qty }}</td>
                    <td class="right">{{ number_format($costUnit, 2) }}</td>
                    <td class="right" style="font-weight:bold">{{ number_format($totalCost, 2) }}</td>
                    <td style="max-width:120px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis">
                        {{ $a->reason ?? '—' }}
                    </td>
                    <td>{{ $a->user->name ?? '—' }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="9" style="text-align:right">Grand Total Cost ({{ $adjustments->count() }} records):</td>
                <td class="right">{{ number_format($grandTotal, 2) }}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <!-- Signature block -->
    <div class="signature-block">
        <div class="sig-line">
            <div class="line"></div>
            <div class="label">Prepared by (Name &amp; Signature)</div>
        </div>
        <div class="sig-line">
            <div class="line"></div>
            <div class="label">Approved by (Name &amp; Signature)</div>
        </div>
        <div class="sig-line">
            <div class="line"></div>
            <div class="label">Date</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="sheet-footer">
        <span>Stock Transactions Report — {{ now()->format('d M Y') }}</span>
        <span>Confidential — Internal Use Only</span>
    </div>

</body>
</html>
