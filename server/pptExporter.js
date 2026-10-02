import JSZip from 'jszip';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

export function toThaiDigits(val) {
  return String(val).replace(/[0-9]/g, d => THAI_DIGITS[Number(d)] || d);
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function formatThaiDateRangePpt(startDateStr, endDateStr) {
  if (!startDateStr) return '-';
  const start = new Date(startDateStr + 'T00:00:00');
  if (isNaN(start.getTime())) return startDateStr;

  const startDay = start.getDate();
  const startMonth = THAI_MONTHS_SHORT[start.getMonth()];
  const startYear = String((start.getFullYear() + 543) % 100);

  if (!endDateStr || endDateStr === startDateStr) {
    return toThaiDigits(`${startDay} ${startMonth}${startYear}`);
  }

  const end = new Date(endDateStr + 'T00:00:00');
  if (isNaN(end.getTime())) {
    return toThaiDigits(`${startDay} ${startMonth}${startYear}`);
  }

  const endDay = end.getDate();
  const endMonth = THAI_MONTHS_SHORT[end.getMonth()];
  const endYear = String((end.getFullYear() + 543) % 100);

  if (startMonth === endMonth && startYear === endYear) {
    if (startDay === endDay) {
      return toThaiDigits(`${startDay} ${startMonth}${startYear}`);
    }
    return toThaiDigits(`${startDay} - ${endDay} ${startMonth}${startYear}`);
  } else {
    return toThaiDigits(`${startDay} ${startMonth}${startYear} - ${endDay} ${endMonth}${endYear}`);
  }
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function setCellText(cellXml, text, align = 'ctr') {
  // Remove existing <a:r> runs
  let cleaned = cellXml.replace(/<a:r>.*?<\/a:r>/gs, '');

  // Ensure alignment is set in pPr
  cleaned = cleaned.replace(/algn="[a-z]+"/g, `algn="${align}"`);

  if (!text) {
    return cleaned;
  }

  const escapedText = escapeXml(text);
  const runXml = `<a:r><a:rPr kumimoji="0" lang="th-TH" altLang="th-TH" sz="2000" b="0" i="0" u="none" strike="noStrike" cap="none" normalizeH="0" baseline="0" dirty="0"><a:ln><a:noFill/></a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/><a:latin typeface="TH SarabunPSK" panose="020B0500040200020003" pitchFamily="34" charset="-34"/><a:cs typeface="TH SarabunPSK" panose="020B0500040200020003" pitchFamily="34" charset="-34"/></a:rPr><a:t>${escapedText}</a:t></a:r>`;

  return cleaned.replace('<a:endParaRPr', `${runXml}<a:endParaRPr`);
}

function buildRowXml(templateRowXml, orderStr, missionStr, dateStr, isChecked = true, isAltBg = false) {
  const cells = templateRowXml.match(/<a:tc.*?<\/a:tc>/gs);
  if (!cells || cells.length < 6) return templateRowXml;

  let cell0 = setCellText(cells[0], orderStr, 'ctr');
  let cell1 = setCellText(cells[1], missionStr, 'l');
  let cell2 = setCellText(cells[2], dateStr, 'ctr');
  let cell3 = setCellText(cells[3], isChecked ? '√' : '', 'ctr');
  let cell4 = setCellText(cells[4], '', 'ctr');
  let cell5 = setCellText(cells[5], '', 'l');

  const bgHex = isAltBg ? 'ECF7E8' : 'FFFFFF';
  const applyBg = (cXml) => cXml.replace(/<a:srgbClr val="[A-Fa-f0-9]{6}"\/>/g, `<a:srgbClr val="${bgHex}"/>`);

  cell0 = applyBg(cell0);
  cell1 = applyBg(cell1);
  cell2 = applyBg(cell2);
  cell3 = applyBg(cell3);
  cell4 = applyBg(cell4);
  cell5 = applyBg(cell5);

  const rowContent = `${cell0}${cell1}${cell2}${cell3}${cell4}${cell5}`;
  return templateRowXml.replace(/<a:tc.*?<\/a:tc>/gs, () => {
    // We will replace all tc in one go
    return '';
  }).replace('<a:tr ', `<a:tr `).replace('</a:tr>', `${rowContent}</a:tr>`);
}

/**
 * Generate populated PowerPoint presentation buffer from template
 * @param {Array} missions List of mission objects
 * @returns {Promise<Buffer>}
 */
export async function generatePptxReport(missions = []) {
  // Try custom path on Desktop first, fallback to project templates
  const desktopPath = 'C:\\Users\\ICTSFC1\\Desktop\\แอพภารกิจ ผสส\\temppt.pptx';
  const fallbackPath = path.join(__dirname, 'templates', 'temppt.pptx');

  let templatePath = fallbackPath;
  if (fs.existsSync(desktopPath)) {
    templatePath = desktopPath;
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error('ไม่พบไฟล์เทมเพลต PowerPoint (temppt.pptx)');
  }

  const templateData = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(templateData);

  const slideFile = zip.file('ppt/slides/slide10.xml');
  if (!slideFile) {
    throw new Error('ไม่พบสไลด์ที่ 10 ในไฟล์เทมเพลต');
  }

  let slideXml = await slideFile.async('string');

  const tblMatch = slideXml.match(/<a:tbl>(.*?)<\/a:tbl>/s);
  if (!tblMatch) {
    throw new Error('ไม่พบตารางในสไลด์ที่ 10');
  }

  const tableXml = tblMatch[0];
  const allRows = tableXml.match(/<a:tr.*?<\/a:tr>/gs);
  if (!allRows || allRows.length < 4) {
    throw new Error('โครงสร้างแถวในตารางไม่ถูกต้อง');
  }

  // Row 0: Main Header
  // Row 1: Sub Header
  // Row 2: Fixed Row ๑
  // Row 3: Fixed Row ๒
  // Row 4..8: Empty template rows
  const headerAndFixedRows = allRows.slice(0, 4);
  const emptyTemplateRow = allRows[4];

  const populatedDataRows = [];

  // Determine total rows to output (at least 5 rows to keep wireframe table intact)
  const totalSlots = Math.max(5, missions.length);

  for (let i = 0; i < totalSlots; i++) {
    const orderNum = 3 + i;
    const orderStr = toThaiDigits(orderNum);
    const mission = missions[i];
    const isAltBg = (i % 2 === 1); // alternate row colors

    if (mission) {
      const missionText = `${mission.title || ''}${
        mission.location && !mission.title?.includes(mission.location)
          ? `, ${mission.location}`
          : ''
      }`;
      const dateText = formatThaiDateRangePpt(mission.start_date, mission.end_date);
      const rowXml = buildRowXml(emptyTemplateRow, orderStr, missionText, dateText, true, isAltBg);
      populatedDataRows.push(rowXml);
    } else {
      // Empty row with no text, preserving empty table slots
      const rowXml = buildRowXml(emptyTemplateRow, '', '', '', false, isAltBg);
      populatedDataRows.push(rowXml);
    }
  }

  // Assemble full table rows
  const newRowsXml = [...headerAndFixedRows, ...populatedDataRows].join('');

  // Replace rows in <a:tbl>
  const tblPrAndGrid = tableXml.match(/^(<a:tbl>.*?<a:tblGrid>.*?<\/a:tblGrid>)/s)?.[1] || '<a:tbl>';
  const updatedTableXml = `${tblPrAndGrid}${newRowsXml}</a:tbl>`;

  slideXml = slideXml.replace(/<a:tbl>.*?<\/a:tbl>/s, updatedTableXml);

  zip.file('ppt/slides/slide10.xml', slideXml);

  const outputBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return outputBuffer;
}
