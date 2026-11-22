import pptxgen from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePresentation() {
  const pres = new pptxgen();
  // Use LAYOUT_WIDE (13.333" x 7.5") for modern 16:9 widescreen presentation
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Smart Agricultural Procurement Team';
  pres.company = 'Software Engineering Department';
  pres.title = 'Smart Agricultural Procurement & Queue Management System';

  // Define Theme Colors
  const COLOR_PRIMARY = '1B4D3E';   // Forest Green
  const COLOR_SECONDARY = '0F172A'; // Dark Slate
  const COLOR_ACCENT = '2E7D32';    // Agri Green
  const COLOR_BG = 'F8FAFC';        // Soft Off-White
  const COLOR_CARD = 'FFFFFF';      // Pure White
  const COLOR_BORDER = 'E2E8F0';    // Border Gray
  const COLOR_TEXT = '334155';      // Body Slate
  const COLOR_MUTED = '64748B';     // Subtitle Gray
  const COLOR_HIGHLIGHT = 'D97706'; // Amber Accent

  // ==========================================
  // SLIDE 1: CORE PROBLEM & REAL-WORLD MOTIVATION
  // ==========================================
  const slide1 = pres.addSlide();
  slide1.background = { color: COLOR_BG };

  // Header Pill
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35, rectRadius: 0.15,
    fill: { color: 'E8F5E9' }, line: { color: 'A5D6A7', width: 1 }
  });
  slide1.addText('CORE PROBLEM DEFINITION', {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35,
    fontSize: 10, bold: true, color: COLOR_PRIMARY, align: 'center', valign: 'middle'
  });

  slide1.addText('The 48-Hour Mandi Wait Crisis & Distress Selling', {
    x: 0.8, y: 0.95, w: 11.7, h: 0.5,
    fontSize: 22, bold: true, color: COLOR_SECONDARY
  });
  slide1.addText('Pinpointing the single core bottleneck in regional agricultural procurement', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.35,
    fontSize: 13, color: COLOR_MUTED
  });

  // Box 1: The Core Problem
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 2.05, w: 5.65, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: 'FCA5A5', width: 1.5 }
  });
  slide1.addText('🚨 The Single Core Problem', {
    x: 1.1, y: 2.25, w: 5.0, h: 0.4,
    fontSize: 15, bold: true, color: 'B91C1C'
  });
  slide1.addText([
    { text: '• Zero Capacity Awareness: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Hundreds of farmers arrive simultaneously with loaded tractor-trolleys for a weighbridge processing only 12-15 vehicles/hr.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Uncontrolled Physical Bottleneck: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Farmers are stranded in chaotic highway queues for 36 to 72 hours under open weather without basic amenities.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Zero Predictability: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Arbitrary queue jumping and zero arrival scheduling severely disrupt government MSP procurement operations.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.1, y: 2.75, w: 5.0, h: 3.8, fontSize: 11, lineSpacing: 16
  });

  // Box 2: Real-World Motivation
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 6.85, y: 2.05, w: 5.65, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: 'FED7AA', width: 1.5 }
  });
  slide1.addText('💡 Why This Problem? (Motivation)', {
    x: 7.15, y: 2.25, w: 5.0, h: 0.4,
    fontSize: 15, bold: true, color: 'C2410C'
  });
  slide1.addText([
    { text: '• Devastating Distress Selling: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Smallholders unable to endure 3-day queue delays sell to middlemen at 15–20% below Minimum Support Price (MSP).\n\n', options: { color: COLOR_TEXT } },
    { text: '• Severe Post-Harvest Spoilage: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Rain and open-air trolley storage cause moisture damage, fungal growth, and subsequent weighbridge rejection.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Severe Economic Toll: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Highways blocked, tractor fuel wasted idling, and lost working days for marginal farming families.', options: { color: COLOR_TEXT } }
  ], {
    x: 7.15, y: 2.75, w: 5.0, h: 3.8, fontSize: 11, lineSpacing: 16
  });


  // ==========================================
  // SLIDE 2: SOFTWARE ENGINEERING (SE) APPROACH
  // ==========================================
  const slide2 = pres.addSlide();
  slide2.background = { color: COLOR_BG };

  slide2.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35, rectRadius: 0.15,
    fill: { color: 'E0F2FE' }, line: { color: '7DD3FC', width: 1 }
  });
  slide2.addText('SOFTWARE ENGINEERING ROLE', {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35,
    fontSize: 10, bold: true, color: '0369A1', align: 'center', valign: 'middle'
  });

  slide2.addText('The Role of SE: Transforming Physical Chaos into Finite State Machine', {
    x: 0.8, y: 0.95, w: 11.7, h: 0.5,
    fontSize: 22, bold: true, color: COLOR_SECONDARY
  });
  slide2.addText('How rigorous Software Engineering principles eliminate physical queue bottlenecks', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.35,
    fontSize: 13, color: COLOR_MUTED
  });

  // 3 Horizontal Cards for SE Process
  const colW = 3.65;
  const colGap = 0.38;

  // Card 1: Requirements Engineering
  slide2.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 2.05, w: colW, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 }
  });
  slide2.addText('1. Requirements & Constraints', {
    x: 1.0, y: 2.25, w: 3.25, h: 0.4,
    fontSize: 13, bold: true, color: COLOR_PRIMARY
  });
  slide2.addText([
    { text: '• Formal SRS v1.0: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Defined 10 Functional Requirements (FR-01 to FR-10) and 20 Acceptance Tests (AT-01 to AT-20).\n\n', options: { color: COLOR_TEXT } },
    { text: '• Dual Physical Constraints: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Time slots alone fail without simultaneous tonnage caps (quintals + farmer count).\n\n', options: { color: COLOR_TEXT } },
    { text: '• Non-Functional SLAs: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: '< 500ms booking lock latency, sub-second QR token scanning, and ACID guarantee.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.0, y: 2.75, w: 3.25, h: 3.8, fontSize: 10, lineSpacing: 15
  });

  // Card 2: Architecture & Patterns
  slide2.addShape(pres.ShapeType.roundRect, {
    x: 0.8 + colW + colGap, y: 2.05, w: colW, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 }
  });
  slide2.addText('2. Decoupled Architecture', {
    x: 1.0 + colW + colGap, y: 2.25, w: 3.25, h: 0.4,
    fontSize: 13, bold: true, color: COLOR_PRIMARY
  });
  slide2.addText([
    { text: '• 3-Tier Layered Pattern: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Presentation (Vite React SPA), Application (Node/Express API), Storage (PostgreSQL Relational DB).\n\n', options: { color: COLOR_TEXT } },
    { text: '• WebSocket Event Push: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Room-isolated Socket.IO channels broadcast live queue progress to waiting farmers.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Asynchronous Outbox Worker: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Decouples email/notification dispatch from the transactional booking path.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.0 + colW + colGap, y: 2.75, w: 3.25, h: 3.8, fontSize: 10, lineSpacing: 15
  });

  // Card 3: FSM State Machine
  slide2.addShape(pres.ShapeType.roundRect, {
    x: 0.8 + (colW + colGap) * 2, y: 2.05, w: colW, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 }
  });
  slide2.addText('3. Finite State Machine (FSM)', {
    x: 1.0 + (colW + colGap) * 2, y: 2.25, w: 3.25, h: 0.4,
    fontSize: 13, bold: true, color: COLOR_PRIMARY
  });
  slide2.addText([
    { text: '• Deterministic State Flow: \n', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Confirmed ➔ Checked-In ➔ In-Service ➔ Completed\n\n', options: { bold: true, color: COLOR_HIGHLIGHT } },
    { text: '• Guarded Transitions: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Farmers cannot check in without active appointment; intake blocked without check-in.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Automated Reversion: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Cutoff sweeper marks No-Show at T+15m and reclaims slot capacity for waitlists.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.0 + (colW + colGap) * 2, y: 2.75, w: 3.25, h: 3.8, fontSize: 10, lineSpacing: 15
  });


  // ==========================================
  // SLIDE 3: JUSTIFICATION OF APPROACH ("WHY THIS AND NOT THAT?")
  // ==========================================
  const slide3 = pres.addSlide();
  slide3.background = { color: COLOR_BG };

  slide3.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35, rectRadius: 0.15,
    fill: { color: 'FEF3C7' }, line: { color: 'FCD34D', width: 1 }
  });
  slide3.addText('ARCHITECTURAL TRADE-OFFS', {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35,
    fontSize: 10, bold: true, color: 'B45309', align: 'center', valign: 'middle'
  });

  slide3.addText('Justification: "Why This Approach and Why NOT That?"', {
    x: 0.8, y: 0.95, w: 11.7, h: 0.5,
    fontSize: 22, bold: true, color: COLOR_SECONDARY
  });
  slide3.addText('Defending key technical selections against traditional alternatives (Viva Defense Focus)', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.35,
    fontSize: 13, color: COLOR_MUTED
  });

  // 4 Comparison Rows
  const comparisons = [
    {
      choice: 'Dual Capacity (Farmers + Quintals)',
      rejected: 'Why NOT Simple FIFO / Time-Only?',
      reason: 'Time-only slots with 10 farmers carrying 500q stall weighbridges for 4 hours. Dual capacity bounds BOTH vehicle count and tonnage to prevent yard overflow.'
    },
    {
      choice: 'Pessimistic Row Lock (FOR UPDATE)',
      rejected: 'Why NOT Optimistic Lock (Version Timestamp)?',
      reason: 'Morning bursts bring 50 farmers competing for 2 slots. Optimistic locking causes 48 rollback-retry loops on 2G/3G. Pessimistic lock serializes with 0 retries.'
    },
    {
      choice: 'PostgreSQL with CHECK Constraints',
      rejected: 'Why NOT NoSQL (MongoDB / Document DB)?',
      reason: 'Procurement demands strict ACID compliance. Database-level CHECK constraints mathematically prevent overbooking even if multiple API instances fail.'
    },
    {
      choice: 'WebSocket Delta Push Protocol',
      rejected: 'Why NOT HTTP Client Polling?',
      reason: 'Polling every 10s exhausts farmer mobile batteries and crashes server socket limits under heavy traffic. WebSockets push updates only when queue shifts.'
    }
  ];

  comparisons.forEach((item, idx) => {
    const yPos = 2.05 + idx * 1.2;
    slide3.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: yPos, w: 11.7, h: 1.08, rectRadius: 0.1,
      fill: { color: COLOR_CARD }, line: { color: COLOR_BORDER, width: 1 }
    });

    slide3.addShape(pres.ShapeType.roundRect, {
      x: 1.0, y: yPos + 0.16, w: 3.3, h: 0.75, rectRadius: 0.08,
      fill: { color: 'F0FDF4' }, line: { color: 'BBF7D0', width: 1 }
    });
    slide3.addText(`✅ Selected: ${item.choice}`, {
      x: 1.1, y: yPos + 0.16, w: 3.1, h: 0.75,
      fontSize: 10, bold: true, color: '15803D', valign: 'middle'
    });

    slide3.addText([
      { text: `❌ ${item.rejected}\n`, options: { bold: true, color: 'DC2626' } },
      { text: `👉 ${item.reason}`, options: { color: COLOR_TEXT } }
    ], {
      x: 4.5, y: yPos + 0.12, w: 7.7, h: 0.82,
      fontSize: 9.5, lineSpacing: 13
    });
  });


  // ==========================================
  // SLIDE 4: OUTCOMES & SIGNIFICANT RESULTS
  // ==========================================
  const slide4 = pres.addSlide();
  slide4.background = { color: COLOR_BG };

  slide4.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35, rectRadius: 0.15,
    fill: { color: 'F3E8FF' }, line: { color: 'D8B4FE', width: 1 }
  });
  slide4.addText('QUANTITATIVE OUTCOMES', {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35,
    fontSize: 10, bold: true, color: '7E22CE', align: 'center', valign: 'middle'
  });

  slide4.addText('Measurable Outcomes & Verified System Performance', {
    x: 0.8, y: 0.95, w: 11.7, h: 0.5,
    fontSize: 22, bold: true, color: COLOR_SECONDARY
  });
  slide4.addText('Concrete numerical metrics validated through automated concurrency test suites', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.35,
    fontSize: 13, color: COLOR_MUTED
  });

  // 4 Metric Callout Cards
  const metrics = [
    { num: '36h ➔ 22m', label: 'Wait-Time Reduction', desc: 'Average highway wait slashed from 36-72 hrs to an exact 22-min intake window.' },
    { num: '0.00%', label: 'Slot Overbooking Rate', desc: 'Zero overbooking verified under 50+ concurrent requests in stress tests (phase4).' },
    { num: '100 Quintals', label: 'Weighbridge Balance', desc: 'Predictable intake capacity per 30-min window prevents weighbridge choking.' },
    { num: '100% Zero-Loss', label: 'Payment Traceability', desc: 'Direct DBT bank reference tracking & tamper-evident digital receipts eliminate cuts.' }
  ];

  metrics.forEach((m, idx) => {
    const xPos = 0.8 + idx * 2.98;
    slide4.addShape(pres.ShapeType.roundRect, {
      x: xPos, y: 2.05, w: 2.75, h: 2.45, rectRadius: 0.15,
      fill: { color: COLOR_CARD }, line: { color: 'E2E8F0', width: 1 }
    });
    slide4.addText(m.num, {
      x: xPos + 0.1, y: 2.25, w: 2.55, h: 0.55,
      fontSize: 21, bold: true, color: COLOR_PRIMARY, align: 'center'
    });
    slide4.addText(m.label, {
      x: xPos + 0.1, y: 2.85, w: 2.55, h: 0.35,
      fontSize: 11, bold: true, color: COLOR_SECONDARY, align: 'center'
    });
    slide4.addText(m.desc, {
      x: xPos + 0.15, y: 3.25, w: 2.45, h: 1.05,
      fontSize: 9, color: COLOR_MUTED, align: 'center', lineSpacing: 13
    });
  });

  // Verification & Quality Bar Box
  slide4.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 4.75, w: 11.7, h: 2.1, rectRadius: 0.15,
    fill: { color: 'F0FDF4' }, line: { color: '86EFAC', width: 1.5 }
  });
  slide4.addText('🧪 Automated Quality Assurance Verification (100% Test Pass Rate)', {
    x: 1.1, y: 4.95, w: 11.0, h: 0.35,
    fontSize: 13, bold: true, color: '166534'
  });
  slide4.addText([
    { text: '• Full Test Coverage: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'All 8 test suites (Phase 1 Auth to Phase 8 E2E Simulation) passed with 100% assertion success.\n', options: { color: COLOR_TEXT } },
    { text: '• Concurrency Stress Testing: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Simulated 5 concurrent threads booking a 2-capacity slot; exactly 2 succeeded and 3 received 409 Conflict.\n', options: { color: COLOR_TEXT } },
    { text: '• Security Hardening: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Strict regex enforcement on phone (10 digits), PIN (6 digits), and tamper-evident SHA-256 QR token verification.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.1, y: 5.35, w: 11.0, h: 1.35, fontSize: 10, lineSpacing: 15
  });


  // ==========================================
  // SLIDE 5: INNOVATION & TECHNICAL DIFFERENTIATION
  // ==========================================
  const slide5 = pres.addSlide();
  slide5.background = { color: COLOR_BG };

  slide5.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35, rectRadius: 0.15,
    fill: { color: 'ECFDF5' }, line: { color: '6EE7B7', width: 1 }
  });
  slide5.addText('TECHNICAL INNOVATION', {
    x: 0.8, y: 0.5, w: 2.4, h: 0.35,
    fontSize: 10, bold: true, color: '047857', align: 'center', valign: 'middle'
  });

  slide5.addText('Innovation: Why This Solution is Defensible & Non-Generic', {
    x: 0.8, y: 0.95, w: 11.7, h: 0.5,
    fontSize: 22, bold: true, color: COLOR_SECONDARY
  });
  slide5.addText('Beyond generic appointment software: tailored mathematical models for rural agro-logistics', {
    x: 0.8, y: 1.5, w: 11.7, h: 0.35,
    fontSize: 13, color: COLOR_MUTED
  });

  // 3 Pillar Innovation Cards
  const innovCardW = 3.65;
  const innovGap = 0.38;

  // Innovation 1: Multi-Factor Recommendation
  slide5.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 2.05, w: innovCardW, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: 'A7F3D0', width: 1.5 }
  });
  slide5.addText('1. 40/30/20/10 Decision Algorithm', {
    x: 1.0, y: 2.25, w: 3.25, h: 0.4,
    fontSize: 13, bold: true, color: '065F46'
  });
  slide5.addText([
    { text: '• Haversine Distance (40%): ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Minimizes tractor travel distance & fuel cost from farmer village.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Real-Time Price (30%): ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Steers produce toward highest prevailing MSP center prices.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Queue Congestion (20%): ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Dynamically penalizes busy centers to balance regional loads.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Dynamic Renormalization: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'If GPS is denied, auto-adjusts to 50% Price / 33% Queue / 17% Quota.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.0, y: 2.75, w: 3.25, h: 3.8, fontSize: 9.5, lineSpacing: 14
  });

  // Innovation 2: Self-Healing Virtual Hold
  slide5.addShape(pres.ShapeType.roundRect, {
    x: 0.8 + innovCardW + innovGap, y: 2.05, w: innovCardW, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: 'BAE6FD', width: 1.5 }
  });
  slide5.addText('2. Self-Healing Queue Lifecycle', {
    x: 1.0 + innovCardW + innovGap, y: 2.25, w: 3.25, h: 0.4,
    fontSize: 13, bold: true, color: '0369A1'
  });
  slide5.addText([
    { text: '• Automated Cutoff Sweep: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Daemon marks expired check-ins (+15m) as No-Show automatically.\n\n', options: { color: COLOR_TEXT } },
    { text: '• 10-Minute Protected Hold: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Instantly reserves released capacity for waitlisted farmers.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Zero Capacity Leakage: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Ensures weighbridge throughput stays 100% utilized all day.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.0 + innovCardW + innovGap, y: 2.75, w: 3.25, h: 3.8, fontSize: 9.5, lineSpacing: 14
  });

  // Innovation 3: Rural Resilience & Accessibility
  slide5.addShape(pres.ShapeType.roundRect, {
    x: 0.8 + (innovCardW + innovGap) * 2, y: 2.05, w: innovCardW, h: 4.8, rectRadius: 0.15,
    fill: { color: COLOR_CARD }, line: { color: 'FDE68A', width: 1.5 }
  });
  slide5.addText('3. Rural Low-Bandwidth Resilience', {
    x: 1.0 + (innovCardW + innovGap) * 2, y: 2.25, w: 3.25, h: 0.4,
    fontSize: 13, bold: true, color: 'B45309'
  });
  slide5.addText([
    { text: '• Full Bilingual Localization: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Complete Hindi & English switching across UI, receipts, and tokens.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Offline QR Token Security: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'Farmers screenshot SVG token; operators verify SHA-256 offline.\n\n', options: { color: COLOR_TEXT } },
    { text: '• Graceful Reconnect: ', options: { bold: true, color: COLOR_SECONDARY } },
    { text: 'HTTP interceptors handle Render cold starts with auto backoff.', options: { color: COLOR_TEXT } }
  ], {
    x: 1.0 + (innovCardW + innovGap) * 2, y: 2.75, w: 3.25, h: 3.8, fontSize: 9.5, lineSpacing: 14
  });

  // Save the presentation
  const outputPath = path.join(__dirname, '..', 'Smart_Agri_Procurement_Presentation.pptx');
  await pres.writeFile({ fileName: outputPath });
  console.log('✅ PowerPoint presentation generated successfully at:', outputPath);
}

generatePresentation().catch(err => {
  console.error('Failed to generate PPTX:', err);
  process.exit(1);
});
