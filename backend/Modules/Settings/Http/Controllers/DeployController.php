<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DeployController extends Controller
{
    private string $deployScript;

    public function __construct()
    {
        $this->deployScript = base_path('../scripts/deploy.sh');
    }

    /**
     * Trigger the deploy script. Super-admin only.
     */
    public function trigger(Request $request): JsonResponse
    {
        if (! $request->user()?->hasRole('super-admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (! file_exists($this->deployScript)) {
            return response()->json([
                'message' => 'Deploy script not found on server. Expected at: ' . $this->deployScript,
            ], 422);
        }

        Log::info('Deploy triggered', ['user' => $request->user()->email, 'ip' => $request->ip()]);

        $output  = [];
        $exitCode = 0;
        exec('bash ' . escapeshellarg($this->deployScript) . ' 2>&1', $output, $exitCode);

        $log = implode("\n", $output);

        if ($exitCode !== 0) {
            Log::error('Deploy failed', ['exit_code' => $exitCode, 'output' => $log]);
            return response()->json([
                'success' => false,
                'message' => 'Deploy script exited with code ' . $exitCode,
                'log'     => $log,
            ], 500);
        }

        Log::info('Deploy succeeded');
        return response()->json([
            'success' => true,
            'message' => 'Deploy complete!',
            'log'     => $log,
        ]);
    }

    /**
     * Check if the deploy script exists on this server.
     */
    public function status(Request $request): JsonResponse
    {
        if (! $request->user()?->hasRole('super-admin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'script_exists' => file_exists($this->deployScript),
            'script_path'   => $this->deployScript,
            'app_env'       => config('app.env'),
        ]);
    }
}
