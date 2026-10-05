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

function makeTextRun(text) {
  const escaped = escapeXml(text);
  return `<a:r><a:rPr kumimoji="0" lang="en-US" altLang="th-TH" sz="2000" b="0" i="0" u="none" strike="noStrike" cap="none" normalizeH="0" baseline="0" dirty="0"><a:ln><a:noFill/></a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/><a:latin typeface="TH SarabunPSK" panose="020B0500040200020003" pitchFamily="34" charset="-34"/><a:cs typeface="TH SarabunPSK" panose="020B0500040200020003" pitchFamily="34" charset="-34"/></a:rPr><a:t>${escaped}</a:t></a:r>`;
}

function populateSlideXml(slideXmlTemplate, slideMissions, startOrderNum, isFirstSlide = false) {
  let slideXml = slideXmlTemplate;
  const tblMatch = slideXml.match(/<a:tbl>(.*?)<\/a:tbl>/s);
  if (!tblMatch) return slideXml;

  const tableXml = tblMatch[0];
  const allRows = tableXml.match(/<a:tr.*?<\/a:tr>/gs);
  if (!allRows || allRows.length < 9) return slideXml;

  // Rows 2..8 are the 7 data rows in the template
  for (let i = 0; i < 7; i++) {
    const rowIdx = 2 + i;
    const rowXml = allRows[rowIdx];
    const cells = rowXml.match(/<a:tc.*?<\/a:tc>/gs);
    const m = slideMissions[i];

    if (m) {
      const orderStr = toThaiDigits(startOrderNum + i);
      let prefix = '';
      const loc = (m.location || '').trim();
      const locGroup1 = ['ห้องประชุม อย.1', 'ห้องประชุม อย.3', 'ห้องประชุม ศยพ.ศปก.ทอ.'];
      const locGroup2 = ['ห้องประชุม อย.2', 'โรงเลี้ยง พัน.2 กรม ปพ.อย.', 'ลานอเนกประสงค์ อาคารรณนภากาศ', 'ห้องโถง บก.อย.', 'หอพระไพรีพินาศ'];
      
      if (!m._fixedRow) {
        if (locGroup1.some(l => loc.includes(l))) {
          prefix = 'สนับสนุน จนท.ควบคุมห้องประชุม ';
        } else if (locGroup2.some(l => loc.includes(l))) {
          prefix = 'สนับสนุน จนท.และจัดเครื่องขยายเสียง ';
        } else {
          prefix = 'สนับสนุน จนท. ';
        }
      }

      // 1. Remove location text, only show prefix + title
      const missionText = `${prefix}${m.title || ''}`;
      const dateText = m.dateTextOverride || formatThaiDateRangePpt(m.start_date, m.end_date);

      // Check if future mission (isFuture)
      let isFuture = false;
      if (!m._fixedRow && m.start_date) {
        const todayStr = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Bangkok' }).split(',')[0];
        if (m.start_date > todayStr) {
          isFuture = true;
        }
      }

      // Cell 0: ลำดับ
      cells[0] = cells[0].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun(orderStr));
      // Cell 1: ภารกิจ
      cells[1] = cells[1].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun(missionText));
      // Cell 2: วันที่ปฏิบัติ
      cells[2] = cells[2].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun(dateText));
      
      // Cell 3 (เรียบร้อย), Cell 4 (ไม่เรียบร้อย), Cell 5 (หมายเหตุ)
      if (isFuture) {
        if (cells[3].includes('<a:t>√</a:t>')) {
           cells[3] = cells[3].replace('<a:t>√</a:t>', '<a:t>-</a:t>');
        } else {
           cells[3] = cells[3].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun('-'));
        }
        if (cells[4]) cells[4] = cells[4].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun('-'));
        if (cells[5]) cells[5] = cells[5].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun('อยู่ระหว่างเตรียมการ'));
      } else {
        if (!cells[3].includes('<a:t>√</a:t>')) {
           cells[3] = cells[3].replace(/<a:endParaRPr[\s\S]*?<\/a:endParaRPr>/, makeTextRun('√'));
        }
        // Template row 2 cell 3 might be cloned, so check for empty cells in other rows
      }
    } else {
      // Empty row
      if (cells[3] && cells[3].includes('<a:t>√</a:t>')) {
        // Clear checkmark from empty cloned rows
        const endParaXml = `<a:endParaRPr kumimoji="0" lang="en-US" altLang="th-TH" sz="2000" b="0" i="0" u="none" strike="noStrike" cap="none" normalizeH="0" baseline="0" dirty="0"><a:ln><a:noFill/></a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:effectLst/><a:latin typeface="TH SarabunPSK" panose="020B0500040200020003" pitchFamily="34" charset="-34"/><a:cs typeface="TH SarabunPSK" panose="020B0500040200020003" pitchFamily="34" charset="-34"/></a:endParaRPr>`;
        cells[3] = cells[3].replace(/<a:r>[\s\S]*?<\/a:r>/, endParaXml);
      }
    }

    let cIdx = 0;
    const updatedRow = rowXml.replace(/<a:tc[\s\S]*?<\/a:tc>/g, () => cells[cIdx++]);
    slideXml = slideXml.replace(rowXml, updatedRow);
  }

  return slideXml;
}

/**
 * Generate populated PowerPoint presentation buffer from template
 * @param {Array} missions List of mission objects
 * @returns {Promise<Buffer>}
 */
export async function generatePptxReport(missions = []) {
  // Requirement 4 & 5: Always add 2 fixed missions at the top
  const fixedMission1 = {
    _fixedRow: true,
    title: 'สนับสนุน จนท.ควบคุมห้องประชุม ศปก.อย.เขตพระราชฐาน พระตำหนักที่ประทับ ๙๐๔ ดอนเมือง',
    start_date: 'FIXED1',
    dateTextOverride: 'ทุกวัน เวลา ๐๗๐๐',
  };
  const fixedMission2 = {
    _fixedRow: true,
    title: 'สนับสนุน จนท.จัดเครื่องเสียงเคารพธงชาติ',
    start_date: 'FIXED2',
    dateTextOverride: 'ทุกวันราชการ เวลา ๐๗๓๐',
  };
  
  missions = [fixedMission1, fixedMission2, ...missions];

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

  // Dynamically find the target slide containing the missions table
  const slideFiles = Object.keys(zip.files).filter(k => k.startsWith('ppt/slides/slide') && k.endsWith('.xml'));
  let targetSlidePath = null;
  let slideXmlTemplate = null;

  for (const sPath of slideFiles) {
    const xml = await zip.file(sPath).async('string');
    if (xml.includes('ภารกิจ') && xml.includes('ผลการปฏิบัติงาน')) {
      targetSlidePath = sPath;
      slideXmlTemplate = xml;
      break;
    }
  }

  if (!targetSlidePath || !slideXmlTemplate) {
    throw new Error('ไม่พบสไลด์ที่มีตารางภารกิจในไฟล์เทมเพลต');
  }

  const s1Rels = await zip.file('ppt/slides/_rels/slide1.xml.rels')?.async('string') ||
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout4.xml"/></Relationships>';

  const SLOTS_PER_SLIDE = 7;
  const numSlides = Math.max(1, Math.ceil(missions.length / SLOTS_PER_SLIDE));

  let presXml = await zip.file('ppt/presentation.xml').async('string');
  let presRels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  let ctXml = await zip.file('[Content_Types].xml').async('string');

  let currentOrder = 3; // Order starts at Thai number ๓ (3)

  for (let s = 1; s <= numSlides; s++) {
    const slideMissions = missions.slice((s - 1) * SLOTS_PER_SLIDE, s * SLOTS_PER_SLIDE);
    const populatedXml = populateSlideXml(slideXmlTemplate, slideMissions, currentOrder, s === 1);
    currentOrder += slideMissions.length;

    const slideFileName = `slide${s}.xml`;
    zip.file(`ppt/slides/${slideFileName}`, populatedXml);
    zip.file(`ppt/slides/_rels/${slideFileName}.rels`, s1Rels);

    if (s > 1) {
      const relId = `rIdSlide${s}`;
      const sldId = 4840 + s;
      presRels = presRels.replace('</Relationships>', `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${slideFileName}"/></Relationships>`);
      presXml = presXml.replace('</p:sldIdLst>', `<p:sldId id="${sldId}" r:id="${relId}"/></p:sldIdLst>`);
      ctXml = ctXml.replace('</Types>', `<Override PartName="/ppt/slides/${slideFileName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
    }
  }

  zip.file('ppt/presentation.xml', presXml);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);
  zip.file('[Content_Types].xml', ctXml);

  const outputBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return outputBuffer;
}
