<?php

namespace Modules\Formula\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Companies\Models\Company;
use Modules\Formula\Http\Requests\StoreFormulaRequest;
use Modules\Formula\Http\Requests\UpdateFormulaRequest;
use Modules\Formula\Http\Resources\FormulaResource;
use Modules\Formula\Models\Formula;
use Modules\Formula\Services\FormulaService;
use Modules\Templates\Services\PdfService;
use Symfony\Component\HttpFoundation\Response;

class FormulaController extends Controller
{
    public function __construct(private FormulaService $service)
    {
        $this->authorizeResource(Formula::class, 'formula');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return FormulaResource::collection(
            $this->service->paginate($request->only(['search', 'status', 'target_product_id', 'per_page']))
        );
    }

    public function store(StoreFormulaRequest $request): JsonResponse
    {
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validated();
        $f = $this->service->create($companyId, [
            'target_product_id' => $data['target_product_id'],
            'output_qty'        => $data['output_qty'],
            'output_uom_id'     => $data['output_uom_id'] ?? null,
            'notes'             => $data['notes'] ?? null,
        ], $data['components'], $request->user()?->id);
        return (new FormulaResource($f))->response()->setStatusCode(201);
    }

    public function show(Formula $formula): FormulaResource
    {
        $formula->load(['components.product', 'targetProduct', 'outputUom']);
        return new FormulaResource($formula);
    }

    public function update(UpdateFormulaRequest $request, Formula $formula): FormulaResource
    {
        $data = $request->validated();
        $components = $data['components'] ?? null;
        unset($data['components']);
        $updated = $this->service->update($formula, $data, $components, $request->user()?->id);
        return new FormulaResource($updated);
    }

    public function destroy(Formula $formula): JsonResponse
    {
        $this->service->delete($formula);
        return response()->json(['data' => ['message' => 'Formula deleted.']]);
    }

    public function activate(Request $request, Formula $formula): FormulaResource
    {
        $this->authorize('activate', $formula);
        return new FormulaResource($this->service->activate($formula, $request->user()?->id));
    }

    public function pdf(Request $request, Formula $formula, PdfService $pdf): Response
    {
        $this->authorize('view', $formula);
        $formula->load(['components.product', 'targetProduct', 'outputUom']);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $company = Company::find($companyId);
        $html = $this->renderHtml($company, $formula);
        $name = preg_replace('/[^A-Za-z0-9-]/', '_', $formula->code ?? ('FORMULA-' . $formula->id));
        return $pdf->download($html, "formula-{$name}.pdf", 'a4', 'portrait');
    }

    private function renderHtml(?Company $company, Formula $f): string
    {
        $companyName = $company ? e($company->name) : '—';
        $target = $f->targetProduct ? e($f->targetProduct->code . ' — ' . $f->targetProduct->name) : '—';
        $uom = $f->outputUom?->symbol ?? '';
        $rowsHtml = '';
        foreach ($f->components as $c) {
            $product = $c->product ? e($c->product->code . ' — ' . $c->product->name) : '—';
            $qty   = number_format((float) $c->qty_per_yield, 4);
            $waste = number_format((float) ($c->wastage_pct ?? 0), 2);
            $rate  = number_format((float) ($c->rate ?? 0), 2);
            $notes = e($c->notes ?? '');
            $rowsHtml .= '<tr>'
                . '<td>' . $product . '</td>'
                . '<td class="num">' . $qty . '</td>'
                . '<td class="num">' . $waste . '%</td>'
                . '<td class="num">' . $rate . '</td>'
                . '<td>' . $notes . '</td>'
                . '</tr>';
        }
        if ($rowsHtml === '') {
            $rowsHtml = '<tr><td colspan="5" style="text-align:center;color:#999;padding:18px">No components.</td></tr>';
        }
        $outputQty = number_format((float) $f->output_qty, 4);
        $version   = (int) ($f->version ?? 1);
        $status    = e($f->status ?? 'draft');
        $today = date('Y-m-d H:i');

        return <<<HTML
<!doctype html>
<html><head><meta charset="utf-8"><style>
body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #111; }
h1 { font-size: 18px; margin: 0 0 4px 0; }
.meta { font-size: 10px; color: #666; margin-bottom: 10px; }
.summary { margin: 8px 0; }
.summary span { display:inline-block; margin-right:20px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 4px 6px; vertical-align: top; }
th { background: #f3f4f6; font-weight: 600; text-align: left; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
</style></head><body>
<h1>Formula — {$f->code}</h1>
<div class="meta"><strong>{$companyName}</strong> &middot; Generated {$today}</div>
<div class="summary">
  <span>Target product: <strong>{$target}</strong></span>
  <span>Output: <strong>{$outputQty} {$uom}</strong></span>
  <span>Version: <strong>{$version}</strong></span>
  <span>Status: <strong>{$status}</strong></span>
</div>
<table>
  <thead>
    <tr>
      <th>Component</th>
      <th class="num">Qty / yield</th>
      <th class="num">Wastage</th>
      <th class="num">Rate</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>{$rowsHtml}</tbody>
</table>
</body></html>
HTML;
    }

    /** Used by the production batch UI to scaffold input lines from the active formula. */
    public function scale(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Formula::class);
        $request->validate([
            'target_product_id' => ['required', 'integer', 'exists:products,id'],
            'qty'               => ['required', 'numeric', 'gt:0'],
        ]);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $formula = $this->service->activeFor($companyId, (int) $request->input('target_product_id'));
        if (! $formula) {
            return response()->json([
                'data' => ['inputs' => [], 'formula' => null, 'message' => 'No active formula found for this product.'],
            ]);
        }
        return response()->json([
            'data' => [
                'inputs'  => $this->service->scaleFor($formula, (float) $request->input('qty')),
                'formula' => new FormulaResource($formula),
            ],
        ]);
    }
}
