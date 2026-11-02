"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  QrCode,
  Building2,
  Wallet,
  Shield,
  Code2,
  Search,
} from "lucide-react";

interface Stats {
  totalRevenue: number;
  settledCount: number;
  pendingCount: number;
  mutationsCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    settledCount: 0,
    pendingCount: 0,
    mutationsCount: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [mutations, setMutations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "mutations" | "api">("transactions");
  const [loading, setLoading] = useState(true);

  // Quick Simulation Form
  const [simProvider, setSimProvider] = useState("BCA");
  const [simAmount, setSimAmount] = useState("");
  const [simDesc, setSimDesc] = useState("Transfer M-Banking");
  const [simResult, setSimResult] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [txRes, mutRes] = await Promise.all([
        fetch("/api/admin/transactions"),
        fetch("/api/v1/mutations", {
          headers: { "x-admin-key": "pay-admin-secret-2026" },
        }),
      ]);

      const txJson = await txRes.json();
      const mutJson = await mutRes.json();

      if (txJson.success) {
        setTransactions(txJson.data);
        const settled = txJson.data.filter((t: any) => t.status === "SETTLED");
        const pending = txJson.data.filter((t: any) => t.status === "PENDING");
        const rev = settled.reduce((sum: number, t: any) => sum + t.totalAmount, 0);

        setStats((prev) => ({
          ...prev,
          totalRevenue: rev,
          settledCount: settled.length,
          pendingCount: pending.length,
        }));
      }

      if (mutJson.success) {
        setMutations(mutJson.data);
        setStats((prev) => ({
          ...prev,
          mutationsCount: mutJson.data.length,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAmount) return;

    setSimLoading(true);
    setSimResult(null);

    try {
      const res = await fetch("/api/v1/mutations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": "pay-admin-secret-2026",
        },
        body: JSON.stringify({
          provider: simProvider,
          amount: Number(simAmount),
          description: simDesc,
          type: "CR",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSimResult(json.message);
        setSimAmount("");
        loadData();
      } else {
        setSimResult(`Gagal: ${json.message}`);
      }
    } catch (e: any) {
      setSimResult(`Error: ${e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const copyText = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Navbar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black">
                PG
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>PayGateway Hub</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Self-Hosted
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Direct Multi-Tenant Payment Engine (Bank, DANA, GoPay, QRIS)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pendapatan</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-3">
              Rp {stats.totalRevenue.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">100% langsung ke rekening Anda (0% fee)</p>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaksi Lunas</span>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-3">
              {stats.settledCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Terverifikasi otomatis via kode unik</p>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Menunggu Pembayaran</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-3">
              {stats.pendingCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sedang aktif dalam window 3 jam</p>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mutasi Terdeteksi</span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-3">
              {stats.mutationsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total riwayat mutasi bank & e-wallet</p>
          </div>
        </div>

        {/* Quick Simulation Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚡ Test & Simulasi Mutasi Masuk (Instant Auto-Match)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ketikkan nominal yang sedang pending di bawah untuk menguji auto-match dan pengiriman webhook secara instan.
              </p>
            </div>

            <form onSubmit={handleSimulateMutation} className="flex flex-wrap items-center gap-3">
              <select
                value={simProvider}
                onChange={(e) => setSimProvider(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
              >
                <option value="BCA">Bank BCA</option>
                <option value="MANDIRI">Bank Mandiri</option>
                <option value="BRI">Bank BRI</option>
                <option value="DANA">DANA</option>
                <option value="GOPAY">GoPay</option>
                <option value="QRIS">QRIS</option>
              </select>

              <input
                type="number"
                placeholder="Nominal (cth: 150342)"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
                required
              />

              <button
                type="submit"
                disabled={simLoading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Simulasikan Uang Masuk</span>
              </button>
            </form>
          </div>

          {simResult && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-400">
              {simResult}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === "transactions"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Daftar Transaksi ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("mutations")}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === "mutations"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Riwayat Mutasi Bank ({mutations.length})
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === "api"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Panduan Integrasi API (Learnify / VPS / WhatsApp)
          </button>
        </div>

        {/* Tab 1: Transactions */}
        {activeTab === "transactions" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">ID Transaksi / Waktu</th>
                    <th className="p-4">Aplikasi</th>
                    <th className="p-4">Metode</th>
                    <th className="p-4">Nominal Asli</th>
                    <th className="p-4">Kode Unik</th>
                    <th className="p-4 font-bold text-white">Total Tagihan</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Belum ada transaksi. Silakan buat transaksi dari Learnify atau gunakan API.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4 font-mono">
                          <div className="text-white font-bold">{tx.id}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(tx.createdAt).toLocaleString("id-ID")}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                            {tx.project?.name || "App"}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-200">{tx.paymentMethod}</td>
                        <td className="p-4 text-slate-400">Rp {tx.amount.toLocaleString("id-ID")}</td>
                        <td className="p-4 text-amber-400 font-mono">+{tx.uniqueCode}</td>
                        <td className="p-4 font-black text-emerald-400 text-sm">
                          Rp {tx.totalAmount.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              tx.status === "SETTLED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : tx.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <a
                            href={`/pay/${tx.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
                          >
                            <span>Buka Invoice</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Mutations */}
        {activeTab === "mutations" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Waktu</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Keterangan</th>
                    <th className="p-4">Nominal</th>
                    <th className="p-4">Match Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {mutations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Belum ada mutasi yang masuk.
                      </td>
                    </tr>
                  ) : (
                    mutations.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4 text-slate-500 font-mono">
                          {new Date(m.createdAt).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 font-bold text-white">{m.provider}</td>
                        <td className="p-4 text-slate-300 max-w-xs truncate">{m.description}</td>
                        <td className="p-4 font-black text-emerald-400">
                          +Rp {m.amount.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4">
                          {m.isMatched ? (
                            <span className="text-emerald-400 font-mono text-[11px] font-bold">
                              ✓ Matched with {m.matchedTxId}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Belum / Tidak Cocok</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: API Guide */}
        {activeTab === "api" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Panduan Integrasi untuk Learnify, VPS, dan WABridge</h2>
              <p className="text-sm text-slate-400 mt-1">
                Gunakan API di bawah untuk membuat invoice otomatis dari project manapun.
              </p>
            </div>

            {/* API Keys Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold">Project: Learnify</div>
                <div className="font-mono text-xs text-blue-400 font-bold mt-1 truncate">pay_sec_learnify_2026</div>
                <button
                  onClick={() => copyText("pay_sec_learnify_2026", "learnify")}
                  className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-xs py-1.5 rounded-lg text-slate-300 font-semibold transition"
                >
                  {copiedKey === "learnify" ? "Tersalin!" : "Salin API Key"}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold">Project: Mini VPS</div>
                <div className="font-mono text-xs text-indigo-400 font-bold mt-1 truncate">pay_sec_vps_2026</div>
                <button
                  onClick={() => copyText("pay_sec_vps_2026", "vps")}
                  className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-xs py-1.5 rounded-lg text-slate-300 font-semibold transition"
                >
                  {copiedKey === "vps" ? "Tersalin!" : "Salin API Key"}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold">Project: WABridge (WhatsApp)</div>
                <div className="font-mono text-xs text-emerald-400 font-bold mt-1 truncate">pay_sec_wabridge_2026</div>
                <button
                  onClick={() => copyText("pay_sec_wabridge_2026", "wabridge")}
                  className="mt-3 w-full bg-slate-900 hover:bg-slate-800 text-xs py-1.5 rounded-lg text-slate-300 font-semibold transition"
                >
                  {copiedKey === "wabridge" ? "Tersalin!" : "Salin API Key"}
                </button>
              </div>
            </div>

            {/* Code Snippet */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span>Contoh Request Pembuatan Invoice (TypeScript / Node.js)</span>
              </h4>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <pre>{`// Panggil dari Learnify saat Siswa Checkout Kursus:
const res = await fetch("http://localhost:3005/api/v1/transactions/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "pay_sec_learnify_2026",
  },
  body: JSON.stringify({
    orderId: "ORDER-101",
    amount: 150000,
    paymentMethod: "QRIS", // atau "BCA", "MANDIRI", "DANA", "GOPAY"
    customerName: "Budi Santoso",
    customerEmail: "budi@gmail.com",
    description: "Kursus Laravel PHP Fullstack",
  }),
});

const data = await res.json();
// Redirect siswa ke URL invoice otomatis:
window.location.href = data.data.checkoutUrl;`}</pre>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
