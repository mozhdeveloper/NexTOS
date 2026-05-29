import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import { useCRMStore } from "@/stores/useCRMStore";
import { useBillingStore } from "@/stores/useBillingStore";
import type { ServiceType, ServiceRecord } from "@/types";
import {
  Shield,
  History,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  Package,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ServiceReportView } from "@/components/ServiceReportView";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type TabType = "history" | "equipment" | "booking" | "packages" | "billing";

export default function ClientPortal() {
  const { user } = useAuthStore();
  const { equipment, serviceRecords, servicePhotos, bookings, addBooking } = useOperationsStore();
  const { clients } = useCRMStore();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(clients[0]?.id ?? null);
  const { invoices, packages, markInvoicePaid, addInvoice } = useBillingStore();
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [expandedEquipment, setExpandedEquipment] = useState<number | null>(null);
  const [showReport, setShowReport] = useState<ServiceRecord | null>(null);

  // Client-filtered data (admin can pick a client). Default to first client for admins.
  const clientId =
    (user?.role !== "client"
      ? (selectedClientId ?? clients[0]?.id ?? user?.clientId)
      : user?.clientId) || 1;
  const client = clients.find((c) => c.id === clientId);
  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientRecords = serviceRecords.filter((r) => r.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  const clientPackages = packages.filter((p) => p.clientId === clientId);
  const availablePackages = packages.filter((p) => p.clientId !== clientId);
  const clientBookings = bookings.filter((b) => b.clientId === clientId);

  // Booking wizard state
  const [bookingStep, setBookingStep] = useState(0);
  const [bookingEquipment, setBookingEquipment] = useState("");
  const [bookingType, setBookingType] = useState<ServiceType>("pms");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Payment state
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [purchaseProcessing, setPurchaseProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const handleBookingSubmit = () => {
    // persist booking to operations store
    const toServiceCategory = (type: ServiceType) => {
      if (type === "pms") return "Heavy Equipment PMS" as const;
      if (type === "calibration") return "Calibration PMS" as const;
      if (type === "repair") return "Repair" as const;
      if (type === "inspection") return "Inspection" as const;
      return "Installation" as const;
    };

    addBooking({
      clientId,
      equipmentId: parseInt(bookingEquipment),
      serviceCategory: toServiceCategory(bookingType),
      serviceType: bookingType,
      requestedDate: bookingDate,
      preferredTime: bookingTime,
      status: "pending",
      notes: bookingNotes,
    });

    setBookingComplete(true);
    setTimeout(() => {
      setBookingComplete(false);
      setBookingStep(0);
      setBookingEquipment("");
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      setActiveTab("history");
    }, 3000);
  };

  const isServiceDueFor = (eq: any) => {
    if (!eq) return false;
    if (eq.equipmentType === "Heavy Equipment") {
      return typeof eq.nextPMSHours === "number" && eq.nextPMSHours > 0 && eq.currentHours >= eq.nextPMSHours;
    }
    if (eq.equipmentType === "Lab Equipment" || eq.equipmentType === "Testing Equipment") {
      return eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate) <= new Date() : false;
    }
    return false;
  };

  // When a booking completes inside the modal, auto-close the modal and return to bookings list
  useEffect(() => {
    if (bookingComplete && bookingModalOpen) {
      const t = setTimeout(() => {
        setBookingModalOpen(false);
        // restore booking tab in case handleBookingSubmit changed it
        setActiveTab("booking");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [bookingComplete, bookingModalOpen]);

  const handlePayment = (invoiceId: number) => {
    setSelectedInvoice(invoiceId);
    setPaymentProcessing(true);
    setTimeout(() => {
      markInvoicePaid(invoiceId);
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedInvoice(null);
      }, 2000);
    }, 2000);
  };

  const handlePackagePurchase = (packageId: number, packageName: string) => {
    setSelectedPackage(packageId);
    setPurchaseProcessing(true);
    setTimeout(() => {
      // create a mock invoice for the package purchase
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const amount = packages.find((p) => p.id === packageId)?.price ?? 0;
      const tax = Math.round(amount * 0.1 * 100) / 100; // 10% tax
      const total = Math.round((amount + tax) * 100) / 100;
      const dueDate = new Date(Date.now() + 14 * 86400000).toISOString();

      addInvoice({
        clientId,
        packageId,
        serviceRecordId: null,
        invoiceNumber,
        amount,
        tax,
        total,
        status: "sent",
        dueDate,
        paidDate: null,
      });

      setPurchaseProcessing(false);
      setPurchaseSuccess(`${packageName} purchase requested — invoice ${invoiceNumber} created.`);
      setTimeout(() => {
        setPurchaseSuccess("");
        setSelectedPackage(null);
      }, 3000);
    }, 1200);
  };

  const outstandingTotal = clientInvoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-black tracking-[-0.02em]">Client Portal</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            {client?.companyName || "Your Account"} — Equipment history, bookings &amp; billing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role !== "client" && (
            <select
              value={String(selectedClientId ?? clients[0]?.id ?? user?.clientId ?? 1)}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              className="h-8 bg-white border border-gray-200 text-black text-xs px-2"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#66B2B2]/10 border border-[#66B2B2]/20">
            <Shield className="w-3.5 h-3.5 text-[#66B2B2]" />
            <span className="text-xs text-[#66B2B2] font-medium">Secure Portal</span>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-3 gap-3">
        <div className="data-card p-4">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Current Balance</div>
          <div className="text-3xl font-bold text-[#66B2B2] kpi-glow">₱{outstandingTotal.toFixed(2)}</div>
          <div className="text-[10px] text-gray-600 mt-1">
            {clientInvoices.filter((i) => i.status !== "paid").length} outstanding invoices
          </div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Active Equipment</div>
          <div className="text-3xl font-bold text-black">{clientEquipment.length}</div>
          <div className="text-[10px] text-gray-600 mt-1">Units under management</div>
        </div>
        <div className="data-card p-4">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Service History</div>
          <div className="text-3xl font-bold text-black">{clientRecords.length}</div>
          <div className="text-[10px] text-gray-600 mt-1">Total service records</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "history" as TabType, label: "Equipment History", icon: History },
          { id: "equipment" as TabType, label: "Equipment", icon: Package },
          { id: "booking" as TabType, label: "Book Service", icon: Calendar },
          { id: "packages" as TabType, label: "Packages", icon: Package },
          { id: "billing" as TabType, label: "Billing", icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-[#66B2B2] text-[#66B2B2] bg-[#66B2B2]/5"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Equipment History Tab */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {clientEquipment.map((eq) => {
            const eqRecords = clientRecords.filter((r) => r.equipmentId === eq.id);
            const eqPhotos = servicePhotos.filter((p) => eqRecords.some((r) => r.id === p.serviceRecordId));
            const isExpanded = expandedEquipment === eq.id;
            const serviceDue = isServiceDueFor(eq);

            return (
              <div key={eq.id} className="data-card">
                <button
                  onClick={() => setExpandedEquipment(isExpanded ? null : eq.id)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#66B2B2]/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-[#66B2B2]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-black font-mono-tech">{eq.unitId}</span>
                        <span className="text-xs text-gray-600">{eq.type}</span>
                      </div>
                      <div className="text-[10px] text-gray-600">
                        {eq.manufacturer} {eq.model} — {eq.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {serviceDue && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#EF4444]/20 text-[#EF4444] font-medium">
                        Service Due
                      </span>
                    )}
                    <span className="text-[10px] text-gray-600">{eqRecords.length} services</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                    <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                      <div>
                        <div className="text-[10px] text-gray-600">Serial</div>
                        <div className="text-black font-mono-tech">{eq.serialNumber}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600">Install Date</div>
                        <div className="text-black">{new Date(eq.installDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600">Current Hours</div>
                        <div className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-black"}`}>
                          {eq.currentHours}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600">Next Service</div>
                          <div className={`font-mono-tech ${serviceDue ? "text-[#EF4444]" : "text-black"}`}>
                            {eq.equipmentType === "Heavy Equipment" ? (eq.nextPMSHours ? `${eq.nextPMSHours}h` : "—") : (eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate).toLocaleDateString() : "—")}
                          </div>
                      </div>
                    </div>

                    {/* Service Records */}
                    {eqRecords.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Service Records</span>
                            <span className="flex items-center gap-1 text-[#66B2B2] font-black">
                                <Shield className="w-2.5 h-2.5" />
                                SECURE AUDIT TRAIL ENABLED
                            </span>
                        </div>
                        <div className="space-y-2">
                          {eqRecords.filter(r => r.status === 'completed').map((record) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900 capitalize">{record.serviceCategory}</span>
                                        {record.safetyChecklist && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-tighter border border-amber-100">
                                                Safety Verified
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium">Tech: {record.technician} <span className="mx-1">•</span> {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : "—"}</div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowReport(record)}
                                className="h-8 text-[10px] font-bold text-[#66B2B2] hover:bg-[#66B2B2]/10 rounded-lg group-hover:translate-x-1 transition-all"
                              >
                                View Full Report
                                <ArrowRight className="w-3 h-3 ml-1.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {eqPhotos.length > 0 && (
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Documentation</div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {eqPhotos.map((photo, idx) => (
                            <div key={idx} className="relative">
                              <img src={photo.url} alt={photo.caption} className="w-full h-16 object-cover rounded" />
                              <span
                                className={`absolute top-0.5 left-0.5 text-[8px] px-1 py-0.5 rounded font-medium ${
                                  photo.type === "before"
                                    ? "bg-[#66B2B2]/80 text-white"
                                    : "bg-[#10B981]/80 text-white"
                                }`}
                              >
                                {photo.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === "equipment" && (
        <div className="space-y-3">
          {clientEquipment.length === 0 ? (
            <div className="data-card p-6 text-center">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600 text-sm">No equipment found for this company</p>
            </div>
          ) : (
            clientEquipment.map((eq) => {
              const serviceDue = isServiceDueFor(eq);
              return (
                <div key={eq.id} className="data-card p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        serviceDue ? 'bg-red-50' : 'bg-[#66B2B2]/10'
                      }`}>
                        <Zap className={`w-6 h-6 ${serviceDue ? 'text-red-600' : 'text-[#66B2B2]'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-black font-mono-tech">{eq.unitId}</span>
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{eq.equipmentType}</span>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1">
                          {eq.manufacturer} {eq.model}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {serviceDue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-50 text-red-600 font-bold border border-red-200">
                          Service Due
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        eq.status === 'active' ? 'bg-green-50 text-green-600 border border-green-200' :
                        eq.status === 'maintenance' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        eq.status === 'service_due' ? 'bg-red-50 text-red-600 border border-red-200' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {eq.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Serial Number</div>
                      <div className="text-sm font-mono-tech font-bold text-gray-900 mt-1">{eq.serialNumber}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Installation Date</div>
                      <div className="text-sm font-mono-tech font-bold text-gray-900 mt-1">
                        {new Date(eq.installDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Location</div>
                      <div className="text-sm font-bold text-gray-900 mt-1">{eq.location}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Warranty Expiry</div>
                      <div className="text-sm font-mono-tech font-bold text-gray-900 mt-1">
                        {new Date(eq.warrantyExpiry).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Heavy Equipment Specific Info */}
                  {eq.equipmentType === "Heavy Equipment" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Current Hours</div>
                        <div className={`text-lg font-bold font-mono-tech mt-1 ${serviceDue ? 'text-red-600' : 'text-[#66B2B2]'}`}>
                          {eq.currentHours} hrs
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Last PMS</div>
                        <div className="text-sm font-mono-tech font-bold text-gray-900 mt-1">
                          {eq.lastPMSHours} hrs
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">PMS Interval</div>
                        <div className="text-sm font-mono-tech font-bold text-gray-900 mt-1">
                          {eq.pmsInterval} hrs
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Next PMS Due</div>
                        <div className={`text-lg font-bold font-mono-tech mt-1 ${serviceDue ? 'text-red-600' : 'text-[#66B2B2]'}`}>
                          {eq.nextPMSHours} hrs
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lab/Testing Equipment Specific Info */}
                  {(eq.equipmentType === "Lab Equipment" || eq.equipmentType === "Testing Equipment") && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Last Calibration</div>
                        <div className="text-sm font-mono-tech font-bold text-gray-900 mt-1">
                          {eq.lastCalibrationDate ? new Date(eq.lastCalibrationDate).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Frequency</div>
                        <div className="text-sm font-bold text-gray-900 mt-1">
                          {eq.calibrationFrequency} months
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Next Calibration</div>
                        <div className={`text-sm font-mono-tech font-bold mt-1 ${
                          serviceDue ? 'text-red-600' : 'text-[#66B2B2]'
                        }`}>
                          {eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {eq.notes && (
                    <div>
                      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-2">Notes</div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100">
                        {eq.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Booking Tab */}
      {activeTab === "booking" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-gray-600">Schedule a service appointment for your equipment</p>
            </div>
            <div>
              <Button
                onClick={() => setBookingModalOpen(true)}
                className="h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold"
              >
                Book Service
              </Button>
            </div>
          </div>

          {(() => {
            const isBookingPast = (b: { requestedDate: string; preferredTime?: string }) => {
              const date = new Date(b.requestedDate);
              const endTime = b.preferredTime?.split("-")[1];
              if (endTime) {
                const [hours, minutes] = endTime.split(":").map(Number);
                date.setHours(hours, minutes, 0, 0);
              } else {
                date.setHours(23, 59, 59, 999);
              }
              return date < new Date();
            };
            const upcomingBookings = clientBookings.filter((b) => !isBookingPast(b));
            const pastBookings = clientBookings.filter((b) => isBookingPast(b));
            const BookingCard = ({ b, isPast }: { b: typeof clientBookings[0]; isPast: boolean }) => (
              <div key={b.id} className="data-card">
                <div className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#66B2B2]/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-[#66B2B2]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-black font-mono-tech">{clientEquipment.find((e) => e.id === b.equipmentId)?.unitId || "—"}</span>
                        <span className="text-xs text-gray-600">{b.serviceType}</span>
                      </div>
                      <div className="text-[10px] text-gray-600">{new Date(b.requestedDate).toLocaleDateString()} · {b.preferredTime}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {isPast ? (
                      <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#10B981]/20 text-[#10B981]">completed</div>
                      ) : (
                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${b.status === "confirmed" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "bg-[#66B2B2]/20 text-[#66B2B2]"}`}>{b.status}</div>
                    )}
                  </div>
                </div>
              </div>
            );
            return (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-black mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#66B2B2]"/> Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingBookings.length === 0 && <div className="data-card p-4 text-sm text-gray-600">No upcoming bookings</div>}
                    {upcomingBookings.map((b) => <BookingCard key={b.id} b={b} isPast={false} />)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-black mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-[#8B5CF6]"/> Past</h3>
                  <div className="space-y-2">
                    {pastBookings.length === 0 && <div className="data-card p-4 text-sm text-gray-600">No past bookings</div>}
                    {pastBookings.map((b) => <BookingCard key={b.id} b={b} isPast={true} />)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Booking modal */}
          {bookingModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setBookingModalOpen(false)} />
              <div className="relative z-10 w-full max-w-lg mx-4">
                <div className="bg-white rounded p-5 border border-gray-200">
                  <button onClick={() => { setBookingModalOpen(false); setBookingStep(0); setBookingEquipment(""); setBookingDate(""); setBookingTime(""); setBookingNotes(""); setBookingComplete(false); }} className="absolute top-3 right-3 text-gray-600">
                    <X className="w-4 h-4" />
                  </button>

                  {/* Wizard content (same as before) */}
                  {bookingComplete ? (
                    <div className="text-center py-8" >
                      <div className="w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                      </div>
                      <h3 className="text-lg font-semibold text-black mb-1">Booking Confirmed!</h3>
                      <p className="text-sm text-gray-600">Your service appointment has been scheduled.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-5">
                        {[0, 1, 2].map((step) => (
                          <div key={step} className="flex items-center gap-2 flex-1">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                bookingStep >= step
                                  ? "bg-[#66B2B2] text-white"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {step + 1}
                            </div>
                            {step < 2 && (
                              <div
                                className={`flex-1 h-0.5 ${
                                  bookingStep > step ? "bg-[#66B2B2]" : "bg-gray-200"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Step 1 */}
                      {bookingStep === 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-black">Select Equipment &amp; Service</h3>
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Equipment</label>
                            <Select value={bookingEquipment} onValueChange={setBookingEquipment}>
                              <SelectTrigger className="h-9 bg-white border-gray-200 text-black text-xs">
                                <SelectValue placeholder="Choose unit" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200 text-black">
                                {clientEquipment.map((eq) => (
                                  <SelectItem key={eq.id} value={eq.id.toString()} className="text-xs text-black">
                                    {eq.unitId} — {eq.type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Service Type</label>
                            <Select value={bookingType} onValueChange={(v) => setBookingType(v as ServiceType)}>
                              <SelectTrigger className="h-9 bg-white border-gray-200 text-black text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200 text-black">
                                <SelectItem value="pms" className="text-xs text-black">Preventative Maintenance</SelectItem>
                                <SelectItem value="repair" className="text-xs text-black">Repair</SelectItem>
                                <SelectItem value="inspection" className="text-xs text-black">Inspection</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => setBookingStep(1)}
                            disabled={!bookingEquipment}
                            className="w-full h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold disabled:opacity-50"
                          >
                            Continue <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}

                      {/* Step 2 */}
                      {bookingStep === 1 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-black">Schedule Appointment</h3>
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Preferred Date</label>
                            <Input
                              type="date"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              className="h-9 bg-white border-gray-200 text-black text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Preferred Time</label>
                            <Select value={bookingTime} onValueChange={setBookingTime}>
                              <SelectTrigger className="h-9 bg-white border-gray-200 text-black text-xs">
                                <SelectValue placeholder="Select time window" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-200 text-black">
                                <SelectItem value="08:00-12:00" className="text-xs text-black">Morning (8:00 - 12:00)</SelectItem>
                                <SelectItem value="12:00-16:00" className="text-xs text-black">Afternoon (12:00 - 16:00)</SelectItem>
                                <SelectItem value="16:00-20:00" className="text-xs text-black">Evening (16:00 - 20:00)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setBookingStep(0)}
                              className="flex-1 h-9 border-gray-200 text-gray-600 text-xs"
                            >
                              Back
                            </Button>
                            <Button
                              onClick={() => setBookingStep(2)}
                              disabled={!bookingDate || !bookingTime}
                              className="flex-1 h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold disabled:opacity-50"
                            >
                              Continue <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step 3 */}
                      {bookingStep === 2 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-black">Confirm Booking</h3>
                          <div className="p-3 rounded bg-gray-50 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Equipment</span>
                              <span className="text-black font-mono-tech">
                                {clientEquipment.find((e) => e.id === parseInt(bookingEquipment))?.unitId}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Service Type</span>
                              <span className="text-black capitalize">{bookingType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Date</span>
                              <span className="text-black">{bookingDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Time</span>
                              <span className="text-black">{bookingTime}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Additional Notes</label>
                            <textarea
                              value={bookingNotes}
                              onChange={(e) => setBookingNotes(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-black text-xs focus:outline-none focus:border-[#66B2B2]/50 resize-none"
                              placeholder="Any special instructions..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setBookingStep(1)}
                              className="flex-1 h-9 border-gray-200 text-gray-600 text-xs"
                            >
                              Back
                            </Button>
                            <Button
                              onClick={handleBookingSubmit}
                              className="flex-1 h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Confirm Booking
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === "packages" && (
        <div className="space-y-4">
          <div className="data-card p-4">
            <h3 className="text-sm font-semibold text-black mb-1">Active Packages</h3>
            <p className="text-[10px] text-gray-600 mb-3">Currently assigned to your account</p>
            {clientPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clientPackages.map((pkg) => (
                  <div key={pkg.id} className="rounded border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-semibold text-black">{pkg.name}</div>
                        <div className="text-[10px] text-gray-600 capitalize">
                          {pkg.tier} • {pkg.billingCycle}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/20 text-[#10B981]">
                        {pkg.status}
                      </span>
                    </div>
                    <div className="text-[#66B2B2] font-bold text-sm mb-2">₱{pkg.price.toFixed(0)}</div>
                    <div className="flex flex-wrap gap-1">
                      {pkg.includedServices.map((service, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-[#66B2B2]/20 text-[#66B2B2]">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-600">No active packages found.</div>
            )}
          </div>

          <div className="data-card p-4">
            <h3 className="text-sm font-semibold text-black mb-1">Available Packages</h3>
            <p className="text-[10px] text-gray-600 mb-3">Browse and request a new package purchase</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availablePackages.map((pkg) => (
                <div key={pkg.id} className="rounded border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-semibold text-black">{pkg.name}</div>
                      <div className="text-[10px] text-gray-600 capitalize">
                        {pkg.tier} • {pkg.billingCycle}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#66B2B2]/20 text-[#66B2B2]">
                      Available
                    </span>
                  </div>
                  <div className="text-[#66B2B2] font-bold text-sm mb-2">₱{pkg.price.toFixed(0)}</div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pkg.includedServices.map((service, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-[#66B2B2]/20 text-[#66B2B2]">
                        {service}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePackagePurchase(pkg.id, pkg.name)}
                    disabled={purchaseProcessing && selectedPackage === pkg.id}
                    className="h-6 text-[10px] bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-semibold px-3"
                  >
                    {purchaseProcessing && selectedPackage === pkg.id ? (
                      <Clock className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-3 h-3 mr-1" />
                        Purchase
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {purchaseSuccess && (
            <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#10B981] font-medium">{purchaseSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-4">
          {/* Package Info */}
          {clientPackages.map((pkg) => (
            <div key={pkg.id} className="data-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-black">{pkg.name}</h3>
                  <p className="text-[10px] text-gray-600 capitalize">{pkg.tier} Plan — {pkg.billingCycle}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[#66B2B2]">₱{pkg.price.toFixed(0)}</div>
                  <div className="text-[10px] text-gray-600">per {pkg.billingCycle === "monthly" ? "month" : pkg.billingCycle}</div>
                </div>
              </div>
              <div className="text-[10px] text-gray-600 mb-2">Included Services:</div>
              <div className="flex flex-wrap gap-1.5">
                {pkg.includedServices.map((service, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-[#66B2B2]/20 text-[#66B2B2]">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Invoices */}
          <div className="data-card overflow-auto">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-black">Invoices</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Invoice #</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Amount</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Due Date</th>
                  <th className="text-left py-2.5 px-3 text-gray-600 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.map((invoice) => (
                  <tr key={invoice.id} className="grid-table-row border-b border-gray-200">
                    <td className="py-2.5 px-3 text-black font-mono-tech">{invoice.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-[#66B2B2] font-mono-tech font-bold">₱{invoice.total.toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          invoice.status === "paid"
                            ? "bg-[#10B981]/20 text-[#10B981]"
                            : invoice.status === "overdue"
                            ? "bg-[#EF4444]/20 text-[#EF4444]"
                            : "bg-[#66B2B2]/20 text-[#66B2B2]"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 font-mono-tech">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {invoice.status !== "paid" ? (
                        <Button
                          size="sm"
                          onClick={() => handlePayment(invoice.id)}
                          disabled={paymentProcessing && selectedInvoice === invoice.id}
                          className="h-6 text-[10px] bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-semibold px-3"
                        >
                          {paymentProcessing && selectedInvoice === invoice.id ? (
                            <Clock className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 mr-1" />
                              Pay
                            </>
                          )}
                        </Button>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Success Toast */}
          {paymentSuccess && (
            <div className="fixed bottom-4 right-4 px-4 py-3 rounded bg-[#10B981]/20 border border-[#10B981]/30 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#10B981] font-medium">Payment successful!</span>
            </div>
          )}
        </div>
      )}

      {/* Service Report View Modal */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[95vh] overflow-auto scrollbar-hide rounded-2xl">
          {showReport && (
            <ServiceReportView
              record={showReport}
              equipment={equipment.find((eqItem) => eqItem.id === showReport.equipmentId)}
              client={client}
              photos={servicePhotos.filter((p) => p.serviceRecordId === showReport.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
