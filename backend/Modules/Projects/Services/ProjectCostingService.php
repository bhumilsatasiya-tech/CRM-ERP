<?php

namespace Modules\Projects\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\Projects\Models\Project;
use Modules\Projects\Models\ProjectCostEntry;
use Modules\Settings\Services\SequenceService;
use RuntimeException;

/**
 * Manual project costing — operator enters every cost line by hand.
 *
 * Deliberately does NOT auto-pull from purchases, batches, or salary runs.
 * The goal is to model the IDEAL cost of a finished product (planned) and the
 * actuals that emerged (actual), independent of operational documents.
 */
class ProjectCostingService
{
    public function __construct(private SequenceService $sequences) {}

    /* ============================================================ Projects */

    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Project::query()
            ->with(['targetProduct:id,code,name'])
            ->withCount('entries')
            ->when(($filters['search'] ?? '') !== '', fn(Builder $q) => $q->where(function (Builder $w) use ($filters) {
                $w->where('code', 'like', '%'.$filters['search'].'%')
                  ->orWhere('name', 'like', '%'.$filters['search'].'%');
            }))
            ->when(($filters['status'] ?? '') !== '', fn(Builder $q) => $q->where('status', $filters['status']))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function create(int $companyId, array $data, ?int $actorId = null): Project
    {
        return DB::transaction(function () use ($companyId, $data, $actorId) {
            $code = $this->sequences->next($companyId, 'project', $data['code'] ?? null);
            return Project::create(array_merge($data, [
                'company_id' => $companyId,
                'code'       => $code,
                'status'     => $data['status'] ?? Project::STATUS_PLANNING,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]));
        });
    }

    public function update(Project $project, array $data, ?int $actorId = null): Project
    {
        return DB::transaction(function () use ($project, $data, $actorId) {
            $project->fill($data);
            $project->updated_by = $actorId;
            $project->save();
            return $project->fresh(['targetProduct']);
        });
    }

    public function delete(Project $project): void
    {
        // Entries cascade via DB FK. Soft-delete only — preserves audit trail.
        DB::transaction(fn() => $project->delete());
    }

    /* ============================================================ Entries */

    public function addEntry(Project $project, array $data, ?int $actorId = null): ProjectCostEntry
    {
        return DB::transaction(function () use ($project, $data, $actorId) {
            $this->validateCategory($data['category'] ?? '');
            $qty    = (float) ($data['qty']  ?? 1);
            $rate   = (float) ($data['rate'] ?? 0);
            $amount = isset($data['amount']) && $data['amount'] !== null
                ? (float) $data['amount']
                : round($qty * $rate, 2);

            $entry = ProjectCostEntry::create([
                'company_id'  => $project->company_id,
                'project_id'  => $project->id,
                'category'    => $data['category'],
                'description' => $data['description'] ?? '',
                'qty'         => $qty,
                'unit'        => $data['unit'] ?? null,
                'rate'        => $rate,
                'amount'      => $amount,
                'partner_id'  => $data['partner_id'] ?? null,
                'entry_date'  => $data['entry_date'] ?? now()->toDateString(),
                'is_planned'  => (bool) ($data['is_planned'] ?? false),
                'notes'       => $data['notes'] ?? null,
                'created_by'  => $actorId,
                'updated_by'  => $actorId,
            ]);
            $this->recalcTotals($project);
            return $entry;
        });
    }

    public function updateEntry(ProjectCostEntry $entry, array $data, ?int $actorId = null): ProjectCostEntry
    {
        return DB::transaction(function () use ($entry, $data, $actorId) {
            if (array_key_exists('category', $data)) $this->validateCategory($data['category']);
            $entry->fill($data);
            if (array_key_exists('qty', $data) || array_key_exists('rate', $data)) {
                if (! array_key_exists('amount', $data) || $data['amount'] === null) {
                    $entry->amount = round((float) $entry->qty * (float) $entry->rate, 2);
                }
            }
            $entry->updated_by = $actorId;
            $entry->save();
            $this->recalcTotals($entry->project);
            return $entry->fresh();
        });
    }

    public function deleteEntry(ProjectCostEntry $entry): void
    {
        DB::transaction(function () use ($entry) {
            $project = $entry->project;
            $entry->delete();
            $this->recalcTotals($project);
        });
    }

    /* ============================================================ Totals */

    /**
     * Re-aggregate planned_total + actual_total on the parent project. Called
     * after every entry add / update / delete so the header always reflects truth.
     */
    public function recalcTotals(Project $project): void
    {
        $planned = (float) $project->entries()->where('is_planned', true)->sum('amount');
        $actual  = (float) $project->entries()->where('is_planned', false)->sum('amount');
        $project->forceFill([
            'planned_total' => round($planned, 2),
            'actual_total'  => round($actual,  2),
        ])->save();
    }

    /**
     * Returns totals broken down by category, plus the planned-vs-actual variance.
     * Used by the Summary tab in the UI.
     */
    public function summary(Project $project): array
    {
        $byCategory = $project->entries()
            ->selectRaw('category, is_planned, SUM(amount) as total')
            ->groupBy('category', 'is_planned')
            ->get();

        $out = [];
        foreach (ProjectCostEntry::CATEGORIES as $cat) {
            $planned = (float) ($byCategory->firstWhere(fn($r) => $r->category === $cat && (bool) $r->is_planned)->total ?? 0);
            $actual  = (float) ($byCategory->firstWhere(fn($r) => $r->category === $cat && ! (bool) $r->is_planned)->total ?? 0);
            $out[] = [
                'category'    => $cat,
                'planned'     => round($planned, 2),
                'actual'      => round($actual,  2),
                'variance'    => round($actual - $planned, 2),
                'variance_pct' => $planned > 0 ? round((($actual - $planned) / $planned) * 100, 2) : null,
            ];
        }

        $plannedTotal = round(array_sum(array_column($out, 'planned')), 2);
        $actualTotal  = round(array_sum(array_column($out, 'actual')),  2);
        $perUnit = ($project->target_qty > 0)
            ? round($actualTotal / (float) $project->target_qty, 4)
            : null;

        return [
            'by_category'  => $out,
            'planned_total'=> $plannedTotal,
            'actual_total' => $actualTotal,
            'variance'     => round($actualTotal - $plannedTotal, 2),
            'variance_pct' => $plannedTotal > 0 ? round((($actualTotal - $plannedTotal) / $plannedTotal) * 100, 2) : null,
            'cost_per_unit_actual' => $perUnit,
        ];
    }

    private function validateCategory(string $cat): void
    {
        if (! in_array($cat, ProjectCostEntry::CATEGORIES, true)) {
            throw new RuntimeException("Invalid category: {$cat}");
        }
    }
}
