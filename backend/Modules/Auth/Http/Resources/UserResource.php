<?php

namespace Modules\Auth\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var \Illuminate\Http\Request $request */
        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'email'                => $this->email,
            'phone'                => $this->phone,
            'avatar_path'          => $this->avatar_path,
            'locale'               => $this->locale,
            'timezone'             => $this->timezone,
            'default_company_id'   => $this->default_company_id,
            'is_active'            => (bool) $this->is_active,
            'two_factor_enabled'   => (bool) $this->two_factor_enabled,
            'must_change_password' => (bool) $this->must_change_password,
            'last_login_at'        => $this->last_login_at?->toIso8601String(),
            'email_verified_at'    => $this->email_verified_at?->toIso8601String(),
            'roles'                => $this->whenLoaded('roles', fn() => $this->roles->pluck('name')),
            'permissions'          => $this->when(
                $request->routeIs('auth.me') || $request->boolean('with_permissions'),
                fn() => $this->getAllPermissions()->pluck('name')
            ),
            'created_at'           => $this->created_at?->toIso8601String(),
            'updated_at'           => $this->updated_at?->toIso8601String(),
        ];
    }
}
