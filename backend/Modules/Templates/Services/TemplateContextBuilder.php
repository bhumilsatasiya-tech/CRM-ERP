<?php

namespace Modules\Templates\Services;

use Modules\Companies\Models\Company;
use Modules\Crm\Models\Partner;
use Modules\Export\Models\ExportInvoice;
use Modules\Export\Models\TaxInvoice;
use Modules\Purchase\Models\PurchaseOrder;
use Modules\Quotation\Models\Quotation;
use Modules\Sales\Models\Invoice;
use Modules\Sales\Models\SalesOrder;

/**
 * Turns a doc model (Invoice / Quotation / SO / EI / TI / PO / etc.) into a flat array
 * the template renderer can consume. Builds `{ company, partner, doc, items }`.
 */
class TemplateContextBuilder
{
    /** Build the Mustache context for a given doc model. */
    public function build(string $docType, $model): array
    {
        $company = optional(Company::find($model->company_id));

        $base = [
            'now'      => (new \DateTimeImmutable())->format('Y-m-d H:i'),
            'today'    => (new \DateTimeImmutable())->format('Y-m-d'),
            'company'  => $this->companyArr($company),
        ];

        switch ($docType) {
            case 'invoice':         return $base + $this->invoiceArr($model);
            case 'quotation':       return $base + $this->quotationArr($model);
            case 'sales_order':     return $base + $this->salesOrderArr($model);
            case 'purchase_order':  return $base + $this->purchaseOrderArr($model);
            case 'export_invoice':  return $base + $this->exportInvoiceArr($model);
            case 'tax_invoice':     return $base + $this->taxInvoiceArr($model);
            default:                return $base + ['doc' => (array) $model->toArray()];
        }
    }

    /** A small fixed set of mock data for the template editor preview. */
    public function mockContextFor(string $docType): array
    {
        $partner = [
            'code' => 'CL-DEMO', 'name' => 'Acme Pharma USA', 'gst_no' => '29ABCDE1234F1Z5',
            'country' => 'US', 'phone' => '+1-555-0100', 'email' => 'orders@acme.example',
            'address_lines' => ['456 Main St', 'Springfield, IL 62704', 'United States'],
        ];
        $company = [
            'code' => 'COA', 'name' => 'Demo Exports Pvt Ltd', 'legal_name' => 'Demo Exports Pvt Ltd',
            'gst_no' => '24DEMO1234X1ZK', 'pan_no' => 'DEMOX1234D',
            'address_lines' => ['Plot 42, Industrial Area', 'Surat, Gujarat 395003', 'India'],
            'phone' => '+91 261 555 1234', 'email' => 'accounts@demo.example',
        ];
        $items = [
            ['sl' => 1, 'product_code' => 'P-001', 'product_name' => 'Demo widget A', 'hsn_code' => '3004', 'qty' => 100, 'unit' => 'PCS', 'rate' => 25.00, 'tax_rate' => 18, 'subtotal' => 2500.00, 'tax_amount' => 450.00, 'total' => 2950.00],
            ['sl' => 2, 'product_code' => 'P-002', 'product_name' => 'Demo widget B', 'hsn_code' => '3004', 'qty' => 50,  'unit' => 'PCS', 'rate' => 40.00, 'tax_rate' => 18, 'subtotal' => 2000.00, 'tax_amount' => 360.00, 'total' => 2360.00],
        ];
        $doc = [
            'code' => $this->mockCodeFor($docType), 'date' => date('Y-m-d'), 'due_date' => date('Y-m-d', strtotime('+30 days')),
            'reference' => 'PO-1234', 'currency' => $docType === 'export_invoice' ? 'USD' : 'INR',
            'subtotal' => 4500.00, 'tax_amount' => 810.00, 'discount' => 0, 'shipping' => 0, 'total' => 5310.00,
            'notes' => 'Thank you for your business.',
            'terms_and_conditions' => 'Payment due within 30 days. 1.5% interest per month on overdue amounts.',
            'status' => 'posted',
        ];

        return [
            'now' => date('Y-m-d H:i'), 'today' => date('Y-m-d'),
            'company' => $company,
            'partner' => $partner,
            'doc' => $doc,
            'items' => $items,
        ];
    }

    private function mockCodeFor(string $docType): string
    {
        $map = ['invoice' => 'INV/2026/00042', 'quotation' => 'QO/2026/00042', 'sales_order' => 'SO/2026/00042',
                'purchase_order' => 'PO/2026/00042', 'export_invoice' => 'EI/2026/00042', 'tax_invoice' => 'TAX/2026/00042'];
        return $map[$docType] ?? 'DOC/2026/00042';
    }

    private function companyArr(?Company $c): array
    {
        if (!$c) return [];
        return [
            'id' => $c->id, 'code' => $c->code, 'name' => $c->name, 'legal_name' => $c->legal_name,
            'gst_no' => $c->gst_no, 'pan_no' => $c->pan_no, 'cin_no' => $c->cin_no, 'iec_no' => $c->iec_no,
            'phone' => $c->phone, 'email' => $c->email, 'website' => $c->website,
            'address_lines' => array_values(array_filter([$c->address_line1, $c->address_line2,
                trim(($c->city ?? '') . ', ' . ($c->state ?? '') . ' ' . ($c->postal_code ?? ''), ', '),
                $c->country,
            ])),
            'currency' => $c->currency,
        ];
    }

    private function partnerArr(?Partner $p): array
    {
        if (!$p) return [];
        return [
            'id' => $p->id, 'code' => $p->code, 'name' => $p->name, 'legal_name' => $p->legal_name,
            'gst_no' => $p->gst_no, 'pan_no' => $p->pan_no, 'country' => $p->country,
            'phone' => $p->phone, 'mobile' => $p->mobile, 'email' => $p->email,
            'address_lines' => $this->partnerAddress($p),
        ];
    }

    private function partnerAddress(Partner $p): array
    {
        $primary = $p->addresses()->where('is_primary', true)->first()
                ?? $p->addresses()->first();
        if (!$primary) return [];
        return array_values(array_filter([
            $primary->line1, $primary->line2,
            trim(($primary->city ?? '') . ', ' . ($primary->state ?? '') . ' ' . ($primary->postal_code ?? ''), ', '),
            $primary->country,
        ]));
    }

    /** Render a single line item to an array — shared shape across all doc types. */
    private function itemArr($line, int $sl): array
    {
        $product = $line->product ?? null;
        $qty   = (float) ($line->qty ?? 0);
        $rate  = (float) ($line->rate ?? 0);
        $tax   = (float) ($line->tax_rate ?? 0);
        $sub   = round($qty * $rate, 2);
        $taxA  = round($sub * $tax / 100, 2);
        return [
            'sl'           => $sl,
            'product_id'   => $line->product_id ?? null,
            'product_code' => $product?->code,
            'product_name' => $product?->name,
            'hsn_code'     => $line->hsn_code ?? $product?->hsn_code,
            'qty'          => $qty,
            'unit'         => $product?->unit?->symbol,
            'rate'         => $rate,
            'tax_rate'     => $tax,
            'subtotal'     => $sub,
            'tax_amount'   => $taxA,
            'total'        => round($sub + $taxA, 2),
            'batch_no'     => $line->batch_no ?? null,
            'expiry_date'  => isset($line->expiry_date) && $line->expiry_date ? (string) $line->expiry_date : null,
            'notes'        => $line->notes ?? null,
        ];
    }

    private function invoiceArr(Invoice $inv): array
    {
        $inv->loadMissing(['partner', 'items.product.unit', 'payments']);
        $items = [];
        foreach ($inv->items as $i => $l) $items[] = $this->itemArr($l, $i + 1);
        return [
            'partner' => $this->partnerArr($inv->partner),
            'doc' => [
                'code' => $inv->code, 'date' => optional($inv->invoice_date)->toDateString(),
                'due_date' => optional($inv->due_date)->toDateString(), 'reference' => $inv->reference,
                'currency' => $inv->currency, 'exchange_rate' => $inv->exchange_rate,
                'tax_type' => $inv->tax_type,
                'subtotal' => (float) $inv->subtotal, 'tax_amount' => (float) $inv->tax_amount,
                'discount' => (float) $inv->discount, 'shipping' => (float) $inv->shipping,
                'total' => (float) $inv->total, 'paid_amount' => (float) $inv->paid_amount,
                'balance' => (float) $inv->balance,
                'notes' => $inv->notes, 'terms_and_conditions' => $inv->terms_and_conditions,
                'status' => $inv->status,
            ],
            'items' => $items,
        ];
    }

    private function quotationArr(Quotation $q): array
    {
        $q->loadMissing(['partner', 'items.product.unit']);
        $items = [];
        foreach ($q->items as $i => $l) $items[] = $this->itemArr($l, $i + 1);
        return [
            'partner' => $this->partnerArr($q->partner),
            'doc' => [
                'code' => $q->code, 'date' => optional($q->quotation_date)->toDateString(),
                'valid_until' => optional($q->valid_until)->toDateString(), 'reference' => $q->reference,
                'currency' => $q->currency,
                'subtotal' => (float) $q->subtotal, 'tax_amount' => (float) $q->tax_amount,
                'discount' => (float) $q->discount, 'shipping' => (float) $q->shipping,
                'total' => (float) $q->total,
                'notes' => $q->notes, 'terms_and_conditions' => $q->terms_and_conditions,
                'status' => $q->status,
            ],
            'items' => $items,
        ];
    }

    private function salesOrderArr(SalesOrder $so): array
    {
        $so->loadMissing(['partner', 'items.product.unit']);
        $items = [];
        foreach ($so->items as $i => $l) $items[] = $this->itemArr($l, $i + 1);
        return [
            'partner' => $this->partnerArr($so->partner),
            'doc' => [
                'code' => $so->code, 'date' => optional($so->order_date)->toDateString(),
                'expected_delivery_date' => optional($so->expected_delivery_date)->toDateString(),
                'reference' => $so->reference, 'currency' => $so->currency,
                'subtotal' => (float) $so->subtotal, 'tax_amount' => (float) $so->tax_amount,
                'discount' => (float) $so->discount, 'shipping' => (float) $so->shipping,
                'total' => (float) $so->total,
                'notes' => $so->notes, 'terms_and_conditions' => $so->terms_and_conditions,
                'status' => $so->status,
            ],
            'items' => $items,
        ];
    }

    private function purchaseOrderArr(PurchaseOrder $po): array
    {
        $po->loadMissing(['partner', 'items.product.unit']);
        $items = [];
        foreach ($po->items as $i => $l) $items[] = $this->itemArr($l, $i + 1);
        return [
            'partner' => $this->partnerArr($po->partner),
            'doc' => [
                'code' => $po->code, 'date' => optional($po->order_date)->toDateString(),
                'expected_date' => optional($po->expected_date)->toDateString(),
                'reference' => $po->reference, 'currency' => $po->currency,
                'subtotal' => (float) $po->subtotal, 'tax_amount' => (float) $po->tax_amount,
                'discount' => (float) $po->discount, 'shipping' => (float) $po->shipping,
                'total' => (float) $po->total,
                'notes' => $po->notes,
                'status' => $po->status,
            ],
            'items' => $items,
        ];
    }

    private function exportInvoiceArr(ExportInvoice $ei): array
    {
        $ei->loadMissing(['partner', 'items.product.unit', 'consignee']);
        $items = [];
        foreach ($ei->items as $i => $l) $items[] = $this->itemArr($l, $i + 1) + [
            'shipper_qty'  => $l->shipper_qty != null ? (int) $l->shipper_qty : null,
            'shipper_unit' => $l->shipper_unit,
        ];
        return [
            'partner' => $this->partnerArr($ei->partner),
            'consignee' => [
                'name' => $ei->consignee_name, 'address' => $ei->consignee_address,
                'country' => $ei->consignee_country, 'contact_person' => $ei->consignee_contact_person,
                'phone' => $ei->consignee_phone, 'email' => $ei->consignee_email,
            ],
            'doc' => [
                'code' => $ei->code, 'date' => optional($ei->invoice_date)->toDateString(),
                'date_of_supply' => optional($ei->date_of_supply)->toDateString(),
                'due_date' => optional($ei->due_date)->toDateString(),
                'currency' => $ei->currency, 'exchange_rate' => $ei->exchange_rate,
                'incoterm' => $ei->incoterm, 'transport_mode' => $ei->transport_mode,
                'lut_no' => $ei->lut_no, 'lut_date' => optional($ei->lut_date)->toDateString(),
                'tax_details' => $ei->tax_details,
                'port_of_loading' => $ei->port_of_loading, 'port_of_discharge' => $ei->port_of_discharge,
                'final_destination' => $ei->final_destination, 'country_of_destination' => $ei->country_of_destination,
                'payment_terms' => $ei->payment_terms,
                'subtotal' => (float) $ei->subtotal, 'tax_amount' => (float) $ei->tax_amount,
                'discount' => (float) $ei->discount, 'shipping' => (float) $ei->shipping,
                'freight_charge' => (float) $ei->freight_charge,
                'packaging_charge' => (float) $ei->packaging_charge,
                'development_charge' => (float) $ei->development_charge,
                'total' => (float) $ei->total, 'paid_amount' => (float) $ei->paid_amount,
                'balance' => (float) $ei->balance,
                'notes' => $ei->notes, 'terms_and_conditions' => $ei->terms_and_conditions,
                'status' => $ei->status,
            ],
            'notify_party' => [
                'name' => $ei->notify_party_name, 'address' => $ei->notify_party_address,
            ],
            'items' => $items,
        ];
    }

    private function taxInvoiceArr(TaxInvoice $ti): array
    {
        $ti->loadMissing(['partner', 'items.product.unit', 'exportInvoice']);
        $items = [];
        foreach ($ti->items as $i => $l) $items[] = $this->itemArr($l, $i + 1);
        return [
            'partner' => $this->partnerArr($ti->partner),
            'export_invoice_code' => $ti->exportInvoice?->code,
            'doc' => [
                'code' => $ti->code, 'date' => optional($ti->invoice_date)->toDateString(),
                'currency' => $ti->currency, 'exchange_rate' => $ti->exchange_rate,
                'gstin_supplier' => $ti->gstin_supplier, 'gstin_recipient' => $ti->gstin_recipient,
                'place_of_supply' => $ti->place_of_supply,
                'customs_notification_no' => $ti->customs_notification_no,
                'customs_notification_date' => optional($ti->customs_notification_date)->toDateString(),
                'subtotal_inr' => (float) $ti->subtotal_inr, 'total_inr' => (float) $ti->total_inr,
                'status' => $ti->status,
            ],
            'items' => $items,
        ];
    }
}
