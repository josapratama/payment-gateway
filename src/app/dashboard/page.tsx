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
  Key,
  Eye,
  EyeOff,
  Layers,
  Globe,
  Sparkles,
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

interface Project {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  webhookUrl?: string | null;
  webhookSecret: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    transactions: number;
  };
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<
    "transactions" | "mutations" | "accounts" | "projects" | "api"
  >("transactions");
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

  // New Project State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectWebhook, setNewProjectWebhook] = useState("");
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [createdProjectResult, setCreatedProjectResult] = useState<Project | null>(null);

  // Show/Hide Keys State
  const [revealedKeys, setRevealedKeys] = useState<{ [id: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleKeyReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const loadData = async () => {
    try {
      const [txRes, mutRes, accRes, projRes] = await Promise.all([
        fetch("/api/admin/transactions"),
        fetch("/api/v1/mutations", {
          headers: { "x-admin-key": "pay-admin-secret-2026" },
        }),
        fetch("/api/admin/accounts"),
        fetch("/api/admin/projects"),
      ]);

      const txJson = await txRes.json();
      const mutJson = await mutRes.json();
      const accJson = await accRes.json();
      const projJson = await projRes.json();

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

      if (projJson.success) {
        setProjects(projJson.data);
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreateProjectLoading(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          webhookUrl: newProjectWebhook.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreatedProjectResult(json.data);
        setNewProjectName("");
        setNewProjectWebhook("");
        loadData();
      } else {
        alert(json.message || "Gagal membuat project");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreateProjectLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20 text-white">
              PG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">PayGateway Hub</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  Self-Hosted Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct Multi-Tenant Payment Engine (Bank, DANA, GoPay, QRIS) — 100% Direct Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pendapatan</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-3">
              Rp {stats.totalRevenue.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">100% langsung ke rekening Anda (0% fee)</p>
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
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Simulasikan Uang Masuk</span>
              </button>
            </form>
          </div>

          {simResult && (
            <div className="mt-4 p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{simResult}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap px-1 ${
              activeTab === "transactions"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Daftar Transaksi ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("mutations")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap px-1 ${
              activeTab === "mutations"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Riwayat Mutasi Bank ({mutations.length})
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap px-1 ${
              activeTab === "accounts"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            ⚙️ Rekening & E-Wallet Tujuan ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap px-1 ${
              activeTab === "projects"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            🔑 Project & API Keys ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap px-1 ${
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
                          {tx.status === "SETTLED" ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> LUNAS
                            </span>
                          ) : tx.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              <Clock className="w-3 h-3" /> PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              EXPIRED
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <a
                            href={`/pay/${tx.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-[11px] font-bold transition border border-blue-500/30"
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
                    <th className="p-4">Bank / Provider</th>
                    <th className="p-4">Keterangan Transfer</th>
                    <th className="p-4 font-bold text-white">Nominal Mutasi</th>
                    <th className="p-4">Status Auto-Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {mutations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Belum ada mutasi terdeteksi. Gunakan form simulasi di atas untuk menguji mutasi.
                      </td>
                    </tr>
                  ) : (
                    mutations.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4 font-mono text-slate-400">
                          {new Date(m.createdAt).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 font-bold text-slate-200">{m.provider}</td>
                        <td className="p-4 text-slate-300 font-mono text-[11px]">{m.description}</td>
                        <td className="p-4 font-black text-emerald-400 text-sm">
                          + Rp {m.amount.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4">
                          {m.isMatched ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> MATCHED ({m.matchedTransactionId})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              Belum Cocok
                            </span>
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

        {/* Tab 3: Payment Accounts */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span>Daftar Rekening ATM & E-Wallet Tujuan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Uang pembayaran dari pembeli akan <strong>100% langsung ditransfer ke rekening di bawah ini</strong>. Klik "Ubah" untuk memperbarui nomor rekening atau nomor HP DANA Anda.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 relative flex flex-col justify-between hover:border-blue-500/40 transition group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-black text-blue-400 text-xs">
                          {acc.type === "QRIS" ? (
                            <QrCode className="w-5 h-5" />
                          ) : acc.type === "EWALLET" ? (
                            <Wallet className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{acc.provider}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.type}</div>
                        </div>
                      </div>

                      {acc.isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2 mb-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-slate-400">Atas Nama:</span>
                        <div className="text-xs font-bold text-white">{acc.accountName}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-slate-400">
                          {acc.type === "QRIS" ? "ID Merchant QRIS:" : "Nomor Rekening / HP:"}
                        </span>
                        <div className="text-sm font-mono font-bold text-blue-400 tracking-wider">
                          {acc.accountNumber}
                        </div>
                      </div>
                    </div>

                    {acc.instructions && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic mb-4">
                        "{acc.instructions}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingAccount(acc)}
                    className="w-full bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah Rekening Ini</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Projects & API Keys */}
        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  <span>Kelola Project & API Keys</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Setiap website atau aplikasi (seperti Learnify, Mini VPS, WhatsApp, Toko Online) menggunakan <strong>API Key unik</strong> untuk membuat invoice pembayaran.
                </p>
              </div>

              <button
                onClick={() => {
                  setCreatedProjectResult(null);
                  setIsNewProjectModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tambah Project Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-400 text-xs">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{proj.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">slug: {proj.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {proj._count?.transactions || 0} Transaksi
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      </div>
                    </div>

                    {/* API Key Box */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-400" /> API Key:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleKeyReveal(proj.id + "_key")}
                            className="text-slate-400 hover:text-white p-1 rounded-md transition"
                            title="Tampilkan/Sembunyikan"
                          >
                            {revealedKeys[proj.id + "_key"] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(proj.apiKey, proj.id + "_key")}
                            className="text-slate-400 hover:text-white p-1 rounded-md transition"
                            title="Salin API Key"
                          >
                            {copiedKey === proj.id + "_key" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-xs text-amber-300 break-all select-all font-semibold">
                        {revealedKeys[proj.id + "_key"]
                          ? proj.apiKey
                          : proj.apiKey.slice(0, 10) + "•".repeat(16) + proj.apiKey.slice(-4)}
                      </div>
                    </div>

                    {/* Webhook Secret Box */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-400" /> Webhook Secret:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleKeyReveal(proj.id + "_wh")}
                            className="text-slate-400 hover:text-white p-1 rounded-md transition"
                            title="Tampilkan/Sembunyikan"
                          >
                            {revealedKeys[proj.id + "_wh"] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(proj.webhookSecret, proj.id + "_wh")}
                            className="text-slate-400 hover:text-white p-1 rounded-md transition"
                            title="Salin Webhook Secret"
                          >
                            {copiedKey === proj.id + "_wh" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-xs text-blue-300 break-all select-all font-semibold">
                        {revealedKeys[proj.id + "_wh"]
                          ? proj.webhookSecret
                          : proj.webhookSecret.slice(0, 8) + "•".repeat(18) + proj.webhookSecret.slice(-4)}
                      </div>
                    </div>

                    {/* Webhook Target URL */}
                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Target Callback Webhook:</span>
                      <div className="font-mono text-slate-300 text-[11px] truncate mt-0.5">
                        {proj.webhookUrl || <span className="text-slate-600 italic">Belum dikonfigurasi (Polling mode)</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: API Documentation */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                <span>Dokumentasi Integrasi API (Learnify / VPS / WhatsApp / Web Eksternal)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Gunakan REST API berikut untuk membuat invoice tagihan secara otomatis dari backend bahasa apa pun (Node.js, PHP/Laravel, Python, Go, dll).
              </p>

              {/* Endpoint 1 */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">POST</span>
                  <span className="text-white font-bold">https://pay.josapratama.com/api/v1/transactions/create</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-x-auto space-y-3">
                  <div className="text-slate-500">// Headers</div>
                  <div className="text-blue-400">
                    Content-Type: application/json<br />
                    x-api-key: pay_live_projectanda_xxxx (Ambil dari tab "Project &amp; API Keys")
                  </div>

                  <div className="text-slate-500">// Request Body (JSON)</div>
                  <pre className="text-emerald-400">
{`{
  "orderId": "ORD-2026-9901",
  "amount": 150000,
  "customerName": "Budi Santoso",
  "customerEmail": "budi@gmail.com",
  "customerPhone": "081234567890",
  "paymentMethod": "BCA" // BCA | MANDIRI | BRI | DANA | GOPAY | QRIS
}`}
                  </pre>

                  <div className="text-slate-500">// Response Sukses (200 OK)</div>
                  <pre className="text-amber-300">
{`{
  "success": true,
  "data": {
    "id": "TRX-MVZ6XXXX-YYYY",
    "orderId": "ORD-2026-9901",
    "amount": 150000,
    "uniqueCode": 342,
    "totalAmount": 150342, // Total yang wajib ditransfer
    "paymentMethod": "BCA",
    "status": "PENDING",
    "paymentUrl": "https://pay.josapratama.com/pay/TRX-MVZ6XXXX-YYYY",
    "expiredAt": "2026-11-02T13:30:00.000Z"
  }
}`}
                  </pre>
                </div>
              </div>

              {/* Endpoint 2: Webhook Callback */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Webhook Callback Otomatis Saat Dana Masuk</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Saat mutasi rekening/DANA Anda mendeteksi dana masuk sebesar total tagihan, PayGateway akan langsung menembakkan POST ke URL webhook project Anda:
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 overflow-x-auto space-y-2">
                  <div className="text-blue-400">
                    Header Signature: x-callback-signature: sha256_hmac_hex
                  </div>
                  <pre className="text-emerald-400">
{`{
  "event": "payment.settled",
  "transactionId": "TRX-MVZ6XXXX-YYYY",
  "orderId": "ORD-2026-9901",
  "amount": 150000,
  "uniqueCode": 342,
  "totalAmount": 150342,
  "paymentMethod": "BCA",
  "status": "SETTLED",
  "settledAt": "2026-11-02T10:15:30.000Z"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal: Tambah Project Baru */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsNewProjectModalOpen(false);
                setCreatedProjectResult(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {!createdProjectResult ? (
              <form onSubmit={handleCreateProject} className="space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Tambah Project Baru</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Buat kredensial API Key untuk menghubungkan website atau aplikasi baru ke PayGateway.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Project / Aplikasi:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Toko Online Budi / Donasi Peduli"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Webhook Callback URL (Opsional):
                  </label>
                  <input
                    type="url"
                    placeholder="Contoh: https://tokobudi.com/api/payment/callback"
                    value={newProjectWebhook}
                    onChange={(e) => setNewProjectWebhook(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    URL endpoint di server Anda yang akan dipanggil secara otomatis saat pembayaran berhasil diverifikasi.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectLoading}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
                  >
                    {createProjectLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Buat &amp; Generate Kredensial</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Project Berhasil Dibuat!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Simpan API Key dan Webhook Secret di bawah untuk menghubungkan aplikasi Anda.
                  </p>
                </div>

                <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Nama Project:</span>
                    <div className="text-xs font-bold text-white">{createdProjectResult.name}</div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">API Key:</span>
                    <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5 mt-1">
                      <code className="text-xs font-mono text-amber-300 break-all select-all font-bold">
                        {createdProjectResult.apiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdProjectResult.apiKey, "new_key")}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition shrink-0"
                        title="Salin"
                      >
                        {copiedKey === "new_key" ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Webhook Secret:</span>
                    <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5 mt-1">
                      <code className="text-xs font-mono text-blue-300 break-all select-all font-bold">
                        {createdProjectResult.webhookSecret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdProjectResult.webhookSecret, "new_wh")}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition shrink-0"
                        title="Salin"
                      >
                        {copiedKey === "new_wh" ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsNewProjectModalOpen(false);
                    setCreatedProjectResult(null);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Selesai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Payment Account */}
      {editingAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingAccount(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ubah Rekening {editingAccount.provider}</h3>
                <p className="text-xs text-slate-400">
                  Ubah data nomor rekening atau e-wallet tujuan transfer
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pemilik Rekening / Akun:
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
