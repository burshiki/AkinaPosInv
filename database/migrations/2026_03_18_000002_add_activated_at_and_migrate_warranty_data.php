<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add activated_at to warranties
        Schema::table('warranties', function (Blueprint $table) {
            $table->timestamp('activated_at')->nullable()->after('serial_number');
        });

        // Set activated_at for warranties that were already activated
        DB::statement("
            UPDATE warranties
            SET activated_at = created_at
            WHERE status NOT IN ('pending', 'pending_serial')
        ");

        // --- Create claim records for existing warranty data ---
        $seq = 1;
        $warranties = DB::table('warranties')
            ->whereNotNull('check_reason')
            ->orWhereIn('status', [
                'checking', 'confirmed', 'replacement_requested',
                'sent_to_supplier', 'replaced', 'replacement_received',
                'repair_received', 'refunded', 'no_issue_found',
            ])
            ->get();

        foreach ($warranties as $w) {
            $claimNumber = sprintf('CLM-MIGRATED-%04d', $seq++);

            $claimStatus = match ($w->status) {
                'checking'              => 'open',
                'confirmed',
                'replacement_requested' => 'confirmed',
                'sent_to_supplier'      => 'in_repair',
                'replaced',
                'replacement_received'  => 'resolved',
                'repair_received'       => 'resolved',
                'refunded'              => 'resolved',
                'no_issue_found'        => 'no_defect',
                default                 => 'resolved',
            };

            $resolutionType = match ($w->status) {
                'sent_to_supplier',
                'repair_received'      => 'repair',
                'replaced',
                'replacement_received',
                'replacement_requested' => 'replacement',
                'refunded'              => 'refund',
                default                 => $w->resolution_type ?? null,
            };

            DB::table('warranty_claims')->insert([
                'warranty_id'            => $w->id,
                'claim_number'           => $claimNumber,
                'issue_description'      => $w->check_reason ?? null,
                'status'                 => $claimStatus,
                'resolution_type'        => $resolutionType,
                'supplier_id'            => $w->supplier_id ?? null,
                'tracking_number'        => $w->tracking_number ?? null,
                'received_serial_number' => $w->received_serial_number ?? null,
                'resolution_notes'       => $w->received_notes ?? null,
                'resolved_at'            => in_array($claimStatus, ['resolved', 'no_defect'])
                                            ? $w->updated_at
                                            : null,
                'created_at'             => $w->created_at,
                'updated_at'             => $w->updated_at,
            ]);
        }

        // --- Remap warranty statuses to new values ---
        // pending_serial
        DB::statement("UPDATE warranties SET status = 'pending_serial' WHERE status = 'pending'");

        // active (all in-progress or returned-fine statuses)
        DB::statement("
            UPDATE warranties
            SET status = 'active'
            WHERE status IN ('active','checking','confirmed','replacement_requested',
                             'sent_to_supplier','repair_received',
                             'no_issue_found','replacement_received')
        ");

        // replaced
        DB::statement("UPDATE warranties SET status = 'replaced' WHERE status = 'replaced'");

        // void (refunded)
        DB::statement("UPDATE warranties SET status = 'void' WHERE status = 'refunded'");

        // expired → treat as active (expires_at in past will show as expired in UI)
        DB::statement("UPDATE warranties SET status = 'active' WHERE status = 'expired'");
    }

    public function down(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->dropColumn('activated_at');
        });

        DB::table('warranty_claims')->where('claim_number', 'like', 'CLM-MIGRATED-%')->delete();
    }
};
