import React, { useState, useEffect } from "react";
import { Shield, Trash2, Plus, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { adminRequest } from "../../lib/api";

interface BlockedIp {
  id: number;
  ipAddress: string;
  blockedUntil: string;
  reason: string | null;
  createdAt: string;
}

export default function AdminSecurity() {
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newDuration, setNewDuration] = useState("3650");
  const [showForm, setShowForm] = useState(false);

  const fetchBlockedIps = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminRequest("/api/admin/blocked-ips");
      setBlockedIps(data || []);
    } catch (e: any) {
      setError(e.message || "Veri alinamadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlockedIps(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    setAdding(true);
    try {
      await adminRequest("/api/admin/blocked-ips", {
        method: "POST",
        body: JSON.stringify({ ipAddress: newIp.trim(), reason: newReason.trim() || "Manuel engel (admin)", durationDays: Number(newDuration) }),
      });
      setNewIp(""); setNewReason(""); setNewDuration("3650"); setShowForm(false);
      fetchBlockedIps();
    } catch (e: any) {
      setError(e.message || "IP eklenemedi");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu IP engelini kaldirmak istediginizden emin misiniz?")) return;
    try {
      await adminRequest(`/api/admin/blocked-ips/${id}`, { method: "DELETE" });
      setBlockedIps(prev => prev.filter(ip => ip.id !== id));
    } catch (e: any) {
      setError(e.message || "Silinemedi");
    }
  };

  const isPermanent = (until: string) => new Date(until).getFullYear() > new Date().getFullYear() + 5;
  const isExpired  = (until: string) => new Date(until) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg"><Shield className="w-6 h-6 text-red-600" /></div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Guvenlik &mdash; IP Engelleme</h1>
            <p className="text-sm text-gray-500">Engellenen IP adresleri veritabaninda kalici olarak saklanir.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBlockedIps} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" /> IP Engelle
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Yeni IP Engeli Ekle</h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1">IP Adresi *</label>
              <input type="text" value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="Orn: 192.168.1.100" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1">Sebep</label>
              <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Engel sebebi (istege bagli)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="w-40">
              <label className="block text-xs text-gray-500 mb-1">Sure (Gun)</label>
              <select value={newDuration} onChange={e => setNewDuration(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="1">1 Gun</option>
                <option value="7">7 Gun</option>
                <option value="30">30 Gun</option>
                <option value="90">90 Gun</option>
                <option value="365">1 Yil</option>
                <option value="3650">Kalici (10 Yil)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={adding} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {adding ? "Ekleniyor..." : "Engelle"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                Iptal
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Engellenen IP Listesi</h2>
          <span className="text-xs text-gray-400">{blockedIps.length} kayit</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Yukleniyor...</div>
        ) : blockedIps.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Henuz engellenmis IP adresi yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">IP Adresi</th>
                  <th className="px-4 py-3 text-left">Sebep</th>
                  <th className="px-4 py-3 text-left">Bitis Tarihi</th>
                  <th className="px-4 py-3 text-left">Eklenme</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-right">Islem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {blockedIps.map(ip => (
                  <tr key={ip.id} className={`hover:bg-gray-50 transition-colors ${isExpired(ip.blockedUntil) ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-mono text-gray-900 font-semibold">{ip.ipAddress}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{ip.reason || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {isPermanent(ip.blockedUntil) ? <span className="text-red-600 font-medium">Kalici</span> : new Date(ip.blockedUntil).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(ip.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3">
                      {isExpired(ip.blockedUntil) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                          <Clock className="w-3 h-3" /> Suresi Dolmus
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                          <Shield className="w-3 h-3" /> Aktif Engel
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(ip.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Engeli kaldir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
