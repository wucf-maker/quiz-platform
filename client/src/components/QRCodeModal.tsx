import { trpc } from "@/lib/trpc";
import { X, Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  assessmentId: number;
  title: string;
  onClose: () => void;
}

export default function QRCodeModal({ assessmentId, title, onClose }: Props) {
  const origin = window.location.origin;
  const { data, isLoading } = trpc.assessment.getQrCode.useQuery({
    id: assessmentId,
    origin,
  });

  const handleCopy = () => {
    if (data?.shareUrl) {
      navigator.clipboard.writeText(data.shareUrl);
      toast.success("連結已複製！");
    }
  };

  const handleDownload = () => {
    if (!data?.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = data.qrDataUrl;
    link.download = `qrcode-${title}.png`;
    link.click();
    toast.success("QR Code 已下載！");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,26,26,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="memphis-card w-full max-w-sm p-8 relative text-center">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#FF8C7A] transition-colors"
        >
          <X size={16} />
        </button>

        <h2 className="memphis-heading text-2xl mb-1">{title}</h2>
        <p className="text-sm font-semibold text-[#1A1A1A]/60 mb-6">
          學生掃描以下 QR Code 即可作答
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          {isLoading ? (
            <div
              className="w-48 h-48 flex items-center justify-center"
              style={{
                border: "4px solid #1A1A1A",
                borderRadius: 16,
                background: "#F5F5F5",
              }}
            >
              <div className="w-8 h-8 border-4 border-[#D4C5F9] border-t-[#1A1A1A] rounded-full animate-spin" />
            </div>
          ) : data?.qrDataUrl ? (
            <div
              style={{
                padding: 12,
                border: "4px solid #1A1A1A",
                borderRadius: 16,
                background: "white",
                boxShadow: "6px 6px 0 #1A1A1A",
              }}
            >
              <img
                src={data.qrDataUrl}
                alt="QR Code"
                className="w-44 h-44 block"
              />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-[#1A1A1A]/40 font-bold">
              無法生成 QR Code
            </div>
          )}
        </div>

        {/* Share URL */}
        {data?.shareUrl && (
          <div
            className="flex items-center gap-2 p-3 mb-6 text-xs font-bold text-[#1A1A1A]/70 break-all"
            style={{
              background: "#FFF3A3",
              border: "2px solid #1A1A1A",
              borderRadius: 10,
            }}
          >
            <ExternalLink size={14} className="shrink-0" />
            <span className="flex-1 text-left">{data.shareUrl}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 memphis-btn-mint flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Copy size={16} />
            複製連結
          </button>
          <button
            onClick={handleDownload}
            disabled={!data?.qrDataUrl}
            className="flex-1 memphis-btn flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
          >
            <Download size={16} />
            下載
          </button>
        </div>
      </div>
    </div>
  );
}
