<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inventory Count Sheet — {{ now()->format('d M Y') }}</title>
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
        .sheet-header .title { font-size: 18px; font-weight: bold; }
        .sheet-header .meta  { text-align: right; font-size: 10.5px; line-height: 1.5; }

        .instructions {
            background: #f5f5f5;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 5px 10px;
            font-size: 10.5px;
            margin-bottom: 12px;
            color: #333;
        }

        /* ── Category heading ── */
        .category-heading {
            font-size: 11.5px;
            font-weight: bold;
            background: #e8e8e8;
            padding: 3px 6px;
            margin: 12px 0 4px;
            border-left: 4px solid #444;
        }

        /* ── Table ── */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead th {
            background: #333;
            color: #fff;
            text-align: left;
            padding: 4px 6px;
            font-size: 10.5px;
        }
        thead th.num   { width: 28px;  text-align: center; }
        thead th.sku   { width: 100px; }
        thead th.qty   { width: 70px;  text-align: center; }
        thead th.count { width: 80px;  text-align: center; }
        thead th.notes { width: 120px; }

        tbody tr:nth-child(even) { background: #f9f9f9; }
        tbody tr { border-bottom: 1px solid #ddd; }
        tbody td { padding: 4px 6px; vertical-align: middle; }
        tbody td.num   { text-align: center; color: #555; }
        tbody td.qty   { text-align: center; font-weight: bold; }
        tbody td.count { text-align: center; }

        /* blank input box */
        .blank-box {
            display: inline-block;
            width: 58px;
            height: 18px;
            border: 1px solid #aaa;
            border-radius: 2px;
        }

        /* ── Footer ── */
        .sheet-footer {
            margin-top: 20px;
            border-top: 1px solid #ccc;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #666;
        }

        .signature-block {
            margin-top: 24px;
            display: flex;
            gap: 60px;
        }
        .sig-line {
            flex: 1;
            text-align: center;
        }
        .sig-line .line {
            border-bottom: 1px solid #333;
            height: 28px;
            margin-bottom: 3px;
        }
        .sig-line .label { font-size: 9.5px; color: #555; }

        /* ── Print ── */
        @media print {
            body { padding: 8mm 10mm; }
            .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr    { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body onload="window.print()">

    <!-- Print button (hidden on actual print) -->
    <div class="no-print" style="margin-bottom:10px; text-align:right;">
        <button onclick="window.print()" style="padding:6px 16px; font-size:12px; cursor:pointer;">
            🖨 Print
        </button>
        <button onclick="window.close()" style="padding:6px 16px; font-size:12px; margin-left:6px; cursor:pointer;">
            ✕ Close
        </button>
    </div>

    <!-- Header -->
    <div class="sheet-header">
        <div>
            <div class="title">Inventory Count Sheet</div>
            <div style="font-size:10.5px; margin-top:3px;">Physical stock count — fill in actual quantities</div>
        </div>
        <div class="meta">
            <div><strong>Printed:</strong> {{ now()->format('d M Y  H:i') }}</div>
            <div><strong>Total Products:</strong> {{ $totalProducts }}</div>
        </div>
    </div>

    <div class="instructions">
        Instructions: Count the actual quantity on shelves for each item and write it in the <strong>Counted Qty</strong> column.
        Leave the <strong>Notes</strong> column for discrepancies or comments.
    </div>

    {{-- Products grouped by category --}}
    @php $rowNum = 1; @endphp

    @foreach ($categories as $category)
        @if ($category->products->isNotEmpty())
            <div class="category-heading">{{ $category->name }}</div>
            <table>
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Product Name</th>
                        <th class="sku">SKU</th>
                        <th class="qty">Current Qty</th>
                        <th class="count">Counted Qty</th>
                        <th class="notes">Notes / Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($category->products as $product)
                        <tr>
                            <td class="num">{{ $rowNum++ }}</td>
                            <td>{{ $product->name }}</td>
                            <td style="font-family:monospace; font-size:10px;">{{ $product->sku ?? '—' }}</td>
                            <td class="qty">{{ $product->stock_quantity }}</td>
                            <td class="count"><span class="blank-box"></span></td>
                            <td></td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endforeach

    {{-- Uncategorized products --}}
    @if ($uncategorized->isNotEmpty())
        <div class="category-heading">Uncategorized</div>
        <table>
            <thead>
                <tr>
                    <th class="num">#</th>
                    <th>Product Name</th>
                    <th class="sku">SKU</th>
                    <th class="qty">Current Qty</th>
                    <th class="count">Counted Qty</th>
                    <th class="notes">Notes / Remarks</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($uncategorized as $product)
                    <tr>
                        <td class="num">{{ $rowNum++ }}</td>
                        <td>{{ $product->name }}</td>
                        <td style="font-family:monospace; font-size:10px;">{{ $product->sku ?? '—' }}</td>
                        <td class="qty">{{ $product->stock_quantity }}</td>
                        <td class="count"><span class="blank-box"></span></td>
                        <td></td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <!-- Signature block -->
    <div class="signature-block">
        <div class="sig-line">
            <div class="line"></div>
            <div class="label">Counted by (Name &amp; Signature)</div>
        </div>
        <div class="sig-line">
            <div class="line"></div>
            <div class="label">Verified by (Name &amp; Signature)</div>
        </div>
        <div class="sig-line">
            <div class="line"></div>
            <div class="label">Date</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="sheet-footer">
        <span>Inventory Count Sheet — {{ now()->format('d M Y') }}</span>
        <span>— Page <span class="page-num"></span> —</span>
    </div>

</body>
</html>
