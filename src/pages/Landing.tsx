import { useState, useEffect } from "react";
import { useCRMStore } from "@/stores/useCRMStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Mail, 
  Building2, 
  ArrowRight,
  Shield,
  Wrench,
  Clock,
  ChevronDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Landing() {
  const { addLead } = useCRMStore();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inquiryType, setInquiryType] = useState<string>("sales");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated network delay
    setTimeout(() => {
      // Determine department assignment based on inquiry type
      let dept: any = "Management";
      if (inquiryType === "pms") dept = "Service";
      if (inquiryType === "equipment" || inquiryType === "quote") dept = "Operations";
      if (inquiryType === "sales") dept = "Operations";

      addLead({
        clientId: null,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        inquiryType: inquiryType as any,
        department: dept,
        message: formData.message,
        source: "Marketing Landing Page",
        status: "new",
        priority: "high",
        score: 75,
        assignedTo: "Marketing System",
        notes: `Inbound inquiry from ${formData.name}. Needs: ${inquiryType}`,
      });

      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#EAEAEA] selection:bg-[#F2A900]/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#F2A900] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#050505]" />
            </div>
            <span className="font-bold text-lg tracking-tight">NexTOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-[#88888C]">
            <a href="#" className="hover:text-[#F2A900] transition-colors">Solutions</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors">Technology</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors">Enterprise</a>
            <a href="#" className="hover:text-[#F2A900] transition-colors">Case Studies</a>
          </div>
          <Button variant="outline" className="h-9 text-xs border-white/10 hover:bg-white/5">
            Client Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-[#F2A900]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F2A900]/10 border border-[#F2A900]/20 text-[#F2A900] text-[10px] font-bold tracking-widest uppercase">
              <Shield className="w-3 h-3" />
              Advanced Asset Intelligence
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              The Operating System for <span className="text-gradient">Modern Enterprise.</span>
            </h1>
            
            <p className="text-lg text-[#88888C] max-w-lg leading-relaxed">
              Unified platform for security, fleet logistics, and automated service management. 
              Built for speed, scale, and uncompromising reliability.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setInquiryType("sales")} className="h-12 px-8 bg-[#F2A900] text-[#050505] font-bold text-base hover:bg-[#F2A900]/90">
                Talk to Sales
              </Button>
              <Button onClick={() => setInquiryType("pms")} variant="outline" className="h-12 px-8 border-white/10 hover:bg-white/5 text-base">
                Book PMS
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-[#1A1A20] flex items-center justify-center">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-full h-full rounded-full" />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-bold text-[#EAEAEA]">500+ Enterprises</div>
                <div className="text-[#88888C]">Trusting NexTOS daily</div>
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-right-4 duration-1000 delay-200">
            <div className="absolute inset-0 bg-[#F2A900]/20 blur-[100px] rounded-full opacity-20" />
            
            {!submitted ? (
              <div className="void-glass p-8 rounded-2xl relative border border-white/10">
                <h3 className="text-2xl font-bold mb-2">Request Information</h3>
                <p className="text-sm text-[#88888C] mb-6">Our team will reach out within 2 hours during business days.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[#88888C] tracking-wider">Full Name</label>
                      <Input 
                        required 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="bg-[#1A1A20] border-white/5 focus:border-[#F2A900]/50" 
                        placeholder="John Doe" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[#88888C] tracking-wider">Company</label>
                      <Input 
                        required 
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className="bg-[#1A1A20] border-white/5 focus:border-[#F2A900]/50" 
                        placeholder="Acme Inc" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[#88888C] tracking-wider">Email</label>
                      <Input 
                        required 
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="bg-[#1A1A20] border-white/5 focus:border-[#F2A900]/50" 
                        placeholder="john@company.com" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[#88888C] tracking-wider">Phone</label>
                      <Input 
                        required 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="bg-[#1A1A20] border-white/5 focus:border-[#F2A900]/50" 
                        placeholder="+1 (555) 000-0000" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#88888C] tracking-wider">How can we help?</label>
                    <Select value={inquiryType} onValueChange={setInquiryType}>
                      <SelectTrigger className="bg-[#1A1A20] border-white/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A20] border-white/10">
                        <SelectItem value="sales">Talk to Sales</SelectItem>
                        <SelectItem value="quote">Request a Quote</SelectItem>
                        <SelectItem value="pms">Book PMS / Service</SelectItem>
                        <SelectItem value="equipment">Inquire About Equipment</SelectItem>
                        <SelectItem value="general">General Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#88888C] tracking-wider">Message</label>
                    <Textarea 
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className="bg-[#1A1A20] border-white/5 focus:border-[#F2A900]/50 h-24 resize-none" 
                      placeholder="Tell us about your requirements..." 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-[#F2A900] text-[#050505] font-bold text-base mt-2"
                  >
                    {loading ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Submit Inquiry
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="void-glass p-12 rounded-2xl relative border border-[#10B981]/20 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-2 text-[#EAEAEA]">Inquiry Received</h3>
                  <p className="text-[#88888C]">
                    Thank you, {formData.name.split(' ')[0]}. An agent from our <span className="text-[#F2A900] font-bold">{inquiryType.toUpperCase()}</span> team will contact you shortly at <span className="text-[#EAEAEA] underline">{formData.email}</span>.
                  </p>
                </div>
                <Button 
                  onClick={() => setSubmitted(false)}
                  variant="outline" 
                  className="h-10 border-white/10 hover:bg-white/5"
                >
                  Send Another Inquiry
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-[10px] font-bold text-[#88888C] uppercase tracking-[0.3em] mb-12">
            INTEGRATED WITH INDUSTRY LEADERS
          </p>
          <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="flex items-center gap-2 font-bold text-2xl">MICROSOFT</div>
             <div className="flex items-center gap-2 font-bold text-2xl">SAMSUNG</div>
             <div className="flex items-center gap-2 font-bold text-2xl">HYUNDAI</div>
             <div className="flex items-center gap-2 font-bold text-2xl">TOTAL</div>
             <div className="flex items-center gap-2 font-bold text-2xl">AXIS</div>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .text-gradient {
          background: linear-gradient(to right, #F2A900, #F2E400);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .void-glass {
          background: rgba(26, 26, 32, 0.4);
          backdrop-filter: blur(20px);
        }
      `}} />
    </div>
  );
}
