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
  ExternalLink,
} from "lucide-react";

interface PaymentAccount {
  id: string;
  type: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  instructions?: string | null;
  isDefault: boolean;
}

interface PaymentDetails {
  id: string;
  project: { name: string; slug: string };
  orderId: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  paymentMethod: string;
  paymentAccount: {
    type?: string;
    provider: string;
    accountName: string;
    accountNumber: string;
    instructions?: string;
  } | null;
  qrisImage?: string | null;
  status: "PENDING" | "SETTLED" | "EXPIRED" | "CANCELLED";
  customerName?: string | null;
  description?: string | null;
  metadata?: any;
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

  // Multi-method accounts state
  const [allAccounts, setAllAccounts] = useState<PaymentAccount[]>([]);
  const [activeCategory, setActiveCategory] = useState<"EWALLET" | "BANK" | "QRIS">("EWALLET");
  const [selectedProvider, setSelectedProvider] = useState<string>("DANA");

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

  // Fetch available accounts
  useEffect(() => {
    fetch("/api/v1/payment-methods")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setAllAccounts(res.data);
          const hasDana = res.data.find((a: PaymentAccount) => a.provider === "DANA");
          if (hasDana) {
            setSelectedProvider("DANA");
            setActiveCategory("EWALLET");
          } else if (res.data.length > 0) {
            setSelectedProvider(res.data[0].provider);
            if (res.data[0].type === "BANK_TRANSFER") setActiveCategory("BANK");
            else if (res.data[0].type === "QRIS") setActiveCategory("QRIS");
            else setActiveCategory("EWALLET");
          }
        }
      })
      .catch(console.error);
  }, []);

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

          {data.metadata?.returnUrl ? (
            <a
              href={data.metadata.returnUrl}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              <span>Lanjut Belajar di {data.project.name}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <button
              onClick={() => window.close()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
            >
              <span>Tutup Jendela Ini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Find active accounts by category
  const ewalletAccounts = allAccounts.filter((a) => a.type === "EWALLET");
  const bankAccounts = allAccounts.filter((a) => a.type === "BANK_TRANSFER");
  const qrisAccount = allAccounts.find((a) => a.type === "QRIS");

  // Get current active payment account to display
  const currentAccount =
    allAccounts.find((a) => a.provider === selectedProvider) ||
    data.paymentAccount ||
    allAccounts[0];

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
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
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

          {/* Interactive Method Tabs */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Pilih Cara Pembayaran:</span>
              <span className="text-[11px] text-blue-400 font-medium">Auto-verifikasi kode unik</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* E-Wallet Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("EWALLET");
                  setSelectedProvider("DANA");
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  activeCategory === "EWALLET"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Wallet className="w-5 h-5 text-blue-400" />
                <span className="text-xs">E-Wallet</span>
                <span className="text-[10px] text-blue-300 font-medium">DANA / GoPay</span>
              </button>

              {/* Bank Transfer Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("BANK");
                  setSelectedProvider(bankAccounts[0]?.provider || "BCA");
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  activeCategory === "BANK"
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Transfer Bank</span>
                <span className="text-[10px] text-indigo-300 font-medium">BCA / Mandiri / BRI</span>
              </button>

              {/* QRIS Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("QRIS");
                  setSelectedProvider("QRIS");
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  activeCategory === "QRIS"
                    ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <QrCode className="w-5 h-5 text-purple-400" />
                <span className="text-xs">QRIS</span>
                <span className="text-[10px] text-purple-300 font-medium">Scan QR</span>
              </button>
            </div>
          </div>

          {/* Sub-Providers Selection */}
          {activeCategory === "EWALLET" && ewalletAccounts.length > 1 && (
            <div className="flex gap-2">
              {ewalletAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedProvider(acc.provider)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    selectedProvider === acc.provider
                      ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{acc.provider}</span>
                </button>
              ))}
            </div>
          )}

          {activeCategory === "BANK" && bankAccounts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {bankAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedProvider(acc.provider)}
                  className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    selectedProvider === acc.provider
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{acc.provider}</span>
                </button>
              ))}
            </div>
          )}

          {/* Details Card */}
          {activeCategory === "QRIS" && data.qrisImage ? (
            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>Scan QRIS (Semua Bank & E-Wallet)</span>
              </div>

              <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
                <img src={data.qrisImage} alt="QRIS Dinamis" className="w-56 h-56 mx-auto object-contain" />
              </div>

              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Buka BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay, atau aplikasi m-Banking apa saja, lalu pilih menu <strong>Scan QRIS</strong>.
              </p>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-left text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block mb-1">Catatan Scan QRIS:</span>
                Jika QRIS mengalami kendala jaringan bank/merchant, silakan beralih ke tab <strong>E-Wallet (DANA)</strong> atau <strong>Transfer Bank</strong> di atas untuk transfer langsung dengan nomor rekening.
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  {(currentAccount as any)?.type === "EWALLET" || currentAccount?.provider === "DANA" || currentAccount?.provider === "GOPAY" ? (
                    <Wallet className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>
                    Instruksi Pembayaran {currentAccount?.provider}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Online 24 Jam
                </span>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {(currentAccount as any)?.type === "EWALLET" || currentAccount?.provider === "DANA" || currentAccount?.provider === "GOPAY" ? "Nomor Akun / HP" : "Nomor Rekening"} {currentAccount?.provider}
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-white tracking-wider mt-0.5 break-all">
                    {currentAccount?.accountNumber}
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    a/n {currentAccount?.accountName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentAccount?.accountNumber || "", "account")}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {copiedField === "account" ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedField === "account" ? "Tersalin!" : "Salin Nomor"}</span>
                </button>
              </div>

              {/* Petunjuk Langkah Transfer */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <span>Cara Transfer {currentAccount?.provider}:</span>
                </div>
                {currentAccount?.provider === "DANA" ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Buka aplikasi <strong>DANA</strong> di HP Anda.</li>
                    <li>Pilih menu <strong>Kirim</strong> (Send) &rarr; pilih <strong>Kirim ke Nomor Telepon</strong>.</li>
                    <li>Ketik/tempel nomor DANA: <strong className="text-white font-mono">{currentAccount.accountNumber}</strong> ({currentAccount.accountName}).</li>
                    <li>Masukkan nominal PERSIS: <strong className="text-blue-400 font-mono">Rp {data.totalAmount.toLocaleString("id-ID")}</strong>.</li>
                    <li>Konfirmasi dan kirim. Transaksi akan terverifikasi otomatis dalam 10 detik!</li>
                  </ol>
                ) : currentAccount?.provider === "GOPAY" ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Buka aplikasi <strong>Gojek / GoPay</strong> di HP Anda.</li>
                    <li>Pilih menu <strong>Kirim</strong> / <strong>Bayar</strong> &rarr; pilih nomor HP.</li>
                    <li>Masukkan nomor GoPay: <strong className="text-white font-mono">{currentAccount.accountNumber}</strong>.</li>
                    <li>Masukkan nominal PERSIS: <strong className="text-blue-400 font-mono">Rp {data.totalAmount.toLocaleString("id-ID")}</strong>.</li>
                    <li>Selesaikan transfer. Sistem akan otomatis memproses pesanan Anda.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Buka m-Banking {currentAccount?.provider} atau kunjungi ATM terdekat.</li>
                    <li>Pilih menu <strong>Transfer</strong> &rarr; masukkan rekening <strong className="text-white font-mono">{currentAccount?.accountNumber}</strong>.</li>
                    <li>Periksa nama penerima: <strong className="text-white">{currentAccount?.accountName}</strong>.</li>
                    <li>Masukkan nominal transfer PERSIS: <strong className="text-blue-400 font-mono">Rp {data.totalAmount.toLocaleString("id-ID")}</strong>.</li>
                    <li>Konfirmasi transfer. Kursus/layanan Anda akan langsung aktif!</li>
                  </ol>
                )}
              </div>
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
