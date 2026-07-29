import React, { useState, useEffect, useRef } from 'react';
import { 
  HeartPulse, Database, Server, RefreshCw, Terminal, Activity, 
  CheckCircle, AlertTriangle, Cpu, Clock, Search 
} from 'lucide-react';
import { adminRequest } from '../../lib/api';

interface LogItem {
  time: string;
  type: 'log' | 'error';
  message: string;
}

interface SystemHealthData {
  status: 'ok' | 'degraded';
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  platform: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  loadAvg: number[];
  db: 'up' | 'down';
  dbError: string | null;
  pid: number;
  node: string;
  logs: LogItem[];
}

export default function AdminSystemHealth() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'log' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const fetchHealth = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await adminRequest('/api/admin/system/health');
      if (res) {
        setData(res);
        setError('');
      } else {
        throw new Error('Yanıt alınamadı');
      }
    } catch (e: any) {
      setError(e.message || 'Sistem durum verileri yüklenemedi.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHealth(true);
  }, []);

  // Auto refresh interval (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Auto scroll to bottom of logs
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.logs, autoScroll]);

  // Format bytes to human readable
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format uptime to readable string
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d} gün`);
    if (h > 0) parts.push(`${h} saat`);
    if (m > 0) parts.push(`${m} dk`);
    parts.push(`${s} sn`);
    return parts.join(' ');
  };

  // Filter logs based on search and log filter type
  const logsList = Array.isArray(data?.logs) ? data.logs : [];
  const filteredLogs = logsList.filter(log => {
    const matchesSearch = (log.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = logFilter === 'all' || log.type === logFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <HeartPulse className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sistem Sağlık Durumu</h1>
            <p className="text-sm text-gray-500">
              Sunucu performansı, veritabanı bağlantısı ve gerçek zamanlı sistem günlükleri (loglar).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer shadow-sm">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={e => setAutoRefresh(e.target.checked)} 
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            Otomatik Yenile (5sn)
          </label>
          <button 
            onClick={() => fetchHealth(true)} 
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 h-5 text-red-500 mr-2" />
            <span className="text-sm font-medium text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DB Status */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Veritabanı</p>
              <h3 className="text-lg font-bold text-gray-800 mt-1">
                {data?.db === 'up' ? 'Bağlantı Aktif' : 'Bağlantı Koptu'}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${data?.db === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
            {data?.db === 'up' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">Sorunsuz çalışıyor</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 font-medium truncate max-w-[180px]" title={data?.dbError || ''}>
                  {data?.dbError || 'Bağlantı hatası oluştu'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Memory Status */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bellek Kullanımı</p>
              <h3 className="text-lg font-bold text-gray-800 mt-1">
                {data ? formatBytes(data.memory.rss) : '--'}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            {data && (
              <div className="space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(100, (data.memory.heapUsed / data.memory.heapTotal) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Heap Used: {formatBytes(data.memory.heapUsed, 1)}</span>
                  <span>Total: {formatBytes(data.memory.heapTotal, 1)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CPU & Platform */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">İşlemci & İşletim Sistemi</p>
              <h3 className="text-lg font-bold text-gray-800 mt-1 capitalize">
                {data ? `${data.platform} (${data.cpus} Çekirdek)` : '--'}
              </h3>
            </div>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Node: {data?.node || '--'}</span>
            <span>Yük (Load): {data?.loadAvg ? data.loadAvg[0].toFixed(2) : '0.00'}</span>
          </div>
        </div>

        {/* Server Uptime */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Çalışma Süresi (Uptime)</p>
              <h3 className="text-lg font-bold text-gray-800 mt-1">
                {data ? formatUptime(data.uptime) : '--'}
              </h3>
            </div>
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>PID: {data?.pid || '--'}</span>
            <span>OS Bellek: {data ? `${((1 - data.freeMemory / data.totalMemory) * 100).toFixed(0)}%` : '--'}</span>
          </div>
        </div>
      </div>

      {/* Log Console Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
        {/* Console Header */}
        <div className="bg-slate-900 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">Gerçek Zamanlı Sunucu Logları</h2>
            <span className="bg-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded font-mono">
              {filteredLogs.length} Kayıt Gösteriliyor
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-slate-300 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Loglarda ara..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 pl-8 focus:outline-none focus:border-indigo-500 text-xs w-[150px] sm:w-[200px]"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex bg-slate-800 border border-slate-700 rounded overflow-hidden">
              <button 
                onClick={() => setLogFilter('all')}
                className={`px-2.5 py-1 transition-colors ${logFilter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Hepsi
              </button>
              <button 
                onClick={() => setLogFilter('log')}
                className={`px-2.5 py-1 transition-colors ${logFilter === 'log' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Info
              </button>
              <button 
                onClick={() => setLogFilter('error')}
                className={`px-2.5 py-1 transition-colors ${logFilter === 'error' ? 'bg-red-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Hata
              </button>
            </div>

            {/* Auto Scroll Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800 border border-slate-700 rounded px-2.5 py-1">
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={e => setAutoScroll(e.target.checked)}
                className="rounded text-indigo-500 focus:ring-indigo-500 w-3 h-3 bg-slate-700 border-slate-600"
              />
              Kaydır
            </label>
          </div>
        </div>

        {/* Console Logs Body */}
        <div className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-2 select-text selection:bg-indigo-500/30">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-10">
              Gösterilecek log kaydı bulunamadı.
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 border-b border-slate-900/50 pb-1.5 last:border-b-0">
                <span className="text-slate-600 select-none text-[10px] whitespace-nowrap shrink-0 mt-0.5">
                  [{new Date(log.time).toLocaleTimeString()}]
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 select-none ${
                  log.type === 'error' ? 'bg-red-950 text-red-400 border border-red-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'
                }`}>
                  {log.type === 'error' ? 'ERROR' : 'INFO'}
                </span>
                <span className={`break-all whitespace-pre-wrap flex-1 ${
                  log.type === 'error' ? 'text-red-300 font-medium' : 'text-slate-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}
