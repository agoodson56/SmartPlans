// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL SUBMITTAL PACKAGE GENERATOR v1.0
// CSI-formatted product submittals for GC/Owner approval
// Brand: Teal (#0D9488) + White + Gold (#BF9000) — NO navy
// ═══════════════════════════════════════════════════════════════
const SubmittalGenerator = {
  _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
  CO: { name:'3D Technology Services, Inc.', addr:'11365 Sunrise Gold Circle', csz:'Rancho Cordova, CA 95742', ph:'(916) 859-9111', web:'www.3Dtsi.com' },
  B: { teal:'#0D9488', tealDk:'#0F766E', gold:'#BF9000', white:'#FFFFFF', blk:'#1A1A2E', gray:'#4A5568', ltGray:'#F7F8FA', bdr:'#D1D5DB' },

  async generateSubmittal(state, cb) {
    cb = cb || (() => {});
    cb(5, 'Preparing submittal package…');
    const bom = (typeof getFilteredBOM === 'function') ? getFilteredBOM(state.aiAnalysis, state.disciplines) : SmartPlansExport._filterBOMByDisciplines(SmartPlansExport._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
    if (!bom || bom.categories.length === 0) throw new Error('No BOM data. Run the estimate first.');
    const products = []; let n = 0;
    for (const cat of bom.categories) for (const item of cat.items) { if (item.qty <= 0) continue; n++; products.push({ num:n, cat:cat.name, name:item.item||item.name||'', mfg:item.mfg||'TBD', pn:item.partNumber||'', qty:item.qty, unit:item.unit||'ea' }); }
    cb(15, 'Generating specs for ' + products.length + ' products…');
    const specs = await this._aiSpecs(products, state);
    cb(75, 'Building Word document…');
    const html = this._buildDoc(state, bom, products, specs);
    cb(95, 'Downloading…');
    const nm = (state.projectName||'Project').replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,'_');
    const blob = new Blob(['\ufeff'+html], { type:'application/msword' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=nm+'_Submittal_Package.doc'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    cb(100, 'Submittal package downloaded!');
  },

  async _aiSpecs(products, state) {
    const prompt = 'You are a low-voltage product specialist. For each product return a JSON array with: "num" (item number), "desc" (2-sentence description), "specs" (4-6 key specs array), "certs" (certifications array like UL, NDAA, FCC, NEC).\n\nPROJECT: '+(state.projectName||'Project')+'\nDISCIPLINES: '+(state.disciplines||[]).join(', ')+'\n\nPRODUCTS:\n'+products.map(function(p){return '['+p.num+'] '+p.name+' | MFG: '+p.mfg+' | Part#: '+p.pn;}).join('\n')+'\n\nReturn ONLY the JSON array.';
    try {
      const resp = await fetch('/api/ai/invoke', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.2,maxOutputTokens:16384}, _model:'gemini-3.1-pro-preview', _brainSlot:Math.floor(Math.random()*18) }) });
      let txt = ''; const reader = resp.body.getReader(); const dec = new TextDecoder();
      while (true) { const {done,value} = await reader.read(); if (done) break; for (const line of dec.decode(value,{stream:true}).split('\n')) { if (!line.startsWith('data: ')) continue; try { const ch=JSON.parse(line.substring(6)); if(ch._proxyError) continue; for(const p of (ch?.candidates?.[0]?.content?.parts||[])) if(p.text&&!p.thought) txt+=p.text; } catch(e){} } }
      const m = txt.match(/\[[\s\S]*\]/); if (m) return JSON.parse(m[0]);
    } catch(e) { console.warn('[Submittal] AI specs failed:', e); }
    return [];
  },

  _buildDoc(state, bom, products, specs) {
    const co=this.CO, b=this.B, e=this._esc.bind(this);
    const proj=e(state.projectName||'Untitled'), loc=e(state.projectLocation||'As Specified'), prep=e(state.preparedFor||state.projectName||'');
    const disc=e((state.disciplines||[]).join(', ')||'Low Voltage');
    const date=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    const subNum='SUB-'+((state.disciplines||['LV'])[0]||'LV').substring(0,4).toUpperCase()+'-001';
    const sm={}; for(const s of specs) sm[s.num]=s;
    const th='padding:8px 10px;font-weight:bold;color:'+b.white+';font-size:9pt;border:1px solid '+b.tealDk+';';
    const hdr=function(t){return '<p style="page-break-before:always;"></p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:'+b.teal+';padding:12px 20px;"><p style="margin:0;font-size:14pt;font-weight:bold;color:'+b.white+';letter-spacing:1px;">'+t+'</p></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:'+b.gold+';height:3px;font-size:1px;">&nbsp;</td></tr></table><p style="height:12px;font-size:1px;">&nbsp;</p>';};

    // Product Schedule
    let sched='', cc='';
    for(const p of products) { if(p.cat!==cc){cc=p.cat;sched+='<tr><td colspan="6" style="background:'+b.ltGray+';padding:8px 10px;font-weight:bold;font-size:10pt;border:1px solid '+b.bdr+';">'+e(cc)+'</td></tr>';} sched+='<tr><td style="padding:6px 10px;border:1px solid '+b.bdr+';text-align:center;font-size:9pt;">'+p.num+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';font-size:9pt;">'+e(p.name)+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';font-size:9pt;">'+e(p.mfg)+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';font-size:9pt;">'+e(p.pn)+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';text-align:center;font-size:9pt;">'+p.qty+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';text-align:center;font-size:9pt;">'+e(p.unit)+'</td></tr>'; }

    // Product Data
    let data='', sn=0; cc='';
    for(const p of products) { if(p.cat!==cc){cc=p.cat;sn++;data+=hdr('SECTION '+sn+': '+e(cc.toUpperCase()));} const sp=sm[p.num]||{}; const bul=(sp.specs||[]).map(function(s){return '<li style="margin:4px 0;font-size:9.5pt;">'+e(s)+'</li>';}).join(''); const crt=(sp.certs||[]).map(function(c){return '<span style="display:inline-block;background:'+b.ltGray+';border:1px solid '+b.bdr+';padding:2px 8px;margin:2px;font-size:8pt;font-weight:bold;">'+e(c)+'</span>';}).join(' ');
    data+='<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;"><tr><td style="border-bottom:2px solid '+b.teal+';padding:8px 0;"><p style="margin:0;font-size:11pt;font-weight:bold;color:'+b.blk+';">'+p.num+'. '+e(p.name)+'</p><p style="margin:2px 0 0 0;font-size:9pt;color:'+b.gray+';">'+e(p.mfg)+' | '+e(p.pn)+' | Qty: '+p.qty+' '+e(p.unit)+'</p></td></tr></table><p style="font-size:9.5pt;line-height:1.5;color:'+b.blk+';margin:6px 0 10px 0;">'+e(sp.desc||'Product specification data pending.')+'</p>'+(bul?'<p style="font-size:9pt;font-weight:bold;color:'+b.teal+';margin:8px 0 4px 0;">KEY SPECIFICATIONS</p><ul style="margin:0 0 10px 20px;padding:0;">'+bul+'</ul>':'')+(crt?'<p style="font-size:9pt;font-weight:bold;color:'+b.teal+';margin:8px 0 4px 0;">CERTIFICATIONS &amp; COMPLIANCE</p><p style="margin:0 0 10px 0;">'+crt+'</p>':''); }

    // Warranty
    const wr=[['Cameras &amp; VMS','3 Years','Hardware defects, firmware'],['Network Equipment','Limited Lifetime','Hardware, advance replacement'],['Structured Cabling','25 Years','Performance, components'],['Access Control','2 Years','Hardware defects'],['UPS / Power','2 Years','Electronics, 1yr battery'],['Installation Workmanship','1 Year ('+co.name+')','All labor, terminations']];
    let wt=''; for(let i=0;i<wr.length;i++){const r=wr[i]; wt+='<tr'+(i%2?' style="background:'+b.ltGray+';"':'')+'><td style="padding:6px 10px;border:1px solid '+b.bdr+';font-size:9pt;'+(i===5?'font-weight:bold;color:'+b.teal+';':'')+'">'+r[0]+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';font-size:9pt;'+(i===5?'font-weight:bold;':'')+'">'+r[1]+'</td><td style="padding:6px 10px;border:1px solid '+b.bdr+';font-size:9pt;">'+r[2]+'</td></tr>';}

    return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><meta name="ProgId" content="Word.Document"><title>'+proj+' Submittal</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--><style>@page{size:8.5in 11in;margin:0.7in 0.85in 0.8in 0.85in;mso-footer-margin:0.4in;}@page Section1{mso-footer:f1;}div.Section1{page:Section1;}body{font-family:Segoe UI,Calibri,Arial,sans-serif;font-size:10pt;color:'+b.blk+';line-height:1.4;}table{border-collapse:collapse;}p{margin:0 0 6px 0;}</style></head><body>'
    +'<div style="mso-element:footer" id="f1"><p style="text-align:center;font-size:8pt;font-weight:bold;color:'+b.gold+';text-transform:uppercase;letter-spacing:3pt;margin:0;padding-top:4pt;border-top:1pt solid '+b.teal+';">3D CONFIDENTIAL</p></div>'
    +'<div class="Section1">'
    // Cover
    +'<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:'+b.teal+';padding:40px 30px 30px 30px;"><p style="font-size:28pt;font-weight:bold;color:'+b.white+';letter-spacing:3px;margin:0;">PRODUCT SUBMITTAL</p><p style="font-size:14pt;color:'+b.gold+';letter-spacing:2px;margin:8px 0 0 0;">PACKAGE</p></td></tr></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:'+b.gold+';height:4px;font-size:1px;">&nbsp;</td></tr></table><p style="height:30px;font-size:1px;">&nbsp;</p>'
    +'<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;border-bottom:1px solid '+b.bdr+';width:35%;">Project</td><td style="padding:8px 0;font-size:12pt;font-weight:bold;border-bottom:1px solid '+b.bdr+';">'+proj+'</td></tr><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;border-bottom:1px solid '+b.bdr+';">Location</td><td style="padding:8px 0;border-bottom:1px solid '+b.bdr+';">'+loc+'</td></tr><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;border-bottom:1px solid '+b.bdr+';">Submitted To</td><td style="padding:8px 0;border-bottom:1px solid '+b.bdr+';">'+prep+'</td></tr><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;border-bottom:1px solid '+b.bdr+';">Submittal No.</td><td style="padding:8px 0;border-bottom:1px solid '+b.bdr+';">'+e(subNum)+'</td></tr><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;border-bottom:1px solid '+b.bdr+';">Date</td><td style="padding:8px 0;border-bottom:1px solid '+b.bdr+';">'+date+'</td></tr><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;border-bottom:1px solid '+b.bdr+';">Discipline</td><td style="padding:8px 0;border-bottom:1px solid '+b.bdr+';">'+disc+'</td></tr><tr><td style="padding:8px 0;color:'+b.gray+';font-weight:bold;">Total Products</td><td style="padding:8px 0;">'+products.length+' items</td></tr></table>'
    +'<p style="height:30px;font-size:1px;">&nbsp;</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:'+b.teal+';border:3px solid '+b.gold+';padding:16px 20px;text-align:center;"><p style="font-size:14pt;font-weight:bold;color:'+b.white+';letter-spacing:2px;margin:0;">STATUS: FOR APPROVAL</p></td></tr></table>'
    +'<p style="height:40px;font-size:1px;">&nbsp;</p><table width="100%"><tr><td style="color:'+b.gray+';">Prepared by</td></tr><tr><td style="font-size:12pt;font-weight:bold;color:'+b.teal+';padding:4px 0;">'+co.name+'</td></tr><tr><td style="font-size:9pt;color:'+b.gray+';">'+co.addr+'<br>'+co.csz+'<br>'+co.ph+' | '+co.web+'</td></tr></table>'
    // Product Schedule
    +hdr('PRODUCT SCHEDULE')
    +'<table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse;"><tr style="background:'+b.teal+';"><td style="'+th+'width:5%;">#</td><td style="'+th+'width:35%;">Description</td><td style="'+th+'width:15%;">Manufacturer</td><td style="'+th+'width:20%;">Model / Part #</td><td style="'+th+'width:8%;">Qty</td><td style="'+th+'width:7%;">Unit</td></tr>'+sched+'</table>'
    // Product Data
    +data
    // Warranty
    +hdr('WARRANTY INFORMATION')
    +'<table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse;"><tr style="background:'+b.teal+';"><td style="'+th+'">Category</td><td style="'+th+'">Warranty</td><td style="'+th+'">Coverage</td></tr>'+wt+'</table>'
    // Approval
    +hdr('SUBMITTAL RESPONSE')
    +'<p style="color:'+b.gray+';margin-bottom:20px;">Check one and sign below:</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 0;font-size:11pt;border-bottom:1px solid '+b.bdr+';">&#9744; <b>APPROVED</b> — No exceptions</td></tr><tr><td style="padding:12px 0;font-size:11pt;border-bottom:1px solid '+b.bdr+';">&#9744; <b>APPROVED AS NOTED</b></td></tr><tr><td style="padding:12px 0;font-size:11pt;border-bottom:1px solid '+b.bdr+';">&#9744; <b>REVISE AND RESUBMIT</b></td></tr><tr><td style="padding:12px 0;font-size:11pt;border-bottom:1px solid '+b.bdr+';">&#9744; <b>REJECTED</b></td></tr></table>'
    +'<p style="height:15px;font-size:1px;">&nbsp;</p><p style="font-weight:bold;color:'+b.teal+';">REVIEWER COMMENTS:</p><table width="100%"><tr><td style="border-bottom:1px solid '+b.bdr+';padding:20px 0;">&nbsp;</td></tr><tr><td style="border-bottom:1px solid '+b.bdr+';padding:20px 0;">&nbsp;</td></tr><tr><td style="border-bottom:1px solid '+b.bdr+';padding:20px 0;">&nbsp;</td></tr></table>'
    +'<p style="height:30px;font-size:1px;">&nbsp;</p><table width="100%"><tr><td style="background:'+b.gold+';height:2px;font-size:1px;">&nbsp;</td></tr></table><p style="height:20px;font-size:1px;">&nbsp;</p>'
    +'<table width="100%"><tr><td width="48%" style="vertical-align:top;"><p style="font-weight:bold;color:'+b.teal+';margin-bottom:8px;">'+co.name.toUpperCase()+'</p><table width="100%"><tr><td style="background:'+b.teal+';height:2px;font-size:1px;">&nbsp;</td></tr></table><p style="height:40px;font-size:1px;">&nbsp;</p><p style="border-bottom:1px solid '+b.bdr+';padding-bottom:4px;font-size:9pt;color:'+b.gray+';">AUTHORIZED SIGNATURE</p><p style="height:10px;font-size:1px;">&nbsp;</p><p style="border-bottom:1px solid '+b.bdr+';padding-bottom:4px;font-size:9pt;color:'+b.gray+';">PRINTED NAME &amp; TITLE</p><p style="height:10px;font-size:1px;">&nbsp;</p><p style="border-bottom:1px solid '+b.bdr+';padding-bottom:4px;font-size:9pt;color:'+b.gray+';">DATE</p></td><td width="4%">&nbsp;</td><td width="48%" style="vertical-align:top;"><p style="font-weight:bold;color:'+b.teal+';margin-bottom:8px;">REVIEWER</p><table width="100%"><tr><td style="background:'+b.teal+';height:2px;font-size:1px;">&nbsp;</td></tr></table><p style="height:40px;font-size:1px;">&nbsp;</p><p style="border-bottom:1px solid '+b.bdr+';padding-bottom:4px;font-size:9pt;color:'+b.gray+';">AUTHORIZED SIGNATURE</p><p style="height:10px;font-size:1px;">&nbsp;</p><p style="border-bottom:1px solid '+b.bdr+';padding-bottom:4px;font-size:9pt;color:'+b.gray+';">PRINTED NAME &amp; TITLE</p><p style="height:10px;font-size:1px;">&nbsp;</p><p style="border-bottom:1px solid '+b.bdr+';padding-bottom:4px;font-size:9pt;color:'+b.gray+';">DATE</p></td></tr></table>'
    +'<p style="height:30px;font-size:1px;">&nbsp;</p><table width="100%"><tr><td style="background:'+b.gold+';height:2px;font-size:1px;">&nbsp;</td></tr></table><p style="text-align:center;font-size:8pt;font-weight:bold;color:'+b.gold+';letter-spacing:3px;margin-top:8px;">3D CONFIDENTIAL</p><p style="text-align:center;font-size:8pt;color:'+b.gray+';margin-top:4px;">'+co.name+' &bull; '+co.addr+', '+co.csz+' &bull; '+co.web+'</p>'
    +'</div></body></html>';
  },
};
