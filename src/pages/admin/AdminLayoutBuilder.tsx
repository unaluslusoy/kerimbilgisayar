import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { adminRequest } from "../../lib/api";

const ELEMENT_REGISTRY = [
  { key: "hero_banner",      label: "Hero Banner",      icon: "🖼" },
  { key: "text_block",       label: "Metin Blogu",       icon: "📝" },
  { key: "image_block",      label: "Resim Blogu",       icon: "🖼" },
  { key: "button_block",     label: "Buton",             icon: "🔘" },
  { key: "services_list",    label: "Hizmetler Listesi", icon: "🛠" },
  { key: "testimonials",     label: "Musteri Yorumlari", icon: "💬" },
  { key: "contact_form",     label: "Iletisim Formu",    icon: "📧" },
  { key: "blog_posts",       label: "Blog Yazilari",     icon: "📰" },
  { key: "campaigns",        label: "Kampanyalar",       icon: "🎯" },
  { key: "faq_section",      label: "SSS Bolumu",        icon: "❓" },
  { key: "custom_html",      label: "Ozel HTML",         icon: "⌨" },
  { key: "spacer",           label: "Bosluk",            icon: "↕" },
];

interface PageBlock {
  id: number;
  elementKey: string;
  props: any;
  region: string;
  sortOrder: number;
  isVisible: boolean;
}

export default function AdminLayoutBuilder() {
  const { id } = useParams();
  const [layout, setLayout] = useState<any>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<PageBlock | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [layouts, bks] = await Promise.all([
          adminRequest("/api/admin/layouts"),
          adminRequest(`/api/admin/page-blocks/layout_template/${id}`).catch(() => []),
        ]);
        const current = layouts.find((l: any) => l.id === parseInt(id || "0"));
        setLayout(current);
        setBlocks(bks || []);
      } catch (e: any) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleDragStart = (e: React.DragEvent, elementKey: string) => {
    e.dataTransfer.setData("elementKey", elementKey);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const elementKey = e.dataTransfer.getData("elementKey");
    if (!elementKey || !id) return;
    try {
      const result = await adminRequest(`/api/admin/page-blocks/layout_template/${id}`, {
        method: "POST",
        body: JSON.stringify({ elementKey, sortOrder: blocks.length, props: {} }),
      });
      const newBlock: PageBlock = {
        id: result.id,
        elementKey,
        props: {},
        region: "main",
        sortOrder: blocks.length,
        isVisible: true,
      };
      setBlocks(prev => [...prev, newBlock]);
    } catch (e: any) { console.error(e); }
  };

  const handleToggleVisible = async (block: PageBlock) => {
    const updated = { ...block, isVisible: !block.isVisible };
    setBlocks(prev => prev.map(b => b.id === block.id ? updated : b));
    if (selectedBlock?.id === block.id) setSelectedBlock(updated);
    await adminRequest(`/api/admin/page-blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ isVisible: updated.isVisible }),
    }).catch(console.error);
  };

  const handleDelete = async (blockId: number) => {
    if (!confirm("Bu blogu silmek istediginizden emin misiniz?")) return;
    await adminRequest(`/api/admin/page-blocks/${blockId}`, { method: "DELETE" }).catch(console.error);
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlock?.id === blockId) setSelectedBlock(null);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      await adminRequest("/api/admin/page-blocks/reorder", {
        method: "POST",
        body: JSON.stringify({ blocks: blocks.map((b, i) => ({ id: b.id, sortOrder: i })) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleMoveBlock = useCallback((idx: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const getElement = (key: string) => ELEMENT_REGISTRY.find(e => e.key === key);

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-400">Yukleniyor...</div>;
  if (!layout)  return <div className="p-6 text-red-500">Sablon bulunamadi.</div>;

  return (
    <div className="min-h-screen bg-gray-100 -m-6 p-0 flex flex-col">
      {/* Header Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/admin/sablonlar" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">
              {layout.name}
              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{layout.type}</span>
            </h1>
            <p className="text-xs text-gray-400">{blocks.length} blok</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Kaydedildi
            </span>
          )}
          <button onClick={handleSaveOrder} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" /> {saving ? "Kaydediliyor..." : "Siralamayi Kaydet"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
        {/* Left Panel: Element Registry */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Bilesenler
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {ELEMENT_REGISTRY.map(el => (
              <div
                key={el.key}
                draggable
                onDragStart={e => handleDragStart(e, el.key)}
                className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm select-none"
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="text-base leading-none">{el.icon}</span>
                <span className="font-medium text-gray-700 truncate">{el.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`min-h-[300px] rounded-xl border-2 border-dashed transition-colors p-4 space-y-3 ${
              dragOver ? "border-blue-400 bg-blue-50" : blocks.length === 0 ? "border-gray-300 bg-gray-50 flex items-center justify-center" : "border-gray-200 bg-white"
            }`}
          >
            {blocks.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Plus className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Sol panelden bilesenleri buraya suruklup birakin</p>
              </div>
            ) : (
              blocks.map((block, idx) => {
                const el = getElement(block.elementKey);
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedBlock?.id === block.id
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    } ${!block.isVisible ? "opacity-40" : ""}`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <span className="text-lg shrink-0">{el?.icon || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{el?.label || block.elementKey}</p>
                      <p className="text-xs text-gray-400">{block.elementKey}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); handleMoveBlock(idx, -1); }}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded" title="Yukari tasid">
                        ▲
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleMoveBlock(idx, 1); }}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded" title="Asagi tasid">
                        ▼
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleToggleVisible(block); }}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded">
                        {block.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(block.id); }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Block Settings */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Blok Ayarlari
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedBlock ? (
              <p className="text-sm text-gray-400 text-center py-10">Bir blok secin.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bilesed Anahtari</p>
                  <p className="text-sm font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1">{selectedBlock.elementKey}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bolge (Region)</p>
                  <select
                    value={selectedBlock.region}
                    onChange={async e => {
                      const region = e.target.value;
                      const updated = { ...selectedBlock, region };
                      setSelectedBlock(updated);
                      setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? updated : b));
                      await adminRequest(`/api/admin/page-blocks/${selectedBlock.id}`, {
                        method: "PUT",
                        body: JSON.stringify({ region }),
                      }).catch(console.error);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="main">Ana Icerik</option>
                    <option value="header_top">Ust Baslik</option>
                    <option value="sidebar">Kenar Cubugu</option>
                    <option value="footer">Alt Bilgi</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Goster</span>
                  <button
                    onClick={() => handleToggleVisible(selectedBlock)}
                    className={`w-10 h-6 rounded-full transition-colors ${selectedBlock.isVisible ? "bg-blue-500" : "bg-gray-300"}`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform m-1 ${selectedBlock.isVisible ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Blok ID: #{selectedBlock.id}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
