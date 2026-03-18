<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; color: #333; max-width: 620px; margin: 0 auto; background: #f4f4f4; }
        .wrapper { background: #ffffff; margin: 20px auto; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .header { background: #1e293b; color: white; padding: 24px 28px; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p  { margin: 4px 0 0; opacity: .75; font-size: 13px; }
        .body { padding: 24px 28px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .meta-table td { padding: 4px 0; font-size: 13px; }
        .meta-table td:first-child { color: #888; width: 120px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
        .items-table th { background: #f1f5f9; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        .items-table th.r, .items-table td.r { text-align: right; }
        .items-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
        .totals { width: 220px; margin-left: auto; font-size: 13px; border-collapse: collapse; }
        .totals td { padding: 4px 0; }
        .totals td.r { text-align: right; }
        .totals .grand td { font-weight: bold; font-size: 15px; border-top: 2px solid #1e293b; padding-top: 6px; }
        .note-box { background: #f8fafc; border-left: 3px solid #1e293b; padding: 10px 14px; margin: 18px 0; font-size: 13px; border-radius: 2px; }
        .footer { background: #f8fafc; padding: 14px 28px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #e2e8f0; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>{{ $appName }}</h1>
        <p>Quotation — {{ $quotation->quotation_number }}</p>
    </div>
    <div class="body">
        <table class="meta-table">
            <tr><td>Quotation No.</td><td><strong>{{ $quotation->quotation_number }}</strong></td></tr>
            <tr><td>Date</td><td>{{ $quotation->created_at->format('M d, Y') }}</td></tr>
            @if($quotation->customer_name)
            <tr><td>Customer</td><td>{{ $quotation->customer_name }}</td></tr>
            @endif
            @if($quotation->customer_phone)
            <tr><td>Phone</td><td>{{ $quotation->customer_phone }}</td></tr>
            @endif
            @if($quotation->valid_until)
            <tr><td>Valid Until</td><td>{{ $quotation->valid_until->format('M d, Y') }}</td></tr>
            @endif
        </table>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th class="r">Qty</th>
                    <th class="r">Unit Price</th>
                    <th class="r">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($quotation->items as $item)
                <tr>
                    <td>{{ $item->product_name }}</td>
                    <td style="color:#888;font-family:monospace">{{ $item->product_sku ?? '—' }}</td>
                    <td class="r">{{ $item->quantity }}</td>
                    <td class="r">{{ number_format($item->unit_price, 2) }}</td>
                    <td class="r">{{ number_format($item->subtotal, 2) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <table class="totals">
            <tr>
                <td>Subtotal</td>
                <td class="r">{{ number_format($quotation->subtotal, 2) }}</td>
            </tr>
            @if($quotation->discount_amount > 0)
            @php
                $disc = $quotation->discount_type === 'percentage'
                    ? $quotation->subtotal * $quotation->discount_amount / 100
                    : $quotation->discount_amount;
            @endphp
            <tr>
                <td>Discount{{ $quotation->discount_type === 'percentage' ? " ({$quotation->discount_amount}%)" : '' }}</td>
                <td class="r" style="color:#dc2626">-{{ number_format($disc, 2) }}</td>
            </tr>
            @endif
            <tr class="grand">
                <td>TOTAL</td>
                <td class="r">{{ number_format($quotation->total, 2) }}</td>
            </tr>
        </table>

        @if($quotation->notes)
        <div class="note-box"><strong>Notes:</strong> {{ $quotation->notes }}</div>
        @endif
    </div>
    <div class="footer">
        <p>This quotation was prepared by {{ $appName }}.</p>
        @if($quotation->valid_until)
        <p>Valid until {{ $quotation->valid_until->format('M d, Y') }}. This is not a receipt or official document.</p>
        @endif
    </div>
</div>
</body>
</html>
