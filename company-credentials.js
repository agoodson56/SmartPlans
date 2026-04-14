// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — 3D TECHNOLOGY SERVICES COMPANY CREDENTIALS
// Structured data for Fortune-500-grade proposal generation
//
// Harvested from www.3dtsi.com on 2026-04-14. Fields marked with
// [UPDATE] are gaps the website didn't expose — edit in-app via
// Settings → Company Profile (saves to localStorage, overrides
// this file per-browser without touching source).
//
// IMPORTANT: This file is the SINGLE SOURCE OF TRUTH for every
// proposal SmartPlans generates. Every proposal brain reads from
// this object. No hard-coded company data lives anywhere else.
// ═══════════════════════════════════════════════════════════════

const COMPANY_CREDENTIALS = {
    // ─── CORE IDENTITY ─────────────────────────────────────────
    legalName: '3D Technology Services, Inc.',
    dba: '3D TSI',
    tagline: 'Enterprise Technology Integration',
    methodology: '3D Approach: Design · Deliver · Defend',
    founded: 1998,
    yearsInBusiness: (new Date()).getFullYear() - 1998,
    website: 'https://www.3dtsi.com',
    mainEmail: 'info@3dtsi.com',

    // ─── HEADQUARTERS ──────────────────────────────────────────
    headquarters: {
        address: '11365 Sunrise Gold Circle',
        cityStateZip: 'Rancho Cordova, CA 95742',
        city: 'Rancho Cordova',
        state: 'CA',
        zip: '95742',
        mainPhone: '(916) 859-9111',
        tollFree: '(800) 733-3453',
    },

    // ─── REGIONAL OFFICES ──────────────────────────────────────
    // Full list of offices surfaces automatically on cover letter,
    // "Our Footprint" page, and contact info
    offices: [
        { city: 'Rancho Cordova', state: 'CA', region: 'Greater Sacramento', phone: '(916) 859-9111', tollFree: '(800) 733-3453', isHQ: true },
        { city: 'Fresno',         state: 'CA', region: 'Central Valley',      phone: '(559) 291-6199' },
        { city: 'Livermore',      state: 'CA', region: 'San Francisco Bay',   phone: '(925) 455-1884' },
        { city: 'Sparks',         state: 'NV', region: 'Northern Nevada',     phone: '(775) 451-5980' },
        { city: 'McCall',         state: 'ID', region: 'Central Idaho',       phone: '(208) 893-9706' },
    ],

    // ─── SERVICE TERRITORY ─────────────────────────────────────
    serviceStates: ['CA', 'NV', 'AZ', 'ID', 'OR', 'WA', 'UT', 'CO', 'TX', 'NM', 'MT'],
    serviceStateNames: ['California', 'Nevada', 'Arizona', 'Idaho', 'Oregon', 'Washington', 'Utah', 'Colorado', 'Texas', 'New Mexico', 'Montana'],
    serviceTerritoryLabel: '11 Western States',

    // ─── LICENSES & REGISTRATIONS ──────────────────────────────
    licenses: [
        { state: 'CA', type: 'Contractor License',            number: '757157',   classification: 'C-7 Low Voltage' },
        { state: 'NV', type: 'Contractor License',            number: '0049045',  classification: 'Low Voltage' },
        { state: 'AZ', type: 'Contractor License',            number: '332533',   classification: 'Low Voltage' },
        { state: 'CA', type: 'Dept. of Industrial Relations', number: '[UPDATE]', classification: 'Public Works Registered Contractor' },
        { state: 'CA', type: 'Alarm Company Operator (BSIS)', number: '[UPDATE]', classification: 'Burglar/Fire Alarm' },
    ],

    // ─── CERTIFICATIONS & AFFILIATIONS ─────────────────────────
    certifications: [
        { org: 'BICSI',  credential: 'Member Organization', description: 'Building Industry Consulting Service International' },
        { org: 'BICSI',  credential: 'RCDD-certified staff', description: 'Registered Communications Distribution Designer technicians on staff' },
        { org: 'OSHA',   credential: 'OSHA-30 certified technicians', description: 'All field personnel carry OSHA-30 construction safety certification', editable: true },
    ],

    // ─── FEDERAL REGISTRATION ──────────────────────────────────
    federal: {
        naics:           ['238210'],               // Electrical Contractors and Other Wiring Installation Contractors
        naicsPrimary:    '238210',
        sam:             '[UPDATE: SAM.gov UEI]',  // 12-character Unique Entity Identifier
        cage:            '[UPDATE: CAGE code]',    // 5-character Commercial and Government Entity code
        duns:            '[UPDATE: DUNS legacy]',
        sba:             '[UPDATE: SBA size/designation — small business? DBE? WOSB? SDVOSB?]',
    },

    // ─── BONDING & INSURANCE (editable per estimator) ──────────
    bonding: {
        aggregateCapacity: '[UPDATE: e.g., $10,000,000]',
        singleProjectCapacity: '[UPDATE: e.g., $5,000,000]',
        bondingCompany: '[UPDATE: surety company name]',
        bondingAgent: '[UPDATE: bonding agent name, phone]',
    },
    insurance: {
        generalLiability: '[UPDATE: e.g., $2,000,000 per occurrence / $4,000,000 aggregate]',
        autoLiability:    '[UPDATE: e.g., $1,000,000 combined single limit]',
        workersComp:      'Statutory — California, Nevada, Arizona, all service states',
        umbrella:         '[UPDATE: e.g., $5,000,000]',
        professional:     '[UPDATE: E&O / Professional Liability limit]',
        carrier:          '[UPDATE: primary carrier name]',
        broker:           '[UPDATE: broker name, phone, email]',
    },

    // ─── SAFETY RECORD ─────────────────────────────────────────
    safety: {
        emr: '[UPDATE: Experience Modification Rate, e.g., 0.78]',
        trir: '[UPDATE: Total Recordable Incident Rate]',
        dart: '[UPDATE: Days Away/Restricted/Transfer rate]',
        lostTimeIncidentsLast3Years: '[UPDATE: integer]',
        safetyProgram: 'OSHA-compliant job-site safety plans, daily JHAs, weekly toolbox talks, annual 40-hour Supervisor refresher',
    },

    // ─── KEY METRICS ───────────────────────────────────────────
    metrics: {
        projectsCompleted: '500+',
        yearsInBusiness: (new Date()).getFullYear() - 1998,
        clientRating: '4.9',
        clientReviewCount: 127,
        statesLicensed: 3,           // CA, NV, AZ (active)
        serviceStates: 11,
        officeCount: 5,
        employees: '[UPDATE: headcount]',
        annualRevenue: '[UPDATE: optional — e.g., $15M or leave hidden]',
        repeatClientRate: '[UPDATE: e.g., 87%]',
    },

    // ─── LEADERSHIP TEAM ───────────────────────────────────────
    // Bios are [UPDATE] until estimator fills them in; name/title
    // already live on www.3dtsi.com/team.html
    leadership: [
        { name: 'Frank Pedersen',  title: 'President & Chief Executive Officer', location: 'Corporate', years: '[UPDATE]', certs: '[UPDATE]', bio: '[UPDATE: Frank leads corporate strategy and client relationships with decades of enterprise integration experience…]' },
        { name: 'Pete Pedersen',   title: 'Vice President',                      location: 'Corporate', years: '[UPDATE]', certs: '[UPDATE]', bio: '[UPDATE]' },
        { name: 'Allan Goodson',   title: 'General Manager',                     location: 'Corporate', years: '[UPDATE]', certs: '[UPDATE]', bio: '[UPDATE: Allan oversees estimating and project delivery…]' },
        { name: 'James Goodrich',  title: 'General Manager — Idaho',             location: 'McCall, ID', years: '[UPDATE]', certs: '[UPDATE]', bio: '[UPDATE]' },
        { name: 'Warren Hall',     title: 'Senior Project Manager — Nevada',     location: 'Sparks, NV', years: '[UPDATE]', certs: '[UPDATE]', bio: '[UPDATE]' },
    ],

    // Default proposal signer (estimator) — overridden per-bid by state.preparedBy
    defaultSigner: {
        name: 'Justin Whitton',
        title: 'Senior Sales Consultant',
        email: 'jwhitton@3dtsi.com',
        phone: '(916) 267-7319',
    },

    // ─── TECHNOLOGY PARTNERS ───────────────────────────────────
    // Used in proposal "Why Us" and "Technology Approach" sections
    technologyPartners: {
        accessControl:      ['Genetec', 'LenelS2', 'Software House', 'DMP', 'Avigilon'],
        videoSurveillance:  ['Axis', 'Hanwha', 'Milestone', 'Genetec', 'Avigilon', 'Pelco', 'Verkada'],
        structuredCabling:  ['CommScope / SYSTIMAX', 'Panduit', 'Leviton', 'Berk-Tek', 'Superior Essex', 'Hubbell'],
        networking:         ['Cisco', 'Cisco Meraki', 'Aruba', 'Ruckus'],
        audioVisual:        ['Crestron', 'Extron', 'Biamp', 'QSC', 'Shure'],
        fireAlarm:          ['Siemens', 'Honeywell Notifier', 'Edwards', 'Silent Knight'],
        intrusion:          ['DMP', 'Bosch', 'Honeywell Vista'],
    },

    // ─── CORE SERVICES ─────────────────────────────────────────
    services: [
        { key: 'security',    name: 'Security Systems',             description: 'Video surveillance, access control, VMS, intrusion detection. Enterprise-grade platforms backed by 24/7 monitoring and SLA-backed response.' },
        { key: 'cabling',     name: 'Structured Cabling',           description: 'BICSI-certified Cat6A copper, OS2 single-mode fiber, OM4 multi-mode fiber. Manufacturer-warranted channel installations with 25-year performance guarantees.' },
        { key: 'av',          name: 'Audio & Video Integration',    description: 'Conference rooms, board rooms, digital signage, mass notification, control systems. Crestron and Extron certified programmers on staff.' },
        { key: 'networking',  name: 'Enterprise Networking',        description: 'Wi-Fi 6E, managed switching, SD-WAN, next-gen firewalls, network segmentation, wireless site surveys.' },
        { key: 'fire',        name: 'Fire & Life Safety',           description: 'Fire alarm, mass notification, emergency communication, NFPA-72 code-compliant installation and commissioning.' },
        { key: 'service',     name: 'Service & 24/7 Support',       description: 'Preventive maintenance, monitoring, break/fix, software updates, SLA-backed response. On-site tech within 90 minutes for critical failures in our service territory.' },
        { key: 'datacenter',  name: 'Data Center Design & Build',   description: 'Redundant power, precision cooling, cabinet layout, hot/cold aisle containment, DCIM integration.' },
    ],

    // ─── INDUSTRIES SERVED ─────────────────────────────────────
    industriesServed: [
        'Federal Government (VA, USACE, DoD, GSA)',
        'State & Municipal Government',
        'Healthcare Systems',
        'Financial Services',
        'Public Transit & Railroad',
        'Education (K-12 and Higher Ed)',
        'Manufacturing & Industrial',
        'Corporate / Fortune 500 Headquarters',
        'Water & Utilities (Critical Infrastructure)',
    ],

    // ─── PAST PERFORMANCE LIBRARY ──────────────────────────────
    // 5 featured projects pulled from 3dtsi.com. Dollar values and
    // contact info are [UPDATE] — fill in from your past-project
    // records so future proposals auto-select the 3 most relevant.
    //
    // `tags` drives the Past Performance Selector: every proposal
    // auto-picks the 3 projects whose tags best match the current
    // bid's disciplines + building type + contract value.
    pastProjects: [
        {
            id: 'ev-manufacturer-tx',
            clientName: 'Major EV Manufacturer',
            clientNameForProposal: 'Major EV Manufacturer (NDA)',
            location: 'Buffalo, TX',
            completion: '[UPDATE: year]',
            value: '[UPDATE: $ amount]',
            scope: 'Enterprise-wide security integration across a new-build EV manufacturing campus. Video surveillance, access control, intrusion detection, and structured cabling tied to a centralized VMS.',
            disciplines: ['CCTV', 'Access Control', 'Structured Cabling', 'Intrusion Detection'],
            buildingType: 'manufacturing',
            tags: ['manufacturing', 'enterprise_security', 'greenfield', 'corporate'],
            highlights: ['New-construction greenfield campus', 'Unified security platform (Genetec/Milestone)', 'Phased cutover coordinated with manufacturing ramp-up'],
            contact: { name: '[UPDATE]', title: '[UPDATE]', phone: '[UPDATE]', email: '[UPDATE]' },
        },
        {
            id: 'water-treatment-sac',
            clientName: 'Sacramento Regional Water Treatment Facility',
            clientNameForProposal: 'Sacramento Regional Water Treatment Facility',
            location: 'Sacramento, CA',
            completion: '[UPDATE]',
            value: '[UPDATE]',
            scope: 'Critical-infrastructure physical security upgrade. Perimeter CCTV, access control at treatment zones, fiber backbone, and integration with existing SCADA monitoring.',
            disciplines: ['CCTV', 'Access Control', 'Structured Cabling', 'Fiber Backbone'],
            buildingType: 'utility',
            tags: ['critical_infrastructure', 'government', 'water_utility', 'outdoor', 'fiber_backbone'],
            highlights: ['Public Works prevailing wage project', 'Phased installation with zero system downtime', 'NFPA-compliant conduit in classified areas'],
            contact: { name: '[UPDATE]', title: '[UPDATE]', phone: '[UPDATE]', email: '[UPDATE]' },
        },
        {
            id: 'transit-authority-sac',
            clientName: 'Sacramento Regional Transit Authority',
            clientNameForProposal: 'Sacramento Regional Transit Authority',
            location: 'Sacramento, CA',
            completion: '[UPDATE]',
            value: '[UPDATE]',
            scope: 'Multi-station CCTV upgrade, passenger information signage, and structured cabling backbone across transit stations. Coordination with live-rail operations.',
            disciplines: ['CCTV', 'Audio Visual', 'Structured Cabling'],
            buildingType: 'transit',
            tags: ['transit', 'public_works', 'live_rail', 'prevailing_wage', 'government'],
            highlights: ['Davis-Bacon prevailing wage', 'Coordination with live-rail operations', 'Multi-station cutover plan'],
            contact: { name: '[UPDATE]', title: '[UPDATE]', phone: '[UPDATE]', email: '[UPDATE]' },
        },
        {
            id: 'k12-eldorado',
            clientName: 'El Dorado Hills K-12 School District',
            clientNameForProposal: 'El Dorado Hills Unified School District',
            location: 'El Dorado Hills, CA',
            completion: '[UPDATE]',
            value: '[UPDATE]',
            scope: 'District-wide security upgrade: lockdown-ready access control, classroom paging integration, campus CCTV, and Cat6A structured cabling refresh across multiple schools.',
            disciplines: ['Access Control', 'CCTV', 'Audio Visual', 'Structured Cabling', 'Fire Alarm'],
            buildingType: 'education_k12',
            tags: ['education', 'k12', 'lockdown', 'mass_notification', 'prevailing_wage'],
            highlights: ['Lockdown-ready door hardware', 'Classroom paging + mass notification integration', 'Completed during summer break to avoid classroom disruption'],
            contact: { name: '[UPDATE]', title: '[UPDATE]', phone: '[UPDATE]', email: '[UPDATE]' },
        },
        {
            id: 'national-rail-sj',
            clientName: 'National Railway',
            clientNameForProposal: 'National Railway Operator (NDA)',
            location: 'San Jose, CA',
            completion: '[UPDATE]',
            value: '[UPDATE]',
            scope: 'Railway station and yard physical security. Outdoor CCTV, perimeter intrusion, card-reader access control, and IP paging integrated with existing station systems.',
            disciplines: ['CCTV', 'Access Control', 'Audio Visual', 'Structured Cabling', 'Intrusion Detection'],
            buildingType: 'transportation',
            tags: ['railroad', 'amtrak', 'transit', 'federal_rail', 'outdoor', 'prevailing_wage'],
            highlights: ['Federal rail security compliance', 'Live-track access coordination', 'Prevailing wage and union workforce coordination'],
            contact: { name: '[UPDATE]', title: '[UPDATE]', phone: '[UPDATE]', email: '[UPDATE]' },
        },
        {
            id: 'fortune500-livermore',
            clientName: 'Fortune 500 Headquarters',
            clientNameForProposal: 'Fortune 500 Corporate Headquarters (NDA)',
            location: 'Livermore, CA',
            completion: '[UPDATE]',
            value: '[UPDATE]',
            scope: 'Corporate HQ physical security and AV integration. Enterprise access control, board-room AV, reception digital signage, and global VMS integration.',
            disciplines: ['Access Control', 'CCTV', 'Audio Visual', 'Structured Cabling'],
            buildingType: 'commercial_office',
            tags: ['corporate', 'fortune_500', 'executive', 'boardroom', 'av_integration'],
            highlights: ['Enterprise-wide access control federation', 'Executive-grade boardroom AV', 'Global VMS federation across multiple sites'],
            contact: { name: '[UPDATE]', title: '[UPDATE]', phone: '[UPDATE]', email: '[UPDATE]' },
        },
    ],

    // ─── CLIENT TESTIMONIALS ───────────────────────────────────
    // From 3dtsi.com. Used in proposal "Client Voices" section.
    testimonials: [
        {
            name: 'Michael Johnson',
            title: 'Facilities Director',
            companyType: 'Fortune 500 Financial Services',
            quote: 'Security infrastructure delivered on time and under budget. Eight years into our partnership, they remain our single point of contact for every physical-security question across our campus.',
        },
        {
            name: 'Sarah Rodriguez',
            title: 'Vice President of IT',
            companyType: 'Regional Healthcare System',
            quote: 'They were the only integrator who could handle our 50-plus building, three-state upgrade. Flawless execution, and they absorbed change orders without the usual finger-pointing.',
        },
        {
            name: 'David Thompson',
            title: 'Security Manager',
            companyType: 'Municipal Government',
            quote: 'Their 24/7 support is the real deal. When we had a critical failure, a tech was on-site within 90 minutes — at 2 AM on a Sunday.',
        },
    ],

    // ─── WIN THEMES ────────────────────────────────────────────
    // These are the 4-5 messages every proposal hammers home.
    // Brain 1 (Project Understanding) weaves them into the narrative.
    winThemes: [
        {
            headline: '28 Years. 500+ Projects. Zero Finger-Pointing.',
            body: '3D TSI has been delivering enterprise technology integration since 1998. Our 3D Approach — Design, Deliver, Defend — means one contract, one accountable partner, and one throat to choke when anything needs attention. Fortune 500 clients, municipal governments, and federal agencies keep coming back because we absorb the friction other integrators create.',
        },
        {
            headline: 'Under One Roof: Security, Cabling, AV, Networking, Fire, Service',
            body: 'Every discipline your project requires — video surveillance, access control, structured cabling, audio-visual, enterprise networking, fire alarm, data center — is delivered by 3D TSI technicians on 3D TSI payroll. No fourth-tier subcontractors. No "coordination meetings" that go nowhere. One foreman. One project manager. One warranty.',
        },
        {
            headline: 'Licensed, Bonded, and Insured Across 11 Western States',
            body: '3D TSI holds active contractor licenses in California (#757157), Nevada (#0049045), and Arizona (#332533), with service reach into eight additional western states. Our Rancho Cordova corporate office coordinates five regional offices — Fresno, Livermore, Sparks NV, and McCall ID — so your project gets a local team and a corporate safety net at the same time.',
        },
        {
            headline: 'We Still Pick Up the Phone at 2 AM',
            body: 'Our SLA-backed Service Department (24/7, 365) has technicians on call across our service territory. When a Fortune 500 client had a critical failure on a Sunday morning, we had a tech on-site in 90 minutes. That is not marketing language — it is a client testimonial we will share references for on request.',
        },
        {
            headline: 'Manufacturer-Authorized on Every Platform You Need',
            body: 'Our technicians are factory-trained and manufacturer-authorized on Genetec, Milestone, Axis, Hanwha, Avigilon, Pelco, Cisco, Meraki, Aruba, Crestron, Siemens, Honeywell Notifier, Panduit, CommScope, Berk-Tek, and more. Every installation ships with the full manufacturer warranty — typically 25 years for structured cabling systems.',
        },
    ],

    // ─── STANDARD EXCLUSIONS (boilerplate applied to every bid) ─
    // Project-specific exclusions get added on top from the
    // auto-populated Step 6 list.
    standardExclusions: [
        'Electrical power to equipment rack locations, outlet boxes, and device junctions — provided by Division 26 Electrical Contractor',
        'HVAC and cooling for MDF, IDF, and equipment rooms — provided by Division 23 Mechanical Contractor',
        'Architectural modifications including wall penetrations, hard-lid ceiling access, core drilling at structural members, and fire-rated wall repair',
        'Permits, inspection fees, and agency application costs (unless explicitly included as a line item in the Schedule of Values)',
        'After-hours, weekend, holiday, and shift-premium labor — unless explicitly specified in the bid documents',
        'Removal or abatement of hazardous materials (asbestos, lead paint, mold, PCBs)',
        'Owner-furnished equipment not listed in the Bill of Materials',
        'Temporary power, temporary lighting, and temporary heat during construction',
        'As-built CAD drawings beyond standard redline markups delivered at project closeout',
        'Extended warranty beyond manufacturer standard terms',
    ],

    standardAssumptions: [
        'Normal working hours: Monday through Friday, 6:00 AM to 4:30 PM local time',
        'Unrestricted site access during normal working hours with adequate parking and material staging',
        'Power available at all equipment locations by the time low-voltage rough-in begins',
        'All ceilings, walls, and floors are in finished or open-frame condition ready for cable installation',
        'No asbestos, lead paint, or other hazardous materials in installation areas',
        'Owner or General Contractor provides adequate security and dust-control barriers where required',
        'Coordination meetings held at regular intervals — assumed weekly during rough-in and daily during cutover',
        'Final testing and commissioning performed during normal working hours unless a phased cutover is explicitly required',
    ],

    // ─── BRAND / VISUAL IDENTITY ───────────────────────────────
    brand: {
        gold:         '#EBB328',
        goldDark:     '#C99518',
        teal:         '#3B97A1',
        tealDark:     '#2B828B',
        tealDarker:   '#237078',
        navy:         '#0F2942',
        charcoal:     '#1a1a2e',
        dark:         '#237078',
        gray:         '#4A5568',
        grayMid:      '#6B7280',
        grayLight:    '#9CA3AF',
        lightGray:    '#F4F6F8',
        cream:        '#FAFAF7',
        border:       '#D1D5DB',
        white:        '#FFFFFF',
    },

    // ─── BRAND FONTS ───────────────────────────────────────────
    fonts: {
        heading:     "'Playfair Display', 'Cormorant', Georgia, serif",
        subheading:  "'Inter', 'Helvetica Neue', Arial, sans-serif",
        body:        "'Inter', 'Helvetica Neue', Arial, sans-serif",
        mono:        "'JetBrains Mono', 'Courier New', monospace",
    },
};

// ═══════════════════════════════════════════════════════════════
// LOCALSTORAGE OVERRIDE
// Any field in localStorage['smartplans_company_overrides'] wins
// over the static file above. This is how the in-app Company
// Profile editor persists edits without touching source.
// ═══════════════════════════════════════════════════════════════

(function applyLocalStorageOverrides() {
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('smartplans_company_overrides') : null;
        if (!raw) return;
        const overrides = JSON.parse(raw);
        if (!overrides || typeof overrides !== 'object') return;
        // Shallow merge: any top-level key in overrides replaces the same key in COMPANY_CREDENTIALS
        Object.assign(COMPANY_CREDENTIALS, overrides);
        console.log('[SmartPlans] Applied company-credentials overrides from localStorage');
    } catch (e) {
        console.warn('[SmartPlans] Failed to apply company-credentials overrides:', e.message);
    }
})();

// ═══════════════════════════════════════════════════════════════
// HELPERS — used by proposal generator and Company Profile editor
// ═══════════════════════════════════════════════════════════════

const COMPANY_CREDENTIALS_HELPERS = {
    /**
     * Score a past project against a current bid's disciplines + building type.
     * Returns a numeric relevance score — higher is more relevant.
     * Used by the Past Performance Selector to auto-pick the 3 best matches.
     */
    scoreProject(project, bidContext) {
        if (!project || !bidContext) return 0;
        let score = 0;

        const bidDisciplines = new Set((bidContext.disciplines || []).map(d => String(d).toLowerCase()));
        const projDisciplines = new Set((project.disciplines || []).map(d => String(d).toLowerCase()));

        // +10 per matching discipline
        for (const d of projDisciplines) {
            if (bidDisciplines.has(d)) score += 10;
        }

        // +15 if building type matches
        const bidBuildingType = String(bidContext.buildingType || '').toLowerCase();
        if (bidBuildingType && String(project.buildingType || '').toLowerCase() === bidBuildingType) {
            score += 15;
        }

        // +8 if federal/public-works flag matches
        if (bidContext.prevailingWageRequired && (project.tags || []).some(t => /prevailing_wage|davis|federal|public_works|government|transit|railroad/.test(t))) {
            score += 8;
        }

        // +5 for tag overlap (soft boost)
        const projTags = new Set((project.tags || []).map(t => String(t).toLowerCase()));
        for (const t of projTags) {
            if (bidDisciplines.has(t) || bidBuildingType.includes(t) || t.includes(bidBuildingType)) {
                score += 5;
            }
        }

        return score;
    },

    /**
     * Pick the top N past projects for this bid.
     * Deterministic — no AI cost.
     */
    selectRelevantProjects(bidContext, count = 3) {
        const projects = COMPANY_CREDENTIALS.pastProjects || [];
        const scored = projects.map(p => ({ project: p, score: this.scoreProject(p, bidContext) }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, count).map(s => s.project);
    },

    /**
     * Return the list of every field currently marked [UPDATE],
     * so the Company Profile editor can surface them as "fill these in".
     */
    findUpdatePlaceholders(obj = COMPANY_CREDENTIALS, path = '') {
        const gaps = [];
        const walk = (o, p) => {
            if (o == null) return;
            if (typeof o === 'string') {
                if (/\[UPDATE/.test(o)) gaps.push({ path: p, current: o });
                return;
            }
            if (Array.isArray(o)) {
                o.forEach((item, i) => walk(item, `${p}[${i}]`));
                return;
            }
            if (typeof o === 'object') {
                for (const k of Object.keys(o)) {
                    walk(o[k], p ? `${p}.${k}` : k);
                }
            }
        };
        walk(obj, path);
        return gaps;
    },

    /**
     * Save an overrides object to localStorage. Called by the
     * Company Profile editor when the user clicks Save.
     */
    saveOverrides(overrides) {
        try {
            localStorage.setItem('smartplans_company_overrides', JSON.stringify(overrides));
            // Re-apply to current runtime object
            Object.assign(COMPANY_CREDENTIALS, overrides);
            return true;
        } catch (e) {
            console.error('[SmartPlans] Failed to save company-credentials overrides:', e.message);
            return false;
        }
    },

    loadOverrides() {
        try {
            const raw = localStorage.getItem('smartplans_company_overrides');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    },
};

// Make available on window for in-browser access
if (typeof window !== 'undefined') {
    window.COMPANY_CREDENTIALS = COMPANY_CREDENTIALS;
    window.COMPANY_CREDENTIALS_HELPERS = COMPANY_CREDENTIALS_HELPERS;
}
