const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const COLOR_BG = '0F172A';
const COLOR_CARD = '1E293B';
const COLOR_BORDER = '334155';
const COLOR_TEXT = 'F8FAFC';
const COLOR_MUTED = '94A3B8';
const COLOR_PRIMARY = '0EA5E9';
const COLOR_SUCCESS = '10B981';
const COLOR_WARN = 'F59E0B';
const COLOR_DANGER = 'EF4444';

function createShapeOptions(fillColor, lineColor, radius) {
  return {
    fill: { color: fillColor },
    line: { color: lineColor, width: 1 },
    rectRadius: radius || 0.08
  };
}

function addStandardHeader(slide, trackerText, titleText) {
  slide.addText(
    [
      {
        text: trackerText.toUpperCase(),
        options: {
          fontSize: 9.5,
          color: COLOR_PRIMARY,
          bold: true,
          charSpacing: 1.5,
          breakLine: true,
          fontFace: 'Arial',
          paraSpaceAfter: 4
        }
      },
      {
        text: titleText,
        options: {
          fontSize: 22,
          color: COLOR_TEXT,
          bold: true,
          fontFace: 'Arial'
        }
      }
    ],
    { x: 0.8, y: 0.35, w: 8.4, h: 0.75, margin: 0, valign: 'top' }
  );
}

function buildDeck() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  const slide1 = pres.addSlide();
  slide1.background = { color: COLOR_BG };
  slide1.addShape(
    pres.ShapeType.roundRect,
    Object.assign({ x: 0.8, y: 0.5, w: 8.4, h: 4.62 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.12))
  );

  slide1.addText(
    [
      {
        text: 'AHMADU BELLO UNIVERSITY, ZARIA  •  FACULTY OF PHYSICAL SCIENCES',
        options: {
          fontSize: 10.5,
          color: COLOR_PRIMARY,
          bold: true,
          charSpacing: 1.5,
          breakLine: true,
          fontFace: 'Arial',
          paraSpaceAfter: 4
        }
      },
      {
        text: 'DEPARTMENT OF COMPUTER SCIENCE',
        options: {
          fontSize: 11.5,
          color: COLOR_MUTED,
          bold: true,
          charSpacing: 1.2,
          breakLine: true,
          fontFace: 'Arial',
          paraSpaceAfter: 16
        }
      },
      {
        text: 'SMART OFFICE APPLIANCE CONTROL SYSTEM (SAOCS)',
        options: {
          fontSize: 22,
          color: COLOR_TEXT,
          bold: true,
          breakLine: true,
          fontFace: 'Arial',
          paraSpaceAfter: 10
        }
      },
      {
        text: 'An IoT-Enabled Hardware-Software Architecture for Commercial Energy Optimization and Remote Auditability',
        options: {
          fontSize: 12.5,
          color: COLOR_MUTED,
          fontFace: 'Arial'
        }
      }
    ],
    { x: 1.0, y: 0.85, w: 8.0, h: 2.1, margin: 0, align: 'center', valign: 'top' }
  );

  slide1.addShape(
    pres.ShapeType.roundRect,
    Object.assign({ x: 1.4, y: 3.1, w: 7.2, h: 1.65 }, createShapeOptions(COLOR_BG, COLOR_BORDER, 0.1))
  );

  slide1.addText(
    [
      {
        text: 'CANDIDATE PROFILE',
        options: { fontSize: 9.0, color: COLOR_PRIMARY, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 }
      },
      {
        text: 'Jesutoyin Adeshina',
        options: { fontSize: 13, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 }
      },
      {
        text: 'Matriculation Number: U21CS1119',
        options: { fontSize: 10.5, color: COLOR_MUTED, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 }
      },
      {
        text: 'Degree: B.Sc. Computer Science',
        options: { fontSize: 10.5, color: COLOR_MUTED, fontFace: 'Arial' }
      }
    ],
    { x: 1.7, y: 3.3, w: 3.3, h: 1.3, margin: 0, align: 'left', valign: 'top' }
  );

  slide1.addText(
    [
      {
        text: 'ACADEMIC INSTITUTION & SESSION',
        options: { fontSize: 9.0, color: COLOR_PRIMARY, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 }
      },
      {
        text: 'Faculty of Physical Sciences',
        options: { fontSize: 12, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 }
      },
      {
        text: 'Ahmadu Bello University, Zaria, Nigeria',
        options: { fontSize: 10.5, color: COLOR_MUTED, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 }
      },
      {
        text: 'Academic Session Defense • April 2026',
        options: { fontSize: 10.5, color: COLOR_SUCCESS, bold: true, fontFace: 'Arial' }
      }
    ],
    { x: 5.2, y: 3.3, w: 3.2, h: 1.3, margin: 0, align: 'left', valign: 'top' }
  );

  slide1.addNotes(
    'Good day, respected supervisor, internal and external examiners, and members of the panel. My name is Jesutoyin Adeshina, matriculation number U21CS1119. Today, I am proud to present the design and implementation of the Smart Office Appliance Control System—SAOCS. This project addresses the critical intersection of energy conservation, electrical safety, and modern distributed IoT architectures within the Nigerian office landscape.'
  );

  const slide2 = pres.addSlide();
  slide2.background = { color: COLOR_BG };
  addStandardHeader(slide2, 'Research Context & Motivation', 'Problem Statement & Motivation');

  const s2Cards = [
    {
      x: 0.8,
      tag: 'PHANTOM WASTAGE',
      tagColor: COLOR_DANGER,
      title: 'Electrical Energy Waste',
      stat: '> 30%',
      statColor: COLOR_DANGER,
      label: 'Preventable Commercial Consumption',
      bullets: [
        'Commercial office buildings incur heavy operational costs from unmonitored lighting, fans, and cooling units left running after business hours and over weekends.',
        'Continuous baseline loads draw electricity uninterrupted due to absence of automated shutdown controls or centralized enforcement schedules.'
      ]
    },
    {
      x: 3.68,
      tag: 'FACILITY GOVERNANCE',
      tagColor: COLOR_WARN,
      title: 'Manual Facility Auditing',
      stat: '0 Logs',
      statColor: COLOR_WARN,
      label: 'Zero Historical Runtime Auditability',
      bullets: [
        'Nigerian commercial facilities rely predominantly on manual physical inspection rounds conducted by security personnel or caretakers.',
        'Routine human oversight results in uncorrected loads, complete lack of structured audit trails, untracked energy use, and delayed fault detection.'
      ]
    },
    {
      x: 6.56,
      tag: 'TARIFF REALITIES',
      tagColor: COLOR_PRIMARY,
      title: 'Tariff Pressures & Deficits',
      stat: '₦209.5',
      statColor: COLOR_PRIMARY,
      label: 'NERC Kaduna Electric Band A / kWh',
      bullets: [
        'Band A commercial electricity tariffs leave zero financial margin for unmetered appliance runtime and unmonitored operational waste.',
        'Chronic electrical power instability demands autonomous state recovery, local switch persistence, and rigorous load visibility.'
      ]
    }
  ];

  s2Cards.forEach(function (card) {
    slide2.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: card.x, y: 1.25, w: 2.64, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const cardRuns = [
      { text: card.tag, options: { fontSize: 9.0, color: card.tagColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: card.title, options: { fontSize: 14, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 8 } },
      { text: card.stat, options: { fontSize: 26, color: card.statColor, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 } },
      { text: card.label, options: { fontSize: 8.5, color: COLOR_MUTED, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    card.bullets.forEach(function (bulletText, bIdx) {
      cardRuns.push({
        text: bulletText,
        options: {
          fontSize: 9.0,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < card.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 6
        }
      });
    });

    slide2.addText(cardRuns, { x: card.x + 0.16, y: 1.4, w: 2.32, h: 3.5, margin: 0, valign: 'top' });
  });

  slide2.addNotes(
    'Commercial organizations across Nigeria face significant operating expenditure from electricity consumption. Lighting, fans, and cooling units left running after business hours waste hundreds of kilowatt-hours weekly. Physical inspection by facility guards is error-prone, inefficient, and provides zero historical auditing. Furthermore, with recent Band A tariff adjustments, every hour of unmonitored appliance runtime creates substantial financial strain. Our goal was to design an IoT solution engineered specifically to eliminate this operational deficit.'
  );

  const slide3 = pres.addSlide();
  slide3.background = { color: COLOR_BG };
  addStandardHeader(slide3, 'Project Proposal Contract', 'Research Objectives');

  const s3Objectives = [
    {
      badge: 'OBJ I',
      title: 'Construct Embedded Hardware Switching Module',
      detail: 'Construct an embedded microcontroller hardware switching module utilizing optocoupler isolation, flyback diode protection, and dual physical/digital input switching.'
    },
    {
      badge: 'OBJ II',
      title: 'Implement Bi-Directional MQTT Telemetry Pipeline',
      detail: 'Implement a lightweight, bi-directional IoT messaging pipeline over MQTT with QoS 1 telemetry, per-device topic isolation, and Last Will and Testament status tracking.'
    },
    {
      badge: 'OBJ III',
      title: 'Engineer Single-Authority Arbitration & NVS Recovery',
      detail: 'Engineer a single-authority hardware arbitration engine with 1000ms debounce protection, conflict resolution, and non-volatile flash (Preferences NVS) state recovery.'
    },
    {
      badge: 'OBJ IV',
      title: 'Develop Accessible Web Application & Async Backend',
      detail: 'Develop an accessible, responsive web application (React 19 + Tailwind CSS) and async REST/WebSocket backend (FastAPI) providing live synchronization and role-based administration.'
    },
    {
      badge: 'OBJ V',
      title: 'Formulate Band A Energy Model & Benchmark Performance',
      detail: 'Formulate an empirical Kaduna Electric Band A energy estimation model and rigorously evaluate system latency, synchronization, and fault degradation against sub-500ms targets.'
    }
  ];

  s3Objectives.forEach(function (obj, idx) {
    const rowY = 1.22 + idx * 0.74;
    slide3.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: 0.8, y: rowY, w: 8.4, h: 0.65 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    slide3.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: 0.95, y: rowY + 0.12, w: 0.85, h: 0.41 }, createShapeOptions(COLOR_BORDER, COLOR_BORDER, 0.06))
    );

    slide3.addText(obj.badge, {
      x: 0.95,
      y: rowY + 0.12,
      w: 0.85,
      h: 0.41,
      margin: 0,
      fontSize: 10,
      color: COLOR_PRIMARY,
      bold: true,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial'
    });

    slide3.addText(
      [
        {
          text: obj.title,
          options: { fontSize: 10.5, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 }
        },
        {
          text: obj.detail,
          options: { fontSize: 8.8, color: COLOR_MUTED, fontFace: 'Arial' }
        }
      ],
      { x: 1.95, y: rowY + 0.1, w: 7.1, h: 0.45, margin: 0, valign: 'top' }
    );
  });

  slide3.addNotes(
    'To solve this problem systematically, this research established five core objectives directly fulfilling our academic project proposal: First, constructing the physical embedded switching layer with industrial-grade galvanic isolation. Second, implementing a robust MQTT telemetry protocol that operates through firewalls and mobile hotspots. Third, developing single-authority arbitration to resolve switch conflicts and maintain NVS state memory. Fourth, delivering an accessible, real-time web dashboard with audit logging. And fifth, integrating localized energy cost modeling and benchmarking system performance against sub-500ms latency targets.'
  );

  const slide4 = pres.addSlide();
  slide4.background = { color: COLOR_BG };
  addStandardHeader(slide4, 'End-to-End Distributed Pipeline', 'Proposed System Architecture & Dataflow');

  const s4Tiers = [
    {
      x: 0.8,
      badge: 'TIER 1',
      badgeColor: COLOR_PRIMARY,
      title: 'Edge Hardware',
      sub: 'Microcontroller Layer',
      bullets: [
        'ESP32-WROOM-32 (240MHz, 520KB SRAM)',
        '4-Channel Relays (GPIO 16–19)',
        'Wall Switches (GPIO 32–35)',
        'Preferences NVS Flash Persistence',
        'PC817 Galvanic Optoisolation',
        'Outbound TLS MQTTS Only'
      ]
    },
    {
      x: 2.95,
      badge: 'TIER 2',
      badgeColor: COLOR_SUCCESS,
      title: 'Message Broker',
      sub: 'MQTTS Ingestion Hub',
      bullets: [
        'Eclipse Mosquitto 2.x Broker',
        'Port 8883 (TLS Encrypted)',
        'Topic: office/<id>/command',
        'Topic: office/<id>/state',
        'LWT: office/<id>/status',
        'Per-Device ACL Isolation'
      ]
    },
    {
      x: 5.1,
      badge: 'TIER 3',
      badgeColor: COLOR_WARN,
      title: 'Application Core',
      sub: 'FastAPI Backend',
      bullets: [
        'Python 3.12 + FastAPI asyncio',
        'Async SQLAlchemy + SQLite WAL',
        'Background aiomqtt Consumer',
        'WebSocket Broadcast Pool',
        'In-Memory 1000ms Debounce',
        'Automated Cron Scheduler'
      ]
    },
    {
      x: 7.25,
      badge: 'TIER 4',
      badgeColor: COLOR_PRIMARY,
      title: 'Presentation',
      sub: 'Client Interface',
      bullets: [
        'React 19 + TypeScript + Vite',
        'Tailwind CSS v4 Design Tokens',
        'TanStack Query v5 Direct Push',
        '44px Minimum Touch Targets',
        'Caddy Proxy + ACME TLS',
        '115 KB Cellular Bundle'
      ]
    }
  ];

  s4Tiers.forEach(function (tier) {
    slide4.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: tier.x, y: 1.25, w: 1.95, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const tierRuns = [
      { text: tier.badge, options: { fontSize: 8.5, color: tier.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: tier.title, options: { fontSize: 13.5, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 } },
      { text: tier.sub, options: { fontSize: 8.5, color: COLOR_MUTED, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    tier.bullets.forEach(function (bulletText, bIdx) {
      tierRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.5,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < tier.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 6
        }
      });
    });

    slide4.addText(tierRuns, { x: tier.x + 0.14, y: 1.4, w: 1.67, h: 3.5, margin: 0, valign: 'top' });
  });

  slide4.addNotes(
    'This slide illustrates the multi-tier architecture of SAOCS. At the edge, an ESP32 microcontroller manages relays and switches. Crucially, the ESP32 never accepts inbound network connections. Instead, it initiates an outbound TLS connection to a cloud-hosted Mosquitto MQTT broker. Our FastAPI backend simultaneously connects to the broker, consuming telemetry and publishing commands. The backend pushes updates to connected React clients via WebSockets. This architecture guarantees that even if the hardware operates on a dynamic cellular mobile hotspot, bi-directional communication remains instantaneous without port forwarding.'
  );

  const slide5 = pres.addSlide();
  slide5.background = { color: COLOR_BG };
  addStandardHeader(slide5, 'Circuit Design & Electrical Safety', 'Hardware Prototype & Circuit Safety');

  const s5Columns = [
    {
      x: 0.8,
      badge: 'HARDWARE SPECIFICATIONS',
      badgeColor: COLOR_PRIMARY,
      title: 'Microcontroller & Switching Elements',
      bullets: [
        'Espressif ESP32-WROOM-32: Dual-core 240MHz Tensilica LX6, 520KB SRAM, 4MB SPI Flash, onboard 2.4GHz 802.11 b/g/n Wi-Fi transceiver.',
        'Songle SRD-05VDC-SL-C Relays: 4-channel electromechanical relays rated up to 10A @ 250VAC / 30VDC, driven with active-low logic.',
        'Locked GPIO Contract (TRD §6): Relays mapped to GPIO 16, 17, 18, 19; physical wall switches mapped to GPIO 32, 33, 34, 35.',
        'Pure Input Strapping Immunity: GPIO 32–35 are pure input pins without boot strapping conflicts, preventing relay glitching during boot or brownout cycles.'
      ]
    },
    {
      x: 5.15,
      badge: 'ELECTRICAL DEFENSE',
      badgeColor: COLOR_SUCCESS,
      title: 'Galvanic Isolation & Inductive Clamping',
      bullets: [
        'PC817 Optocouplers: Optical air-gap barrier completely isolates sensitive 3.3V microcontroller logic from high-current 5V relay drive circuits.',
        '1N4007 Flyback Diodes: Positioned across inductive relay coils to immediately clamp reverse back-EMF spikes during de-energization.',
        'Preferences NVS Flash Persistence: Every state change commits synchronously to non-volatile flash, achieving sub-50ms post-power-outage recovery.',
        'Fail-Safe Physical Operation: Main firmware polling loop ensures physical wall switches actuate relays even if Wi-Fi or cloud broker is disconnected.'
      ]
    }
  ];

  s5Columns.forEach(function (col) {
    slide5.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: col.x, y: 1.25, w: 4.05, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const colRuns = [
      { text: col.badge, options: { fontSize: 9.0, color: col.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: col.title, options: { fontSize: 14, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    col.bullets.forEach(function (bulletText, bIdx) {
      colRuns.push({
        text: bulletText,
        options: {
          fontSize: 9.2,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < col.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 8
        }
      });
    });

    slide5.addText(colRuns, { x: col.x + 0.2, y: 1.4, w: 3.65, h: 3.5, margin: 0, valign: 'top' });
  });

  slide5.addNotes(
    'Safety and hardware isolation were paramount during circuit design. When controlling inductive mains loads, relay coils generate severe back-electromotive force upon switching off. We incorporated PC817 optocouplers to provide complete optical isolation between the ESP32\'s 3.3-volt logic and the relay drivers, alongside 1N4007 flyback diodes across the coils. For pin allocation, we strictly locked inputs to GPIO 32 through 35. These pins are pure inputs uninvolved in ESP32 boot strapping, preventing relay glitching during microcontroller boot or brownout cycles.'
  );

  const slide6 = pres.addSlide();
  slide6.background = { color: COLOR_BG };
  addStandardHeader(slide6, 'Communication Protocol & Survivability', 'Network & Resilience Architecture');

  const s6Cards = [
    {
      x: 0.8,
      badge: 'TOPOLOGY',
      badgeColor: COLOR_PRIMARY,
      title: 'Outbound Edge Topology',
      bullets: [
        'Zero Inbound Listening Ports: ESP32 runs no local web server or open TCP ports, eliminating external network attack surfaces.',
        'Carrier-Grade NAT Traversal: Operates seamlessly across dynamic cellular 3G/4G/5G mobile SIMs and restrictive corporate firewalls.',
        'Outbound TLS MQTTS: Microcontroller initiates secure TLS connection to cloud broker on port 8883.',
        'No Port Forwarding Required: Eliminates dynamic DNS, static public IP, and firewall traversal overhead.'
      ]
    },
    {
      x: 3.68,
      badge: 'RELIABILITY',
      badgeColor: COLOR_SUCCESS,
      title: 'MQTT Telemetry Contracts',
      bullets: [
        'QoS 1 Command Delivery: office/<device_id>/command topic guarantees at-least-once message delivery with idempotent handling.',
        'QoS 1 State Telemetry: office/<device_id>/state publishes channel number, confirmed state, and trigger source.',
        'Last Will & Testament (LWT): Mosquitto broker publishes retained offline packet on office/<device_id>/status if keepalive expires.',
        'Per-Device ACL Isolation: Hardware credentials restricted strictly to authorized device topic boundaries.'
      ]
    },
    {
      x: 6.56,
      badge: 'SURVIVABILITY',
      badgeColor: COLOR_WARN,
      title: 'Microcontroller Autonomy',
      bullets: [
        'Decoupled Switching Loop: Physical wall switch polling operates in a non-blocking loop independent of network socket state.',
        'Zero Latency Degradation: Wall switches maintain immediate 0ms local response during network or cloud broker downtime.',
        'Automated Exponential Backoff: Non-blocking background reconnect attempts occur without stalling relay actuation.',
        'State Sync on Recovery: Reconnected ESP32 publishes current physical state to reconcile cloud cache.'
      ]
    }
  ];

  s6Cards.forEach(function (card) {
    slide6.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: card.x, y: 1.25, w: 2.64, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const cardRuns = [
      { text: card.badge, options: { fontSize: 9.0, color: card.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: card.title, options: { fontSize: 14, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    card.bullets.forEach(function (bulletText, bIdx) {
      cardRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.8,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < card.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 8
        }
      });
    });

    slide6.addText(cardRuns, { x: card.x + 0.16, y: 1.4, w: 2.32, h: 3.5, margin: 0, valign: 'top' });
  });

  slide6.addNotes(
    'Network resilience is designed for African infrastructural constraints. Traditional IoT designs that run local web servers on microcontrollers fail when deployed behind cellular NAT or dynamic office routers. SAOCS uses strictly outbound MQTT connections. We adopted MQTT QoS 1 with idempotent command handling in firmware. Furthermore, we configured the MQTT Last Will and Testament feature on the status topic. If the device abruptly loses power or cellular link, the broker immediately publishes an offline status packet to the backend, alerting facility administrators within milliseconds.'
  );

  const slide7 = pres.addSlide();
  slide7.background = { color: COLOR_BG };
  addStandardHeader(slide7, 'Backend Engine & Hardware Arbitration', 'Software Core: Backend & Arbitration');

  const s7Columns = [
    {
      x: 0.8,
      badge: 'FASTAPI ARCHITECTURE',
      badgeColor: COLOR_PRIMARY,
      title: 'High-Throughput Async Service Mesh',
      bullets: [
        'Python 3.12 & FastAPI: High-concurrency async runtime orchestrating REST endpoints, WebSocket pools, and background MQTT workers simultaneously.',
        'aiosqlite & SQLite WAL Mode: Write-Ahead Logging prevents read/write lock contention between high-frequency audit logs and dashboard queries.',
        '1000ms In-Memory Cooldown: Rate-limiting queue enforces hardware debounce contract at the API layer, dropping rapid duplicate commands.',
        'WebSocket Broadcast Pool: Instant state broadcasting notifies all connected web clients in under 5ms upon any confirmed appliance state change.'
      ]
    },
    {
      x: 5.15,
      badge: 'HARDWARE ARBITRATION',
      badgeColor: COLOR_SUCCESS,
      title: 'Deterministic Single-Authority Engine',
      bullets: [
        'Single Source of Truth: ESP32 hardware execution loop serves as the sole arbitrating authority for relay coil states.',
        'Symmetric Control Convergence: Physical switch inputs and incoming MQTT network packets feed into an identical in-memory state engine.',
        'Most-Recent-Change-Wins (MRCW): Eliminates fragile NTP network clocks, vector clocks, or distributed consensus protocols across edge and cloud.',
        'Immediate Telemetry Feedback: Microcontroller emits confirmed state to the broker immediately after relay contact movement.'
      ]
    }
  ];

  s7Columns.forEach(function (col) {
    slide7.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: col.x, y: 1.25, w: 4.05, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const colRuns = [
      { text: col.badge, options: { fontSize: 9.0, color: col.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: col.title, options: { fontSize: 14, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    col.bullets.forEach(function (bulletText, bIdx) {
      colRuns.push({
        text: bulletText,
        options: {
          fontSize: 9.2,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < col.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 8
        }
      });
    });

    slide7.addText(colRuns, { x: col.x + 0.2, y: 1.4, w: 3.65, h: 3.5, margin: 0, valign: 'top' });
  });

  slide7.addNotes(
    'Our software backend is powered by Python 3.12 and FastAPI. Unlike traditional synchronous frameworks, FastAPI runs on asyncio, enabling concurrent handling of REST requests, real-time WebSocket client pools, and background MQTT telemetry listening. To arbitrate conflicts between physical wall switches and mobile app clicks, we engineered a single-authority arbitration model in firmware. Rather than relying on fragile distributed clocks or vector timestamps across network boundaries, the ESP32 hardware loop acts as the sole authority: whichever command arrives most recently is applied and published back to the cloud.'
  );

  const slide8 = pres.addSlide();
  slide8.background = { color: COLOR_BG };
  addStandardHeader(slide8, 'Frontend Engineering & User Experience', 'Software Core: Accessible Dashboard UI');

  const s8Cards = [
    {
      x: 0.8,
      y: 1.25,
      badge: 'STACK ARCHITECTURE',
      badgeColor: COLOR_PRIMARY,
      title: 'React 19 + TypeScript + Vite',
      bullets: [
        'Modern React 19 architecture with strict TypeScript typing and Tailwind CSS v4 design tokens.',
        'Self-hosted WOFF2 fonts (Plus Jakarta Sans, Outfit, JetBrains Mono) eliminate third-party CDN latency.'
      ]
    },
    {
      x: 5.15,
      y: 1.25,
      badge: 'PERFORMANCE BUDGET',
      badgeColor: COLOR_SUCCESS,
      title: '115.02 KB Gzipped Bundle',
      bullets: [
        '54% below the strict 250 KB emerging-market cellular budget.',
        'First Contentful Paint < 800ms over 3G/4G connections; zero bloated heavy client libraries.'
      ]
    },
    {
      x: 0.8,
      y: 3.25,
      badge: 'STATE MANAGEMENT',
      badgeColor: COLOR_WARN,
      title: 'TanStack Query v5 Direct Push',
      bullets: [
        'WebSocket telemetry pushes state updates directly into TanStack cache via setQueryData.',
        'Zero HTTP polling overhead; instantaneous dashboard updates without page re-renders.'
      ]
    },
    {
      x: 5.15,
      y: 3.25,
      badge: 'ACCESSIBILITY & USABILITY',
      badgeColor: COLOR_PRIMARY,
      title: 'WCAG 2.1 AA Ergonomics',
      bullets: [
        '44px minimum touch targets compliant with mobile accessibility standards.',
        'High-contrast ratios, persistent connection status banner, and honest visual pending spinners.'
      ]
    }
  ];

  s8Cards.forEach(function (card) {
    slide8.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: card.x, y: card.y, w: 4.05, h: 1.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const cardRuns = [
      { text: card.badge, options: { fontSize: 8.5, color: card.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 3 } },
      { text: card.title, options: { fontSize: 13, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 6 } }
    ];

    card.bullets.forEach(function (bulletText, bIdx) {
      cardRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.8,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < card.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 4
        }
      });
    });

    slide8.addText(cardRuns, { x: card.x + 0.18, y: card.y + 0.14, w: 3.69, h: 1.55, margin: 0, valign: 'top' });
  });

  slide8.addNotes(
    'The web frontend was built with React 19, TypeScript, and Tailwind CSS v4. Designed for mobile browsers as well as desktop displays, it complies with WCAG 2.1 AA accessibility standards, featuring 44-pixel touch targets and high-contrast indicators. By utilizing TanStack Query paired with WebSockets, incoming appliance state changes are injected directly into client cache, eliminating polling overhead entirely. The complete production bundle is just 115 kilobytes gzipped, ensuring swift loading even over congested 3G or 4G mobile connections.'
  );

  const slide9 = pres.addSlide();
  slide9.background = { color: COLOR_BG };
  addStandardHeader(slide9, 'Empirical Energy & Financial Modeling', 'Kaduna Electric Band A Tariff & Energy Analytics');

  slide9.addShape(
    pres.ShapeType.roundRect,
    Object.assign({ x: 0.8, y: 1.25, w: 8.4, h: 1.35 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
  );

  slide9.addText(
    [
      {
        text: 'MATHEMATICAL ENERGY CONSUMPTION & EXPENDITURE FORMULATION',
        options: { fontSize: 8.8, color: COLOR_PRIMARY, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 }
      },
      {
        text: 'Energy (kWh) = Σ [ Rated Appliance Power (Watts) × Operational Duration (Hours) ] / 1000',
        options: { fontSize: 11.5, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 }
      },
      {
        text: 'Expenditure (₦) = Cumulative Energy (kWh) × Kaduna Electric Band A Rate (₦209.5 / kWh)',
        options: { fontSize: 11.5, color: COLOR_SUCCESS, bold: true, fontFace: 'Arial' }
      }
    ],
    { x: 1.0, y: 1.38, w: 8.0, h: 1.1, margin: 0, valign: 'top' }
  );

  const s9Cards = [
    {
      x: 0.8,
      badge: 'TARIFF RATE',
      badgeColor: COLOR_PRIMARY,
      title: 'Kaduna Electric Band A',
      bullets: [
        'Calibrated to NERC Kaduna Electric Band A commercial tariff of ₦209.5 per kWh.',
        'Dynamic backend configuration allows rate adjustments without code re-deployment.'
      ]
    },
    {
      x: 3.68,
      badge: 'INTEGRATION',
      badgeColor: COLOR_SUCCESS,
      title: 'Pairwise Duration Engine',
      bullets: [
        'Calculates active appliance runtime by pairing sequential on and off events from immutable activity logs.',
        'Eliminates polling estimation drift, accurately accounting for exact energized duration.'
      ]
    },
    {
      x: 6.56,
      badge: 'AUDITABILITY',
      badgeColor: COLOR_WARN,
      title: 'Financial CSV Reporting',
      bullets: [
        'One-click administrative CSV export generates comprehensive operational records.',
        'Provides facility managers and financial auditors with auditable per-channel kWh and Naira figures.'
      ]
    }
  ];

  s9Cards.forEach(function (card) {
    slide9.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: card.x, y: 2.8, w: 2.64, h: 2.25 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const cardRuns = [
      { text: card.badge, options: { fontSize: 8.5, color: card.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 3 } },
      { text: card.title, options: { fontSize: 13, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 8 } }
    ];

    card.bullets.forEach(function (bulletText, bIdx) {
      cardRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.8,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < card.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 6
        }
      });
    });

    slide9.addText(cardRuns, { x: card.x + 0.16, y: 2.94, w: 2.32, h: 2.0, margin: 0, valign: 'top' });
  });

  slide9.addNotes(
    'To empower facility managers with tangible financial data, SAOCS includes an automated energy and expenditure engine. In Nigerian commercial centers, offices are classified under Kaduna Electric Band A tariffs. We model consumption based on the configured wattage of simulated office loads, calculating active runtimes by pairing consecutive on and off events in the audit log. The system computes exact cumulative kilowatt-hours and financial expenditure at 209.5 Naira per kWh. Administrators can export this data into CSV format for accounting audits with a single click.'
  );

  const slide10 = pres.addSlide();
  slide10.background = { color: COLOR_BG };
  addStandardHeader(slide10, 'Benchmarking & Non-Functional Requirements', 'Experimental Results & NFR Verification');

  const s10Cards = [
    {
      x: 0.8,
      badge: 'PRD NFR-1',
      badgeColor: COLOR_SUCCESS,
      stat: '142 ms',
      statColor: COLOR_PRIMARY,
      title: 'Relay Actuation Latency',
      target: 'Target: < 500 ms',
      status: 'PASSED (71.6% margin)',
      bullets: [
        'Measures delay from web toggle click to physical relay coil energization.',
        'Peak latency remained under 350ms during cellular hotspot testing.'
      ]
    },
    {
      x: 2.95,
      badge: 'PRD NFR-2',
      badgeColor: COLOR_SUCCESS,
      stat: '215 ms',
      statColor: COLOR_PRIMARY,
      title: 'State Sync Latency',
      target: 'Target: ~1,000 ms',
      status: 'PASSED (78.5% margin)',
      bullets: [
        'Measures time for physical switch toggle to update web dashboard UI.',
        'Instant state reflection via MQTT telemetry and WebSockets.'
      ]
    },
    {
      x: 5.1,
      badge: 'PRD NFR-3',
      badgeColor: COLOR_SUCCESS,
      stat: '20 / 20',
      statColor: COLOR_SUCCESS,
      title: 'Client Concurrency',
      target: 'Target: 20 clients',
      status: 'PASSED (100% stable)',
      bullets: [
        '20 concurrent WebSocket client connections streaming live telemetry.',
        '0% message loss, zero socket disconnects, sub-5ms broadcast distribution.'
      ]
    },
    {
      x: 7.25,
      badge: 'QUALITY ASSURANCE',
      badgeColor: COLOR_SUCCESS,
      stat: '117 / 117',
      statColor: COLOR_SUCCESS,
      title: 'Automated Test Suite',
      target: 'Target: 100% Pass',
      status: 'PASSED (0 errors)',
      bullets: [
        '50 Pytest backend/E2E tests and 67 Vitest frontend tests passed (100%).',
        'Zero Ruff lint errors, zero ESLint issues, 100% Zero-Comments compliance.'
      ]
    }
  ];

  s10Cards.forEach(function (card) {
    slide10.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: card.x, y: 1.25, w: 1.95, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const cardRuns = [
      { text: card.badge, options: { fontSize: 8.5, color: card.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: card.stat, options: { fontSize: 26, color: card.statColor, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 } },
      { text: card.title, options: { fontSize: 12, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 } },
      { text: card.target, options: { fontSize: 8.5, color: COLOR_MUTED, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 2 } },
      { text: card.status, options: { fontSize: 8.8, color: COLOR_SUCCESS, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 10 } }
    ];

    card.bullets.forEach(function (bulletText, bIdx) {
      cardRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.3,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < card.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 6
        }
      });
    });

    slide10.addText(cardRuns, { x: card.x + 0.14, y: 1.4, w: 1.67, h: 3.5, margin: 0, valign: 'top' });
  });

  slide10.addNotes(
    'We subjected the complete hardware-software system to rigorous empirical benchmarking. First, relay actuation latency—measuring the time from a user tapping a dashboard toggle to the physical relay firing—averaged 142 milliseconds, well inside our 500-millisecond design threshold. Second, dashboard state synchronization upon a physical switch toggle averaged 215 milliseconds. Third, our load testing suite verified 20 concurrent client dashboard connections streaming live telemetry simultaneously with zero packet loss or connection drops. All 117 automated unit and integration tests achieved a 100% pass rate.'
  );

  const slide11 = pres.addSlide();
  slide11.background = { color: COLOR_BG };
  addStandardHeader(slide11, 'Security Controls & Privacy Governance', 'Security Engineering & NDPA 2023 Compliance');

  const s11Cards = [
    {
      x: 0.8,
      badge: 'IDENTITY & ACCESS',
      badgeColor: COLOR_PRIMARY,
      title: 'Access Control Layer',
      bullets: [
        'Admin-Gated Onboarding: Public self-registration disabled; accounts created solely by authorized administrators.',
        'Hybrid Auth Architecture: Primary Google OAuth2 flow with salted bcrypt password fallback.',
        'Account Lockout Defense: Automatic 15-minute freeze triggered after 5 consecutive failed login attempts.',
        'Role-Based Access (RBAC): Strict segregation of admin configuration and operator switching permissions.'
      ]
    },
    {
      x: 3.68,
      badge: 'NETWORK DEFENSE',
      badgeColor: COLOR_SUCCESS,
      title: 'Transport & Broker Security',
      bullets: [
        'Per-Device Mosquitto ACLs: Hardware credentials restricted strictly to assigned office/<device_id>/* topics.',
        'End-to-End TLS Encryption: Enforced across MQTTS (Port 8883) and Web HTTPS (Port 443).',
        'Secret Hygiene Governance: Zero hardcoded secrets; .env.template enforcement with automated CI/CD audits.',
        'Non-Root Container Execution: Production backend containerized under unprivileged appuser:1001.'
      ]
    },
    {
      x: 6.56,
      badge: 'DATA PRIVACY',
      badgeColor: COLOR_WARN,
      title: 'NDPA 2023 Compliance',
      bullets: [
        'Strict Data Minimization: Collects solely necessary operational metrics (timestamps, channel IDs, states, emails).',
        'Deletion-on-Request Support: User account deletion permanently redacts personal identifiers from audit logs.',
        'Immutable Audit Logging: Append-only event tracking maintains non-repudiation and regulatory chain of custody.',
        'Nigerian Statutory Alignment: Fully complies with Nigeria Data Protection Act (NDPA) 2023 principles.'
      ]
    }
  ];

  s11Cards.forEach(function (card) {
    slide11.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: card.x, y: 1.25, w: 2.64, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const cardRuns = [
      { text: card.badge, options: { fontSize: 9.0, color: card.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: card.title, options: { fontSize: 14, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    card.bullets.forEach(function (bulletText, bIdx) {
      cardRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.8,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < card.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 8
        }
      });
    });

    slide11.addText(cardRuns, { x: card.x + 0.16, y: 1.4, w: 2.32, h: 3.5, margin: 0, valign: 'top' });
  });

  slide11.addNotes(
    'Security and regulatory compliance were treated with strict engineering rigor. To prevent unauthorized access, public user registration is completely barred; only administrators can invite an email address. We integrated Google OAuth2 with fallback bcrypt password authentication, guarded by an automated rate limiter that locks accounts after five failed attempts. At the transport layer, all traffic is encrypted with TLS. In compliance with the Nigeria Data Protection Act (NDPA) 2023, we practice data minimization, storing only essential metadata and supporting user data deletion upon request.'
  );

  const slide12 = pres.addSlide();
  slide12.background = { color: COLOR_BG };
  addStandardHeader(slide12, 'Technical Evolution & Academic Integrity', 'Architectural Evolution & Documented Deviations');

  const tableRows = [
    [
      { text: 'System Component', options: { bold: true, color: COLOR_PRIMARY, fill: COLOR_CARD, fontSize: 10, align: 'center', valign: 'middle' } },
      { text: 'Proposal Specification', options: { bold: true, color: COLOR_PRIMARY, fill: COLOR_CARD, fontSize: 10, align: 'center', valign: 'middle' } },
      { text: 'Delivered Architecture', options: { bold: true, color: COLOR_PRIMARY, fill: COLOR_CARD, fontSize: 10, align: 'center', valign: 'middle' } },
      { text: 'Academic & Technical Rationale', options: { bold: true, color: COLOR_PRIMARY, fill: COLOR_CARD, fontSize: 10, align: 'center', valign: 'middle' } }
    ],
    [
      { text: 'Backend Engine', options: { bold: true, color: COLOR_TEXT, fill: COLOR_CARD, fontSize: 9.5, valign: 'middle' } },
      { text: 'Node.js / Express', options: { color: COLOR_MUTED, fill: COLOR_CARD, fontSize: 9.2, valign: 'middle' } },
      { text: 'Python 3.12 / FastAPI', options: { bold: true, color: COLOR_SUCCESS, fill: COLOR_CARD, fontSize: 9.2, valign: 'middle' } },
      { text: 'Native asyncio event loop for concurrent WebSockets and MQTT; automatic Pydantic schema validation; auto-generated OpenAPI specs; seamless integration with Python energy analytics libraries.', options: { color: COLOR_MUTED, fill: COLOR_CARD, fontSize: 8.8, valign: 'middle' } }
    ],
    [
      { text: 'Firmware Tooling', options: { bold: true, color: COLOR_TEXT, fill: COLOR_CARD, fontSize: 9.5, valign: 'middle' } },
      { text: 'Arduino IDE (Manual GUI)', options: { color: COLOR_MUTED, fill: COLOR_CARD, fontSize: 9.2, valign: 'middle' } },
      { text: 'PlatformIO Core 6.1.19', options: { bold: true, color: COLOR_SUCCESS, fill: COLOR_CARD, fontSize: 9.2, valign: 'middle' } },
      { text: 'Enables reproducible CLI compilation, strictly pinned library dependencies (ArduinoJson, espMqttClient), multi-environment builds (esp32dev, release), and headless CI/CD build automation.', options: { color: COLOR_MUTED, fill: COLOR_CARD, fontSize: 8.8, valign: 'middle' } }
    ],
    [
      { text: 'Scheduling Scope', options: { bold: true, color: COLOR_TEXT, fill: COLOR_CARD, fontSize: 9.5, valign: 'middle' } },
      { text: 'Deferred to future work', options: { color: COLOR_MUTED, fill: COLOR_CARD, fontSize: 9.2, valign: 'middle' } },
      { text: 'Delivered in Version 1.0', options: { bold: true, color: COLOR_SUCCESS, fill: COLOR_CARD, fontSize: 9.2, valign: 'middle' } },
      { text: 'Autonomous cron scheduling is critical to achieving core commercial energy savings during unoccupied office hours; implemented ahead of schedule to deliver a complete production solution.', options: { color: COLOR_MUTED, fill: COLOR_CARD, fontSize: 8.8, valign: 'middle' } }
    ]
  ];

  slide12.addTable(tableRows, {
    x: 0.8,
    y: 1.25,
    w: 8.4,
    colW: [1.5, 1.8, 1.9, 3.2],
    border: { type: 'solid', color: COLOR_BORDER, pt: 1 }
  });

  slide12.addNotes(
    'In accordance with academic integrity, we openly document three evolutionary improvements from our initial written proposal: First, we transitioned the backend from Node.js/Express to Python/FastAPI to leverage Python\'s asynchronous event loop, strict Pydantic type validation, and auto-generated API specifications. Second, we upgraded firmware compilation from the manual Arduino IDE to PlatformIO Core, guaranteeing reproducible builds and pinned library dependencies. Third, while our initial proposal deferred scheduling to future work, we completed and delivered autonomous background scheduling in Version 1.0.'
  );

  const slide13 = pres.addSlide();
  slide13.background = { color: COLOR_BG };
  addStandardHeader(slide13, 'Defense Demo & Verification Script', 'Live Demonstration & Hardware Choreography');

  const s13Demos = [
    {
      x: 0.8,
      y: 1.25,
      badge: 'SEQUENCE 01',
      title: 'Cold-Boot & NVS Recovery',
      bullets: [
        'Power cycle the ESP32 hardware module.',
        'Observe instant (<50ms) restoration of last-known appliance states from non-volatile flash memory.'
      ]
    },
    {
      x: 3.68,
      y: 1.25,
      badge: 'SEQUENCE 02',
      title: 'Bi-Directional Remote Control',
      bullets: [
        'Actuate relays via desktop and mobile dashboards.',
        'Verify sub-500ms round-trip actuation and instant TanStack cache push without HTTP polling.'
      ]
    },
    {
      x: 6.56,
      y: 1.25,
      badge: 'SEQUENCE 03',
      title: 'Physical Wall Switch Override',
      bullets: [
        'Toggle manual physical wall switches.',
        'Confirm instantaneous local relay actuation and real-time dashboard UI reflection in ~215ms.'
      ]
    },
    {
      x: 0.8,
      y: 3.25,
      badge: 'SEQUENCE 04',
      title: 'Autonomous Cron Scheduling',
      bullets: [
        'Configure an automated timed appliance trigger.',
        'Demonstrate hands-off background execution without active browser sessions or user interaction.'
      ]
    },
    {
      x: 3.68,
      y: 3.25,
      badge: 'SEQUENCE 05',
      title: 'Band A Energy & Cost Audit',
      bullets: [
        'Review live kWh consumption computations and ₦209.5/kWh financial expenditure displays.',
        'Execute one-click administrative CSV audit report export.'
      ]
    },
    {
      x: 6.56,
      y: 3.25,
      badge: 'SEQUENCE 06',
      title: 'Fault Containment & Disconnect',
      bullets: [
        'Disconnect network link to simulate connection loss.',
        'Verify broker LWT detection, backend HTTP 503 offline rejection, and uninterrupted local physical switching.'
      ]
    }
  ];

  s13Demos.forEach(function (demo) {
    slide13.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: demo.x, y: demo.y, w: 2.64, h: 1.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const demoRuns = [
      { text: demo.badge, options: { fontSize: 8.5, color: COLOR_PRIMARY, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 3 } },
      { text: demo.title, options: { fontSize: 12.5, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 6 } }
    ];

    demo.bullets.forEach(function (bulletText, bIdx) {
      demoRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.5,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < demo.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 4
        }
      });
    });

    slide13.addText(demoRuns, { x: demo.x + 0.16, y: demo.y + 0.14, w: 2.32, h: 1.55, margin: 0, valign: 'top' });
  });

  slide13.addNotes(
    'At this juncture, I invite the esteemed members of the panel to turn their attention to our physical prototype box and live web dashboard. We will now walk through six practical operational sequences, demonstrating cold-boot recovery, sub-500ms remote switching, physical manual override, autonomous scheduling, energy cost calculation, and intentional network disconnect.'
  );

  const slide14 = pres.addSlide();
  slide14.background = { color: COLOR_BG };
  addStandardHeader(slide14, 'Defense Conclusion & Acknowledgments', 'Conclusion, Future Scope & Acknowledgments');

  const s14Columns = [
    {
      x: 0.8,
      badge: 'RESEARCH SUMMARY',
      badgeColor: COLOR_SUCCESS,
      title: 'Key Achievements',
      bullets: [
        'Successfully engineered an industrial-grade, zero-budget IoT appliance management system.',
        'Met all 5 proposal research objectives and PRD non-functional requirements.',
        'Validated 142ms actuation latency, 100% automated test pass rate, and WCAG 2.1 AA accessibility.',
        'Delivered production-ready Docker containerization with automated CI/CD deployment.'
      ]
    },
    {
      x: 3.68,
      badge: 'FUTURE ROADMAP',
      badgeColor: COLOR_PRIMARY,
      title: 'Future Research Scope',
      bullets: [
        'Advanced Occupancy Sensing: Integration of passive infrared (PIR) and 24GHz mmWave radar sensors for vacancy shutdown.',
        'Edge Predictive Curtailment: Lightweight ML models forecasting peak tariff hours and pre-emptively curtailing non-critical loads.',
        'Wide-Area LoRaWAN: Integrating long-range telemetry for multi-building university campus energy management.'
      ]
    },
    {
      x: 6.56,
      badge: 'ACKNOWLEDGMENTS',
      badgeColor: COLOR_WARN,
      title: 'Formal Gratitude',
      bullets: [
        'Project Supervisor & Academic Faculty: Department of Computer Science, Ahmadu Bello University, Zaria.',
        'Engineering Collaborators: Israel (Firmware & Software Lead) and Abdulfatai (Hardware Lead).',
        'Department of Computer Science: For laboratory facilities and computing resources.',
        'Distinguished Defense Panel: For valuable evaluation, time, and academic guidance.'
      ]
    }
  ];

  s14Columns.forEach(function (col) {
    slide14.addShape(
      pres.ShapeType.roundRect,
      Object.assign({ x: col.x, y: 1.25, w: 2.64, h: 3.8 }, createShapeOptions(COLOR_CARD, COLOR_BORDER, 0.08))
    );

    const colRuns = [
      { text: col.badge, options: { fontSize: 9.0, color: col.badgeColor, bold: true, charSpacing: 1.0, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 4 } },
      { text: col.title, options: { fontSize: 14, color: COLOR_TEXT, bold: true, breakLine: true, fontFace: 'Arial', paraSpaceAfter: 12 } }
    ];

    col.bullets.forEach(function (bulletText, bIdx) {
      colRuns.push({
        text: bulletText,
        options: {
          fontSize: 8.8,
          color: COLOR_MUTED,
          bullet: true,
          breakLine: bIdx < col.bullets.length - 1,
          fontFace: 'Arial',
          paraSpaceAfter: 8
        }
      });
    });

    slide14.addText(colRuns, { x: col.x + 0.16, y: 1.4, w: 2.32, h: 3.5, margin: 0, valign: 'top' });
  });

  slide14.addNotes(
    'In conclusion, the Smart Office Appliance Control System proves that modern, enterprise-grade IoT architectures can be engineered with resilience, strict safety, and zero commercial software licensing costs. For future research, this platform can be expanded with microwave occupancy sensing and edge predictive load curtailment. I would like to express my deepest gratitude to my project supervisor, the Department of Computer Science at Ahmadu Bello University, and my engineering colleagues Israel and Abdulfatai for their invaluable support. Thank you, and I am now prepared to answer your questions.'
  );

  const outputDir = path.resolve(__dirname, '..', 'presentation');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'defense_deck.pptx');
  return pres.writeFile({ fileName: outputPath }).then(function () {
    const stats = fs.statSync(outputPath);
    console.log(JSON.stringify({ status: 'success', path: outputPath, sizeBytes: stats.size }));
  });
}

buildDeck().catch(function (err) {
  console.error(err);
  process.exit(1);
});
