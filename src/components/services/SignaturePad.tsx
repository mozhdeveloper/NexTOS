import { useRef, useEffect } from "react";

interface SignaturePadProps {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  caption: string;
}

export function SignaturePad({ label, value, onChange, caption }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawing = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = "#111827";
                ctx.lineWidth = 2.5;
                ctx.lineCap = "round";
            }
        }
    }, []);

    const start = (e: React.PointerEvent) => {
        isDrawing.current = true;
        const rect = canvasRef.current!.getBoundingClientRect();
        const ctx = canvasRef.current!.getContext("2d")!;
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        canvasRef.current!.setPointerCapture(e.pointerId);
    };

    const move = (e: React.PointerEvent) => {
        if (!isDrawing.current) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const ctx = canvasRef.current!.getContext("2d")!;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const end = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        onChange(canvasRef.current!.toDataURL());
    };

    const reset = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onChange("");
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>
                <button onClick={reset} className="text-[9px] font-black text-[#66B2B2] hover:underline underline-offset-2">Reset Pad</button>
            </div>
            <div className="relative group">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={150}
                    onPointerDown={start}
                    onPointerMove={move}
                    onPointerUp={end}
                    className="w-full h-28 border border-gray-200 rounded-xl bg-white touch-none cursor-crosshair shadow-inner"
                />
                {value && <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-full uppercase">Captured</div>}
            </div>
            <p className="text-[10px] text-gray-400 italic ml-1">{caption}</p>
        </div>
    );
}
