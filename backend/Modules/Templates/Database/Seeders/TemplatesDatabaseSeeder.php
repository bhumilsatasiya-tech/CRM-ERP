<?php

namespace Modules\Templates\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Companies\Models\Company;
use Modules\Templates\Models\DocumentTemplate;

class TemplatesDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $css = $this->defaultCss();

        // doc_type => [name, body html]
        $defaults = [
            'invoice'        => ['Default Tax Invoice (Domestic)', $this->invoiceHtml('TAX INVOICE', false)],
            'quotation'      => ['Default Quotation',              $this->invoiceHtml('QUOTATION', false, false)],
            'sales_order'    => ['Default Proforma Invoice',       $this->invoiceHtml('PROFORMA INVOICE', false)],
            'purchase_order' => ['Default Purchase Order',         $this->invoiceHtml('PURCHASE ORDER', false, false)],
            'export_invoice' => ['Default Export Invoice',         $this->exportInvoiceHtml()],
            'tax_invoice'    => ['Default Tax Invoice (Export INR)', $this->invoiceHtml('TAX INVOICE (INR)', true)],
        ];

        foreach (Company::all() as $company) {
            foreach ($defaults as $docType => [$name, $html]) {
                DocumentTemplate::query()->updateOrCreate(
                    [
                        'company_id' => $company->id,
                        'doc_type'   => $docType,
                        'name'       => $name,
                    ],
                    [
                        'html'        => $html,
                        'css'         => $css,
                        'paper_size'  => 'a4',
                        'orientation' => 'portrait',
                        'is_default'  => true,
                        'is_active'   => true,
                    ]
                );
            }
        }
    }

    private function defaultCss(): string
    {
        return <<<CSS
* { box-sizing: border-box; }
body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #222; margin: 0; padding: 24px; }
h1, h2, h3 { margin: 0 0 8px 0; }
.title { font-size: 22px; font-weight: bold; letter-spacing: 1px; text-align: center; margin: 0 0 12px 0; }
.muted { color: #777; }
.right { text-align: right; }
.center { text-align: center; }
.bold { font-weight: bold; }
.row { width: 100%; }
.row td { vertical-align: top; }
.box { border: 1px solid #ccc; padding: 10px; }
table.items { width: 100%; border-collapse: collapse; margin-top: 12px; }
table.items th, table.items td { border: 1px solid #999; padding: 6px 8px; }
table.items th { background: #f1f1f1; font-weight: bold; text-align: left; }
table.items td.num { text-align: right; }
.totals { width: 100%; margin-top: 8px; border-collapse: collapse; }
.totals td { padding: 4px 8px; }
.totals .label { text-align: right; }
.totals .val { text-align: right; min-width: 110px; border-bottom: 1px solid #ddd; }
.totals .grand { font-size: 13px; font-weight: bold; border-top: 2px solid #222; }
.kv { width: 100%; border-collapse: collapse; }
.kv td { padding: 2px 4px; }
.kv td.k { color: #777; width: 110px; }
.footer { margin-top: 24px; font-size: 10px; color: #555; }
hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
CSS;
    }

    /**
     * Generic domestic-style invoice template (also used for Quotation, SO/Proforma, PO, Tax Invoice INR).
     * @param  string $title       Big title on the page.
     * @param  bool   $showInr     If true, show "₹" + tax_invoice INR-specific fields.
     * @param  bool   $showPayable If false (Quotation/PO), drop the "Amount due" / "Paid" rows.
     */
    private function invoiceHtml(string $title, bool $showInr, bool $showPayable = true): string
    {
        $payableBlock = $showPayable ? <<<HTML
              {{#doc.paid_amount}}
                <tr><td class="label muted">Paid</td><td class="val">{{doc.currency}} {{doc.paid_amount | money:2}}</td></tr>
                <tr><td class="label muted">Balance due</td><td class="val">{{doc.currency}} {{doc.balance | money:2}}</td></tr>
              {{/doc.paid_amount}}
HTML : '';

        $exchangeRow = $showInr ? <<<HTML
              <tr><td class="k">Exchange rate</td><td>{{doc.exchange_rate}}</td></tr>
HTML : '';

        return <<<HTML
<div class="title">{$title}</div>

<table class="row"><tr>
  <td style="width:60%">
    <div class="bold" style="font-size:14px">{{company.name}}</div>
    {{#company.address_lines}}<div>{{.}}</div>{{/company.address_lines}}
    {{#company.gst_no}}<div class="muted">GSTIN: {{company.gst_no}}</div>{{/company.gst_no}}
    {{#company.phone}}<div class="muted">Phone: {{company.phone}}</div>{{/company.phone}}
    {{#company.email}}<div class="muted">Email: {{company.email}}</div>{{/company.email}}
  </td>
  <td style="width:40%">
    <table class="kv">
      <tr><td class="k">Number</td><td class="bold">{{doc.code}}</td></tr>
      <tr><td class="k">Date</td><td>{{doc.date | date:d M Y}}</td></tr>
      {{#doc.due_date}}<tr><td class="k">Due date</td><td>{{doc.due_date | date:d M Y}}</td></tr>{{/doc.due_date}}
      {{#doc.reference}}<tr><td class="k">Reference</td><td>{{doc.reference}}</td></tr>{{/doc.reference}}
      <tr><td class="k">Currency</td><td>{{doc.currency}}</td></tr>
      {$exchangeRow}
    </table>
  </td>
</tr></table>

<hr>

<div class="bold">Bill To</div>
<div class="bold" style="font-size:13px">{{partner.name}}</div>
{{#partner.address_lines}}<div>{{.}}</div>{{/partner.address_lines}}
{{#partner.gst_no}}<div class="muted">GSTIN: {{partner.gst_no}}</div>{{/partner.gst_no}}
{{#partner.phone}}<div class="muted">Phone: {{partner.phone}}</div>{{/partner.phone}}
{{#partner.email}}<div class="muted">Email: {{partner.email}}</div>{{/partner.email}}

<table class="items">
  <thead>
    <tr>
      <th style="width:32px">#</th>
      <th>Item</th>
      <th style="width:60px">HSN</th>
      <th style="width:60px" class="num">Qty</th>
      <th style="width:60px">Unit</th>
      <th style="width:80px" class="num">Rate</th>
      <th style="width:60px" class="num">Tax %</th>
      <th style="width:90px" class="num">Amount</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
      <tr>
        <td>{{sl}}</td>
        <td><div class="bold">{{product_name}}</div><div class="muted">{{product_code}}</div></td>
        <td>{{hsn_code}}</td>
        <td class="num">{{qty | money:3}}</td>
        <td>{{unit}}</td>
        <td class="num">{{rate | money:2}}</td>
        <td class="num">{{tax_rate | money:2}}</td>
        <td class="num">{{total | money:2}}</td>
      </tr>
    {{/items}}
  </tbody>
</table>

<table class="row"><tr>
  <td style="width:60%">
    {{#doc.terms_and_conditions}}<div class="bold" style="margin-top:12px">Terms & Conditions</div><div>{{{doc.terms_and_conditions | nl2br}}}</div>{{/doc.terms_and_conditions}}
    {{#doc.notes}}<div class="bold" style="margin-top:12px">Notes</div><div>{{{doc.notes | nl2br}}}</div>{{/doc.notes}}
  </td>
  <td style="width:40%">
    <table class="totals">
      <tr><td class="label">Subtotal</td><td class="val">{{doc.currency}} {{doc.subtotal | money:2}}</td></tr>
      {{#doc.discount}}<tr><td class="label">Discount</td><td class="val">- {{doc.currency}} {{doc.discount | money:2}}</td></tr>{{/doc.discount}}
      <tr><td class="label">Tax</td><td class="val">{{doc.currency}} {{doc.tax_amount | money:2}}</td></tr>
      {{#doc.shipping}}<tr><td class="label">Shipping</td><td class="val">{{doc.currency}} {{doc.shipping | money:2}}</td></tr>{{/doc.shipping}}
      <tr class="grand"><td class="label">Total</td><td class="val">{{doc.currency}} {{doc.total | money:2}}</td></tr>
{$payableBlock}
    </table>
  </td>
</tr></table>

<div class="footer center">Generated on {{now}} — this is a system-generated document.</div>
HTML;
    }

    private function exportInvoiceHtml(): string
    {
        return <<<HTML
<div class="title">EXPORT INVOICE</div>

<table class="row"><tr>
  <td style="width:60%">
    <div class="bold" style="font-size:14px">{{company.name}}</div>
    {{#company.address_lines}}<div>{{.}}</div>{{/company.address_lines}}
    {{#company.gst_no}}<div class="muted">GSTIN: {{company.gst_no}}</div>{{/company.gst_no}}
    {{#company.iec_no}}<div class="muted">IEC: {{company.iec_no}}</div>{{/company.iec_no}}
    {{#company.phone}}<div class="muted">Phone: {{company.phone}}</div>{{/company.phone}}
  </td>
  <td style="width:40%">
    <table class="kv">
      <tr><td class="k">Invoice no.</td><td class="bold">{{doc.code}}</td></tr>
      <tr><td class="k">Invoice date</td><td>{{doc.date | date:d M Y}}</td></tr>
      {{#doc.date_of_supply}}<tr><td class="k">Date of supply</td><td>{{doc.date_of_supply | date:d M Y}}</td></tr>{{/doc.date_of_supply}}
      <tr><td class="k">Currency</td><td>{{doc.currency}}</td></tr>
      <tr><td class="k">Incoterm</td><td>{{doc.incoterm}}</td></tr>
      {{#doc.transport_mode}}<tr><td class="k">Transport</td><td>{{doc.transport_mode | upper}}</td></tr>{{/doc.transport_mode}}
      {{#doc.lut_no}}<tr><td class="k">LUT no.</td><td>{{doc.lut_no}}</td></tr>{{/doc.lut_no}}
      {{#doc.tax_details}}<tr><td class="k">Tax details</td><td>{{doc.tax_details}}</td></tr>{{/doc.tax_details}}
    </table>
  </td>
</tr></table>

<hr>

<table class="row"><tr>
  <td style="width:50%; padding-right:8px">
    <div class="bold">Bill To (Buyer)</div>
    <div class="bold">{{partner.name}}</div>
    {{#partner.address_lines}}<div>{{.}}</div>{{/partner.address_lines}}
    {{#partner.country}}<div class="muted">Country: {{partner.country}}</div>{{/partner.country}}
    {{#partner.gst_no}}<div class="muted">GSTIN/Tax ID: {{partner.gst_no}}</div>{{/partner.gst_no}}
  </td>
  <td style="width:50%">
    <div class="bold">Consignee (Ship To)</div>
    <div class="bold">{{consignee.name}}</div>
    <div>{{{consignee.address | nl2br}}}</div>
    {{#consignee.country}}<div class="muted">Country: {{consignee.country}}</div>{{/consignee.country}}
    {{#consignee.contact_person}}<div class="muted">Contact: {{consignee.contact_person}}</div>{{/consignee.contact_person}}
    {{#consignee.phone}}<div class="muted">Phone: {{consignee.phone}}</div>{{/consignee.phone}}
  </td>
</tr></table>

{{#notify_party.name}}
<div style="margin-top:8px"><span class="bold">Notify party 2:</span> {{notify_party.name}} — {{notify_party.address}}</div>
{{/notify_party.name}}

<table class="row" style="margin-top:8px"><tr>
  <td style="width:25%"><span class="bold">Port of loading:</span> {{doc.port_of_loading}}</td>
  <td style="width:25%"><span class="bold">Port of discharge:</span> {{doc.port_of_discharge}}</td>
  <td style="width:25%"><span class="bold">Final destination:</span> {{doc.final_destination}}</td>
  <td style="width:25%"><span class="bold">Country:</span> {{doc.country_of_destination}}</td>
</tr></table>

<table class="items">
  <thead>
    <tr>
      <th style="width:28px">#</th>
      <th>Description</th>
      <th style="width:50px">HSN</th>
      <th style="width:55px" class="num">Qty</th>
      <th style="width:50px">Unit</th>
      <th style="width:55px" class="num">Pkgs</th>
      <th style="width:55px">Pkg unit</th>
      <th style="width:80px" class="num">Rate</th>
      <th style="width:90px" class="num">Amount</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
      <tr>
        <td>{{sl}}</td>
        <td><div class="bold">{{product_name}}</div><div class="muted">{{product_code}}</div></td>
        <td>{{hsn_code}}</td>
        <td class="num">{{qty | money:3}}</td>
        <td>{{unit}}</td>
        <td class="num">{{shipper_qty}}</td>
        <td>{{shipper_unit}}</td>
        <td class="num">{{rate | money:2}}</td>
        <td class="num">{{total | money:2}}</td>
      </tr>
    {{/items}}
  </tbody>
</table>

<table class="row" style="margin-top:8px"><tr>
  <td style="width:60%">
    {{#doc.payment_terms}}<div><span class="bold">Payment terms:</span> {{doc.payment_terms}}</div>{{/doc.payment_terms}}
    {{#doc.terms_and_conditions}}<div class="bold" style="margin-top:8px">Terms & Conditions</div><div>{{{doc.terms_and_conditions | nl2br}}}</div>{{/doc.terms_and_conditions}}
    {{#doc.notes}}<div class="bold" style="margin-top:8px">Notes</div><div>{{{doc.notes | nl2br}}}</div>{{/doc.notes}}
  </td>
  <td style="width:40%">
    <table class="totals">
      <tr><td class="label">Subtotal</td><td class="val">{{doc.currency}} {{doc.subtotal | money:2}}</td></tr>
      {{#doc.freight_charge}}<tr><td class="label">Freight</td><td class="val">{{doc.currency}} {{doc.freight_charge | money:2}}</td></tr>{{/doc.freight_charge}}
      {{#doc.packaging_charge}}<tr><td class="label">Packaging</td><td class="val">{{doc.currency}} {{doc.packaging_charge | money:2}}</td></tr>{{/doc.packaging_charge}}
      {{#doc.development_charge}}<tr><td class="label">Development</td><td class="val">{{doc.currency}} {{doc.development_charge | money:2}}</td></tr>{{/doc.development_charge}}
      {{#doc.tax_amount}}<tr><td class="label">Tax</td><td class="val">{{doc.currency}} {{doc.tax_amount | money:2}}</td></tr>{{/doc.tax_amount}}
      <tr class="grand"><td class="label">Total</td><td class="val">{{doc.currency}} {{doc.total | money:2}}</td></tr>
      {{#doc.paid_amount}}
        <tr><td class="label muted">Paid</td><td class="val">{{doc.currency}} {{doc.paid_amount | money:2}}</td></tr>
        <tr><td class="label muted">Balance</td><td class="val">{{doc.currency}} {{doc.balance | money:2}}</td></tr>
      {{/doc.paid_amount}}
    </table>
  </td>
</tr></table>

<div class="footer center">Generated on {{now}} — this is a system-generated document.</div>
HTML;
    }
}
