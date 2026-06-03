import { useState, useRef, useEffect } from "react";
import {
  ClipboardList, Check, AlertTriangle, Package, Camera, QrCode, CheckCircle2,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOperationsStore, type DraftExecution } from "@/stores/useOperationsStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useInventoryStore } from "@/stores/useInventoryStore";
import { useBillingStore } from "@/stores/useBillingStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { trpc } from "@/providers/trpc";
import type { ServiceRecord } from "@/types";
import { getPmsMetricValue } from "./utils";
import { SafetyProtocol } from "./SafetyProtocol";
import { VisualEvidence } from "./VisualEvidence";
import { TechnicalWorkForm } from "./TechnicalWorkForm";
import { SignaturePad } from "./SignaturePad";

const GPS001_HOURS_OFFSET_KEY = "nextos-gps001-hours-offset-ms";

interface ExecutionModalProps {
  task: ServiceRecord | null;
  seedEquipment: any[];
  seedClients: any[];
  onClose: () => void;
  onFinish: () => void;
  resetOnCompletion?: boolean;
  onMetricsReset?: (seedEqId: string, unit: string) => void;
}

export function ExecutionModal({
  task,
  seedEquipment,
  seedClients,
  onClose,
  onFinish,
  resetOnCompletion = false,
  onMetricsReset,
}: ExecutionModalProps) {
    const {
        equipment,
        draftExecutions,
        updateDraftExecution,
        clearDraftExecution,
        updateServiceRecord,
        addServicePhoto,
        queuePendingSubmission,
    } = useOperationsStore();
    const { user } = useAuthStore();
    const { items: inventoryItems } = useInventoryStore();
    const { packages } = useBillingStore();
    const { clients } = useCRMStore();
    const completeSeedServiceRecordMutation = trpc.seedServiceRecords.complete.useMutation();
    const deductAndLogMutation = trpc.inventory.deductAndLog.useMutation();
    const trpcUtils = trpc.useUtils();

    const draft = task ? draftExecutions[task.id] || { currentStep: 1, partsUsed: "Pending" } : null;
    const currentStep = draft?.currentStep || 1;

    // QR Scanning states
    const [isScanning, setIsScanning] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const startScanning = async () => {
        setIsScanning(true);
        setScannerError(null);

        setTimeout(async () => {
            try {
                const element = document.getElementById("qr-reader-modal");
                if (!element) return;

                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode("qr-reader-modal");
                }

                await scannerRef.current.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    (decodedText) => handleScanSuccess(decodedText),
                    () => {}
                );
            } catch (err) {
                console.error("Scanner error:", err);
                setScannerError("Failed to access camera. Please check permissions.");
                setIsScanning(false);
            }
        }, 100);
    };

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (err) {}
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (decodedText: string) => {
        const currentEq = equipment.find(e => e.id === (draft?.equipmentId || task?.equipmentId));
        let _scanMeta: any = {};
        try { _scanMeta = JSON.parse(task?.description ?? "{}"); } catch {}
        const _scanSeedEq = _scanMeta._src === "pms"
          ? seedEquipment.find((s: any) => s.id === _scanMeta._seedEqId) ?? null
          : null;
        const expectedSerial = _scanSeedEq?.serialNumber ?? currentEq?.serialNumber ?? "";
        if (decodedText.trim() === expectedSerial) {
            await stopScanning();
            setIsVerified(true);
            toast.success("Asset Verified Successfully!");
            if (task) {
                updateDraftExecution(task.id, { arrivalTime: new Date().toISOString() });
            }
            setTimeout(() => {
                if (currentEq) handleNext({ equipmentId: currentEq.id });
                setIsVerified(false);
            }, 1500);
        } else {
            toast.error("Serial Mismatch: " + decodedText);
        }
    };

    const handleNext = (data: Partial<DraftExecution>) => {
        if (!task) return;
        updateDraftExecution(task.id, { ...data, currentStep: currentStep + 1 });
    };

    const handleBack = () => {
        if (!task) return;
        updateDraftExecution(task.id, { currentStep: Math.max(1, currentStep - 1) });
    };

    const submitFinalReport = () => {
        if (!task || !draft) return;
        if (!draft.techSignature || !draft.clientSignature) {
            toast.error("Both signatures required");
            return;
        }

        const completionTime = new Date().toISOString();
        const completedDate = completionTime;
        const effectiveEquipId = draft.equipmentId || task.equipmentId;
        const storeEq = equipment.find(e => e.id === effectiveEquipId);

        if (draft.selectedParts && draft.selectedParts.length > 0) {
            draft.selectedParts.forEach(part => {
                const partNumber = inventoryItems.find(i => i.id === part.inventoryItemId)?.partNumber ?? String(part.inventoryItemId);
                deductAndLogMutation.mutate(
                    {
                        partId: partNumber,
                        quantityUsed: part.quantity,
                        inventoryItemId: part.inventoryItemId,
                        serviceRecordId: task.id,
                        unitPriceAtTime: part.pricePerUnit,
                        createdAt: new Date().toISOString(),
                    },
                    { onError: (err) => console.error("inventory.deductAndLog failed", err) }
                );
            });
        }

        updateServiceRecord(task.id, {
            status: "completed",
            technician: user?.name || "Technician",
            findings: draft.findings,
            workDone: draft.workDone,
            recommendation: draft.recommendations,
            partsUsed: draft.selectedParts?.map(p => `${p.name} (x${p.quantity})`).join(", ") || "None",
            partsUsedDetails: draft.selectedParts?.map(p => ({
                name: p.name,
                quantity: p.quantity,
                pricePerUnit: p.pricePerUnit,
            })) ?? [],
            techSignature: draft.techSignature,
            clientSignature: draft.clientSignature,
            clientRepresentativeName: draft.clientRepresentativeName ?? "",
            safetyChecklist: draft.safetyChecklist,
            completedDate,
            equipmentId: effectiveEquipId,
            hoursAtService: draft.hoursAtService || Math.floor(parseFloat((storeEq?.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) || 0,
            cost: draft.cost ?? task.cost ?? 0,
        });

        if (draft.beforePhoto) {
            addServicePhoto({ serviceRecordId: task.id, type: "before", url: draft.beforePhoto, caption: "Before Service" });
        }
        if (draft.afterPhoto) {
            addServicePhoto({ serviceRecordId: task.id, type: "after", url: draft.afterPhoto, caption: "After Service" });
        }

        try {
            let meta: any = {};
            try { meta = JSON.parse(task.description ?? "{}"); } catch {}
            const seedEq = meta._src === "pms"
                ? seedEquipment.find((s: any) => s.id === meta._seedEqId) ?? null
                : null;
            const pmsCfg = seedEq?.pmsConfiguration?.[meta._pmsIdx] ?? null;
            const seedClient = seedEq?.clientId
                ? seedClients.find((c: any) => c.id === seedEq.clientId) ?? null
                : null;

            const snapshotInterval: number | undefined =
                meta._serviceInterval !== undefined ? Number(meta._serviceInterval) : pmsCfg?.serviceInterval;
            const snapshotIntervalUnit: string | undefined =
                meta._serviceIntervalUnit ?? pmsCfg?.serviceIntervalUnit;
            const snapshotServiceType: string | undefined =
                meta._serviceType ?? pmsCfg?.serviceType;

            let metricAtService = "";
            if (pmsCfg || (snapshotIntervalUnit !== undefined)) {
                const unit: string = snapshotIntervalUnit ?? "Hours";
                let gps001Ms = 0;
                try { gps001Ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch {}
                metricAtService = getPmsMetricValue(seedEq, unit, gps001Ms);
            }

            const isEq001Task = meta._seedEqId === "EQ-001";
            const pmsUnit = (snapshotIntervalUnit ?? "").toLowerCase();
            const isHoursOrKmTask = pmsUnit === "hours" || pmsUnit === "km" || pmsUnit === "weeks" || pmsUnit === "months" || pmsUnit === "years";
            const hasPmsConfig = !!pmsCfg || (snapshotInterval !== undefined && snapshotIntervalUnit !== undefined);
            const shouldResetMetrics =
                meta._src === "pms" &&
                !!meta._seedEqId &&
                hasPmsConfig &&
                isHoursOrKmTask &&
                (!isEq001Task || resetOnCompletion);

            let computedEquipmentStatus: string | null = seedEq?.status ?? null;
            if (seedEq && snapshotInterval && snapshotIntervalUnit) {
                const _unit = snapshotIntervalUnit.toLowerCase();
                let _usage: number | null = null;
                if (_unit === "hours") {
                    if (seedEq?.id === "EQ-001") {
                        let _rawMs = 0;
                        let _offsetMs = 0;
                        try { _rawMs = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0; } catch {}
                        try { _offsetMs = Number(window.localStorage.getItem(GPS001_HOURS_OFFSET_KEY) ?? "0") || 0; } catch {}
                        const _effectiveMs = Math.max(0, _rawMs - _offsetMs);
                        _usage = _effectiveMs / (1000 * 60 * 60);
                    } else {
                        const _m = String(seedEq.hoursTotal ?? "").match(/(\d+)\s*h\s*(\d+)\s*m/i);
                        if (_m) _usage = Number(_m[1]) + Number(_m[2]) / 60;
                    }
                } else if (_unit === "km") {
                    const _raw = seedEq.kmTotal;
                    const _p = typeof _raw === "number" ? _raw : parseFloat(String(_raw ?? "").replace(/[^\d.]/g, ""));
                    if (Number.isFinite(_p) && _p >= 0) _usage = _p;
                } else {
                    const _days = typeof seedEq.days === "number" ? seedEq.days : parseFloat(String(seedEq.days ?? ""));
                    if (Number.isFinite(_days) && _days >= 0) {
                        if (_unit === "weeks") _usage = _days / 7;
                        else if (_unit === "months") _usage = _days / 30.44;
                        else if (_unit === "years") _usage = _days / 365.25;
                    }
                }
                if (_usage !== null && Number.isFinite(_usage) && _usage >= 0) {
                    const _pct = (_usage / snapshotInterval) * 100;
                    computedEquipmentStatus = _pct >= 100 ? "Overdue" : _pct >= 80 ? "Near Service" : "OK";
                }
            }

            const submissionPayload = {
                id: task.id,
                completedDate,
                technician: user?.name || "Technician",
                seedEquipmentId: meta._seedEqId ?? "",
                pmsConfigIndex: meta._pmsIdx ?? 0,
                equipmentId: Number(String(effectiveEquipId ?? "").replace(/\D/g, "")) || 0,
                clientId: task.clientId,
                serviceCategory: task.serviceCategory,
                scheduledDate: task.scheduledDate ?? completedDate,
                description: task.description ?? "",
                findings: draft.findings ?? "",
                workDone: draft.workDone ?? "",
                recommendation: draft.recommendations ?? "",
                partsUsed: draft.selectedParts?.map((p) => `${p.name} (x${p.quantity})`).join(", ") || "",
                partsUsedDetails: draft.selectedParts?.map((p) => ({
                    name: p.name,
                    quantity: p.quantity,
                    pricePerUnit: p.pricePerUnit,
                })) ?? [],
                cost: draft.cost ?? pmsCfg?.estimatedCost ?? task.cost ?? 0,
                hoursAtService: draft.hoursAtService ?? Math.floor(parseFloat((storeEq?.hoursTotal ?? "0").match(/(\d+)/)?.[1] ?? "0")) ?? 0,
                equipmentName: seedEq?.name ?? storeEq?.name ?? storeEq?.id ?? "",
                clientName: seedClient?.companyName ?? clients.find(c => c.id === task.clientId)?.companyName ?? "",
                equipmentType: seedEq?.equipmentType ?? "",
                serialNumber: seedEq?.serialNumber ?? storeEq?.serialNumber ?? "",
                serviceType: snapshotServiceType ?? task.serviceCategory,
                serviceInterval: snapshotInterval,
                serviceIntervalUnit: snapshotIntervalUnit,
                metricAtService,
                safetyChecklist: draft.safetyChecklist,
                beforePhoto: draft.beforePhoto,
                beforeNotes: draft.beforeNotes,
                afterPhoto: draft.afterPhoto,
                afterNotes: draft.afterNotes,
                techSignature: draft.techSignature,
                clientSignature: draft.clientSignature,
                clientRepresentativeName: draft.clientRepresentativeName ?? "",
                startTime: draft.travelStartTime ?? null,
                endTime: completionTime,
                duration: null,
                finalCost: draft.cost ?? null,
                travelStartTime: draft.travelStartTime ?? null,
                arrivalTime: draft.arrivalTime ?? null,
                completionTime,
                technicianAddress: draft.technicianAddress ?? null,
                equipmentSiteAddress: draft.equipmentSiteAddress ?? null,
                estimatedArrival: draft.estimatedArrival ?? null,
                equipmentStatusAtService: computedEquipmentStatus,
                resetMetricsOnComplete: shouldResetMetrics,
            } as const;

            completeSeedServiceRecordMutation.mutate(submissionPayload, {
                onSuccess: () => {
                    trpcUtils.seedServiceRecords.list.invalidate();
                    trpcUtils.seedEquipment.list.invalidate();
                    if (shouldResetMetrics) {
                        onMetricsReset?.(meta._seedEqId as string, pmsCfg.serviceIntervalUnit ?? "Hours");
                    }
                },
                onError: () => {
                    queuePendingSubmission({
                        id: task.id,
                        queuedAt: new Date().toISOString(),
                        payload: submissionPayload,
                    });
                    toast.error("Couldn't write report to records — will retry automatically.");
                },
            });
        } catch { /* silently skip — in-memory update already done */ }

        clearDraftExecution(task.id);
        toast.success("Final report sealed and submitted!");
        onFinish();
    };

    // Cleanup scanner on unmount or close
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try { const s = scannerRef.current.stop(); if (s && typeof (s as any).catch === "function") (s as any).catch(() => {}); } catch {}
                try { const c = scannerRef.current.clear(); if (c && typeof (c as any).catch === "function") (c as any).catch(() => {}); } catch {}
            }
        };
    }, []);

    const currentEq = equipment.find(e => e.id === (draft?.equipmentId || task?.equipmentId));

    let _pmsMeta: any = {};
    try { _pmsMeta = JSON.parse(task?.description ?? "{}"); } catch {}
    const _isPmsTask = _pmsMeta._src === "pms";
    const _pmsSeedEq = _isPmsTask
      ? seedEquipment.find((s: any) => s.id === _pmsMeta._seedEqId) ?? null
      : null;

    const displaySerial = _pmsSeedEq?.serialNumber ?? currentEq?.serialNumber ?? "";
    const displayName = _pmsSeedEq?.name ?? currentEq?.name ?? currentEq?.id ?? `SIM-UNIT-${task?.id}`;
    const displaySubtitle = _pmsSeedEq?.equipmentType ?? currentEq?.equipmentType ?? "";
    const displayClient = _pmsSeedEq?.clientId
      ? (seedClients.find((c: any) => c.id === _pmsSeedEq.clientId)?.companyName ?? null)
      : null;
    const _pmsCfg = _pmsSeedEq?.pmsConfiguration?.[_pmsMeta._pmsIdx] ?? null;
    const displayOperatingTime = (() => {
      if (_pmsSeedEq?.id === "EQ-001") {
        try {
          const ms = Number(window.localStorage.getItem("nextos-gps001-total-hours-ms") ?? "0") || 0;
          const offsetMs = Number(window.localStorage.getItem(GPS001_HOURS_OFFSET_KEY) ?? "0") || 0;
          const effectiveMs = Math.max(0, ms - offsetMs);
          if (ms > 0) {
            const totalMin = Math.floor(effectiveMs / (1000 * 60));
            return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
          }
        } catch { /* fall through */ }
      }
      return _pmsSeedEq?.hoursTotal ?? currentEq?.hoursTotal ?? "0h 0m";
    })();

    return (
        <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-white border-gray-200 max-h-[90vh] overflow-auto scrollbar-hide rounded-2xl shadow-2xl p-0">
                {task && draft && (
                    <div className="flex flex-col h-full">
                        <DialogHeader className="p-6 border-b border-gray-50 bg-gray-50/30 rounded-t-2xl">
                            <DialogTitle className="flex items-center gap-2 text-gray-900 text-lg font-bold">
                                <div className="w-8 h-8 rounded bg-[#66B2B2]/10 flex items-center justify-center">
                                    <ClipboardList className="w-4 h-4 text-[#66B2B2]" />
                                </div>
                                Service Execution: <span className="font-mono-tech">{displayName}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 mt-1">
                                Complete the following steps to document and finalize the service execution for this asset.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="px-10 py-6 border-b border-gray-50">
                            <div className="flex items-center justify-between relative">
                                {[1, 2, 3, 4, 5, 6].map((step, i) => (
                                    <div key={step} className="flex items-center flex-1 last:flex-none">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                            currentStep === step ? 'bg-[#66B2B2] text-white ring-4 ring-[#66B2B2]/10 scale-110' :
                                            currentStep > step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {currentStep > step ? <Check className="w-4 h-4" /> : step}
                                        </div>
                                        {i < 5 && (
                                            <div className={`h-1 flex-1 mx-2 rounded-full ${currentStep > step ? 'bg-green-500' : 'bg-gray-100'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-3 px-1">
                                {["Scan", "Safety", "Before", "Findings", "After", "Sign"].map((label, i) => (
                                    <span key={label} className={`text-[9px] font-bold uppercase tracking-wider ${currentStep === i + 1 ? 'text-[#66B2B2]' : 'text-gray-400'}`}>
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 flex-1">
                            {/* STEP 1: ASSET VERIFICATION */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="text-center pb-2">
                                        <h4 className="text-lg font-bold text-gray-900">Asset Verification</h4>
                                        <p className="text-sm text-gray-500">Confirm you are at the correct unit before beginning documentation.</p>
                                    </div>

                                    {currentEq ? (
                                        <div className="p-6 rounded-2xl bg-gray-900 text-white shadow-2xl space-y-6 border border-gray-800">
                                            {isScanning ? (
                                                <div className="space-y-4">
                                                    <div className="text-center">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#66B2B2]/20 text-[#66B2B2] rounded-full text-[10px] font-black uppercase tracking-[0.1em] mb-4">
                                                            <div className="w-2 h-2 rounded-full bg-[#66B2B2] animate-ping" /> Scanning Mode Active
                                                        </div>
                                                    </div>
                                                    <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border-4 border-white/10 bg-black">
                                                        <div id="qr-reader-modal" className="w-full h-full"></div>
                                                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                                            <div className="w-full h-full border-2 border-[#66B2B2]/50 rounded-lg relative">
                                                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#66B2B2]" />
                                                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#66B2B2]" />
                                                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#66B2B2]" />
                                                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#66B2B2]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full text-gray-400 hover:text-white"
                                                        onClick={stopScanning}
                                                    >
                                                        Cancel Scanning
                                                    </Button>
                                                </div>
                                            ) : isVerified ? (
                                                <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-500">
                                                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border-2 border-green-500/50">
                                                        <Check className="w-10 h-10 text-green-500" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xl font-bold text-white">Asset Verified!</h5>
                                                        <p className="text-sm text-gray-400">Lock-on confirmed. Initializing service report...</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="text-[10px] text-[#66B2B2] font-black uppercase tracking-[0.2em] mb-1">Target Asset</div>
                                                            <div className="text-2xl font-black tracking-tight">{displayName}</div>
                                                            {displayClient && <div className="text-xs text-[#66B2B2] font-semibold mt-0.5">{displayClient}</div>}
                                                            <div className="text-sm text-gray-400 font-bold">{displaySubtitle}</div>
                                                        </div>
                                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Package className="w-6 h-6 text-[#66B2B2]" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/5">
                                                        <div className="space-y-1">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
                                                            <div className="text-sm font-mono-tech font-bold text-[#66B2B2]">{displaySerial}</div>
                                                        </div>
                                                        <div className="space-y-1 text-right">
                                                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Operating Time</div>
                                                            <div className="text-sm font-bold text-white">{displayOperatingTime}</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <Button
                                                            className="w-full h-14 bg-[#66B2B2] hover:bg-[#5A9E9E] text-white font-black rounded-xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-wider"
                                                            onClick={startScanning}
                                                        >
                                                            <QrCode className="w-5 h-5 mr-3" />
                                                            Scan QR to Unlock Service
                                                        </Button>

                                                        {scannerError && (
                                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-tight">{scannerError}</p>
                                                            </div>
                                                        )}

                                                        <div className="text-center">
                                                            <button
                                                                onClick={() => handleNext({ equipmentId: currentEq.id })}
                                                                className="text-[10px] font-black text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-colors"
                                                            >
                                                                Tag Damaged? Verify Manually
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed">
                                            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500 font-bold">Error: Asset data not found for this task.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: SAFETY PROTOCOL */}
                            {currentStep === 2 && (
                                <SafetyProtocol
                                    checklist={draft.safetyChecklist || { ppeChecked: false, engineOff: false, areaSecured: false, lotoApplied: false }}
                                    onSave={(checklist) => handleNext({ safetyChecklist: checklist })}
                                    onBack={handleBack}
                                />
                            )}

                            {/* STEP 3: BEFORE PHOTO */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <Camera className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Pre-Service Documentation</h4>
                                        <p className="text-sm text-gray-500">Capture the initial condition of the asset.</p>
                                    </div>
                                    <VisualEvidence
                                        label="BEFORE"
                                        photo={draft.beforePhoto}
                                        notes={draft.beforeNotes}
                                        onSave={(photo, notes) => handleNext({ beforePhoto: photo, beforeNotes: notes })}
                                        onBack={handleBack}
                                    />
                                </div>
                            )}

                            {/* STEP 4: TECHNICAL FINDINGS */}
                            {currentStep === 4 && (
                                <TechnicalWorkForm
                                    draft={draft}
                                    equipment={currentEq}
                                    client={clients.find(c => c.id === task.clientId)}
                                    packages={packages}
                                    seedEquipment={_pmsSeedEq}
                                    seedClients={seedClients}
                                    pmsConfig={_pmsCfg}
                                    taskId={task.id}
                                    onSave={(data) => handleNext(data)}
                                    onBack={handleBack}
                                />
                            )}

                            {/* STEP 5: AFTER PHOTO */}
                            {currentStep === 5 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Post-Service Documentation</h4>
                                        <p className="text-sm text-gray-500">Capture the asset state after service completion.</p>
                                    </div>
                                    <VisualEvidence
                                        label="AFTER"
                                        photo={draft.afterPhoto}
                                        notes={draft.afterNotes}
                                        onSave={(photo, notes) => handleNext({ afterPhoto: photo, afterNotes: notes })}
                                        onBack={handleBack}
                                    />
                                </div>
                            )}

                            {/* STEP 6: SIGNATURES */}
                            {currentStep === 6 && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <SignaturePad
                                        label="Technician Verification"
                                        value={draft.techSignature}
                                        onChange={(sig) => updateDraftExecution(task.id, { techSignature: sig })}
                                        caption="I certify that the listed work has been completed to specification."
                                    />
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                                            Client Representative Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Name of person signing on behalf of client"
                                            value={draft.clientRepresentativeName ?? ""}
                                            onChange={(e) => updateDraftExecution(task.id, { clientRepresentativeName: e.target.value })}
                                            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:border-[#66B2B2] focus:ring-2 focus:ring-[#66B2B2]/10 outline-none"
                                        />
                                    </div>
                                    <SignaturePad
                                        label="Client Acceptance"
                                        value={draft.clientSignature}
                                        onChange={(sig) => updateDraftExecution(task.id, { clientSignature: sig })}
                                        caption="Client representative acknowledgment of work completion."
                                    />
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={handleBack}>Previous</Button>
                                        <Button className="flex-[2] h-12 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-black" onClick={submitFinalReport}>
                                            Seal & Submit Final Report
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
