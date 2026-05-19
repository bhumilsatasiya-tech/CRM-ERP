<?php

namespace Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Inventory\Http\Resources\StockLedgerResource;
use Modules\Inventory\Models\StockLedger;
use Modules\Inventory\Services\StockService;

class StockLedgerController extends Controller
{
    public function __construct(private StockService $stock) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('stock.ledger.view'), 403, 'Forbidden');

        $perPage = max(1, min((int) $request->input('per_page', 25), 100));

        $rows = StockLedger::query()
            ->with(['product:id,code,name,unit_id', 'product.unit:id,code,symbol', 'warehouse:id,code,name'])
            ->when($request->filled('product_id'),   fn($q) => $q->where('product_id', $request->integer('product_id')))
            ->when($request->filled('warehouse_id'), fn($q) => $q->where('warehouse_id', $request->integer('warehouse_id')))
            ->when($request->filled('movement_type'),fn($q) => $q->where('movement_type', $request->string('movement_type')))
            ->when($request->filled('batch_no'),     fn($q) => $q->where('batch_no', $request->string('batch_no')))
            ->when($request->filled('reference_no'), fn($q) => $q->where('reference_no', 'like', '%'.$request->string('reference_no').'%'))
            ->when($request->filled('from'), fn($q) => $q->whereDate('posted_at', '>=', $request->date('from')))
            ->when($request->filled('to'),   fn($q) => $q->whereDate('posted_at', '<=', $request->date('to')))
            ->orderByDesc('posted_at')->orderByDesc('id')
            ->paginate($perPage);

        return StockLedgerResource::collection($rows);
    }

    /** GET /stock/current — current stock pivot product × warehouse */
    public function current(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('stock.ledger.view'), 403, 'Forbidden');
        $companyId   = app()->bound('active_company_id') ? app('active_company_id') : null;
        $warehouseId = $request->filled('warehouse_id') ? $request->integer('warehouse_id') : null;
        return response()->json(['data' => $this->stock->currentStockPivot($companyId, $warehouseId)]);
    }

    /** GET /stock/reports/low-stock */
    public function lowStock(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('stock.ledger.view'), 403, 'Forbidden');

        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $rows = $this->stock->currentStockPivot($companyId, null);

        // Cross-reference with product reorder_level
        $productIds = collect($rows)->pluck('product_id')->unique()->values()->all();
        $reorderLevels = \Modules\Products\Models\Product::query()
            ->whereIn('id', $productIds)
            ->pluck('reorder_level', 'id')
            ->toArray();

        $low = collect($rows)->filter(function ($r) use ($reorderLevels) {
            $threshold = (float) ($reorderLevels[$r['product_id']] ?? 0);
            return $threshold > 0 && (float) $r['qty'] <= $threshold;
        })->map(function ($r) use ($reorderLevels) {
            $r['reorder_level'] = (float) ($reorderLevels[$r['product_id']] ?? 0);
            return $r;
        })->values();

        return response()->json(['data' => $low]);
    }

    /** GET /stock/reports/valuation?as_of=YYYY-MM-DD */
    public function valuation(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('stock.ledger.view'), 403, 'Forbidden');
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : null;
        $asOf = $request->filled('as_of') ? \Carbon\Carbon::parse($request->string('as_of')) : null;
        $value = $this->stock->valuationAt($asOf, $companyId);
        return response()->json([
            'data' => [
                'as_of' => ($asOf ?? now())->toDateString(),
                'company_id' => $companyId,
                'total_value' => round($value, 2),
            ],
        ]);
    }
}
