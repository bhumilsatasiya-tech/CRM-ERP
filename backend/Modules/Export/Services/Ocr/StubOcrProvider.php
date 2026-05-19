<?php

namespace Modules\Export\Services\Ocr;

use Modules\Export\Contracts\OcrProvider;
use RuntimeException;

/**
 * Default OCR provider — throws a clear error until a real provider is configured.
 *
 * To enable real OCR:
 *   1. Pick a provider (Tesseract, Google Vision, AWS Textract, Azure Form Recognizer)
 *   2. composer require <vendor/sdk> if needed
 *   3. Write a concrete OcrProvider implementation in this folder
 *   4. Set OCR_PROVIDER=<your-class> in .env
 *   5. Update ExportServiceProvider::register to bind your class when env matches
 */
class StubOcrProvider implements OcrProvider
{
    public function extractShippingBill(string $absolutePath): array
    {
        throw new RuntimeException(
            'OCR is not configured. Set OCR_PROVIDER in .env and bind a concrete provider in ExportServiceProvider.'
        );
    }
}
