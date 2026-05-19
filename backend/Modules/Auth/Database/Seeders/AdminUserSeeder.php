<?php

namespace Modules\Auth\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Auth\Models\User;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_SEED_EMAIL', 'admin@crm-erp.local');
        $password = env('ADMIN_SEED_PASSWORD', 'ChangeMe@123');

        $admin = User::firstOrCreate(
            ['email' => $email],
            [
                'name'                  => 'Super Admin',
                'password'              => Hash::make($password),
                'is_active'             => true,
                'must_change_password'  => true,
                'email_verified_at'     => now(),
                'password_changed_at'   => now(),
            ]
        );

        if (! $admin->hasRole('super-admin')) {
            $admin->assignRole('super-admin');
        }
    }
}
