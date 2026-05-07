import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOperationsStore } from "@/stores/useOperationsStore";
import type { ServiceCategory } from "@/types";
import { Calendar, Clock, Package, ArrowRight, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientBookings() {
  const { user } = useAuthStore();
  const { bookings, equipment, addBooking } = useOperationsStore();
  const clientId = user?.clientId || 1;

  const clientEquipment = equipment.filter((e) => e.clientId === clientId);
  const clientBookings = bookings
    .filter((b) => b.clientId === clientId)
    .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime());

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

  const upcoming = clientBookings.filter((b) => !isBookingPast(b));
  const past = clientBookings.filter((b) => isBookingPast(b));

  const [bookingStep, setBookingStep] = useState(0);
  const [bookingEquipment, setBookingEquipment] = useState("");
  const [bookingCategory, setBookingCategory] = useState<ServiceCategory>("Heavy Equipment PMS");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingProjectName, setBookingProjectName] = useState("");
  const [bookingSampleName, setBookingSampleName] = useState("");
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const handleBookingSubmit = () => {
    if (!bookingEquipment) return;

    addBooking({
      clientId,
      equipmentId: parseInt(bookingEquipment),
      serviceCategory: bookingCategory,
      requestedDate: bookingDate,
      preferredTime: bookingTime,
      status: "pending",
      notes: bookingNotes,
      projectName: bookingCategory === "Lab Testing Service" ? bookingProjectName : undefined,
      sampleName: bookingCategory === "Lab Testing Service" ? bookingSampleName : undefined,
    });

    setBookingComplete(true);
    setTimeout(() => {
      setBookingComplete(false);
      setBookingModalOpen(false);
      setBookingStep(0);
      setBookingEquipment("");
      setBookingDate("");
      setBookingTime("");
      setBookingNotes("");
      setBookingProjectName("");
      setBookingSampleName("");
    }, 3000);
  };

  useEffect(() => {
    if (!bookingModalOpen && bookingComplete) {
      setBookingComplete(false);
    }
  }, [bookingModalOpen, bookingComplete]);

  return (
    <div className="space-y-4 px-8 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#EAEAEA] tracking-[-0.02em]">Bookings</h1>
          <p className="text-sm text-[#88888C] mt-0.5">View and request service bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setBookingModalOpen(true)}
            className="h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold"
          >
            Book Service
          </Button>
        </div>
      </div>

      {/* Booking modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBookingModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4">
            <div className="bg-[#0A0A0C] rounded p-5 border border-white/10">
              <button
                onClick={() => {
                  setBookingModalOpen(false);
                  setBookingStep(0);
                  setBookingEquipment("");
                  setBookingDate("");
                  setBookingTime("");
                  setBookingNotes("");
                  setBookingComplete(false);
                }}
                className="absolute top-3 right-3 text-[#88888C]"
              >
                <X className="w-4 h-4" />
              </button>

              {bookingComplete ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-[#10B981]/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#EAEAEA] mb-1">Booking Confirmed!</h3>
                  <p className="text-sm text-[#88888C]">Your service appointment has been scheduled.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    {[0, 1, 2].map((step) => (
                      <div key={step} className="flex items-center gap-2 flex-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            bookingStep >= step ? "bg-[#F2A900] text-[#050505]" : "bg-[#2A2A30] text-[#88888C]"
                          }`}
                        >
                          {step + 1}
                        </div>
                        {step < 2 && (
                          <div className={`flex-1 h-0.5 ${bookingStep > step ? "bg-[#F2A900]" : "bg-[#2A2A30]"}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {bookingStep === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#EAEAEA]">Select Equipment &amp; Service</h3>
                      <div>
                        <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Equipment</label>
                        <Select value={bookingEquipment} onValueChange={setBookingEquipment}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue placeholder="Choose unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            {clientEquipment.map((eq) => (
                              <SelectItem key={eq.id} value={eq.id.toString()} className="text-xs text-[#EAEAEA]">
                                {eq.unitId} — {eq.equipmentType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Service Category</label>
                        <Select value={bookingCategory} onValueChange={(v) => setBookingCategory(v as ServiceCategory)}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            <SelectItem value="Heavy Equipment PMS" className="text-xs text-[#EAEAEA]">Heavy Equipment PMS</SelectItem>
                            <SelectItem value="Calibration PMS" className="text-xs text-[#EAEAEA]">Calibration PMS</SelectItem>
                            <SelectItem value="Lab Testing Service" className="text-xs text-[#EAEAEA]">Lab Testing Service</SelectItem>
                            <SelectItem value="Repair" className="text-xs text-[#EAEAEA]">Repair</SelectItem>
                            <SelectItem value="Inspection" className="text-xs text-[#EAEAEA]">Inspection</SelectItem>
                            <SelectItem value="Installation" className="text-xs text-[#EAEAEA]">Installation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {bookingCategory === "Lab Testing Service" && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div>
                            <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Project Name</label>
                            <Input 
                              value={bookingProjectName} 
                              onChange={(e) => setBookingProjectName(e.target.value)}
                              placeholder="e.g. Skyline Tower"
                              className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Sample ID</label>
                            <Input 
                              value={bookingSampleName} 
                              onChange={(e) => setBookingSampleName(e.target.value)}
                              placeholder="e.g. S-101"
                              className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs" 
                            />
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={() => setBookingStep(1)}
                        disabled={!bookingEquipment}
                        className="w-full h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold disabled:opacity-50"
                      >
                        Continue <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {bookingStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#EAEAEA]">Schedule Appointment</h3>
                      <div>
                        <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Preferred Date</label>
                        <Input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Preferred Time</label>
                        <Select value={bookingTime} onValueChange={setBookingTime}>
                          <SelectTrigger className="h-9 bg-[#1A1A20] border-white/10 text-[#EAEAEA] text-xs">
                            <SelectValue placeholder="Select time window" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A20] border-white/10">
                            <SelectItem value="08:00-12:00" className="text-xs text-[#EAEAEA]">Morning (8:00 - 12:00)</SelectItem>
                            <SelectItem value="12:00-16:00" className="text-xs text-[#EAEAEA]">Afternoon (12:00 - 16:00)</SelectItem>
                            <SelectItem value="16:00-20:00" className="text-xs text-[#EAEAEA]">Evening (16:00 - 20:00)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setBookingStep(0)} className="flex-1 h-9 border-white/10 text-[#88888C] text-xs">
                          Back
                        </Button>
                        <Button
                          onClick={() => setBookingStep(2)}
                          disabled={!bookingDate || !bookingTime}
                          className="flex-1 h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold disabled:opacity-50"
                        >
                          Continue <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {bookingStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#EAEAEA]">Confirm Booking</h3>
                      <div className="p-3 rounded bg-[#0A0A0C] space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Equipment</span>
                          <span className="text-[#EAEAEA] font-mono-tech">
                            {clientEquipment.find((e) => e.id === parseInt(bookingEquipment))?.unitId}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Category</span>
                          <span className="text-[#EAEAEA]">{bookingCategory}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Date</span>
                          <span className="text-[#EAEAEA]">{bookingDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#88888C]">Time</span>
                          <span className="text-[#EAEAEA]">{bookingTime}</span>
                        </div>
                        {bookingCategory === "Lab Testing Service" && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[#88888C]">Project</span>
                              <span className="text-[#EAEAEA]">{bookingProjectName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#88888C]">Sample ID</span>
                              <span className="text-[#EAEAEA]">{bookingSampleName}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-[#88888C] uppercase tracking-wider mb-1 block">Additional Notes</label>
                        <textarea
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded bg-[#1A1A20] border border-white/10 text-[#EAEAEA] text-xs focus:outline-none focus:border-[#F2A900]/50 resize-none"
                          placeholder="Any special instructions..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setBookingStep(1)} className="flex-1 h-9 border-white/10 text-[#88888C] text-xs">
                          Back
                        </Button>
                        <Button onClick={handleBookingSubmit} className="flex-1 h-9 bg-[#F2A900] hover:bg-[#F2A900]/80 text-[#050505] font-bold">
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

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#EAEAEA] mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#F2A900]"/> Upcoming</h3>
          <div className="space-y-2">
            {upcoming.length === 0 && <div className="data-card p-4 text-sm text-[#88888C]">No upcoming bookings</div>}
            {upcoming.map((b) => (
              <div key={b.id} className="data-card">
                <div className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#005F73]/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-[#005F73]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#EAEAEA] font-mono-tech">{clientEquipment.find((e) => e.id === b.equipmentId)?.unitId || "—"}</span>
                        <span className="text-[10px] text-[#88888C]">{b.serviceCategory}</span>
                      </div>
                      <div className="text-[10px] text-[#88888C]">{new Date(b.requestedDate).toLocaleDateString()} · {b.preferredTime}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${b.status === "confirmed" ? "bg-[#3B82F6]/20 text-[#3B82F6]" : "bg-[#F2A900]/20 text-[#F2A900]"}`}>
                      {b.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#EAEAEA] mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-[#8B5CF6]"/> Past</h3>
          <div className="space-y-2">
            {past.length === 0 && <div className="data-card p-4 text-sm text-[#88888C]">No past bookings</div>}
            {past.map((b) => (
              <div key={b.id} className="data-card">
                <div className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#005F73]/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-[#005F73]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#EAEAEA] font-mono-tech">{clientEquipment.find((e) => e.id === b.equipmentId)?.unitId || "—"}</span>
                        <span className="text-[10px] text-[#88888C]">{b.serviceCategory}</span>
                      </div>
                      <div className="text-[10px] text-[#88888C]">{new Date(b.requestedDate).toLocaleDateString()} · {b.preferredTime}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#10B981]/20 text-[#10B981]">
                      completed
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
