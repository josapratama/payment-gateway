"use client";

import { useEffect, useState, use } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  QrCode,
  Building2,
  Wallet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface PaymentDetails {
  id: string;
  project: { name: string; slug: string };
  orderId: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  paymentMethod: string;
  paymentAccount: {
    provider: string;
    accountName: string;
    accountNumber: string;
    instructions?: string;
  } | null;
  qrisImage?: string | null;
  status: "PENDING" | "SETTLED" | "EXPIRED" | "CANCELLED";
  customerName?: string | null;
  description?: string | null;
  expiresAt: string;
  settledAt?: string | null;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const txId = resolvedParams.id;

  const [data, setData] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/v1/transactions/${txId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (json.data.status === "SETTLED") {
          setIsSuccess(true);
        }
      } else {
        setError(json.message || "Transaksi tidak ditemukan");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds while pending
    const interval = setInterval(() => {
      if (!isSuccess) {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [txId, isSuccess]);

  // Countdown Timer
  useEffect(() => {
    if (!data?.expiresAt || isSuccess) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(data.expiresAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        clearInterval(timer);
        return;
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        .toString()
        .padStart(2, "0");
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor((diff / 1000) % 60)
        .toString()
        .padStart(2, "0");

      setTimeLeft(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [data, isSuccess]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 font-medium">Memuat invoice pembayaran...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Invoice Tidak Ditemukan</h2>
          <p className="text-slate-400 text-sm">{error || "Silakan periksa kembali link invoice Anda."}</p>
        </div>
      </div>
    );
  }

  if (isSuccess || data.status === "SETTLED") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-emerald-500/10 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Pembayaran Berhasil!</h2>
          <p className="text-slate-300 text-sm mb-6">
            Pembayaran sebesar <span className="font-bold text-emerald-400">Rp {data.totalAmount.toLocaleString("id-ID")}</span> telah terverifikasi otomatis.
          </p>

          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">ID Transaksi</span>
              <span className="font-mono text-slate-300">{data.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID</span>
              <span className="font-mono text-slate-300">{data.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aplikasi</span>
              <span className="font-medium text-slate-300">{data.project.name}</span>
            </div>
          </div>

          <button
            onClick={() => window.close()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
          >
            <span>Tutup Jendela Ini</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative">
          <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Direct Gateway</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{data.project.name}</h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">{data.description || `Order #${data.orderId}`}</p>
        </div>

        {/* Timer Bar */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-amber-400 font-medium">
            <Clock className="w-4 h-4" />
            <span>Selesaikan dalam:</span>
          </div>
          <span className="font-mono font-bold text-amber-400 text-base">{timeLeft}</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Total Amount Box */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 text-center relative">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Yang Harus Ditransfer</span>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 my-2">
              <span className="text-2xl sm:text-4xl font-black text-blue-400 tracking-tight">
                Rp {data.totalAmount.toLocaleString("id-ID")}
              </span>
              <button
                onClick={() => copyToClipboard(data.totalAmount.toString(), "total")}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-slate-300 hover:text-white transition"
                title="Salin Total Nominal"
              >
                {copiedField === "total" ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="text-[11px] text-slate-400 flex justify-center gap-4 border-t border-slate-800/80 pt-2.5 mt-2">
              <span>Nominal: Rp {data.amount.toLocaleString("id-ID")}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">Kode Unik: +{data.uniqueCode}</span>
            </div>

            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-300/90 font-medium">
                PENTING: Transfer <strong>PERSIS Rp {data.totalAmount.toLocaleString("id-ID")}</strong> sampai digit terakhir agar sistem kami dapat memverifikasi pembayaran Anda secara <strong>otomatis dalam hitungan detik</strong>!
              </p>
            </div>
          </div>

          {/* Payment Method Details */}
          {data.paymentMethod === "QRIS" && data.qrisImage ? (
            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>Scan QRIS (Semua Bank & E-Wallet)</span>
              </div>

              <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
                <img src={data.qrisImage} alt="QRIS Dinamis" className="w-56 h-56 mx-auto object-contain" />
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Buka BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay, atau aplikasi m-Banking apa saja, lalu pilih menu <strong>Scan QRIS</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {data.paymentAccount?.provider === "DANA" || data.paymentAccount?.provider === "GOPAY" ? (
                  <Wallet className="w-4 h-4 text-blue-400" />
                ) : (
                  <Building2 className="w-4 h-4 text-blue-400" />
                )}
                <span>Instruksi {data.paymentMethod}</span>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Nomor Rekening / E-Wallet</div>
                  <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-wider mt-0.5 break-all">
                    {data.paymentAccount?.accountNumber}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">a/n {data.paymentAccount?.accountName}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(data.paymentAccount?.accountNumber || "", "account")}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
                >
                  {copiedField === "account" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedField === "account" ? "Tersalin" : "Salin Nomor"}</span>
                </button>
              </div>

              {data.paymentAccount?.instructions && (
                <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  {data.paymentAccount.instructions}
                </p>
              )}
            </div>
          )}

          {/* Status Live Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Menunggu pembayaran masuk... Halaman akan otomatis berpindah saat lunas.</span>
          </div>

        </div>

      </div>
    </div>
  );
}

