// All records, payment dates, names, and linked example text files are fictitious UI demonstration data.
const projects = {"0001":{"customer":"예시담당자","person":"예시담당자","phone":"010-0000-0000","email":"owner@example.com","number":"#0001","name":"개인 포트폴리오 홈페이지 제작","status":"제작중","ordered":"2026.10.01","due":"2026.12.31","progress":35,"payments":{"advance":{"due":300000,"received":300000,"payBy":"2026.10.05","paidAt":"2026.10.04"},"interim":{"due":400000,"received":250000,"payBy":"2026.10.20","paidAt":"2026.10.13"},"final":{"due":300000,"received":0,"payBy":"2026.12.31","paidAt":""},"extra":{"due":50000,"received":50000,"payBy":"2026.10.12","paidAt":"2026.10.11"}},"contacts":[{"method":"전화","detail":"010-0000-0000","date":"2026.10.14","target":"예시담당자","summary":"요구사항 확인 및 작업 일정 협의","result":"연락완료","nextDate":"2026.10.21"},{"method":"이메일","detail":"contact@example.com","date":"2026.10.12","target":"예시담당자","summary":"견적서 전달 및 검토 요청","result":"추가확인 필요","nextDate":"2026.10.17"},{"method":"카톡","detail":"담당자 채팅방","date":"2026.10.10","target":"예시담당자","summary":"참고자료 수신 및 적용 범위 확인","result":"연락완료","nextDate":"미정"},{"method":"문자","detail":"010-0000-0000","date":"2026.10.08","target":"예시담당자","summary":"상담 일정 안내","result":"재연락 필요","nextDate":"2026.10.10"}],"services":[{"name":"GitHub","use":"소스·버전 관리","info":"저장소 주소 미입력","owner":"개발자 계정","payer":"무료","renew":"해당 없음","cost":"무료","note":"버전관리"},{"name":"호스팅.kr","use":"도메인 관리","info":"example.com (예시)","owner":"고객","payer":"고객","renew":"2027.10.01","cost":"13,000원/년","note":"자동갱신 여부 확인"},{"name":"ImproveMX","use":"이메일 전달","info":"설정 계정 미입력","owner":"고객","payer":"고객","renew":"2026.11.01","cost":"3,000원/월","note":"갱신 예정"},{"name":"Vercel","use":"웹 배포","info":"배포 도메인 미입력","owner":"고객","payer":"고객","renew":"해당 없음","cost":"무료","note":"예시"},{"name":"Supabase","use":"DB · 파일 저장","info":"프로젝트 ID 미입력","owner":"고객","payer":"고객","renew":"요금제별 확인","cost":"무료","note":"예시"}],"github":"https://example.com/demo-repository","chatgpt":"","site":"https://example.com","lastDeployed":"2026.10.12 (예시)","delivery":"납품 준비중","deliveredAt":"미납품","acceptance":"검수 전","maintenanceUntil":"미시작","portfolio":"미정","portfolioProof":"공개 동의 미확보","documents":{"contract":{"status":"제작완료","version":"v1.1","updated":"2026.10.11"},"design":{"status":"제작완료","version":"v0.9","updated":"2026.10.13"},"description":{"status":"미완","version":"-","updated":"2026.10.14"},"handover":{"status":"미완","version":"-","updated":"미기록"}}},"0002":{"customer":"진흥산업","person":"김담당","phone":"010-0000-0000","email":"manager@example.com","number":"#0002","name":"기업 소개 홈페이지 구축","status":"검수중","ordered":"2026.09.20","due":"2026.11.30","progress":90,"payments":{"advance":{"due":450000,"received":450000,"payBy":"2026.09.25","paidAt":"2026.09.24"},"interim":{"due":600000,"received":600000,"payBy":"2026.10.09","paidAt":"2026.10.08"},"final":{"due":600000,"received":0,"payBy":"2026.11.30","paidAt":""},"extra":{"due":120000,"received":120000,"payBy":"2026.10.10","paidAt":"2026.10.10"}},"contacts":[{"method":"이메일","detail":"office@example.com","date":"2026.10.13","target":"김담당","summary":"검수 의견 접수","result":"추가확인 필요","nextDate":"2026.10.19"},{"method":"전화","detail":"010-0000-0000","date":"2026.10.09","target":"김담당","summary":"제품 소개 자료 요청","result":"연락완료","nextDate":"2026.10.16"},{"method":"카톡","detail":"진흥산업 협의방","date":"2026.10.02","target":"김담당","summary":"메뉴 구성 협의","result":"연락완료","nextDate":"미정"}],"services":[{"name":"GitHub","use":"소스·버전 관리","info":"예시 저장소","owner":"고객","payer":"무료","renew":"해당 없음","cost":"무료","note":"예시"},{"name":"Supabase","use":"데이터 저장","info":"예시 DB","owner":"고객","payer":"고객","renew":"매월 05일","cost":"32,000원/월","note":"예시"},{"name":"Vercel","use":"홈페이지 배포","info":"예시 배포 설정","owner":"고객","payer":"고객","renew":"매월 20일","cost":"무료","note":"예시"}],"github":"","chatgpt":"","site":"https://example.com","lastDeployed":"2026.10.14 (예시)","delivery":"검수본 전달","deliveredAt":"미납품 (최종본)","acceptance":"검수 진행중","maintenanceUntil":"시작 전","portfolio":"비공개","portfolioProof":"공개 승인 요청 전","documents":{"contract":{"status":"인계","version":"v1.0","updated":"2026.09.22"},"design":{"status":"제작완료","version":"v1.4","updated":"2026.10.11"},"description":{"status":"제작완료","version":"v1.0","updated":"2026.10.14"},"handover":{"status":"미완","version":"-","updated":"미기록"}}},"0003":{"customer":"현산개발","person":"이담당","phone":"010-0000-0000","email":"team@example.com","number":"#0003","name":"현장 업무 자동화 구축","status":"제작중","ordered":"2026.10.05","due":"2027.01.15","progress":20,"payments":{"advance":{"due":150000,"received":0,"payBy":"2026.10.18","paidAt":""},"interim":{"due":200000,"received":0,"payBy":"2026.12.01","paidAt":""},"final":{"due":250000,"received":0,"payBy":"2027.01.15","paidAt":""},"extra":{"due":0,"received":0,"payBy":"","paidAt":""}},"contacts":[{"method":"전화","detail":"010-0000-0000","date":"2026.10.15","target":"이담당","summary":"자동화 대상 업무 확인","result":"부재·미응답","nextDate":"2026.10.22"},{"method":"이메일","detail":"admin@example.com","date":"2026.10.13","target":"이담당","summary":"현행 업무 양식 수신","result":"연락완료","nextDate":"2026.10.20"}],"services":[{"name":"GitHub","use":"소스·버전 관리","info":"저장소 미입력","owner":"개발자 계정","payer":"무료","renew":"해당 없음","cost":"무료","note":"예시"},{"name":"n8n","use":"업무 흐름 자동화","info":"인스턴스 미입력","owner":"고객","payer":"고객","renew":"요금제 미정","cost":"미정","note":"구축중"},{"name":"VPS","use":"자동화 서버 운영","info":"서버 미입력","owner":"고객","payer":"고객","renew":"미정","cost":"미정","note":"미계약"},{"name":"Raspberry Pi","use":"현장 장비","info":"장비 ID 미입력","owner":"고객","payer":"고객","renew":"해당 없음","cost":"구매예정","note":"구축중"}],"github":"","chatgpt":"","site":"","lastDeployed":"미배포","delivery":"미납품","deliveredAt":"미납품","acceptance":"검수 전","maintenanceUntil":"시작 전","portfolio":"미정","portfolioProof":"승인 근거 없음","documents":{"contract":{"status":"미완","version":"-","updated":"미기록"},"design":{"status":"제작완료","version":"v0.2","updated":"2026.10.12"},"description":{"status":"미완","version":"-","updated":"미기록"},"handover":{"status":"미완","version":"-","updated":"미기록"}}}};

// UI presentation-only sample schedules and issues: not operational Job/task records.
const dashboardExtras = {
 '0001':{
  tasks:[{name:'메인화면 구성 정리',owner:'예시담당자',due:'2026.10.14',status:'완료',doneAt:'2026.10.14'},{name:'관리자 인증 연동',owner:'예시담당자',due:'2026.10.17',status:'진행중',doneAt:''},{name:'고객 검수 요청',owner:'예시담당자',due:'2026.10.22',status:'미착수',doneAt:''},{name:'납품 안내문 검토',owner:'예시담당자',due:'2026.10.27',status:'미착수',doneAt:''}],
  attention:[{type:'자료',title:'고객 이미지 자료 미수신',priority:'보통',status:'확인대기',owner:'고객'},{type:'변경요청',title:'추가 기능 요청 검토',priority:'높음',status:'협의중',owner:'예시담당자'}]
 },
 '0002':{
  tasks:[{name:'검수 의견 반영',owner:'예시담당자',due:'2026.10.16',status:'진행중',doneAt:''},{name:'2차 검수 요청',owner:'예시담당자',due:'2026.10.19',status:'미착수',doneAt:''},{name:'최종본 납품 검토',owner:'예시담당자',due:'2026.10.25',status:'미착수',doneAt:''}],
  attention:[{type:'검수',title:'고객 검수 의견 확인 필요',priority:'높음',status:'확인대기',owner:'김담당'},{type:'자료',title:'제품 소개 이미지 누락',priority:'보통',status:'자료대기',owner:'고객'}]
 },
 '0003':{
  tasks:[{name:'자동화 요구사항 정리',owner:'예시담당자',due:'2026.10.17',status:'진행중',doneAt:''},{name:'현장 양식 분석',owner:'예시담당자',due:'2026.10.24',status:'미착수',doneAt:''},{name:'작업 흐름 설계',owner:'예시담당자',due:'2026.10.31',status:'미착수',doneAt:''}],
  attention:[{type:'자료',title:'원본 작업 양식 추가 요청',priority:'높음',status:'확인대기',owner:'이담당'},{type:'연락',title:'담당자 통화 재시도',priority:'보통',status:'재연락',owner:'예시담당자'}]
 }
};
const CONTACT_HEADERS=['접촉방식','접촉정보','접촉일자','접촉 대상자','접촉주요내용','접촉 결과','다음접촉예정일'];
const DOC_KEYS=[['contract','계약서'],['design','상품설계서'],['description','상품설명서'],['handover','인수인계확인서']];
const STATUS_CLASSES={'미완':'pending','제작완료':'ready','인계':'handed'};
const WON = n => Number(n).toLocaleString('ko-KR')+'원';
const makeEl=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
function setText(id,value){document.getElementById(id).textContent=value??'미입력';}
function refreshContactRows(contacts){
 const body=document.getElementById('contact-rows');body.replaceChildren();
 for(const rowData of [...contacts,...Array.from({length:Math.max(0,5-contacts.length)},()=>null)]){
   const tr=body.insertRow();if(!rowData)tr.className='is-empty';
   const fields=rowData?[rowData.method,rowData.detail,rowData.date,rowData.target,rowData.summary,rowData.result,rowData.nextDate]:Array(7).fill('');
   fields.forEach((value,i)=>{const td=tr.insertCell();td.dataset.label=CONTACT_HEADERS[i];if(i===5&&value){td.append(makeEl('span','contact-result '+(value==='연락완료'?'result-ok':value==='후속조치 불필요'?'result-neutral':'result-attention'),value));}else td.textContent=value;if(!value)td.classList.add('blank');});
 }
 document.querySelector('.contact-scroll').scrollTop=0;
}
function refreshServiceRows(services){
 const body=document.getElementById('service-rows');body.replaceChildren();
 const headers=['서비스·시스템명','사용 용도','연결·관리 정보','유지비','비고'];
 for(const info of services){const tr=body.insertRow();
  for(const [i,key] of ['name','use','info','cost','note'].entries()){
   const td=tr.insertCell();td.dataset.label=headers[i];
   if(key==='info'){td.append(makeEl('div','service-main',info.info));for(const [label,k] of [['계정 소유자','owner'],['비용 부담','payer'],['갱신·만료','renew']])td.append(makeEl('small','service-mini',label+' · '+info[k]));}
   else{td.textContent=info[key];if(!info[key])td.classList.add('blank');}
  }
 }
 document.querySelector('.build-scroll').scrollTop=0;
}
function refreshPaymentRows(payments){
 const fields=[['advance','착수금'],['interim','중도금'],['final','잔금'],['extra','추가금']];
 const body=document.getElementById('payment-summary-rows');body.replaceChildren();const row=body.insertRow();
 let totalDue=0,totalPaid=0;
 for(const [key,label] of fields){
   const p=payments[key];if(!Number.isSafeInteger(p.due)||!Number.isSafeInteger(p.received)||p.received<0||p.due<0||p.received>p.due)throw Error('잘못된 예시 대금 정보');
   totalDue+=p.due;totalPaid+=p.received;
   const td=row.insertCell();td.dataset.label=label;
   if(p.received)td.append(makeEl('span','payment-paid','수금 '+WON(p.received)));
   if(p.due>p.received)td.append(makeEl('span','payment-unpaid','미수 '+WON(p.due-p.received)));
   if(!p.due)td.append(makeEl('span','blank','해당 없음'));
   td.append(makeEl('small','payment-detail','입금예정 '+(p.payBy||(p.due===0?'해당 없음':'미정'))));
   td.append(makeEl('small','payment-detail','실제 수금일 '+(p.paidAt||(p.due===0?'해당 없음':'미수'))));
 }
 for(const [label,value,kind] of [['계약 총금액',totalDue,'payment-contract'],['수금합계',totalPaid,'payment-total'],['미수금',totalDue-totalPaid,'payment-outstanding']]){
   const td=row.insertCell();td.dataset.label=label;td.className=kind;
   const cls=(kind==='payment-total'&&value)?'payment-paid':(kind==='payment-outstanding'&&value)?'payment-unpaid':'payment-neutral';
   td.append(makeEl('strong',cls,WON(value)));
 }
}
function refreshLinkRows(p){
 const body=document.getElementById('project-link-rows');body.replaceChildren();
 const vals=[['GitHub 리포지토리',p.github,'저장소 미등록'],['ChatGPT 대화',p.chatgpt,'대화 링크 미등록'],['실제 운영 URL',p.site,'운영 URL 미등록'],['최근 배포일',p.lastDeployed,'미배포']];
 for(const [label,value,empty] of vals){const tr=body.insertRow();tr.insertCell().textContent=label;const td=tr.insertCell();
   if(value&&value.startsWith('https://')){const a=makeEl('a','','예시 주소 · '+value);a.href=value;a.target='_blank';a.rel='noopener noreferrer';td.append(a);}
   else{td.className='blank';td.textContent=value||empty;}
 }
}
function refreshDeliveryRows(p){
 const body=document.getElementById('delivery-info-rows');body.replaceChildren();
 for(const [label,key] of [['납품정보','delivery'],['실제 납품일','deliveredAt'],['고객 검수상태','acceptance'],['유지보수 종료일','maintenanceUntil'],['포트폴리오 공개여부','portfolio'],['포트폴리오 공개승인 근거','portfolioProof']]){
  const tr=body.insertRow();tr.insertCell().textContent=label;tr.insertCell().textContent=p[key];
 }
}
function previewDocumentHref(projectId,key){
 const label=DOC_KEYS.find(record=>record[0]===key)?.[1]||key;
 return 'data:text/plain;charset=utf-8,'+encodeURIComponent('[WORK & WEB UI 시연용 문서]\n프로젝트: #'+projectId+'\n문서: '+label+'\n실제 계약서/인계 증빙이 아닙니다.\n이 파일은 UI 시안 확인 목적의 예시 텍스트입니다.\n');
}
function refreshDocuments(p,projectId){
 const body=document.getElementById('document-status-rows');body.replaceChildren();
 for(const [key,label] of DOC_KEYS){const data=p.documents[key];if(!Object.hasOwn(STATUS_CLASSES,data.status))throw Error('잘못된 예시 문서 상태');
  const tr=body.insertRow();tr.insertCell().textContent=label;const td=tr.insertCell();
  td.append(makeEl('span','document-stage document-stage-'+STATUS_CLASSES[data.status],data.status));
  td.append(makeEl('div','doc-meta','버전 '+data.version+' · 변경 '+data.updated));
  if(data.status==='미완')td.append(makeEl('span','doc-file-blank','파일 미등록'));
  else{const a=makeEl('a','doc-sample-link','예시 파일 받기');a.href=previewDocumentHref(projectId,key);a.download=projectId+'_'+label+'_예시.txt';td.append(a);}
 }
}
function daysLeft(date){const [y,m,d]=date.split('.').map(Number);const now=new Date();const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());const diff=Math.round((Date.UTC(y,m-1,d)-today)/86400000);return diff>=0?diff+'일':Math.abs(diff)+'일 경과';}
function chooseProject(id){
 const p=projects[id];if(!p)return;
 for(const [target,key] of [['project-customer','customer'],['project-contact-person','person'],['project-number','number'],['project-name-text','name'],['project-order-date','ordered'],['project-due-date','due']])setText(target,p[key]);
 const phoneCell=document.getElementById('project-phone');const email=makeEl('div','secondary-line',p.email);email.id='project-email';phoneCell.replaceChildren(makeEl('div','contact-primary',p.phone),email);
 setText('project-status',p.status);
 const badge=document.getElementById('project-status');badge.dataset.kind=p.status==='검수중'?'review':(p.status==='납품완료'||p.status==='종료')?'done':'active';
 setText('project-remaining',daysLeft(p.due));setText('project-percent',p.progress+'%');
 document.getElementById('project-progress-fill').style.width=p.progress+'%';document.querySelector('.progress-track').setAttribute('aria-valuenow',String(p.progress));
 refreshPaymentRows(p.payments);refreshContactRows(p.contacts);refreshServiceRows(p.services);refreshLinkRows(p);refreshDeliveryRows(p);refreshDocuments(p,id);
 renderDashboardSummary(id,p);
 document.querySelectorAll('[data-project]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.project===id)));
 document.getElementById('project-switcher').open=false;
}

const PANEL_TITLES={basic:'프로젝트 기본정보',payments:'대금 상세 현황',tasks:'업무일정·진행현황',attention:'확인 필요 · 미해결 사항',contacts:'접촉이력',docs:'문서·인계 현황',services:'구축·운영 서비스',links:'개발·운영 링크',delivery:'납품·포트폴리오'};
function dayDifference(date){
 const [y,m,d]=date.split('.').map(Number);const now=new Date();
 return Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);
}
function dateMarker(date){
 if(!date)return '미정';
 const diff=dayDifference(date);
 return diff===0?'D-day':diff<0?'D+'+Math.abs(diff):'D-'+diff;
}
function formatDateShort(date){return /^\d{4}\.\d{2}\.\d{2}$/.test(date)?date.slice(5):date;}
function summaryButton(panel,main,side,sideClass=''){
 const button=makeEl('button','compact-item summary-action');button.type='button';button.dataset.openPanel=panel;
 button.append(makeEl('span','row-main',main),makeEl('span','row-side '+sideClass,side));
 return button;
}
function setSummaryBadge(el,value){
 el.textContent=value;
 el.dataset.kind=value==='검수중'?'review':(value==='납품완료'||value==='종료')?'done':'active';
}
function renderDashboardSummary(id,p){
 const info=dashboardExtras[id],paymentValues=Object.values(p.payments);
 let totalDue=0,paid=0;
 for(const amount of paymentValues){if(!Number.isSafeInteger(amount.due)||!Number.isSafeInteger(amount.received)||amount.due<0||amount.received<0||amount.received>amount.due)throw Error('잘못된 예시 대금 정보');totalDue+=amount.due;paid+=amount.received;}
 setText('dashboard-name',p.name);setText('dashboard-number',p.number);setText('dashboard-customer','고객 '+p.customer+' · 담당 '+p.person);
 setText('dashboard-progress',p.progress+'%');document.getElementById('dashboard-progress-fill').style.width=p.progress+'%';
 setSummaryBadge(document.getElementById('dashboard-status'),p.status);
 setText('dashboard-due',p.due);setText('dashboard-remaining',daysLeft(p.due));
 setText('metric-contract',WON(totalDue));setText('metric-collected',WON(paid));setText('metric-unpaid',WON(totalDue-paid));
 const nextPayment=paymentValues.filter(x=>x.due>x.received&&/^\d{4}\.\d{2}\.\d{2}$/.test(x.payBy)).map(x=>x.payBy).sort()[0];
 setText('metric-next-payment',nextPayment?'다음 입금예정 '+formatDateShort(nextPayment):'입금예정 미정');
 const pendingTasks=info.tasks.filter(x=>x.status!=='완료').sort((a,b)=>a.due.localeCompare(b.due));
 const tasks=document.getElementById('dashboard-tasks');tasks.replaceChildren();
 for(const t of pendingTasks.slice(0,3)){const days=dayDifference(t.due);tasks.append(summaryButton('tasks',t.name,dateMarker(t.due),days<=1?'alert':''));}
 if(!pendingTasks.length)tasks.append(summaryButton('tasks','남은 업무 없음','완료','complete'));
 const attention=document.getElementById('dashboard-attention');attention.replaceChildren();
 for(const item of info.attention.slice(0,3))attention.append(summaryButton('attention',item.title,item.status,item.priority==='높음'?'alert':''));
 if(!info.attention.length)attention.append(summaryButton('attention','확인할 항목 없음','정상','complete'));
 const contacts=document.getElementById('dashboard-contacts');contacts.replaceChildren();
 for(const c of [...p.contacts].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2))contacts.append(summaryButton('contacts',formatDateShort(c.date)+' · '+c.method+' · '+c.summary,c.result,c.result==='연락완료'?'complete':'alert'));
 const nextContact=p.contacts.map(x=>x.nextDate).filter(x=>/^\d{4}\.\d{2}\.\d{2}$/.test(x)).sort().find(x=>dayDifference(x)>=0);
 setText('dashboard-next-contact',nextContact||'예정 없음');
 const docs=document.getElementById('dashboard-documents');docs.replaceChildren();
 for(const [key,label] of DOC_KEYS){
  const status=p.documents[key].status;
  docs.append(summaryButton('docs',label,status,status==='인계'?'complete':status==='미완'?'alert':''));
 }
 setText('dashboard-service-count',p.services.length+'개');
 setText('dashboard-acceptance',p.acceptance);
 setText('dashboard-portfolio',p.portfolio);
 const taskBody=document.getElementById('task-detail-rows');taskBody.replaceChildren();
 for(const task of info.tasks){
  const r=taskBody.insertRow();for(const value of [task.name,task.owner,task.due,task.status,task.doneAt||'—'])r.insertCell().textContent=value;
 }
 const attentionBody=document.getElementById('attention-detail-rows');attentionBody.replaceChildren();
 for(const item of info.attention){
  const r=attentionBody.insertRow();for(const value of [item.type,item.title,item.priority,item.status,item.owner])r.insertCell().textContent=value;
 }
}
function openDetailPanel(panelId){
 if(!Object.hasOwn(PANEL_TITLES,panelId))return;
 const dialog=document.getElementById('detail-dialog');
 document.querySelectorAll('[data-dialog-panel]').forEach(panel=>{panel.hidden=panel.dataset.dialogPanel!==panelId;});
 document.querySelectorAll('.dialog-nav [data-open-panel]').forEach(button=>button.setAttribute('aria-current',String(button.dataset.openPanel===panelId)));
 document.getElementById('dialog-title').textContent=PANEL_TITLES[panelId];
 if(!dialog.open)dialog.showModal();
 document.getElementById('dialog-body').scrollTop=0;
}

document.addEventListener('click',event=>{const button=event.target.closest('[data-open-panel]');if(button)openDetailPanel(button.dataset.openPanel);});
document.getElementById('dialog-close').addEventListener('click',()=>document.getElementById('detail-dialog').close());
document.getElementById('detail-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>chooseProject(button.dataset.project)));
document.addEventListener('click',event=>{const box=document.getElementById('project-switcher');if(box.open&&!box.contains(event.target))box.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.getElementById('project-switcher').open=false;});
chooseProject('0001');
