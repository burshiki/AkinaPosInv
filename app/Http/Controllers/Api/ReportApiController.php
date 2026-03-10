<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class ReportApiController extends Controller
{
    public function __construct(protected ReportService $reportService) {}

    public function sales(): JsonResponse
    {
        return response()->json(
            $this->reportService->salesReport(request('start_date'), request('end_date'))
        );
    }

    public function inventory(): JsonResponse
    {
        return response()->json($this->reportService->inventoryReport());
    }

    public function zReport(): JsonResponse
    {
        return response()->json(
            $this->reportService->zReport(request('date'), request('session_id'))
        );
    }
}
