<?php

namespace Modules\Templates\Services;

use Illuminate\Support\Facades\DB;
use Modules\Templates\Models\DocumentTemplate;
use RuntimeException;

class TemplateService
{
    public function __construct(
        private TemplateRenderer $renderer,
        private TemplateContextBuilder $contextBuilder,
    ) {}

    /** Find the active default template for (company, doc_type), falling back to the first active. */
    public function resolveTemplate(int $companyId, string $docType): DocumentTemplate
    {
        $tpl = DocumentTemplate::query()
            ->where('company_id', $companyId)
            ->where('doc_type', $docType)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        if (!$tpl) {
            throw new RuntimeException("No template configured for doc_type '{$docType}' on company {$companyId}. Seed defaults via TemplatesDatabaseSeeder or create one in Settings → Document Templates.");
        }
        return $tpl;
    }

    /** Render a doc model into final HTML. */
    public function renderModel(string $docType, $model): string
    {
        $tpl = $this->resolveTemplate((int) $model->company_id, $docType);
        $context = $this->contextBuilder->build($docType, $model);
        return $this->wrapHtml($tpl, $this->renderer->render($tpl->html, $context));
    }

    /** Render a template + arbitrary context (used by the editor preview). */
    public function renderWithContext(DocumentTemplate $tpl, array $context): string
    {
        return $this->wrapHtml($tpl, $this->renderer->render($tpl->html, $context));
    }

    /** Toggle a template to be the default for its (company, doc_type). Atomically un-defaults siblings. */
    public function makeDefault(DocumentTemplate $tpl): DocumentTemplate
    {
        DB::transaction(function () use ($tpl) {
            DocumentTemplate::query()
                ->where('company_id', $tpl->company_id)
                ->where('doc_type', $tpl->doc_type)
                ->where('id', '!=', $tpl->id)
                ->update(['is_default' => false]);
            $tpl->is_default = true;
            $tpl->save();
        });
        return $tpl->fresh();
    }

    /** Wraps the rendered body in <html><head><style>…</style></head><body>…</body></html>. */
    private function wrapHtml(DocumentTemplate $tpl, string $body): string
    {
        $css = $tpl->css ?: '';
        // If the template's HTML already starts with <!DOCTYPE or <html, treat as full document.
        $trimmed = ltrim($body);
        if (stripos($trimmed, '<!doctype') === 0 || stripos($trimmed, '<html') === 0) {
            return $body;
        }
        return <<<HTML
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>{$css}</style></head>
<body>{$body}</body></html>
HTML;
    }
}
