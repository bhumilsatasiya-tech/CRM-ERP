<?php

namespace Modules\Auth\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Controllers\Controller;
use Modules\Auth\Http\Requests\AdminResetPasswordRequest;
use Modules\Auth\Http\Requests\StoreUserRequest;
use Modules\Auth\Http\Requests\UpdateUserRequest;
use Modules\Auth\Http\Resources\UserResource;
use Modules\Auth\Models\User;
use Modules\Auth\Services\UserService;

class UserController extends Controller
{
    public function __construct(private UserService $userService)
    {
        $this->authorizeResource(User::class, 'user');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $page = $this->userService->paginate($request->only(['search', 'role', 'is_active', 'sort', 'per_page']));
        return UserResource::collection($page);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated(), $request->user()?->id);
        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load('roles'));
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $updated = $this->userService->update($user, $request->validated(), $request->user()?->id);
        return new UserResource($updated);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->userService->delete($user);
        return response()->json(['data' => ['message' => 'User deleted.']]);
    }

    public function adminResetPassword(AdminResetPasswordRequest $request, User $user): JsonResponse
    {
        $this->userService->adminResetPassword(
            $user,
            $request->validated()['password'],
            (bool) ($request->validated()['must_change_password'] ?? true)
        );
        return response()->json(['data' => ['message' => 'Password reset.']]);
    }
}
