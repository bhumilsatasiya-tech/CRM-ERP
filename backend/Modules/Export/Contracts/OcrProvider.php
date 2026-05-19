<?php

namespace Modules\Export\Contracts;

/**
 * Pluggable OCR provider for Shipping Bill PDFs.
 *
 * Default = StubOcrProvider (throws "Set OCR_PROVIDER first" until configured).
 * Swap to a real provider (Tesseract via shell, Google Vision API, AWS Textract, Azure Form
 * Recognizer, etc.) by setting OCR_PROVIDER in .env and binding the concrete class in
 * ExportServiceProvider.
 *
 * Returned shape (best-effort — provider-dependent):
 *   [
 *     'sb_no'              => 'SB1234567',
 *     'sb_date'            => '2026-05-10',
 *     'port_of_loading'    => 'INNSA',
 *     'vessel_name'        => 'MAERSK ABCD',
 *     'voyage_no'          => 'V123E',
 *     'gross_weight_kg'    => 1500.0,
 *     'net_weight_kg'      => 1450.0,
 *     'lines'              => [['hsn' => '3004', 'qty' => 100, 'unit' => 'KG'], ...],
 *     'raw_text'           => '... full extracted text for fallback display ...',
 *     'confidence'         => 0.92,
 *   ]
 */
interface OcrProvider
{
    /**
     * Extract structured fields from a stored Shipping Bill PDF.
     *
     * @param  string  $absolutePath  Local filesystem path to the PDF file.
     * @return array<string, mixed>   Extracted fields (see contract docblock for shape).
     * @throws \RuntimeException      If the provider is unconfigured or extraction fails.
     */
    public function extractShippingBill(string $absolutePath): array;
}
