'use strict';
const atlasRule = Object.freeze({status:'final', effective:'2027-01-01', id:'DEMO-SQ-01'});
const atlasDecisions = Object.freeze({
 A:Object.freeze({scope:true,dependency:true,hasRevision:false}),
 B:Object.freeze({scope:false,dependency:false,hasRevision:false})
});
function evaluateDecision(rule, decision, date) {
 if(!rule || !decision || decision.scope == null || decision.dependency == null) return 'Undetermined';
 if(!decision.scope || !decision.dependency) return 'No impact';
 if(rule.status==='proposed') return 'Watch only';
 if(rule.status!=='final' || !rule.effective || !date) return 'Undetermined';
 if(date<rule.effective) return 'Watch only';
 if(decision.hasRevision == null) return 'Undetermined';
 return decision.hasRevision ? 'No impact' : 'Review required';
}
const scanModes = Object.freeze({
 scheduled:'Dec. 29, 11:40 a.m. publication → Dec. 30, 6:15 a.m. scheduled check → change found.',
 catchup:'Host off at the Dec. 30 scheduled check → host returns Dec. 31 at 9:00 a.m. → timer starts a catch-up scan → change found if the scan succeeds.',
 manual:'Dec. 29, 11:40 a.m. publication → 11:45 a.m. manual run requested → change found, if the source is reachable.'
});
window.atlasRuleImpact = {atlasRule,atlasDecisions,evaluateDecision,scanModes};
