<?php

namespace Modules\InterCompany\Events;

use Modules\InterCompany\Models\InterCompanyInvoice;

class InterCompanyInvoicePosted
{
    public function __construct(public InterCompanyInvoice $ici) {}
}
