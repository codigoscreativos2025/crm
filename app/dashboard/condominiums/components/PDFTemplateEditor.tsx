'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye,
  EyeOff,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Layout,
  Type,
  Table,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Check,
  X,
} from 'lucide-react';
import {
  PdfTemplate,
  PdfSection,
  DocumentType,
  SECTION_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  FONT_OPTIONS,
  COLOR_PRESETS,
  SectionType,
  getDefaultTemplate,
  PRESET_TEMPLATES,
} from '@/lib/pdfTemplateTypes';

interface SortableSectionProps {
  section: PdfSection;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableSection({ section, isSelected, onSelect }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSectionIcon = (type: SectionType) => {
    switch (type) {
      case 'HEADER':
        return <Layout className="w-4 h-4" />;
      case 'INFO_BOX':
        return <FileText className="w-4 h-4" />;
      case 'TABLE':
        return <Table className="w-4 h-4" />;
      case 'SUMMARY_BOX':
        return <AlignLeft className="w-4 h-4" />;
      case 'FOOTER':
        return <AlignLeft className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-indigo-100 border border-indigo-300'
          : 'bg-white border border-gray-200 hover:border-gray-300'
      } ${!section.visible ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="text-gray-600">{getSectionIcon(section.type)}</div>
      <span className="flex-1 text-sm font-medium text-gray-700 truncate">
        {section.label}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`p-1 rounded ${section.visible ? 'text-green-600' : 'text-gray-400'}`}
      >
        {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface PropertyEditorProps {
  section: PdfSection;
  onChange: (section: PdfSection) => void;
}

function PropertyEditor({ section, onChange }: PropertyEditorProps) {
  const updateContent = (key: string, value: any) => {
    onChange({
      ...section,
      content: { ...section.content, [key]: value },
    });
  };

  const updateStyles = (key: string, value: any) => {
    onChange({
      ...section,
      styles: { ...section.styles, [key]: value },
    });
  };

  const updateVisibility = () => {
    onChange({ ...section, visible: !section.visible });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">{section.label}</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={section.visible}
            onChange={updateVisibility}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-xs text-gray-600">Visible</span>
        </label>
      </div>

      {section.type === 'HEADER' && (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
              <input
                type="text"
                value={section.content.title || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subtítulo</label>
              <input
                type="text"
                value={section.content.subtitle || ''}
                onChange={(e) => updateContent('subtitle', e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-bold text-gray-500 mb-3">ESTILOS</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fuente</label>
                <select
                  value={section.styles.font || 'Helvetica'}
                  onChange={(e) => updateStyles('font', e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tamaño título</label>
                  <select
                    value={section.styles.titleSize || 18}
                    onChange={(e) => updateStyles('titleSize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[12, 14, 16, 18, 20, 22, 24, 28, 32].map((s) => (
                      <option key={s} value={s}>
                        {s}pt
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tamaño subtítulo</label>
                  <select
                    value={section.styles.subtitleSize || 12}
                    onChange={(e) => updateStyles('subtitleSize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[8, 10, 12, 14, 16, 18].map((s) => (
                      <option key={s} value={s}>
                        {s}pt
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color título</label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={section.styles.titleColor || '#000000'}
                      onChange={(e) => updateStyles('titleColor', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <select
                      value={section.styles.titleColor || '#000000'}
                      onChange={(e) => updateStyles('titleColor', e.target.value)}
                      className="flex-1 border rounded p-1 text-xs"
                    >
                      {COLOR_PRESETS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alineación</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateStyles('titleAlign', 'left')}
                      className={`p-2 rounded ${section.styles.titleAlign === 'left' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateStyles('titleAlign', 'center')}
                      className={`p-2 rounded ${section.styles.titleAlign === 'center' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateStyles('titleAlign', 'right')}
                      className={`p-2 rounded ${section.styles.titleAlign === 'right' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {section.type === 'TABLE' && (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título de tabla</label>
              <input
                type="text"
                value={section.content.title || ''}
                onChange={(e) => updateContent('title', e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mostrar subtotal</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={section.content.showSubtotal || false}
                  onChange={(e) => updateContent('showSubtotal', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-xs text-gray-600">Agregar fila de subtotal</span>
              </label>
            </div>
            {section.content.showSubtotal && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label subtotal</label>
                <input
                  type="text"
                  value={section.content.subtotalLabel || ''}
                  onChange={(e) => updateContent('subtotalLabel', e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-bold text-gray-500 mb-3">ESTILOS DE TABLA</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color header</label>
                  <input
                    type="color"
                    value={section.styles.headerBackground || '#3b82f6'}
                    onChange={(e) => updateStyles('headerBackground', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color texto header</label>
                  <input
                    type="color"
                    value={section.styles.headerColor || '#ffffff'}
                    onChange={(e) => updateStyles('headerColor', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tamaño header</label>
                  <select
                    value={section.styles.headerSize || 10}
                    onChange={(e) => updateStyles('headerSize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[8, 9, 10, 11, 12, 14].map((s) => (
                      <option key={s} value={s}>
                        {s}pt
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tamaño cuerpo</label>
                  <select
                    value={section.styles.bodySize || 9}
                    onChange={(e) => updateStyles('bodySize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[8, 9, 10, 11, 12].map((s) => (
                      <option key={s} value={s}>
                        {s}pt
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={section.styles.alternatingRows || false}
                    onChange={(e) => updateStyles('alternatingRows', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs text-gray-600">Filas alternadas</span>
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {section.type === 'SUMMARY_BOX' && (
        <>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color fondo</label>
                <input
                  type="color"
                  value={section.styles.backgroundColor || '#f9fafb'}
                  onChange={(e) => updateStyles('backgroundColor', e.target.value)}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color borde</label>
                <input
                  type="color"
                  value={section.styles.borderColor || '#e5e7eb'}
                  onChange={(e) => updateStyles('borderColor', e.target.value)}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ancho borde</label>
                <select
                  value={section.styles.borderWidth || 1}
                  onChange={(e) => updateStyles('borderWidth', Number(e.target.value))}
                  className="w-full border rounded p-2 text-sm"
                >
                  {[0, 1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      {s}px
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Relleno</label>
                <select
                  value={section.styles.padding || 8}
                  onChange={(e) => updateStyles('padding', Number(e.target.value))}
                  className="w-full border rounded p-2 text-sm"
                >
                  {[0, 4, 8, 12, 16].map((s) => (
                    <option key={s} value={s}>
                      {s}px
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {section.type === 'FOOTER' && (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Texto del pie</label>
              <textarea
                value={section.content.text || ''}
                onChange={(e) => updateContent('text', e.target.value)}
                className="w-full border rounded p-2 text-sm min-h-[60px]"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={section.content.showPageNumbers || false}
                  onChange={(e) => updateContent('showPageNumbers', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-xs text-gray-600">Mostrar número de páginas</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-bold text-gray-500 mb-3">ESTILOS</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fuente</label>
                <select
                  value={section.styles.font || 'Helvetica'}
                  onChange={(e) => updateStyles('font', e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tamaño</label>
                  <select
                    value={section.styles.fontSize || 9}
                    onChange={(e) => updateStyles('fontSize', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[8, 9, 10, 11, 12].map((s) => (
                      <option key={s} value={s}>
                        {s}pt
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color</label>
                  <input
                    type="color"
                    value={section.styles.color || '#6b7280'}
                    onChange={(e) => updateStyles('color', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alineación</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => updateStyles('align', 'left')}
                    className={`flex-1 p-2 rounded flex justify-center ${section.styles.align === 'left' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateStyles('align', 'center')}
                    className={`flex-1 p-2 rounded flex justify-center ${section.styles.align === 'center' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateStyles('align', 'right')}
                    className={`flex-1 p-2 rounded flex justify-center ${section.styles.align === 'right' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100'}`}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {section.type === 'INFO_BOX' && (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número de columnas</label>
              <select
                value={section.content.columns || 2}
                onChange={(e) => updateContent('columns', Number(e.target.value))}
                className="w-full border rounded p-2 text-sm"
              >
                {[1, 2, 3, 4, 6].map((s) => (
                  <option key={s} value={s}>
                    {s} columnas
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-bold text-gray-500 mb-3">ESTILOS</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color fondo</label>
                  <input
                    type="color"
                    value={section.styles.backgroundColor || '#f9fafb'}
                    onChange={(e) => updateStyles('backgroundColor', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color borde</label>
                  <input
                    type="color"
                    value={section.styles.borderColor || '#e5e7eb'}
                    onChange={(e) => updateStyles('borderColor', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ancho borde</label>
                  <select
                    value={section.styles.borderWidth || 1}
                    onChange={(e) => updateStyles('borderWidth', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[0, 1, 2].map((s) => (
                      <option key={s} value={s}>
                        {s}px
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Relleno</label>
                  <select
                    value={section.styles.padding || 8}
                    onChange={(e) => updateStyles('padding', Number(e.target.value))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    {[0, 4, 8, 12, 16].map((s) => (
                      <option key={s} value={s}>
                        {s}px
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {section.type === 'DIVIDER' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estilo de línea</label>
            <select
              value={section.styles.lineStyle || 'solid'}
              onChange={(e) => updateStyles('lineStyle', e.target.value)}
              className="w-full border rounded p-2 text-sm"
            >
              <option value="solid">Sólida</option>
              <option value="dashed">Guiones</option>
              <option value="dotted">Puntos</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grosor</label>
              <select
                value={section.styles.lineThickness || 1}
                onChange={(e) => updateStyles('lineThickness', Number(e.target.value))}
                className="w-full border rounded p-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>
                    {s}px
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <input
                type="color"
                value={section.styles.lineColor || '#e5e7eb'}
                onChange={(e) => updateStyles('lineColor', e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {section.type === 'EMPTY' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Altura</label>
            <select
              value={section.styles.height || 20}
              onChange={(e) => updateStyles('height', Number(e.target.value))}
              className="w-full border rounded p-2 text-sm"
            >
              {[10, 15, 20, 30, 40, 50].map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

interface LivePreviewProps {
  template: PdfTemplate;
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
}

function LivePreview({ template, selectedSectionId, onSelectSection }: LivePreviewProps) {
  const getFontFamily = (font: string) => {
    const found = FONT_OPTIONS.find((f) => f.value === font);
    return found ? found.fontFamily : 'Helvetica, Arial, sans-serif';
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const mockData: Record<string, any> = {
    condominium: { name: 'Condominio Los Pinos' },
    invoice: { id: '000001', status: 'PENDIENTE' },
    month: 'Enero',
    year: '2026',
    invoiceDate: '15/01/2026',
    fixedExpenses: [
      { concept: 'Vigilancia', amount: 5000 },
      { concept: 'Limpieza', amount: 3000 },
      { concept: 'Mantenimiento', amount: 2000 },
    ],
    variableExpenses: [
      { concept: 'Reparación Ascensor', amount: 1500 },
      { concept: 'Pintura', amount: 800 },
    ],
    totals: {
      fixed: 10000,
      variable: 2300,
      grandTotal: 12300,
      perResident: 615,
    },
    residentsCount: 20,
    lastPayment: { date: '10/01/2026' },
    resident: { name: 'Juan Pérez', unit: 'A-101', status: 'SOLVENTE' },
    payments: [
      { date: '10/01/2026', description: 'Enero 2026', reference: 'TX123', amount: 615, status: 'PAGADO' },
      { date: '15/12/2025', description: 'Diciembre 2025', reference: 'TX122', amount: 615, status: 'PAGADO' },
    ],
  };

  const processValue = (value: string): string => {
    if (!value) return '';
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const key = value.replace('{{', '').replace('}}', '').trim();
      const keys = key.split('.');
      let result: any = mockData;
      for (const k of keys) {
        result = result?.[k];
      }
      if (typeof result === 'number') {
        return formatCurrency(result);
      }
      return result || value;
    }
    return value;
  };

  const renderSection = (section: PdfSection) => {
    if (!section.visible) return null;

    const isSelected = selectedSectionId === section.id;
    const fontFamily = getFontFamily(section.styles.font || 'Helvetica');

    const handleClick = () => onSelectSection(section.id);

    switch (section.type) {
      case 'HEADER':
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`p-4 border-b cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            style={{ backgroundColor: section.styles.backgroundColor || '#ffffff' }}
          >
            <h1
              className="font-bold"
              style={{
                fontFamily,
                fontSize: `${section.styles.titleSize || 18}px`,
                color: section.styles.titleColor || '#000000',
                textAlign: section.styles.titleAlign || 'center',
              }}
            >
              {processValue(section.content.title || '')}
            </h1>
            <p
              className="mt-1"
              style={{
                fontFamily,
                fontSize: `${section.styles.subtitleSize || 12}px`,
                color: section.styles.subtitleColor || '#333333',
                textAlign: section.styles.titleAlign || 'center',
              }}
            >
              {processValue(section.content.subtitle || '')}
            </p>
          </div>
        );

      case 'INFO_BOX':
        const fields = section.content.fields || [];
        const cols = section.content.columns || 2;
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            style={{
              backgroundColor: section.styles.backgroundColor || '#f9fafb',
              border: `${section.styles.borderWidth || 1}px solid ${section.styles.borderColor || '#e5e7eb'}`,
              padding: section.styles.padding || 8,
            }}
          >
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {fields.map((field, idx) => (
                <div key={idx}>
                  <span className="text-xs text-gray-500">{field.label}: </span>
                  <span
                    className="text-sm"
                    style={{
                      fontFamily,
                      fontSize: `${section.styles.fontSize || 10}px`,
                      fontWeight: field.bold ? 'bold' : 'normal',
                    }}
                  >
                    {processValue(field.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'TABLE':
        const tableData = mockData[section.content.dataSource || 'fixedExpenses'] || [];
        const columns = section.columns || [
          { key: 'concept', label: 'CONCEPTO', align: 'left' },
          { key: 'amount', label: 'IMPORTE', align: 'right', format: 'currency' },
        ];
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          >
            {section.content.title && (
              <h3
                className="font-bold mb-2"
                style={{
                  fontFamily,
                  fontSize: `${(section.styles.headerSize || 10) + 2}px`,
                  color: section.styles.headerColor || '#000000',
                }}
              >
                {section.content.title}
              </h3>
            )}
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full" style={{ fontFamily, fontSize: `${section.styles.bodySize || 9}px` }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: section.styles.headerBackground || '#3b82f6',
                      color: section.styles.headerColor || '#ffffff',
                    }}
                  >
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="p-2 text-left font-bold"
                        style={{
                          fontSize: `${section.styles.headerSize || 10}px`,
                          textAlign: col.align || 'left',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-t"
                      style={{
                        backgroundColor:
                          section.styles.alternatingRows && idx % 2 === 1 ? '#f9fafb' : '#ffffff',
                      }}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="p-2"
                          style={{ textAlign: col.align || 'left' }}
                        >
                          {col.format === 'currency'
                            ? formatCurrency(row[col.key])
                            : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {section.content.showSubtotal && (
                    <tr className="border-t bg-gray-100 font-bold">
                      <td className="p-2" colSpan={columns.length - 1}>
                        {section.content.subtotalLabel || 'SUBTOTAL'}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(tableData.reduce((s: number, r: any) => s + (r.amount || 0), 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'SUMMARY_BOX':
        const summaryFields = section.content.fields || [];
        const summaryCols = section.content.columns || 4;
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            style={{
              backgroundColor: section.styles.backgroundColor || '#f3f4f6',
              border: `${section.styles.borderWidth || 1}px solid ${section.styles.borderColor || '#d1d5db'}`,
              padding: section.styles.padding || 8,
            }}
          >
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${summaryCols}, 1fr)` }}
            >
              {summaryFields.map((field, idx) => (
                <div
                  key={idx}
                  className="text-center"
                  style={{
                    backgroundColor: field.highlight ? section.styles.headerBackground || '#22c55e' : 'transparent',
                    color: field.highlight
                      ? section.styles.headerColor || '#ffffff'
                      : section.styles.color || '#000000',
                    padding: field.highlight ? '8px' : '0',
                    borderRadius: field.highlight ? '4px' : '0',
                  }}
                >
                  <div className="text-xs opacity-75">{field.label}</div>
                  <div
                    className="font-bold"
                    style={{
                      fontFamily,
                      fontSize: field.highlight ? `${(section.styles.fontSize || 10) + 2}px` : `${section.styles.fontSize || 10}px`,
                    }}
                  >
                    {processValue(field.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'FOOTER':
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`p-2 border-t cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            style={{
              fontFamily,
              fontSize: `${section.styles.fontSize || 9}px`,
              color: section.styles.color || '#6b7280',
              textAlign: section.styles.align || 'center',
            }}
          >
            {section.content.text}
            {section.content.showPageNumbers && (
              <span className="ml-2">- Página 1 de 1</span>
            )}
          </div>
        );

      case 'DIVIDER':
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`px-4 py-2 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <hr
              style={{
                borderStyle: section.styles.lineStyle || 'solid',
                borderWidth: `${section.styles.lineThickness || 1}px 0 0 0`,
                borderColor: section.styles.lineColor || '#e5e7eb',
              }}
            />
          </div>
        );

      case 'EMPTY':
        return (
          <div
            key={section.id}
            onClick={handleClick}
            className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            style={{ height: section.styles.height || 20 }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <span className="text-xs font-bold text-gray-500 uppercase">
          Vista Previa - {DOCUMENT_TYPE_LABELS[template.documentType]}
        </span>
      </div>
      <div className="p-4 bg-gray-100 min-h-[600px]">
        <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
          {template.sections
            .sort((a, b) => a.order - b.order)
            .map(renderSection)}
        </div>
      </div>
    </div>
  );
}

interface PDFTemplateEditorProps {
  condoId: number;
  initialDocType?: DocumentType;
  onClose?: () => void;
}

export default function PDFTemplateEditor({ condoId, initialDocType = 'invoice', onClose }: PDFTemplateEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docType, setDocType] = useState<DocumentType>(initialDocType);
  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [availableTypes, setAvailableTypes] = useState<{ type: string; label: string }[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTemplate();
  }, [condoId, docType]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/condominiums/${condoId}/templates/${docType}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data.template);
        setAvailableTypes(data.availableTypes);
        if (data.template.sections.length > 0) {
          setSelectedSectionId(data.template.sections[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading template:', e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/condominiums/${condoId}/templates/${docType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        alert('Plantilla guardada correctamente');
      } else {
        const data = await res.json();
        alert(data.error || 'Error guardando plantilla');
      }
    } catch (e) {
      alert('Error guardando plantilla');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('¿Restablecer la plantilla por defecto? Se perderán los cambios actuales.')) return;
    const defaultTemplate = getDefaultTemplate(docType);
    setTemplate(defaultTemplate);
    if (defaultTemplate.sections.length > 0) {
      setSelectedSectionId(defaultTemplate.sections[0].id);
    }
  };

  const handleExport = () => {
    if (!template) return;
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla-${docType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as PdfTemplate;
        if (imported.sections && Array.isArray(imported.sections)) {
          setTemplate(imported);
          alert('Plantilla importada correctamente');
        } else {
          alert('El archivo no es una plantilla válida');
        }
      } catch (err) {
        alert('Error al importar el archivo');
      }
    };
    input.click();
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    if (!confirm(`¿Aplicar la plantilla "${preset.name}"? Se sobrescribirán los estilos actuales.`)) return;
    setTemplate(preset.template);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!template || !over || active.id === over.id) return;

    const oldIndex = template.sections.findIndex((s) => s.id === active.id);
    const newIndex = template.sections.findIndex((s) => s.id === over.id);

    const newSections = arrayMove(template.sections, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    setTemplate({ ...template, sections: newSections });
  };

  const handleUpdateSection = (updatedSection: PdfSection) => {
    if (!template) return;
    const newSections = template.sections.map((s) =>
      s.id === updatedSection.id ? updatedSection : s
    );
    setTemplate({ ...template, sections: newSections });
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    if (!template) return;
    const newSections = template.sections.map((s) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    setTemplate({ ...template, sections: newSections });
  };

  const selectedSection = template?.sections.find((s) => s.id === selectedSectionId) || null;

  const goToPrevType = () => {
    const idx = availableTypes.findIndex((t) => t.type === docType);
    if (idx > 0) {
      setDocType(availableTypes[idx - 1].type as DocumentType);
    }
  };

  const goToNextType = () => {
    const idx = availableTypes.findIndex((t) => t.type === docType);
    if (idx < availableTypes.length - 1) {
      setDocType(availableTypes[idx + 1].type as DocumentType);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-8 text-gray-500">
        Error cargando la plantilla
      </div>
    );
  }

  const currentTypeIndex = availableTypes.findIndex((t) => t.type === docType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPrevType}
            disabled={currentTypeIndex <= 0}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Tipo de Documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="border rounded-lg px-3 py-2 text-sm font-medium min-w-[200px]"
            >
              {availableTypes.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={goToNextType}
            disabled={currentTypeIndex >= availableTypes.length - 1}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="ml-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nombre del Archivo
            </label>
            <input
              type="text"
              value={template?.filename || ''}
              onChange={(e) => setTemplate(template ? { ...template, filename: e.target.value } : null)}
              placeholder="Nombre del PDF"
              className="border rounded-lg px-3 py-2 text-sm font-medium min-w-[180px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Restablecer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Secciones</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={template.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {template.sections
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        isSelected={selectedSectionId === section.id}
                        onSelect={() => setSelectedSectionId(section.id)}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Plantillas Predefinidas</h3>
            <div className="space-y-2">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg text-left flex items-center gap-2"
                >
                  <Palette className="w-4 h-4 text-gray-400" />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <LivePreview
            template={template}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
          />
        </div>

        <div className="w-80 flex-shrink-0">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Propiedades</h3>
            {selectedSection ? (
              <PropertyEditor
                section={selectedSection}
                onChange={handleUpdateSection}
              />
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Selecciona una sección para editar sus propiedades
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
