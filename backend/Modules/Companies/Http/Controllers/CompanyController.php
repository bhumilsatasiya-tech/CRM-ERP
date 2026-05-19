<?php

namespace Modules\Companies\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Companies\Http\Requests\StoreCompanyRequest;
use Modules\Companies\Http\Requests\UpdateCompanyRequest;
use Modules\Companies\Http\Resources\CompanyResource;
use Modules\Companies\Models\Company;
use Modules\Companies\Services\CompanyService;

class CompanyController extends Controller
{
    public function __construct(private CompanyService $companies)
    {
        $this->authorizeResource(Company::class, 'company');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->companies->paginate(
            $request->only(['search', 'type', 'is_active', 'per_page']),
            $request->user()
        );
        return CompanyResource::collection($page);
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $company = $this->companies->create($request->validated(), $request->user()?->id);
        return (new CompanyResource($company))->response()->setStatusCode(201);
    }

    public function show(Company $company): CompanyResource
    {
        $company->loadCount(['branches', 'warehouses', 'users']);
        return new CompanyResource($company);
    }

    public function update(UpdateCompanyRequest $request, Company $company): CompanyResource
    {
        $updated = $this->companies->update($company, $request->validated(), $request->user()?->id);
        return new CompanyResource($updated);
    }

    public function destroy(Company $company): JsonResponse
    {
        $this->companies->delete($company);
        return response()->json(['data' => ['message' => 'Company deleted.']]);
    }
}
