<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Internal Use Report — {{ $report['period']['start'] }} to {{ $report['period']['end'] }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 10mm 12mm; }

        .sheet-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
        .sheet-header .title { font-size: 17px; font-weight: bold; }
        .sheet-header .meta  { text-align: right; font-size: 10px; line-height: 1.6; }

        .filters-bar { background: #f5f5f5; border: 1px solid #ccc; border-radius: 3px; padding: 4px 10px; font-size: 10px; color: #444; margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 14px; }
        .filters-bar strong { color: #111; }

        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .summary-card { border: 1px solid #ccc; border-radius: 4px; padding: 7px 10px; text-align: center; }
        .summary-card .val { font-size: 16px; font-weight: bold; }
        .summary-card .lbl { font-size: 9.5px; color: #666; margin-top: 2px; }

        .section-title { font-size: 11.5px; font-weight: bold; background: #e8e8e8; border-left: 4px solid #444; padding: 3px 6px; margin: 12px 0 5px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        thead th { background: #333; color: #fff; text-align: left; padding: 4px 6px; font-size: 10.5px; }
        thead th.right  { text-align: right; }
        thead th.center { text-align: center; }
        tbody tr:nth-child(even) { background: #f9f9f9; }
        tbody tr { border-bottom: 1px solid #ddd; }
        tbody td { padding: 3.5px 6px; font-size: 10.5px; vertical-align: middle; }
        tbody td.right  { text-align: right; }
        tbody td.center { text-align: center; }
        tbody td.mono   { font-family: monospace; font-size: 10px; }
        tfoot td { padding: 5px 6px; font-weight: bold; font-size: 11px; border-top: 2px solid #333; background: #f0f0f0; text-align: right; }

        .signature-block { margin-top: 24px; display: flex; gap: 60px; }
        .sig-line { flex: 1; text-align: center; }
        .sig-line .line { border-bottom: 1px solid #333; height: 28px; margin-bottom: 3px; }
        .sig-line .label { font-size: 9.5px; color: #555; }

        .sheet-footer { margin-top: 14px; border-top: 1px solid #ccc; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9.5px; color: #888; }

        @media print {
            body { padding: 8mm 10mm; }
            .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .summary-grid { page-break-inside: avoid; }
        }
    </style>
</head>
<body onload="window.print()">

    <div class="no-print" style="margin-bottom:10px; text-align:right;">
        <button onclick="window.print()" style="padding:6px 16px; font-size:12px; cursor:pointer;">🖨 Print</button>
        <button onclick="window.close()" style="padding:6px 16px; font-size:12px; margin-left:6px; cursor:pointer;">✕ Close</button>
    </div>

    <div class="sheet-header">
        <div>
            <div class="title">Internal Use Report</div>
            <div style="font-size:10px; margin-top:3px; color:#555;">Manual stock deductions — items consumed internally</div>
        </div>
        <div class="meta">
            <div><strong>Period:</strong> {{ \Carbon\Carbon::parse($report['period']['start'])->format('d M Y') }} — {{ \Carbon\Carbon::parse($report['period']['end'])->format('d M Y') }}</div>
            <div><strong>Printed:</strong> {{ now()->format('d M Y  H:i') }}</div>
            <div><strong>Printed by:</strong> {{ auth()->user()->name }}</div>
        </div>
    </div>

    <div class="filters-bar">
        <span><strong>Period:</strong> {{ $report['period']['start'] }} to {{ $report['period']['end'] }}</span>
        @if($report['filters']['reason'] ?? null)
            <span><strong>Reason filter:</strong> {{ $report['filters']['reason'] }}</span>
        @endif
        <span><strong>Records:</strong> {{ $report['summary']['total_records'] }}</span>
    </div>

    <!-- Summary -->
    <div class="summary-grid">
        <div class="summary-card">
            <div class="val">{{ $report['summary']['total_records'] }}</div>
            <div class="lbl">Total Adjustments</div>
        </div>
        <div class="summary-card">
            <div class="val">{{ number_format($report['summary']['total_qty_consumed']) }}</div>
            <div class="lbl">Total Units Consumed</div>
        </div>
        <div class="summary-card" style="background:#fff8f0; border-color:#f5c07a;">
            <div class="val" style="color:#b45309;">{{ number_format($report['summary']['total_cost'], 2) }}</div>
            <div class="lbl">Total Cost Value</div>
        </div>
    </div>

    <!-- Summary by Product -->
    <div class="section-title">Summary by Product</div>
    <table>
        <thead>
            <tr>
                <th style="width:24px" class="center">#</th>
                <th>Product</th>
                <th style="width:90px" class="mono">SKU</th>
                <th style="width:70px" class="right">Total Qty</th>
                <th style="width:75px" class="right">Cost/Unit</th>
                <th style="width:90px" class="right">Total Cost</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report['by_product'] as $i => $row)
                <tr>
                    <td class="center" style="color:#999">{{ $i + 1 }}</td>
                    <td>{{ $row['name'] }}</td>
                    <td class="mono">{{ $row['sku'] ?? '—' }}</td>
                    <td class="right">{{ number_format($row['total_qty']) }}</td>
                    <td class="right">{{ number_format($row['cost_price'], 2) }}</td>
                    <td class="right" style="font-weight:bold">{{ number_format($row['total_cost'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5">Grand Total:</td>
                <td>{{ number_format($report['summary']['total_cost'], 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <!-- Detailed Transactions -->
    <div class="section-title" style="margin-top:18px;">Detailed Transactions</div>
    <table>
        <thead>
            <tr>
                <th style="width:24px" class="center">#</th>
                <th style="width:90px">Date</th>
                <th>Product</th>
                <th style="width:75px" class="mono">SKU</th>
                <th style="width:52px" class="right">Qty</th>
                <th style="width:75px" class="right">Cost/Unit</th>
                <th style="width:80px" class="right">Total Cost</th>
                <th>Reason</th>
                <th style="width:80px">By</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report['transactions'] as $i => $t)
                <tr>
                    <td class="center" style="color:#999">{{ $i + 1 }}</td>
                    <td style="white-space:nowrap">{{ \Carbon\Carbon::parse($t['date'])->format('d M Y') }}</td>
                    <td>{{ $t['product_name'] }}</td>
                    <td class="mono">{{ $t['product_sku'] ?? '—' }}</td>
                    <td class="right">{{ number_format(abs($t['change_qty'])) }}</td>
                    <td class="right">{{ number_format($t['cost_price'], 2) }}</td>
                    <td class="right" style="font-weight:bold">{{ number_format(abs($t['change_qty']) * $t['cost_price'], 2) }}</td>
                    <td style="max-width:110px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis">{{ $t['reason'] ?? '—' }}</td>
                    <td>{{ $t['user'] ?? '—' }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="6">Grand Total:</td>
                <td>{{ number_format($report['summary']['total_cost'], 2) }}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <div class="signature-block">
        <div class="sig-line"><div class="line"></div><div class="label">Prepared by (Name &amp; Signature)</div></div>
        <div class="sig-line"><div class="line"></div><div class="label">Approved by (Name &amp; Signature)</div></div>
        <div class="sig-line"><div class="line"></div><div class="label">Date</div></div>
    </div>

    <div class="sheet-footer">
        <span>Internal Use Report — {{ $report['period']['start'] }} to {{ $report['period']['end'] }}</span>
        <span>Confidential — Internal Use Only</span>
    </div>
</body>
</html>
