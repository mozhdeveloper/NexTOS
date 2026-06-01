import { Fragment } from "react";
import { Search, Camera, Wrench, Package, History, Check, ChevronDown, ChevronRight, QrCode } from "lucide-react";
import seedData from "@/data/seed-data.json";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { Equipment } from "@/types";

interface EquipmentTabProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filteredSeedEquipment: any[];
  liveClients: any[];
  equipment: Equipment[];
  selectedSeedId: string | null;
  setSelectedSeedId: (v: string | null) => void;
  setSelectedEquipment: (v: number | null) => void;
  highlightedEquipment: number | null;
  equipmentRefs: React.MutableRefObject<Map<number, HTMLTableRowElement>>;
  gps001KmTotal: number;
  gps001WorkingDays: number;
  seedServiceRecordsData: { records: any[] } | undefined;
  startScanning: () => void;
  setQrSerial: (v: string) => void;
  setShowQR: (v: boolean) => void;
  onShowReport: (record: any) => void;
  formatGps001Hours: () => string;
  computeEquipmentWorstStatus: (seedEq: any) => "OK" | "Near Service" | "Overdue" | null;
}

export function EquipmentTab({
  searchQuery,
  setSearchQuery,
  filteredSeedEquipment,
  liveClients,
  equipment,
  selectedSeedId,
  setSelectedSeedId,
  setSelectedEquipment,
  highlightedEquipment,
  equipmentRefs,
  gps001KmTotal,
  gps001WorkingDays,
  seedServiceRecordsData,
  startScanning,
  setQrSerial,
  setShowQR,
  onShowReport,
  formatGps001Hours,
  computeEquipmentWorstStatus,
}: EquipmentTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            placeholder="Search unit ID or serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 bg-white border-gray-200 text-black text-xs"
          />
        </div>
        <Button
          onClick={startScanning}
          className="bg-[#66B2B2] text-white hover:bg-[#10B981]/90 font-bold h-8 text-xs"
        >
          <Camera className="w-3.5 h-3.5 mr-1.5" />
          Scan QR
        </Button>
      </div>

      <div className="data-card overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Image</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Equipment</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Client</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Serial Number</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Total Hours</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Total Km</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Days</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Weeks</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Months</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Years</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">Status</th>
              <th className="text-left py-2.5 px-3 text-gray-600 font-bold uppercase tracking-wider">QR Code</th>
              <th className="py-2.5 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSeedEquipment.map((seedEq) => {
              const seedClient = liveClients.find((c) => c.id === seedEq.clientId);
              const storeEq = equipment.find((e) => e.serialNumber === seedEq.serialNumber);
              const storeId = storeEq?.id ?? null;

              // EQ-001: pull hours/km/days from Fleet's localStorage caches
              const isExcavator = seedEq.id === "EQ-001";
              const hoursDisplay = isExcavator
                ? formatGps001Hours()
                : (seedEq.hoursTotal ?? "—");
              const hoursTodayDisplay = isExcavator ? "—" : (seedEq.hoursToday ?? "—");

              const rawKm = isExcavator ? gps001KmTotal : seedEq.kmTotal;
              const kmNum = rawKm !== undefined && rawKm !== null
                ? (typeof rawKm === "number" ? rawKm : parseFloat(String(rawKm).replace(/[^\d.]/g, "")))
                : null;
              const kmDisplay = kmNum !== null && Number.isFinite(kmNum) ? `${kmNum.toFixed(2)} km` : "—";

              const rawKmToday = isExcavator ? null : seedEq.kmToday;
              const kmTodayNum = rawKmToday !== undefined && rawKmToday !== null
                ? (typeof rawKmToday === "number" ? rawKmToday : parseFloat(String(rawKmToday).replace(/[^\d.]/g, "")))
                : null;
              const kmTodayDisplay = kmTodayNum !== null && Number.isFinite(kmTodayNum) ? `${kmTodayNum.toFixed(2)} km` : "—";

              const rawDays = isExcavator ? gps001WorkingDays : seedEq.days;
              const daysNum = rawDays !== undefined && rawDays !== null
                ? (typeof rawDays === "number" ? rawDays : parseFloat(String(rawDays).replace(/[^\d.]/g, "")))
                : null;
              const validDays = daysNum !== null && Number.isFinite(daysNum) && daysNum >= 0;
              const daysDisplay = validDays ? `${Math.floor(daysNum!)}` : "—";
              const weeksDisplay = validDays ? `${(daysNum! / 7).toFixed(1)}` : "—";
              const monthsDisplay = validDays ? `${(daysNum! / 30.44).toFixed(1)}` : "—";
              const yearsDisplay = validDays ? `${(daysNum! / 365.25).toFixed(1)}` : "—";

              const worstStatus = computeEquipmentWorstStatus(seedEq);
              const statusDef = seedData.pmsStatuses.find(s => s.value === worstStatus);
              const isSelected = selectedSeedId === seedEq.id;
              const isHighlighted = storeId !== null && highlightedEquipment === storeId;

              // Service history for this equipment (used in expanded panel)
              const rowSeedHistory = (seedServiceRecordsData?.records ?? [])
                .filter((r: any) => r.status === "completed" && r.seedEquipmentId === seedEq.id);

              return (
                <Fragment key={seedEq.id}>
                  {/* ── Main table row ── */}
                  <tr
                    ref={(el) => {
                      if (storeId !== null) {
                        if (el) equipmentRefs.current.set(storeId as any, el);
                        else equipmentRefs.current.delete(storeId as any);
                      }
                    }}
                    className={`grid-table-row border-b border-gray-100 cursor-pointer hover:bg-[#66B2B2]/5 transition-all ${
                      isSelected || isHighlighted ? 'bg-[#66B2B2]/10 border-[#66B2B2]/30' : ''
                    }`}
                    onClick={() => {
                      if (selectedSeedId === seedEq.id) {
                        setSelectedSeedId(null);
                        setSelectedEquipment(null);
                      } else {
                        setSelectedSeedId(seedEq.id);
                        setSelectedEquipment(storeId as any);
                      }
                    }}
                  >
                    <td className="py-3 px-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-gray-100 flex items-center justify-center">
                        {seedEq.image ? (
                          <img src={seedEq.image} alt={seedEq.name ?? ""} className="h-full w-full object-cover" />
                        ) : (
                          <Wrench className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-black font-medium">{seedEq.name ?? "—"}</td>
                    <td className="py-3 px-3 text-black">{seedClient?.companyName ?? "—"}</td>
                    <td className="py-3 px-3 text-gray-600 font-mono-tech">{seedEq.serialNumber ?? "—"}</td>
                    <td className="py-3 px-3 font-mono-tech text-gray-800">{hoursDisplay}</td>
                    <td className="py-3 px-3 font-mono-tech text-gray-800">{kmDisplay}</td>
                    <td className="py-3 px-3 font-mono-tech text-gray-800">{daysDisplay}</td>
                    <td className="py-3 px-3 font-mono-tech text-gray-800">{weeksDisplay}</td>
                    <td className="py-3 px-3 font-mono-tech text-gray-800">{monthsDisplay}</td>
                    <td className="py-3 px-3 font-mono-tech text-gray-800">{yearsDisplay}</td>
                    <td className="py-3 px-3">
                      {statusDef ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: `${statusDef.color}33`, color: statusDef.color }}>{statusDef.label}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrSerial(seedEq.serialNumber ?? "");
                          setShowQR(true);
                        }}
                        className="p-1 rounded bg-white border border-gray-100 hover:border-[#66B2B2] transition-all shadow-sm active:scale-95 group/qr"
                        title="View QR Tag"
                      >
                        <QrCode className="w-8 h-8 text-gray-500 group-hover/qr:text-[#66B2B2] transition-colors" />
                      </button>
                    </td>
                    <td className="py-3 px-3 w-8 text-center">
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isSelected ? 'rotate-180 text-[#66B2B2]' : ''}`} />
                    </td>
                  </tr>

                  {/* ── Expanded detail panel ── */}
                  {isSelected && (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-0 border-b-2 border-[#66B2B2]/25 bg-gradient-to-b from-[#66B2B2]/5 to-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-5 py-5 space-y-5 animate-in slide-in-from-top-1 duration-200">

                          {/* ── Identity header ── */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#66B2B2]/10 text-[#66B2B2] text-[9px] font-black uppercase tracking-[0.1em] mb-1.5">
                                <Package className="w-2.5 h-2.5" /> Managed Asset
                              </div>
                              <h3 className="text-lg font-black text-gray-900 tracking-tight">{seedEq.name ?? "—"}</h3>
                              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{seedEq.equipmentType ?? "—"}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              {worstStatus === "Overdue" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-700 border border-red-200">Overdue</span>
                              )}
                              {worstStatus === "Near Service" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200">Near Service</span>
                              )}
                              {worstStatus === "OK" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-green-100 text-green-700 border border-green-200">OK</span>
                              )}
                              {seedEq.id && (
                                <span className="text-[9px] text-gray-400 font-mono-tech font-bold">{seedEq.id}</span>
                              )}
                            </div>
                          </div>

                          {/* ── Info grid ── */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Client</div>
                              <div className="text-xs font-bold text-gray-900">{seedClient?.companyName ?? "—"}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Serial Number</div>
                              <div className="text-xs font-bold font-mono-tech text-gray-900">{seedEq.serialNumber ?? "—"}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Equipment Type</div>
                              <div className="text-xs font-bold text-gray-900">{seedEq.equipmentType ?? "—"}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-gray-100 space-y-0.5">
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">GPS Location</div>
                              <div className="text-xs font-bold font-mono-tech text-gray-900">
                                {(seedEq as any).lat != null && (seedEq as any).lng != null
                                  ? `${Number((seedEq as any).lat).toFixed(5)}°N, ${Number((seedEq as any).lng).toFixed(5)}°E`
                                  : "—"}
                              </div>
                            </div>
                          </div>

                          {/* ── Usage metrics ── */}
                          <div>
                            <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">Usage Metrics</div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                              {[
                                { label: "Hours Today", value: hoursTodayDisplay },
                                { label: "Total Hours", value: hoursDisplay },
                                { label: "KM Today", value: kmTodayDisplay },
                                { label: "Total KM", value: kmDisplay },
                                { label: "Days Active", value: daysDisplay },
                                { label: "Weeks", value: weeksDisplay },
                              ].map(({ label, value }) => (
                                <div key={label} className="p-2.5 rounded-lg bg-white border border-gray-100 text-center space-y-0.5">
                                  <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-tight">{label}</div>
                                  <div className={`text-xs font-black font-mono-tech ${value === "—" ? "text-gray-300" : "text-gray-900"}`}>{value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── PMS Schedules ── */}
                          {Array.isArray((seedEq as any).pmsConfiguration) && (seedEq as any).pmsConfiguration.length > 0 && (
                            <div>
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-2">PMS Schedules</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(seedEq as any).pmsConfiguration.map((cfg: any, i: number) => (
                                  <div key={i} className="p-3 rounded-xl bg-white border border-gray-100 flex items-start justify-between gap-2">
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="text-xs font-bold text-gray-900 truncate">{cfg.serviceType || `Schedule ${i + 1}`}</div>
                                      <div className="text-[10px] text-gray-500 font-mono-tech">{cfg.serviceInterval} {cfg.serviceIntervalUnit}</div>
                                    </div>
                                    {cfg.estimatedCost > 0 && (
                                      <div className="text-[10px] font-black text-[#66B2B2] whitespace-nowrap shrink-0">
                                        ₱{Number(cfg.estimatedCost).toLocaleString("en-PH")}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Notes ── */}
                          {(seedEq as any).notes && (
                            <div>
                              <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1.5">Notes</div>
                              <p className="text-xs text-gray-700 leading-relaxed p-3 rounded-xl bg-white border border-gray-100">{(seedEq as any).notes}</p>
                            </div>
                          )}

                          {/* ── Maintenance History Timeline ── */}
                          <div className="space-y-2.5">
                            <div className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                              <History className="w-3.5 h-3.5" /> Maintenance History Timeline
                            </div>
                            {rowSeedHistory.length > 0 ? (
                              rowSeedHistory.slice(0, 5).map((record: any) => (
                                <div
                                  key={record.id}
                                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-[#66B2B2]/30 hover:bg-[#66B2B2]/5 transition-all cursor-pointer group"
                                  onClick={(e) => { e.stopPropagation(); onShowReport(record as any); }}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                      <Check className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-gray-900 group-hover:text-[#66B2B2] transition-colors">
                                        {record.serviceType || record.serviceCategory}
                                      </div>
                                      <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">
                                        {record.completedDate
                                          ? new Date(record.completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                          : "—"}
                                        <span className="mx-1">•</span>Tech: {record.technician}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 text-gray-300 group-hover:text-[#66B2B2] transition-all shrink-0">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em]">No prior service history</div>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

