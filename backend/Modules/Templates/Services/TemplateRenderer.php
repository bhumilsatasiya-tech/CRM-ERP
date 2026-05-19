<?php

namespace Modules\Templates\Services;

/**
 * Safe Mustache-flavoured template renderer for editable document templates.
 *
 * Why not Blade? Blade is full PHP and would let users execute arbitrary code by editing
 * a template in Settings. This is a simple, safe engine: no PHP, no function calls, just:
 *
 *   {{simple.dotted.path}}            → echo a scalar (auto HTML-escaped)
 *   {{{simple.dotted.path}}}          → echo a scalar without HTML-escaping (raw HTML)
 *   {{#section}}...{{/section}}       → repeat block per array item
 *   {{^section}}...{{/section}}       → render only if section is empty/missing (inverse)
 *   {{!comment}}                      → comment, removed at render time
 *   {{@idx}}                          → 1-based row index (only inside a #section loop)
 *   {{@last}} / {{@first}}            → boolean, true on the last/first row of a loop
 *
 * Format helpers as filters: `{{value | money:2}}`, `{{date | date:Y-m-d}}`, `{{name | upper}}`.
 *
 *   Filters supported:
 *     money:N        → formats number with N decimals + thousands separators
 *     date:FMT       → reformats a date string with PHP date() format
 *     upper / lower  → strtoupper / strtolower
 *     default:VAL    → if value is empty/null, use VAL instead
 */
class TemplateRenderer
{
    public function render(string $template, array $context): string
    {
        // Strip comments first
        $out = preg_replace('/\{\{!.*?\}\}/s', '', $template);

        // Sections (and inverse sections). Recursive — handles nested loops.
        $out = $this->renderSections($out, $context);

        // Simple variable substitution {{var}} (escaped) and {{{var}}} (raw)
        $out = $this->renderVariables($out, $context);

        return $out;
    }

    /** Process all top-level {{#section}}...{{/section}} and {{^section}}...{{/section}} blocks. */
    private function renderSections(string $tpl, array $context): string
    {
        // Match a section opener and its matching close, allowing nesting.
        $pattern = '/\{\{([#^])([A-Za-z0-9_\.]+)\}\}(.*?)\{\{\/\2\}\}/s';
        return preg_replace_callback($pattern, function ($m) use ($context) {
            [$full, $kind, $key, $inner] = $m;
            $value = $this->lookup($context, $key);

            if ($kind === '#') {
                // Truthy section: array → repeat per item; truthy scalar → render once with current context; otherwise → skip
                if (is_array($value) && array_is_list($value)) {
                    $rendered = '';
                    $count = count($value);
                    foreach ($value as $idx => $item) {
                        $loopCtx = is_array($item) ? array_merge($context, $item) : $context;
                        $loopCtx['@idx']   = $idx + 1;
                        $loopCtx['@first'] = $idx === 0;
                        $loopCtx['@last']  = $idx === $count - 1;
                        // Recurse for nested sections, then variables
                        $piece = $this->renderSections($inner, $loopCtx);
                        $piece = $this->renderVariables($piece, $loopCtx);
                        $rendered .= $piece;
                    }
                    return $rendered;
                }
                if (is_array($value) && !empty($value)) {
                    // Object-like → render once with merged context
                    $loopCtx = array_merge($context, $value);
                    return $this->renderVariables($this->renderSections($inner, $loopCtx), $loopCtx);
                }
                if (!empty($value)) {
                    return $this->renderVariables($this->renderSections($inner, $context), $context);
                }
                return '';
            }

            // Inverse: render only when value is empty/missing/false
            if (empty($value)) {
                return $this->renderVariables($this->renderSections($inner, $context), $context);
            }
            return '';
        }, $tpl);
    }

    private function renderVariables(string $tpl, array $context): string
    {
        // Triple-brace = raw (unescaped HTML)
        $tpl = preg_replace_callback('/\{\{\{\s*([^}]+?)\s*\}\}\}/', function ($m) use ($context) {
            return (string) $this->resolveExpression($m[1], $context);
        }, $tpl);

        // Double-brace = escaped
        return preg_replace_callback('/\{\{\s*([^#^\/!{][^}]*?)\s*\}\}/', function ($m) use ($context) {
            $raw = $this->resolveExpression($m[1], $context);
            return htmlspecialchars((string) $raw, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }, $tpl);
    }

    /** Resolve `path | filter:arg | filter2:arg` into a final scalar. */
    private function resolveExpression(string $expr, array $context)
    {
        $parts = array_map('trim', explode('|', $expr));
        $value = $this->lookup($context, array_shift($parts));
        foreach ($parts as $filter) {
            $value = $this->applyFilter($value, $filter);
        }
        return $value;
    }

    private function lookup(array $context, string $path)
    {
        if ($path === '' || $path === '.') return $context['.'] ?? null;
        if (array_key_exists($path, $context)) return $context[$path];

        $segments = explode('.', $path);
        $value = $context;
        foreach ($segments as $seg) {
            if (is_array($value) && array_key_exists($seg, $value)) {
                $value = $value[$seg];
            } elseif (is_object($value) && isset($value->{$seg})) {
                $value = $value->{$seg};
            } else {
                return null;
            }
        }
        return $value;
    }

    private function applyFilter($value, string $filter)
    {
        [$name, $arg] = array_pad(explode(':', $filter, 2), 2, null);
        switch ($name) {
            case 'money':
                $decimals = $arg !== null ? (int) $arg : 2;
                return number_format((float) $value, $decimals, '.', ',');
            case 'int':
                return (int) $value;
            case 'date':
                if (empty($value)) return '';
                $fmt = $arg ?: 'Y-m-d';
                try {
                    return (new \DateTimeImmutable((string) $value))->format($fmt);
                } catch (\Throwable $e) { return (string) $value; }
            case 'upper': return mb_strtoupper((string) $value);
            case 'lower': return mb_strtolower((string) $value);
            case 'default':
                return ($value === null || $value === '' || $value === 0) ? ($arg ?? '') : $value;
            case 'nl2br':
                return nl2br(htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'));
            default:
                return $value;
        }
    }
}
