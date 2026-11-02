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
  Edit2,
  Save,
  X,
  CreditCard,
} from "lucide-react";

interface Stats {
  totalRevenue: number;
  settledCount: number;
  pendingCount: number;
  mutationsCount: number;
}

interface PaymentAccount {
  id: string;
  type: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  qrisContent?: string | null;
  instructions?: string | null;
  isActive: boolean;
  isDefault: boolean;
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
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "mutations" | "accounts" | "api">("transactions");
  const [loading, setLoading] = useState(true);

  // Quick Simulation Form
  const [simProvider, setSimProvider] = useState("BCA");
  const [simAmount, setSimAmount] = useState("");
  const [simDesc, setSimDesc] = useState("Transfer M-Banking");
  const [simResult, setSimResult] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Edit Account State
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [txRes, mutRes, accRes] = await Promise.all([
        fetch("/api/admin/transactions"),
        fetch("/api/v1/mutations", {
          headers: { "x-admin-key": "pay-admin-secret-2026" },
        }),
        fetch("/api/admin/accounts"),
      ]);

      const txJson = await txRes.json();
      const mutJson = await mutRes.json();
      const accJson = await accRes.json();

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

      if (accJson.success) {
        setAccounts(accJson.data);
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

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    setSaveLoading(true);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAccount),
      });

      const json = await res.json();
      if (json.success) {
        setEditingAccount(null);
        loadData();
      } else {
        alert(json.message || "Gagal menyimpan akun");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaveLoading(false);
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
        <div className="flex border-b border-slate-800 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "transactions"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Daftar Transaksi ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("mutations")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "mutations"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Riwayat Mutasi Bank ({mutations.length})
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "accounts"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            ⚙️ Rekening & E-Wallet Tujuan ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "api"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Panduan Integrasi API
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

        {/* Tab 3: Payment Accounts Management */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span>Rekening & E-Wallet Tujuan Transfer</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Uang yang ditransfer oleh pembeli akan <strong>100% langsung masuk ke rekening / nomor HP yang Anda cantumkan di bawah ini</strong>. Klik &quot;Edit&quot; untuk mengganti dengan nomor asli Anda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((acc) => (
                  <div key={acc.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-white flex items-center gap-2">
                          {acc.type === "QRIS" ? (
                            <QrCode className="w-4 h-4 text-blue-400" />
                          ) : acc.type === "EWALLET" ? (
                            <Wallet className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Building2 className="w-4 h-4 text-emerald-400" />
                          )}
                          <span>{acc.provider}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${acc.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                          {acc.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          {acc.type === "QRIS" ? "ID Merchant QRIS" : "Nomor Rekening / No HP"}
                        </div>
                        <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">
                          {acc.accountNumber}
                        </div>
                        <div className="text-xs text-slate-300 mt-1">a/n {acc.accountName}</div>
                      </div>

                      {acc.instructions && (
                        <p className="text-[11px] text-slate-500 mt-3 line-clamp-2">
                          {acc.instructions}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setEditingAccount(acc)}
                      className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-xs py-2 rounded-xl text-slate-200 font-semibold border border-slate-800 flex items-center justify-center gap-1.5 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Ubah Rekening Ini</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: API Guide */}
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
const res = await fetch("https://pay.josapratama.com/api/v1/transactions/create", {
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

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingAccount(null)}
              className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <span>Ubah Informasi {editingAccount.provider}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Ubah nomor rekening atau nomor DANA tujuan agar uang transfer siswa langsung masuk ke akun asli Anda.
            </p>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pemilik Rekening / Akun (a/n):
                </label>
                <input
                  type="text"
                  value={editingAccount.accountName}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, accountName: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingAccount.type === "QRIS" ? "ID Merchant QRIS:" : "Nomor Rekening / Nomor HP DANA / GoPay:"}
                </label>
                <input
                  type="text"
                  value={editingAccount.accountNumber}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, accountNumber: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {editingAccount.type === "QRIS" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    String Kode QRIS Statis Toko Anda:
                  </label>
                  <textarea
                    rows={3}
                    value={editingAccount.qrisContent || ""}
                    onChange={(e) =>
                      setEditingAccount({ ...editingAccount, qrisContent: e.target.value })
                    }
                    placeholder="Contoh: 00020101021126590014..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Dapatkan string ini dengan cara scan QRIS toko Anda menggunakan aplikasi pembaca QR biasa.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Petunjuk / Instruksi Transfer untuk Pembeli:
                </label>
                <textarea
                  rows={2}
                  value={editingAccount.instructions || ""}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, instructions: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
