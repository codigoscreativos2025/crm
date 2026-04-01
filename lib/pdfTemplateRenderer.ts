import { PdfTemplate, PdfSection } from './pdfTemplateTypes';

interface RenderContext {
  data: Record<string, any>;
}

interface InfoBoxField {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  format?: string;
}

export async function renderTemplateToPdf(
  template: PdfTemplate,
  data: Record<string, any>
): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({
    orientation: template.page.orientation,
    unit: 'mm',
    format: template.page.size,
  });

  const marginTop = template.page.margins.top;
  const marginRight = template.page.margins.right;
  const marginBottom = template.page.margins.bottom;
  const marginLeft = template.page.margins.left;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginLeft - marginRight;
  let currentY = marginTop;

  const processValue = (value: string, ctx: RenderContext): string => {
    if (!value) return '';
    if (typeof value !== 'string') return String(value);
    
    const processed = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const keys = key.split('.');
      let result: any = ctx.data;
      for (const k of keys) {
        result = result?.[k];
      }
      return result !== undefined ? String(result) : match;
    });
    return processed;
  };

  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    if (!section.visible) continue;

    const checkPageBreak = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - marginBottom) {
        doc.addPage();
        currentY = marginTop;
        return true;
      }
      return false;
    };

    switch (section.type) {
      case 'HEADER': {
        const title = processValue(section.content.title || '', { data });
        const subtitle = processValue(section.content.subtitle || '', { data });

        checkPageBreak(20);

        doc.setFont(section.styles.font || 'helvetica', 'bold');
        doc.setFontSize(section.styles.titleSize || 18);
        doc.setTextColor(section.styles.titleColor || '#000000');

        const titleAlign = section.styles.titleAlign || 'center';
        let titleX = pageWidth / 2;
        if (titleAlign === 'left') titleX = marginLeft;
        else if (titleAlign === 'right') titleX = pageWidth - marginRight;

        doc.text(title, titleX, currentY, { align: titleAlign as any });

        currentY += (section.styles.titleSize || 18) / 2.5;

        if (subtitle) {
          doc.setFont(section.styles.font || 'helvetica', 'normal');
          doc.setFontSize(section.styles.subtitleSize || 12);
          doc.setTextColor(section.styles.subtitleColor || '#333333');

          let subtitleX = pageWidth / 2;
          if (titleAlign === 'left') subtitleX = marginLeft;
          else if (titleAlign === 'right') subtitleX = pageWidth - marginRight;

          doc.text(subtitle, subtitleX, currentY, { align: titleAlign as any });
          currentY += (section.styles.subtitleSize || 12) / 2.5;
        }

        currentY += 5;
        break;
      }

      case 'INFO_BOX': {
        const fields = (section.content.fields || []) as InfoBoxField[];
        const cols = section.content.columns || 2;
        const boxHeight = Math.ceil(fields.length / cols) * 6 + 4;

        checkPageBreak(boxHeight);

        const x = marginLeft;
        const width = contentWidth;

        doc.setFillColor(section.styles.backgroundColor || '#f9fafb');
        doc.setDrawColor(section.styles.borderColor || '#e5e7eb');
        doc.setLineWidth((section.styles.borderWidth || 1) / 10);
        doc.roundedRect(x, currentY, width, boxHeight, 2, 2, 'FD');

        doc.setFont(section.styles.font || 'helvetica', 'normal');
        doc.setFontSize(section.styles.fontSize || 10);
        doc.setTextColor('#333333');

        const cellWidth = width / cols;
        const cellHeight = 6;

        fields.forEach((field, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cellX = x + col * cellWidth;
          const cellY = currentY + 2 + row * cellHeight;

          const label = processValue(field.label, { data });
          const value = processValue(field.value, { data });

          const labelText = `${label}: `;
          const valueText = field.format === 'currency' ? formatCurrency(Number(value) || 0) : value;

          const isBold = field.bold || false;
          doc.setFont(section.styles.font || 'helvetica', isBold ? 'bold' : 'normal');
          doc.text(labelText, cellX + 2, cellY);
          
          const labelWidth = doc.getTextWidth(labelText);
          doc.setFont(section.styles.font || 'helvetica', isBold ? 'bold' : 'normal');
          doc.text(String(valueText), cellX + 2 + labelWidth, cellY);
        });

        currentY += boxHeight + 3;
        break;
      }

      case 'TABLE': {
        const tableData = data[section.content.dataSource || 'items'] || [];
        const columns = section.columns || [];

        if (tableData.length === 0) break;

        const headerData = columns.map((col) => processValue(col.label, { data }));
        const bodyData = tableData.map((row: any) =>
          columns.map((col) => {
            const value = row[col.key];
            if (col.format === 'currency') {
              return formatCurrency(value || 0);
            }
            if (col.format === 'date' && value) {
              return new Date(value).toLocaleDateString();
            }
            return value || '';
          })
        );

        if (section.content.showSubtotal) {
          const total = tableData.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
          bodyData.push([
            ...Array(columns.length - 1).fill(''),
            section.content.subtotalLabel || 'SUBTOTAL',
            formatCurrency(total),
          ]);
        }

        const tableHeight = tableData.length * 5 + 15;
        checkPageBreak(tableHeight);

        autoTable(doc, {
          startY: currentY,
          head: [headerData],
          body: bodyData,
          theme: 'striped',
          headStyles: {
            fillColor: section.styles.headerBackground
              ? hexToRgb(section.styles.headerBackground)
              : [59, 130, 246],
            textColor: section.styles.headerColor
              ? hexToRgb(section.styles.headerColor)
              : [255, 255, 255],
            fontStyle: 'bold',
            fontSize: section.styles.headerSize || 10,
            font: section.styles.headerFont || 'helvetica',
          },
          bodyStyles: {
            fontSize: section.styles.bodySize || 9,
            font: section.styles.bodyFont || 'helvetica',
          },
          styles: {
            cellPadding: 2,
            lineColor: section.styles.borderColor
              ? hexToRgb(section.styles.borderColor)
              : [200, 200, 200],
            lineWidth: (section.styles.borderWidth || 0.5) / 10,
            overflow: 'linebreak',
            minCellHeight: 10,
          },
          columnStyles: columns.reduce((acc, col, idx) => {
            acc[idx] = {
              halign: col.align || 'left',
              cellWidth: col.width === 'auto' ? 'auto' : (Number(col.width) || 40),
            };
            return acc;
          }, {} as Record<number, any>),
          alternateRowStyles: section.styles.alternatingRows
            ? { fillColor: [249, 250, 251] }
            : {},
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 8;
        break;
      }

      case 'SUMMARY_BOX': {
        const fields = (section.content.fields || []) as InfoBoxField[];
        const cols = section.content.columns || 4;
        const boxHeight = 20;

        checkPageBreak(boxHeight);

        const x = marginLeft;
        const width = contentWidth;
        const cellWidth = width / cols;

        doc.setFillColor(section.styles.backgroundColor || '#f3f4f6');
        doc.setDrawColor(section.styles.borderColor || '#d1d5db');
        doc.setLineWidth((section.styles.borderWidth || 1) / 10);
        doc.roundedRect(x, currentY, width, boxHeight, 2, 2, 'FD');

        fields.forEach((field, idx) => {
          const col = idx % cols;
          const cellX = x + col * cellWidth;
          const cellY = currentY + 5;

          const label = processValue(field.label, { data });
          const rawValue = processValue(field.value, { data });
          const value = field.format === 'currency' || field.highlight
            ? formatCurrency(Number(rawValue) || 0)
            : rawValue;

          if (field.highlight) {
            doc.setFillColor(
              ...hexToRgb(section.styles.headerBackground || '#22c55e')
            );
            doc.roundedRect(
              cellX + 1,
              currentY + 1,
              cellWidth - 2,
              boxHeight - 2,
              1,
              1,
              'F'
            );
            doc.setTextColor(
              ...hexToRgb(section.styles.headerColor || '#ffffff')
            );
          } else {
            const colorRgb = hexToRgb(section.styles.color || '#000000');
            doc.setTextColor(colorRgb[0], colorRgb[1], colorRgb[2]);
          }

          doc.setFont(section.styles.font || 'helvetica', field.bold ? 'bold' : 'normal');
          doc.setFontSize((section.styles.fontSize || 10) - 2);
          doc.text(label, cellX + cellWidth / 2, cellY, { align: 'center' });

          doc.setFontSize(section.styles.fontSize || 10);
          doc.text(String(value), cellX + cellWidth / 2, cellY + 5, {
            align: 'center',
          });
        });

        currentY += boxHeight + 3;
        break;
      }

      case 'NOTES': {
        const text = processValue(section.content.text || '', { data });
        if (!text) break;

        checkPageBreak(10);

        doc.setFont(section.styles.font || 'helvetica', 'italic');
        doc.setFontSize(section.styles.fontSize || 10);
        const notesColor = hexToRgb(section.styles.color || '#6b7280');
        doc.setTextColor(notesColor[0], notesColor[1], notesColor[2]);

        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, marginLeft, currentY);
        currentY += lines.length * 4 + 3;
        break;
      }

      case 'FOOTER': {
        const text = processValue(section.content.text || '', { data });

        doc.setFont(section.styles.font || 'helvetica', 'normal');
        doc.setFontSize(section.styles.fontSize || 9);
        const footerColor = hexToRgb(section.styles.color || '#6b7280');
        doc.setTextColor(footerColor[0], footerColor[1], footerColor[2]);

        const footerY = pageHeight - marginBottom + 5;
        const align = section.styles.align || 'center';

        if (text) {
          if (align === 'center') {
            doc.text(text, pageWidth / 2, footerY, { align: 'center' });
          } else if (align === 'left') {
            doc.text(text, marginLeft, footerY);
          } else {
            doc.text(text, pageWidth - marginRight, footerY, { align: 'right' });
          }
        }

        if (section.content.showPageNumbers) {
          const pageCount = doc.getNumberOfPages();
          const pageText = section.content.pageNumberFormat || 'Página {n} de {total}';
          
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const text = pageText.replace('{n}', String(i)).replace('{total}', String(pageCount));
            
            if (align === 'center') {
              doc.text(text, pageWidth / 2, footerY, { align: 'center' });
            } else if (align === 'left') {
              doc.text(text, marginLeft, footerY);
            } else {
              doc.text(text, pageWidth - marginRight, footerY, { align: 'right' });
            }
          }
        }
        break;
      }

      case 'DIVIDER': {
        checkPageBreak(5);
        
        const lineColorRgb = hexToRgb(section.styles.lineColor || '#e5e7eb');
        doc.setDrawColor(lineColorRgb[0], lineColorRgb[1], lineColorRgb[2]);
        doc.setLineWidth((section.styles.lineThickness || 1) / 10);
        
        if (section.styles.lineStyle === 'dashed') {
          const dashLength = 5;
          const gapLength = 3;
          let x = marginLeft;
          while (x < pageWidth - marginRight) {
            doc.line(x, currentY, Math.min(x + dashLength, pageWidth - marginRight), currentY);
            x += dashLength + gapLength;
          }
        } else if (section.styles.lineStyle === 'dotted') {
          const dotSpacing = 3;
          for (let x = marginLeft; x < pageWidth - marginRight; x += dotSpacing) {
            doc.circle(x, currentY, 0.5, 'F');
          }
        } else {
          doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
        }
        
        currentY += 5;
        break;
      }

      case 'EMPTY': {
        currentY += section.styles.height || 20;
        break;
      }
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
  return [0, 0, 0];
}

function colorToJsPDF(color: string | [number, number, number] | undefined): [number, number, number] {
  if (!color) return [0, 0, 0];
  if (Array.isArray(color)) return color;
  return hexToRgb(color);
}

export async function getTemplateForDocument(
  condoId: number,
  documentType: string
): Promise<PdfTemplate | null> {
  const prisma = (await import('@/lib/prisma')).default;
  
  const condo = await prisma.condominium.findUnique({ where: { id: condoId } });
  
  if (!condo) return null;
  
  let templates: Record<string, any> = {};
  
  if (condo.invoiceTemplates) {
    try {
      templates = JSON.parse(condo.invoiceTemplates);
    } catch (e) {
      console.error('Error parsing invoiceTemplates:', e);
    }
  }
  
  if (templates[documentType]) {
    return templates[documentType] as PdfTemplate;
  }
  
  return null;
}

export function getFilenameFromTemplate(
  template: PdfTemplate | null,
  defaultName: string
): string {
  const date = new Date().toISOString().split('T')[0];
  if (template?.filename) {
    return `${template.filename}_${date}.pdf`;
  }
  return `${defaultName}_${date}.pdf`;
}
