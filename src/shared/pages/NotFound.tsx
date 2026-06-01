import { Button } from "@/shared/components/ui/button";
import { Link } from "react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-sm text-gray-500 mb-6">Module not found in system</p>
        <Button
          asChild
          className="h-9 bg-[#66B2B2] hover:bg-[#66B2B2]/80 text-white font-bold text-sm"
        >
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

