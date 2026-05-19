<?php

namespace Modules\Templates\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

class PdfService
{
    /**
     * Render HTML → PDF. Returns a streaming download response.
     *
     * @param  string $html        Full HTML document (or body — caller can wrap if needed).
     * @param  string $filename    Desired download filename (without quoting).
     * @param  string $paperSize   a4 | letter | legal
     * @param  string $orientation portrait | landscape
     */
    public function download(string $html, string $filename, string $paperSize = 'a4', string $orientation = 'portrait'): Response
    {
        $pdf = Pdf::loadHTML($html)
            ->setPaper($paperSize, $orientation)
            ->setOptions([
                'isRemoteEnabled' => true, // allow external images (logos etc.)
                'isHtml5ParserEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
            ]);

        return $pdf->download($filename);
    }

    /** Stream inline (PDF viewer in browser) instead of forced download. */
    public function stream(string $html, string $filename, string $paperSize = 'a4', string $orientation = 'portrait'): Response
    {
        $pdf = Pdf::loadHTML($html)
            ->setPaper($paperSize, $orientation)
            ->setOptions([
                'isRemoteEnabled' => true,
                'isHtml5ParserEnabled' => true,
                'defaultFont' => 'DejaVu Sans',
            ]);
        return $pdf->stream($filename);
    }
}
