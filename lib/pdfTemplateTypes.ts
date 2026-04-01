export type DocumentType = 
  | 'invoice' 
  | 'invoiceTemplate' 
  | 'paymentReceipt' 
  | 'paymentHistory' 
  | 'residentExport' 
  | 'transactionExport' 
  | 'financialReport'
  | 'pendingPayments'
  | 'suggestionsExport';

export type SectionType = 
  | 'HEADER' 
  | 'INFO_BOX' 
  | 'TABLE' 
  | 'SUMMARY_BOX' 
  | 'NOTES' 
  | 'FOOTER' 
  | 'TEXT_BLOCK' 
  | 'DIVIDER' 
  | 'EMPTY';

export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { value: 'Helvetica', label: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif' },
  { value: 'Times', label: 'Times New Roman', fontFamily: '"Times New Roman", Times, serif' },
  { value: 'Courier', label: 'Courier New', fontFamily: '"Courier New", Courier, monospace' },
];

export interface ColorOption {
  value: string;
  label: string;
}

export const COLOR_PRESETS: ColorOption[] = [
  { value: '#000000', label: 'Negro' },
  { value: '#ffffff', label: 'Blanco' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#8b5cf6', label: 'Morado' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Gris' },
  { value: '#1f2937', label: 'Gris Oscuro' },
];

export interface SectionStyles {
  font?: string;
  titleSize?: number;
  titleColor?: string;
  titleAlign?: 'left' | 'center' | 'right';
  subtitleSize?: number;
  subtitleColor?: string;
  headerBackground?: string;
  headerColor?: string;
  headerFont?: string;
  headerSize?: number;
  bodyFont?: string;
  bodySize?: number;
  bodyColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  alternatingRows?: boolean;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  lineThickness?: number;
  lineColor?: string;
  height?: number;
}

export interface SectionContent {
  title?: string;
  subtitle?: string;
  showDate?: boolean;
  showInvoiceNumber?: boolean;
  showLogo?: boolean;
  fields?: Array<{
    label: string;
    value: string;
    bold?: boolean;
    highlight?: boolean;
  }>;
  columns?: number;
  columnWidth?: 'equal' | 'auto';
  dataSource?: string;
  showSubtotal?: boolean;
  subtotalLabel?: string;
  text?: string;
  showPageNumbers?: boolean;
  pageNumberFormat?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageAlign?: 'left' | 'center' | 'right';
}

export interface TableColumn {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'number' | 'text';
  bold?: boolean;
  color?: string;
}

export interface PdfSection {
  id: string;
  type: SectionType;
  label: string;
  visible: boolean;
  order: number;
  content: SectionContent;
  styles: SectionStyles;
  columns?: TableColumn[];
  gridRow?: number;
  gridCol?: string;
  minHeight?: number;
}

export interface PageConfig {
  size: 'A4' | 'LETTER' | 'LEGAL';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PdfTemplate {
  type: 'GRID';
  documentType: DocumentType;
  page: PageConfig;
  sections: PdfSection[];
  filename?: string;
}

export interface AllTemplates {
  invoice: PdfTemplate;
  invoiceTemplate: PdfTemplate;
  paymentReceipt: PdfTemplate;
  paymentHistory: PdfTemplate;
  residentExport: PdfTemplate;
  transactionExport: PdfTemplate;
  financialReport: PdfTemplate;
  pendingPayments: PdfTemplate;
  suggestionsExport: PdfTemplate;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Factura Mensual',
  invoiceTemplate: 'Plantilla de Gastos',
  paymentReceipt: 'Recibo de Pago',
  paymentHistory: 'Historial de Pagos',
  residentExport: 'Exportación de Residentes',
  transactionExport: 'Exportación de Transacciones',
  financialReport: 'Reporte Financiero',
  pendingPayments: 'Pagos por Conciliar',
  suggestionsExport: 'Reclamos y Sugerencias',
};

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  HEADER: 'Encabezado',
  INFO_BOX: 'Caja de Información',
  TABLE: 'Tabla de Datos',
  SUMMARY_BOX: 'Resumen/Totales',
  NOTES: 'Notas',
  FOOTER: 'Pie de Página',
  TEXT_BLOCK: 'Bloque de Texto',
  DIVIDER: 'Divisor',
  EMPTY: 'Espacio en Blanco',
};

export function getDefaultTemplate(documentType: DocumentType): PdfTemplate {
  const baseTemplate: PdfTemplate = {
    type: 'GRID',
    documentType,
    page: {
      size: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 14, bottom: 20, left: 14 },
    },
    sections: [],
  };

  switch (documentType) {
    case 'invoice':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'ESTADO DE CUENTA',
              subtitle: '{{condominium.name}}',
              showDate: true,
              showInvoiceNumber: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'info_box',
            type: 'INFO_BOX',
            label: 'Información',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Periodo', value: '{{month}} {{year}}', bold: true },
                { label: 'Factura N°', value: '{{invoice.id}}', bold: false },
                { label: 'Estatus', value: '{{invoice.status}}', bold: false },
              ],
              columns: 3,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 5,
              fontSize: 10,
            },
          },
          {
            id: 'fixed_expenses',
            type: 'TABLE',
            label: 'Gastos Fijos',
            visible: true,
            order: 3,
            content: {
              title: 'GASTOS FIJOS',
              dataSource: 'fixedExpenses',
              showSubtotal: true,
              subtotalLabel: 'SUBTOTAL GASTOS FIJOS',
            },
            columns: [
              { key: 'concept', label: 'CONCEPTO', width: 'auto', align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#22c55e',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'variable_expenses',
            type: 'TABLE',
            label: 'Gastos Variables',
            visible: true,
            order: 4,
            content: {
              title: 'GASTOS VARIABLES',
              dataSource: 'variableExpenses',
              showSubtotal: true,
              subtotalLabel: 'SUBTOTAL GASTOS VARIABLES',
            },
            columns: [
              { key: 'concept', label: 'CONCEPTO', width: 'auto', align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#ef4444',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'summary',
            type: 'SUMMARY_BOX',
            label: 'Resumen',
            visible: true,
            order: 5,
            content: {
              fields: [
                { label: 'Total Gastos Fijos', value: '{{totals.fixed}}', bold: true },
                { label: 'Total Gastos Variables', value: '{{totals.variable}}', bold: true },
                { label: 'TOTAL A DISTRIBUIR', value: '{{totals.grandTotal}}', bold: true, highlight: true },
                { label: 'Monto por Residente', value: '{{totals.perResident}}', bold: false },
              ],
              columns: 4,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f3f4f6',
              borderColor: '#d1d5db',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 6,
            content: {
              text: 'Gracias por su puntualidad.',
              showPageNumbers: true,
              pageNumberFormat: 'Página {n} de {total}',
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'invoiceTemplate':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'PLANTILLA DE GASTOS',
              subtitle: '{{condominium.name}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 14,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'info_box',
            type: 'INFO_BOX',
            label: 'Información',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Periodo', value: '{{month}} {{year}}', bold: true },
                { label: 'Factura N°', value: '{{invoice.id}}', bold: false },
                { label: 'Fecha', value: '{{invoice.date}}', bold: false },
              ],
              columns: 3,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 5,
              fontSize: 10,
            },
          },
          {
            id: 'fixed_expenses',
            type: 'TABLE',
            label: 'Gastos Fijos',
            visible: true,
            order: 3,
            content: {
              title: 'GASTOS FIJOS',
              dataSource: 'fixedExpenses',
              showSubtotal: true,
              subtotalLabel: 'SUBTOTAL GASTOS FIJOS',
            },
            columns: [
              { key: 'concept', label: 'CONCEPTO', width: 'auto', align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#22c55e',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'variable_expenses',
            type: 'TABLE',
            label: 'Gastos Variables',
            visible: true,
            order: 4,
            content: {
              title: 'GASTOS VARIABLES',
              dataSource: 'variableExpenses',
              showSubtotal: true,
              subtotalLabel: 'SUBTOTAL GASTOS VARIABLES',
            },
            columns: [
              { key: 'concept', label: 'CONCEPTO', width: 'auto', align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#ef4444',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'summary',
            type: 'SUMMARY_BOX',
            label: 'Resumen',
            visible: true,
            order: 5,
            content: {
              fields: [
                { label: 'Total Gastos Fijos', value: '{{totals.fixed}}', bold: true },
                { label: 'Total Gastos Variables', value: '{{totals.variable}}', bold: true },
                { label: 'TOTAL A DISTRIBUIR', value: '{{totals.grandTotal}}', bold: true, highlight: true },
                { label: 'Número de Residentes', value: '{{residentsCount}}', bold: false },
                { label: 'MONTO POR RESIDENTE', value: '{{totals.perResident}}', bold: true, highlight: true },
              ],
              columns: 5,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f3f4f6',
              borderColor: '#d1d5db',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 6,
            content: {
              text: 'Gracias por su puntualidad.',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'paymentReceipt':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'RECIBO DE PAGO',
              subtitle: '{{condominium.name}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 14,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'payment_info',
            type: 'INFO_BOX',
            label: 'Información del Pago',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Recibo N°', value: '{{receipt.id}}', bold: true },
                { label: 'Fecha', value: '{{receipt.date}}', bold: false },
                { label: 'Residente', value: '{{resident.name}}', bold: false },
                { label: 'Apartamento', value: '{{resident.unit}}', bold: false },
                { label: 'Método de Pago', value: '{{paymentMethod}}', bold: false },
                { label: 'Referencia', value: '{{reference}}', bold: false },
              ],
              columns: 2,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f0fdf4',
              borderColor: '#22c55e',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'payment_details',
            type: 'TABLE',
            label: 'Detalle del Pago',
            visible: true,
            order: 3,
            content: {
              title: 'CONCEPTOS PAGADOS',
              dataSource: 'paymentItems',
              showSubtotal: true,
              subtotalLabel: 'TOTAL PAGADO',
            },
            columns: [
              { key: 'month', label: 'MES', width: 'auto', align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#3b82f6',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'total',
            type: 'SUMMARY_BOX',
            label: 'Total',
            visible: true,
            order: 4,
            content: {
              fields: [
                { label: 'TOTAL PAGADO', value: '{{totals.total}}', bold: true, highlight: true },
              ],
              columns: 1,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#22c55e',
              borderColor: '#16a34a',
              borderWidth: 2,
              padding: 12,
              fontSize: 14,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 5,
            content: {
              text: 'Pago recibido y verificado. Gracias por su colaboración.',
              showPageNumbers: false,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'paymentHistory':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'HISTORIAL DE PAGOS',
              subtitle: '{{resident.name}} - {{resident.unit}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'summary',
            type: 'SUMMARY_BOX',
            label: 'Resumen',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Total Pagado', value: '{{totals.totalPaid}}', bold: true },
                { label: 'Último Pago', value: '{{lastPayment.date}}', bold: false },
                { label: 'Estado', value: '{{resident.status}}', bold: true },
              ],
              columns: 3,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'payments_table',
            type: 'TABLE',
            label: 'Tabla de Pagos',
            visible: true,
            order: 3,
            content: {
              title: 'REGISTRO DE PAGOS',
              dataSource: 'payments',
            },
            columns: [
              { key: 'date', label: 'FECHA', width: 30, align: 'left', format: 'date' },
              { key: 'description', label: 'CONCEPTO', width: 'auto', align: 'left' },
              { key: 'reference', label: 'REF', width: 30, align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 35, align: 'right', format: 'currency' },
              { key: 'status', label: 'ESTADO', width: 25, align: 'center' },
            ],
            styles: {
              headerBackground: '#3b82f6',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 4,
            content: {
              text: 'Documento generado por PIVOT CRM',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'residentExport':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'LISTADO DE RESIDENTES',
              subtitle: '{{condominium.name}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'summary',
            type: 'INFO_BOX',
            label: 'Resumen',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Total Residentes', value: '{{residentsCount}}', bold: true },
                { label: 'Solventes', value: '{{solventCount}}', bold: false },
                { label: 'Insolventes', value: '{{insolventCount}}', bold: false },
              ],
              columns: 3,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'residents_table',
            type: 'TABLE',
            label: 'Tabla de Residentes',
            visible: true,
            order: 3,
            content: {
              title: 'RESIDENTES',
              dataSource: 'residents',
            },
            columns: [
              { key: 'name', label: 'NOMBRE', width: 'auto', align: 'left' },
              { key: 'phone', label: 'TELÉFONO', width: 35, align: 'left' },
              { key: 'unit', label: 'UNIDAD', width: 30, align: 'left' },
              { key: 'status', label: 'ESTADO', width: 25, align: 'center' },
              { key: 'balance', label: 'SALDO', width: 30, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#8b5cf6',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 4,
            content: {
              text: 'Documento generado por PIVOT CRM',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'transactionExport':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'REGISTRO DE TRANSACCIONES',
              subtitle: '{{condominium.name}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'filters',
            type: 'INFO_BOX',
            label: 'Filtros',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Período', value: '{{dateRange}}', bold: true },
                { label: 'Tipo', value: '{{filterType}}', bold: false },
                { label: 'Total Ingresos', value: '{{totals.income}}', bold: true },
                { label: 'Total Egresos', value: '{{totals.expense}}', bold: true },
              ],
              columns: 4,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'transactions_table',
            type: 'TABLE',
            label: 'Tabla de Transacciones',
            visible: true,
            order: 3,
            content: {
              title: 'TRANSACCIONES',
              dataSource: 'transactions',
            },
            columns: [
              { key: 'date', label: 'FECHA', width: 25, align: 'left', format: 'date' },
              { key: 'type', label: 'TIPO', width: 20, align: 'center' },
              { key: 'category', label: 'CATEGORÍA', width: 'auto', align: 'left' },
              { key: 'description', label: 'DESCRIPCIÓN', width: 'auto', align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 30, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#f59e0b',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 4,
            content: {
              text: 'Documento generado por PIVOT CRM',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'financialReport':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'REPORTE FINANCIERO',
              subtitle: '{{condominium.name}} - {{period}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'summary',
            type: 'SUMMARY_BOX',
            label: 'Resumen Ejecutivo',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Ingresos Totales', value: '{{totals.income}}', bold: true, highlight: true },
                { label: 'Egresos Totales', value: '{{totals.expense}}', bold: true, highlight: true },
                { label: 'Balance', value: '{{totals.balance}}', bold: true, highlight: true },
              ],
              columns: 3,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f0fdf4',
              borderColor: '#22c55e',
              borderWidth: 2,
              padding: 12,
              fontSize: 12,
            },
          },
          {
            id: 'income_table',
            type: 'TABLE',
            label: 'Ingresos',
            visible: true,
            order: 3,
            content: {
              title: 'INGRESOS',
              dataSource: 'incomeByCategory',
              showSubtotal: true,
              subtotalLabel: 'TOTAL INGRESOS',
            },
            columns: [
              { key: 'category', label: 'CATEGORÍA', width: 'auto', align: 'left' },
              { key: 'count', label: '#', width: 20, align: 'center', format: 'number' },
              { key: 'amount', label: 'TOTAL', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#22c55e',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'expense_table',
            type: 'TABLE',
            label: 'Egresos',
            visible: true,
            order: 4,
            content: {
              title: 'EGRESOS',
              dataSource: 'expensesByCategory',
              showSubtotal: true,
              subtotalLabel: 'TOTAL EGRESOS',
            },
            columns: [
              { key: 'category', label: 'CATEGORÍA', width: 'auto', align: 'left' },
              { key: 'count', label: '#', width: 20, align: 'center', format: 'number' },
              { key: 'amount', label: 'TOTAL', width: 40, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#ef4444',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 5,
            content: {
              text: 'Documento generado por PIVOT CRM',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'pendingPayments':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'PAGOS POR CONCILIAR',
              subtitle: '{{condominium.name}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'summary',
            type: 'SUMMARY_BOX',
            label: 'Resumen',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Total Pagos', value: '{{totals.count}}', bold: true },
                { label: 'Monto Total', value: '{{totals.amount}}', bold: true, highlight: true },
              ],
              columns: 2,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#fef3c7',
              borderColor: '#f59e0b',
              borderWidth: 2,
              padding: 12,
              fontSize: 12,
            },
          },
          {
            id: 'payments_table',
            type: 'TABLE',
            label: 'Pagos Pendientes',
            visible: true,
            order: 3,
            content: {
              title: 'PAGOS PENDIENTES',
              dataSource: 'payments',
            },
            columns: [
              { key: 'date', label: 'FECHA', width: 25, align: 'left', format: 'date' },
              { key: 'resident', label: 'RESIDENTE', width: 'auto', align: 'left' },
              { key: 'unit', label: 'UNIDAD', width: 25, align: 'left' },
              { key: 'reference', label: 'REFERENCIA', width: 30, align: 'left' },
              { key: 'amount', label: 'IMPORTE', width: 30, align: 'right', format: 'currency' },
            ],
            styles: {
              headerBackground: '#f59e0b',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 4,
            content: {
              text: 'Documento generado por PIVOT CRM',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    case 'suggestionsExport':
      return {
        ...baseTemplate,
        sections: [
          {
            id: 'header',
            type: 'HEADER',
            label: 'Encabezado',
            visible: true,
            order: 1,
            content: {
              title: 'RECLAMOS Y SUGERENCIAS',
              subtitle: '{{condominium.name}}',
              showDate: true,
            },
            styles: {
              font: 'Helvetica',
              titleSize: 18,
              titleColor: '#000000',
              titleAlign: 'center',
              subtitleSize: 12,
              subtitleColor: '#333333',
            },
          },
          {
            id: 'summary',
            type: 'INFO_BOX',
            label: 'Resumen',
            visible: true,
            order: 2,
            content: {
              fields: [
                { label: 'Total', value: '{{totals.count}}', bold: true },
                { label: 'Sugerencias', value: '{{totals.suggestions}}', bold: false },
                { label: 'Reclamos', value: '{{totals.claims}}', bold: false },
                { label: 'Pendientes', value: '{{totals.pending}}', bold: false },
              ],
              columns: 4,
              columnWidth: 'equal',
            },
            styles: {
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 8,
              fontSize: 10,
            },
          },
          {
            id: 'suggestions_table',
            type: 'TABLE',
            label: 'Lista de Reclamos y Sugerencias',
            visible: true,
            order: 3,
            content: {
              title: 'REGISTRO',
              dataSource: 'suggestions',
            },
            columns: [
              { key: 'date', label: 'FECHA', width: 25, align: 'left', format: 'date' },
              { key: 'type', label: 'TIPO', width: 25, align: 'center' },
              { key: 'resident', label: 'RESIDENTE', width: 'auto', align: 'left' },
              { key: 'description', label: 'DESCRIPCIÓN', width: 'auto', align: 'left' },
              { key: 'status', label: 'ESTADO', width: 25, align: 'center' },
            ],
            styles: {
              headerBackground: '#8b5cf6',
              headerColor: '#ffffff',
              headerFont: 'Helvetica',
              headerSize: 10,
              bodyFont: 'Helvetica',
              bodySize: 9,
              borderWidth: 0.5,
              alternatingRows: true,
            },
          },
          {
            id: 'footer',
            type: 'FOOTER',
            label: 'Pie de Página',
            visible: true,
            order: 4,
            content: {
              text: 'Documento generado por PIVOT CRM',
              showPageNumbers: true,
            },
            styles: {
              font: 'Helvetica',
              fontSize: 9,
              color: '#6b7280',
              align: 'center',
            },
          },
        ],
      };

    default:
      return baseTemplate;
  }
}

export const PRESET_TEMPLATES: { name: string; template: PdfTemplate }[] = [
  {
    name: 'Clásico',
    template: (() => {
      const t = getDefaultTemplate('invoice');
      t.sections.forEach(s => {
        if (s.styles.headerBackground) s.styles.headerBackground = '#1f2937';
        if (s.styles.headerColor) s.styles.headerColor = '#ffffff';
      });
      return t;
    })(),
  },
  {
    name: 'Moderno Azul',
    template: (() => {
      const t = getDefaultTemplate('invoice');
      t.sections.forEach(s => {
        if (s.styles.headerBackground) s.styles.headerBackground = '#3b82f6';
        if (s.styles.headerColor) s.styles.headerColor = '#ffffff';
        if (s.styles.titleColor) s.styles.titleColor = '#1e40af';
      });
      return t;
    })(),
  },
  {
    name: 'Verde Profesional',
    template: getDefaultTemplate('invoice'),
  },
  {
    name: 'Rojo Corporativo',
    template: (() => {
      const t = getDefaultTemplate('invoice');
      t.sections.forEach(s => {
        if (s.styles.headerBackground) s.styles.headerBackground = '#dc2626';
        if (s.styles.headerColor) s.styles.headerColor = '#ffffff';
      });
      return t;
    })(),
  },
  {
    name: 'Minimalista',
    template: (() => {
      const t = getDefaultTemplate('invoice');
      t.sections.forEach(s => {
        if (s.styles.headerBackground) {
          s.styles.headerBackground = '#ffffff';
          s.styles.headerColor = '#000000';
          s.styles.borderWidth = 1;
          s.styles.borderColor = '#000000';
        }
        if (s.styles.bodySize) s.styles.bodySize = 8;
        if (s.styles.titleSize) s.styles.titleSize = 14;
      });
      return t;
    })(),
  },
];
