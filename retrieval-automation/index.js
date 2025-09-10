const fs = require('fs');
const path = require('path');
const https = require('https');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

// ------------------------------
// CLI ARGS (minimal parsing)
// ------------------------------
function getArg(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

const endpointOpArg = getArg('--endpoint', 'discoveryTest'); // 'discover' | 'discoveryTest' | 'both'
const apiUrl = getArg('--url', 'https://concord.sandsmedia.com/graphql');
const languagesArg = getArg('--languages', 'en,de,nl'); // comma-separated: en,de,nl
const outDir = getArg('--outDir', path.join(__dirname, 'results'));
const explicitToken = getArg('--token', undefined);
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2N2E5YjNiYTJlZDBmZTA3Mjk3NDg5NjQiLCJpYXQiOjE3NTYxMTkyNzQsImV4cCI6MTc1OTU3NTI3NH0.zk0FU1APcn3n-9pVcsq6p57aJgJm108V04aCDDZzgWg';
const debug = getArg('--debug', 'false') === 'true';
const saveRaw = getArg('--saveRaw', 'true') === 'true';
const verbose = getArg('--verbose', 'true') === 'true';
const useManual = true; 

// ------------------------------
// Questions list: Series + old 90 questions 
// ------------------------------
const QUESTIONS_MANUAL = [
  { id: 'API London', en: 'When is next APICon London happening?', de: 'Wann findet die nächste APICon London statt?', nl: 'Wanneer vindt de volgende APICon London plaats?' },
  { id: 'API New York', en: 'When is next APICon New York happening?', de: 'Wann findet die nächste APICon New York statt?', nl: 'Wanneer vindt de volgende APICon New York plaats?' },
  { id: 'BASTA! Herbst', en: 'When is next BASTA! Herbst happening?', de: 'Wann findet die nächste BASTA! Herbst statt?', nl: 'Wanneer vindt de volgende BASTA! Herbst plaats?' },
  { id: 'BASTA! Spring', en: 'When is next BASTA! Spring happening?', de: 'Wann findet die nächste BASTA! Spring statt?', nl: 'Wanneer vindt die volgende BASTA! Spring plaats?' },
  { id: 'Delphi Code Camp Duesseldorf', en: 'When is next Delphi Code Camp Duesseldorf happening?', de: 'Wann findet die nächste Delphi Code Camp Düsseldorf statt?', nl: 'Wanneer vindt de volgende Delphi Code Camp Duesseldorf plaats?' },
  { id: 'DevOps Training Docker', en: 'When is next DevOps Training Docker happening?', de: 'Wann findet die nächste DevOps Training Docker statt?', nl: 'Wanneer vindt de volgende DevOps Training Docker plaats?' },
  { id: 'DevOps Training Kubernetes', en: 'When is next DevOps Training Kubernetes happening?', de: 'Wann findet die nächste DevOps Training Kubernetes statt?', nl: 'Wanneer vindt de volgende DevOps Training Kubernetes plaats?' },
  { id: 'DevOps Training Kubernetes Advanced', en: 'When is next DevOps Training Kubernetes Advanced happening?', de: 'Wann findet die nächste DevOps Training Kubernetes Advanced statt?', nl: 'Wanneer vindt de volgende DevOps Training Kubernetes Advanced plaats?' },
  { id: 'DevOps Training Kubernetes Master', en: 'When is next DevOps Training Kubernetes Master happening?', de: 'Wann findet die nächste DevOps Training Kubernetes Master statt?', nl: 'Wanneer vindt de volgende DevOps Training Kubernetes Master plaats?' },
  { id: 'DevOps Training Monitoring', en: 'When is next DevOps Training Monitoring happening?', de: 'Wann findet die nächste DevOps Training Monitoring statt?', nl: 'Wanneer vindt de volgende DevOps Training Monitoring plaats?' },
  { id: 'DevOps Training Service Mesh', en: 'When is next DevOps Training Service Mesh happening?', de: 'Wann findet die nächste DevOps Training Service Mesh statt?', nl: 'Wanneer vindt de volgende DevOps Training Service Mesh plaats?' },
  { id: 'DevOpsCon Berlin', en: 'When is next DevOpsCon Berlin happening?', de: 'Wann findet die nächste DevOpsCon Berlin statt?', nl: 'Wanneer vindt de volgende DevOpsCon Berlijn plaats?' },
  { id: 'DevOpsCon London', en: 'When is next DevOpsCon London happening?', de: 'Wann findet die nächste DevOpsCon London statt?', nl: 'Wanneer vindt de volgende DevOpsCon London plaats?' },
  { id: 'DevOpsCon Munich', en: 'When is next DevOpsCon Munich happening?', de: 'Wann findet die nächste DevOpsCon München statt?', nl: 'Wanneer vindt die volgende DevOpsCon München plaats?' },
  { id: 'DevOpsCon New York', en: 'When is next DevOpsCon New York happening?', de: 'Wann findet die nächste DevOpsCon New York statt?', nl: 'Wanneer vindt de volgende DevOpsCon New York plaats?' },
  { id: 'DevOpsCon San Diego, CA', en: 'When is next DevOpsCon San Diego, CA happening?', de: 'Wann findet die nächste DevOpsCon San Diego, CA statt?', nl: 'Wanneer vindt de volgende DevOpsCon San Diego, CA plaats?' },
  { id: 'DevOpsCon Singapore', en: 'When is next DevOpsCon Singapore happening?', de: 'Wann findet die nächste DevOpsCon Singapore statt?', nl: 'Wanneer vindt de volgende DevOpsCon Singapore plaats?' },
  { id: 'EKON', en: 'When is next EKON happening?', de: 'Wann findet die nächste EKON statt?', nl: 'Wanneer vindt de volgende EKON plaats?' },
  { id: 'entwickler summit', en: 'When is next entwickler summit happening?', de: 'Wann findet der nächste entwickler summit statt?', nl: 'Wanneer vindt die volgende entwickler summit plaats?' },
  { id: 'Extreme Java Camp Flexible Design Patterns', en: 'When is next Extreme Java Camp Flexible Design Patterns happening?', de: 'Wann findet die nächste Extreme Java Camp Flexible Design Patterns statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Flexible Design Patterns plaats?' },
  { id: 'Extreme Java Camp Flexible Java Threads', en: 'When is next Extreme Java Camp Flexible Java Threads happening?', de: 'Wann findet die nächste Extreme Java Camp Flexible Java Threads statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Flexible Java Threads plaats?' },
  { id: 'Extreme Java Camp Java 11 und 17 meistern', en: 'When is next Extreme Java Camp Java 11 und 17 meistern happening?', de: 'Wann findet die nächste Extreme Java Camp Java 11 und 17 meistern statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Java 11 und 17 meistern plaats?' },
  { id: 'Extreme Java Camp Refactoring und Design Pattern', en: 'When is next Extreme Java Camp Refactoring und Design Pattern happening?', de: 'Wann findet die nächste Extreme Java Camp Refactoring und Design Pattern statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Refactoring und Design Pattern plaats?' },
  { id: 'Extreme Java Camp Themeninhalte', en: 'When is next Extreme Java Camp Themeninhalte happening?', de: 'Wann findet die nächste Extreme Java Camp Themeninhalte statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Themeninhalte plaats?' },
  { id: 'iJS London', en: 'When is next iJS London happening?', de: 'Wann findet die nächste iJS London statt?', nl: 'Wanneer vindt die volgende iJS London plaats?' },
  { id: 'iJS Munich', en: 'When is next iJS Munich happening?', de: 'Wann findet die nächste iJS München statt?', nl: 'Wanneer vindt die volgende iJS München plaats?' },
  { id: 'iJS New York', en: 'When is next iJS New York happening?', de: 'Wann findet die nächste iJS New York statt?', nl: 'Wanneer vindt die volgende iJS New York plaats?' },
  { id: 'iJS San Diego, CA', en: 'When is next iJS San Diego, CA happening?', de: 'Wann findet die nächste iJS San Diego, CA statt?', nl: 'Wanneer vindt die volgende iJS San Diego, CA plaats?' },
  { id: 'iJS Singapore', en: 'When is next iJS Singapore happening?', de: 'Wann findet die nächste iJS Singapore statt?', nl: 'Wanneer vindt die volgende iJS Singapore plaats?' },
  { id: 'IoT Con Munich', en: 'When is next IoT Con Munich happening?', de: 'Wann findet die nächste IoT Con München statt?', nl: 'Wanneer vindt die volgende IoT Con München plaats?' },
  { id: 'International PHP Conference Berlin', en: 'When is next International PHP Conference Berlin happening?', de: 'Wann findet die nächste International PHP Conference Berlin statt?', nl: 'Wanneer vindt die volgende International PHP Conference Berlijn plaats?' },
  { id: 'International PHP Conference Munich', en: 'When is next International PHP Conference Munich happening?', de: 'Wann findet die nächste International PHP Conference München statt?', nl: 'Wanneer vindt die volgende International PHP Conference München plaats?' },
  { id: 'IT Security Camp on site', en: 'When is next IT Security Camp on site happening?', de: 'Wann findet die nächste IT Security Camp on site statt?', nl: 'Wanneer vindt die volgende IT Security Camp on site plaats?' },
  { id: 'IT Security Camp remote', en: 'When is next IT Security Camp remote happening?', de: 'Wann findet die nächste IT Security Camp remote statt?', nl: 'Wanneer vindt die volgende IT Security Camp remote plaats?' },
  { id: 'IT Security Summit BER', en: 'When is next IT Security Summit BER happening?', de: 'Wann findet der nächste IT Security Summit BER statt?', nl: 'Wanneer vindt die volgende IT Security Summit BER plaats?' },
  { id: 'IT Security Summit MUE', en: 'When is next IT Security Summit MUE happening?', de: 'Wann findet der nächste IT Security Summit MUE statt?', nl: 'Wanneer vindt die volgende IT Security Summit MUE plaats?' },
  { id: 'JavaCamp Munich', en: 'When is next JavaCamp Munich happening?', de: 'Wann findet die nächste JavaCamp München statt?', nl: 'Wanneer vindt die volgende JavaCamp München plaats?' },
  { id: 'JavaScript Days Berlin', en: 'When is next JavaScript Days Berlin happening?', de: 'Wann findet die nächste JavaScript Days Berlin statt?', nl: 'Wanneer vindt die volgende JavaScript Days Berlijn plaats?' },
  { id: 'JavaScript Days München', en: 'When is next JavaScript Days Munich happening?', de: 'Wann findet die nächste JavaScript Days München statt?', nl: 'Wanneer vindt die volgende JavaScript Days München plaats?' },
  { id: 'JAX', en: 'When is next JAX happening?', de: 'Wann findet die nächste JAX statt?', nl: 'Wanneer vindt die volgende JAX plaats?' },
  { id: 'W-JAX', en: 'When is next W-JAX happening?', de: 'Wann findet die nächste W-JAX statt?', nl: 'Wanneer vindt die volgende W-JAX plaats?' },
  { id: 'JAX London', en: 'When is next JAX London happening?', de: 'Wann findet die nächste JAX London statt?', nl: 'Wanneer vindt die volgende JAX London plaats?' },
  { id: 'JAX Microservices Camp', en: 'When is next JAX Microservices Camp happening?', de: 'Wann findet die nächste JAX Microservices Camp statt?', nl: 'Wanneer vindt die volgende JAX Microservices Camp plaats?' },
  { id: 'JAX New York', en: 'When is next JAX New York happening?', de: 'Wann findet die nächste JAX New York statt?', nl: 'Wanneer vindt die volgende JAX New York plaats?' },
  { id: 'MAD Summit Berlin', en: 'When is next MAD Summit Berlin happening?', de: 'Wann findet die nächste MAD Summit Berlin statt?', nl: 'Wanneer vindt die volgende MAD Summit Berlijn plaats?' },
  { id: 'MAD Summit München', en: 'When is next MAD Summit Munich happening?', de: 'Wann findet die nächste MAD Summit München statt?', nl: 'Wanneer vindt die volgende MAD Summit München plaats?' },
  { id: 'ML Conference Berlin', en: 'When is next ML Conference Berlin happening?', de: 'Wann findet die nächste ML Conference Berlin statt?', nl: 'Wanneer vindt die volgende ML Conference Berlijn plaats?' },
  { id: 'MLcon GenAI Camp', en: 'When is next MLcon GenAI Camp happening?', de: 'Wann findet die nächste MLcon GenAI Camp statt?', nl: 'Wanneer vindt die volgende MLcon GenAI Camp plaats?' },
  { id: 'MLcon London', en: 'When is next MLcon London happening?', de: 'Wann findet die nächste MLcon London statt?', nl: 'Wanneer vindt die volgende MLcon London plaats?' },
  { id: 'ML Conference Munich', en: 'When is next ML Conference Munich happening?', de: 'Wann findet die nächste ML Conference München statt?', nl: 'Wanneer vindt die volgende ML Conference München plaats?' },
  { id: 'ML Con New York', en: 'When is next ML Con New York happening?', de: 'Wann findet die nächste ML Con New York statt?', nl: 'Wanneer vindt die volgende ML Con New York plaats?' },
  { id: 'MLcon - San Diego', en: 'When is next MLcon - San Diego happening?', de: 'Wann findet die nächste MLcon - San Diego statt?', nl: 'Wanneer vindt die volgende MLcon - San Diego plaats?' },
  { id: 'ML Con Singapore', en: 'When is next ML Con Singapore happening?', de: 'Wann findet die nächste ML Con Singapore statt?', nl: 'Wanneer vindt die volgende ML Con Singapore plaats?' },
  { id: 'KI und .NET Camp online', en: 'When is next KI und .NET Camp online happening?', de: 'Wann findet die nächste KI und .NET Camp online statt?', nl: 'Wanneer vindt die volgende KI und .NET Camp online plaats?' },
  { id: 'SLA Berlin', en: 'When is next SLA Berlin happening?', de: 'Wann findet die nächste SLA Berlin statt?', nl: 'Wanneer vindt die volgende SLA Berlijn plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul ADOC', en: 'When is next Modul ADOC happening?', de: 'Wann findet die nächste Software Architecture Camp - Advanced Modul ADOC statt?', nl: 'Wanneer vindt die volgende Software Architecture Camp - Advanced Modul ADOC plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul AGILA', en: 'When is next Modul AGILA happening?', de: 'Wann findet die nächste Software Architecture Camp - Advanced Modul AGILA statt?', nl: 'Wanneer vindt die volgende Software Architecture Camp - Advanced Modul AGILA plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul ARCEVAL', en: 'When is next Modul ARCEVAL happening?', de: 'Wann findet die nächste Software Architecture Camp - Advanced Modul ARCEVAL statt?', nl: 'Wanneer vindt die volgende Software Architecture Camp - Advanced Modul ARCEVAL plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul CLOUDINFRA', en: 'When is next Advanced Modul CLOUDINFRA happening?', de: 'Wann findet die nächste Advanced Modul CLOUDINFRA statt?', nl: 'Wanneer vindt die volgende Advanced Modul CLOUDINFRA plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul DDD', en: 'When is next Advanced Modul DDD happening?', de: 'Wann findet die nächste Advanced Modul DDD statt?', nl: 'Wanneer vindt die volgende Advanced Modul DDD plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul DSL', en: 'When is next Advanced Modul DSL happening?', de: 'Wann findet die nächste Advanced Modul DSL statt?', nl: 'Wanneer vindt die volgende Advanced Modul DSL plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul FLEX', en: 'When is next Advanced Modul FLEX happening?', de: 'Wann findet die nächste Advanced Modul FLEX statt?', nl: 'Wanneer vindt die volgende Advanced Modul FLEX plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul FUNAR', en: 'When is next Advanced Modul FUNAR happening?', de: 'Wann findet die nächste Advanced Modul FUNAR statt?', nl: 'Wanneer vindt die volgende Advanced Modul FUNAR plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul IMPROVE', en: 'When is next Advanced Modul IMPROVE happening?', de: 'Wann findet die nächste Advanced Modul IMPROVE statt?', nl: 'Wanneer vindt die volgende Advanced Modul IMPROVE plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul SOFT', en: 'When is next Advanced Modul SOFT happening?', de: 'Wann findet die nächste Advanced Modul SOFT statt?', nl: 'Wanneer vindt die volgende Advanced Modul SOFT plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul SWARC4AI', en: 'When is next Advanced Modul SWARC4AI happening?', de: 'Wann findet die nächste Advanced Modul SWARC4AI statt?', nl: 'Wanneer vindt die volgende Advanced Modul SWARC4AI plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul WEB', en: 'When is next Advanced Modul WEB happening?', de: 'Wann findet die nächste Advanced Modul WEB statt?', nl: 'Wanneer vindt die volgende Advanced Modul WEB plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul WEBSEC', en: 'When is next Advanced Modul WEBSEC happening?', de: 'Wann findet die nächste Advanced Modul WEBSEC statt?', nl: 'Wanneer vindt die volgende Advanced Modul WEBSEC plaats?' },
  { id: 'Software Architecture Camp - Foundation', en: 'When is next Foundation happening?', de: 'Wann findet die nächste Foundation statt?', nl: 'Wanneer vindt die volgende Foundation plaats?' },
  { id: 'Software Architecture Summit Berlin', en: 'When is next Software Architecture Summit Berlin happening?', de: 'Wann findet die nächste Software Architecture Summit Berlin statt?', nl: 'Wanneer vindt die volgende Software Architecture Summit Berlijn plaats?' },
  { id: 'Software Architecture Summit München', en: 'When is next Software Architecture Summit Munich happening?', de: 'Wann findet die nächste Software Architecture Summit München statt?', nl: 'Wanneer vindt die volgende Software Architecture Summit München plaats?' },
  { id: 'webinale', en: 'When is next webinale happening?', de: 'Wann findet die nächste webinale statt?', nl: 'Wanneer vindt die volgende webinale plaats?' },
  { id: 'Web Security Camp', en: 'When is next Web Security Camp happening?', de: 'Wann findet die nächste Web Security Camp statt?', nl: 'Wanneer vindt die volgende Web Security Camp plaats?' },
  { id: 'Webinale', en: 'When is next Webinale happening?', de: 'Wann findet die nächste Webinale statt?', nl: 'Wanneer vindt die volgende Webinale plaats?' },
  { id: 'Extra 001', en: 'Show me all content by Erik Wilde' },
  { id: 'Extra 002', en: 'Find articles and videos from Erik Wilde' },
  { id: 'Extra 003', en: 'Find Arno Hases Talk at Jax' },
  { id: 'Extra 004', en: 'iJS Munich 2024' },
  { id: 'Extra 005', en: 'Show me all talks from iJS Munich 2024' },
  { id: 'Extra 006', en: 'Find me all workshops from the current iJS' },
  { id: 'Extra 007', en: 'What happend at this years MLcon?' },
  { id: 'Extra 008', en: 'Show me only live events about Kubernetes' },
  { id: 'Extra 009', en: 'Find all articles related to AI' },
  { id: 'Extra 010', en: 'Find all recordings on Kubernetes deployment' },
  { id: 'Extra 011', en: 'Show videos about Typescript' },
  { id: 'Extra 012', en: 'Show me all articles from Java Magazine' },
  { id: 'Extra 013', en: 'Find articles from Java Magazine' },
  { id: 'Extra 014', en: 'Find articles from Java Magazine Issue 11.2024' },
  { id: 'Extra 015', en: 'Show me Pieter Buteneers content on Machine Learning' },
  { id: 'Extra 016', en: 'iXS Munich 2024' },
  { id: 'Extra 017', en: 'Show me all sessions held by Wolfgang Pleus.' },
  { id: 'Extra 018', en: 'What workshops are available on GenAI?' },
  { id: 'Extra 019', en: 'Are there courses on AI?' },
  { id: 'Extra 020', en: 'Show me all training videos on .Net.' },
  { id: 'Extra 021', en: 'Are there any instructional videos on implementing TypeScript?' },
  { id: 'Extra 022', en: 'Find all e-learning courses on Angular.' },
  { id: 'Extra 023', en: 'Show me the bootcamps Manfred Steyer has offered on API design.' },
  { id: 'Extra 024', en: 'Show me the camps from Manfred Steyer' },
  { id: 'Extra 025', en: 'Show me all keynotes from the JAX Conference 2023.' },
  { id: 'Extra 026', en: 'What new developments have been presented at the MLcon in spring?' },
  { id: 'Extra 027', en: 'Find all current articles on Spring.' },
  { id: 'Extra 028', en: 'Show me presentations from the JS Con in recent years.' },
  { id: 'Extra 029', en: 'What are the latest talks from APIcon about REST APIs?' },
  { id: 'Extra 030', en: 'Find keynotes from DevOps held earlier this year.' },
  { id: 'Extra 031', en: 'Show me sessions on .NET MAUI' },
  { id: 'Extra 032', en: 'What were the Talks at last year’s EKON Conference?' },
  { id: 'Extra 033', en: 'Show me all talks on digital marketing?' },
  { id: 'Extra 034', en: 'Are there new JS trainings planned?' },
  { id: 'Extra 035', en: 'What happened at this year’s MAD?' },
  { id: 'Extra 036', en: 'What seminars were presented at the Software Architecture Summit last year?' },
  { id: 'Extra 037', en: 'Show me recordings from last year’s Summit.' },
  { id: 'Extra 038', en: 'Show me the articles published last year in the Entwickler Magazine.' },
  { id: 'Extra 039', en: 'What articles are currently featured in the CI/CD Magazine?' },
  { id: 'Extra 040', en: 'Are there any new training sessions on React?' },
  { id: 'Extra 041', en: 'What were the key topics in IT-Security last year?' },
  { id: 'Extra 042', en: 'What new bootcamps are being offered about DevSecOps?' },
  { id: 'Extra 043', en: 'What new JavaScript workshops are planned?' },
  { id: 'Extra 044', en: 'What courses on API design are available?' },
  { id: 'Extra 045', en: 'Is there something about Delphi?' },
  { id: 'Extra 046', en: 'Erik Wilde JAX 2024' },
  { id: 'Extra 047', en: 'Eric Wilde JAX 2024' },
  { id: 'Extra 048', en: 'Erik Wild JAX 2024' },
  { id: 'Extra 049', en: 'Erik test Wilde JAX 2024' },
  { id: 'Extra 050', en: 'Java Magazin 2024' },
  { id: 'Extra 051', en: 'Java Magazin 11.2024' },
  { id: 'Extra 052', en: 'Java Magazin 11 2024' },
  { id: 'Extra 053', en: 'Java Magazin 11/2024' },
  { id: 'Extra 054', en: 'Java Magazin 2024 11' },
  { id: 'Extra 055', en: 'Java Magazin November 2024' },
  { id: 'Extra 056', en: 'python setup.py' },
  { id: 'Extra 057', en: 'python axcf setup.py' },
  { id: 'Extra 058', en: 'python axcf gln setup.py' },
  { id: 'Extra 059', en: 'python axcf gln bzf setup.py' },
  { id: 'Extra 060', en: 'python axcf gln bzf wdp setup.py' },
  { id: 'Extra 061', en: 'python axcf gln bzf wdp päü setup.py' },
  { id: 'Extra 062', en: 'python axcf gln bzf wdp päü sqö setup.py' },
  { id: 'Extra 063', en: 'pithon setup.py' },
  { id: 'Extra 064', en: 'pithen setup.py' },
  { id: 'Extra 065', en: 'pithon setap.py' },
  { id: 'Extra 066', en: 'Helm' },
  { id: 'Extra 067', en: 'Helm webinar' },
  { id: 'Extra 068', en: 'Helm session' },
  { id: 'Extra 069', en: 'Helm articles' },
  { id: 'Extra 070', en: 'Helm Artikel' },
  { id: 'Extra 071', en: 'Helm Marc Müller' },
  { id: 'Extra 072', en: 'Helm conference Mark MüllerJavaFX' },
  { id: 'Extra 073', en: 'JavaFX video' },
  { id: 'Extra 074', en: 'JavaFX Konferenz' },
  { id: 'Extra 075', en: 'JavaFX article' },
  { id: 'Extra 076', en: 'JavaFX Frank Delporte' },
  { id: 'Extra 077', en: 'JavaFX Artikel' },
  { id: 'Extra 078', en: 'JavaFX Artikel Frank DelporteNext.js' },
  { id: 'Extra 079', en: 'Next.js tutorial' },
  { id: 'Extra 080', en: 'Next.js article' },
  { id: 'Extra 081', en: 'Next.js Sebastian Springer' },
  { id: 'Extra 082', en: 'Next.js workshop' },
  { id: 'Extra 083', en: 'Next.js session Sebastian Springer' },
  { id: 'Extra 084', en: 'Next.js Artikel Sebastian SpringerAPI Security' },
  { id: 'Extra 085', en: 'API Security workshop' },
  { id: 'Extra 086', en: 'API Security article' },
  { id: 'Extra 087', en: 'API Security Matthias Biehl' },
  { id: 'Extra 088', en: 'API Security Conference Matthias Biehl' },
  { id: 'Extra 089', en: 'API Security Workshop Biehl' },
  { id: 'Extra 090', en: 'API Security Video' },
  { id: 'Extra 091', en: '', de: 'Welche Neuerungen gibt es in Python 3.12?', nl: '' },
  { id: 'Extra 092', en: '', de: 'Ist Java 21 ein LTS-Release?', nl: '' },
  { id: 'Extra 093', en: '', de: 'Seit welcher Version unterstützt C# async/await?', nl: '' },
  { id: 'Extra 094', en: '', de: 'Welche Features wurden in Ruby 3.0 eingeführt?', nl: '' },
  { id: 'Extra 095', en: '', de: 'Wann erschien Go 1.22 und welche Änderungen bringt es?', nl: '' },
  { id: 'Extra 096', en: '', de: 'Welche Unterschiede gibt es zwischen PHP 7.4 und PHP 8.0?', nl: '' },
  { id: 'Extra 097', en: '', de: 'Ab welcher Version unterstützt Rust async/await stabil?', nl: '' },
  { id: 'Extra 098', en: '', de: 'Was wurde in Kotlin 2.0 geändert?', nl: '' },
  { id: 'Extra 099', en: '', de: 'Wie unterscheidet sich TypeScript 5.0 von TypeScript 4.9?', nl: '' },
  { id: 'Extra 100', en: '', de: 'Gibt es in Swift 6 neue Concurrency-Features?', nl: '' },
  { id: 'Extra 101', en: '', de: 'Welche Neuerungen bringt React 19?', nl: '' },
  { id: 'Extra 102', en: '', de: 'Ab welcher Version unterstützt Angular Standalone Components?', nl: '' },
  { id: 'Extra 103', en: '', de: 'Welche Features wurden in Vue 3.3 ergänzt?', nl: '' },
  { id: 'Extra 104', en: '', de: 'Was ist in Spring Boot 3.2 neu?', nl: '' },
  { id: 'Extra 105', en: '', de: 'Unterstützt Django 5.0 async views?', nl: '' },
  { id: 'Extra 106', en: '', de: 'Welche Performance-Verbesserungen kamen mit Laravel 11?', nl: '' },
  { id: 'Extra 107', en: '', de: 'Wann wurde TensorFlow 2.0 veröffentlicht?', nl: '' },
  { id: 'Extra 108', en: '', de: 'Welche Änderungen brachte PyTorch 2.1?', nl: '' },
  { id: 'Extra 109', en: '', de: 'Welche Breaking Changes enthält Next.js 14?', nl: '' },
  { id: 'Extra 110', en: '', de: 'Seit welcher Version unterstützt Flutter Material 3?', nl: '' },
  { id: 'Extra 111', en: '', de: 'Welche neuen Features gibt es in Docker 25?', nl: '' },
  { id: 'Extra 112', en: '', de: 'Seit welcher Version unterstützt Kubernetes Sidecar Containers?', nl: '' },
  { id: 'Extra 113', en: '', de: 'Was ist neu in Terraform 1.6?', nl: '' },
  { id: 'Extra 114', en: '', de: 'Welche Verbesserungen kamen mit Git 2.44?', nl: '' },
  { id: 'Extra 115', en: '', de: 'Seit wann unterstützt Node.js ES Modules standardmäßig?', nl: '' },
  { id: 'Extra 116', en: '', de: 'Welche Security-Features brachte OpenSSL 3.2?', nl: '' },
  { id: 'Extra 117', en: '', de: 'Was änderte sich in Nginx 1.25?', nl: '' },
  { id: 'Extra 118', en: '', de: 'Welche Neuerungen gibt es in PostgreSQL 16?', nl: '' },
  { id: 'Extra 119', en: '', de: 'Welche Änderungen kamen in MySQL 9.0?', nl: '' },
  { id: 'Extra 120', en: '', de: 'Was wurde in Redis 7 eingeführt?', nl: '' },
  { id: 'Extra 121', en: '', de: 'Was ist der Unterschied zwischen ECMAScript 2015 (ES6) und älteren Versionen?', nl: '' },
  { id: 'Extra 122', en: '', de: 'Welche Sprachfeatures wurden in Java ab Version 17 hinzugefügt?', nl: '' },
  { id: 'Extra 123', en: '', de: 'Welche Verbesserungen brachte C++20 gegenüber C++17?', nl: '' },
  { id: 'Extra 124', en: '', de: 'Welche neuen Operatoren führte PHP 8 ein?', nl: '' },
  { id: 'Extra 125', en: '', de: 'Welche Module sind in Python 3.11 schneller geworden?', nl: '' },
  { id: 'Extra 126', en: '', de: 'Welche Standardbibliotheken wurden in Rust 1.70 erweitert?', nl: '' },
  { id: 'Extra 127', en: '', de: 'Welche Änderungen gab es an Promises in neueren JavaScript-Versionen?', nl: '' },
  { id: 'Extra 128', en: '', de: 'Wie unterscheiden sich die HTTP/3-Unterstützung in nginx und Apache?', nl: '' },
  { id: 'Extra 129', en: '', de: 'Welche neuen Features wurden in CSS 2023/2024 eingeführt?', nl: '' },
  { id: 'Extra 130', en: '', de: 'Welche Verbesserungen an Concurrency gibt es in Go seit 1.20?', nl: '' },
  { id: 'Extra 131', en: '', de: 'Welche neuen Features gibt es in der jüngsten Java-Version?', nl: '' },
  { id: 'Extra 132', en: '', de: 'Hat die aktuelle Java-Version neue Garbage-Collector-Optionen?', nl: '' },
  { id: 'Extra 133', en: '', de: 'Welche Sprachfeatures wurden in den letzten Releases von Java ergänzt?', nl: '' },
  { id: 'Extra 134', en: '', de: 'Welche deprecated Features wurden in Java zuletzt entfernt?', nl: '' },
  { id: 'Extra 135', en: '', de: 'Gibt es seit der letzten größeren Java-Version Änderungen an Records?', nl: '' },
  { id: 'Extra 136', en: '', de: 'Unterstützt Java mittlerweile Pattern Matching vollständig?', nl: '' },
  { id: 'Extra 137', en: '', de: 'Welche Verbesserungen brachte die aktuelle Hauptversion von Java für Concurrency?', nl: '' },
  { id: 'Extra 138', en: '', de: 'Wurde die Performance in Java seit kurzem optimiert?', nl: '' },
  { id: 'Extra 139', en: '', de: 'Gibt es neue API-Erweiterungen in der jüngsten Java-Version?', nl: '' },
  { id: 'Extra 140', en: '', de: 'Welche Security-Verbesserungen brachte Java in den letzten Updates?', nl: '' },
  { id: 'Extra 141', en: '', de: 'Welche Features wurden in der jüngsten Angular-Version ergänzt?', nl: '' },
  { id: 'Extra 142', en: '', de: 'Unterstützt Angular mittlerweile Signals standardmäßig?', nl: '' },
  { id: 'Extra 143', en: '', de: 'Welche Verbesserungen gab es seit den letzten Angular-Releases für Standalone Components?', nl: '' },
  { id: 'Extra 144', en: '', de: 'Hat die aktuelle Angular-Version Änderungen am CLI gebracht?', nl: '' },
  { id: 'Extra 145', en: '', de: 'Welche Performance-Optimierungen gibt es in neueren Angular-Versionen?', nl: '' },
  { id: 'Extra 146', en: '', de: 'Welche Breaking Changes gab es seit der letzten größeren Angular-Version?', nl: '' },
  { id: 'Extra 147', en: '', de: 'Unterstützt Angular seit kurzem zonenfreies Rendering?', nl: '' },
  { id: 'Extra 148', en: '', de: 'Welche neuen Form-APIs kamen in der jüngsten Angular-Version hinzu?', nl: '' },
  { id: 'Extra 149', en: '', de: 'Gibt es Änderungen beim Router in den letzten Angular-Releases?', nl: '' },
  { id: 'Extra 150', en: '', de: 'Welche Verbesserungen für SSR brachte die aktuelle Angular-Version?', nl: '' },
  { id: 'Extra 151', en: '', de: 'Welche neuen Sprachfeatures gibt es in der aktuellen C#-Version?', nl: '' },
  { id: 'Extra 152', en: '', de: 'Wurde die Pattern Matching-Syntax in den letzten C#-Releases erweitert?', nl: '' },
  { id: 'Extra 153', en: '', de: 'Unterstützt C# seit kurzem bessere Records oder Data Classes?', nl: '' },
  { id: 'Extra 154', en: '', de: 'Welche Änderungen gab es in der jüngsten C#-Version an Async/await?', nl: '' },
  { id: 'Extra 155', en: '', de: 'Gibt es neue Features in der aktuellen Hauptversion von C#?', nl: '' },
  { id: 'Extra 156', en: '', de: 'Welche Verbesserungen wurden in den letzten Releases von C# bei Nullable Reference Types eingeführt?', nl: '' },
  { id: 'Extra 157', en: '', de: 'Hat C# mittlerweile erweiterte Lambda-Funktionen?', nl: '' },
  { id: 'Extra 158', en: '', de: 'Welche Performance-Verbesserungen brachte C# in den letzten Updates?', nl: '' },
  { id: 'Extra 159', en: '', de: 'Welche Operatoren oder Sprachkonstrukte wurden in neueren C#-Versionen hinzugefügt?', nl: '' },
  { id: 'Extra 160', en: '', de: 'Wurde die Unterstützung für Records in C# seit der letzten größeren Version verbessert?', nl: '' },
  { id: 'Extra 161', en: '', de: 'Welche neuen Features gibt es in der jüngsten .NET-Version?', nl: '' },
  { id: 'Extra 162', en: '', de: 'Hat die aktuelle .NET-Version Änderungen am Garbage Collector gebracht?', nl: '' },
  { id: 'Extra 163', en: '', de: 'Welche Verbesserungen gab es in den letzten Releases von .NET bei Blazor?', nl: '' },
  { id: 'Extra 164', en: '', de: 'Welche Breaking Changes kamen mit der aktuellen Hauptversion von .NET?', nl: '' },
  { id: 'Extra 165', en: '', de: 'Gibt es neue APIs in der jüngsten .NET-Version?', nl: '' },
  { id: 'Extra 166', en: '', de: 'Unterstützt .NET seit kurzem bessere Native-AOT-Deployments?', nl: '' },
  { id: 'Extra 167', en: '', de: 'Welche Security-Updates brachte .NET in den letzten Releases?', nl: '' },
  { id: 'Extra 168', en: '', de: 'Wurde die Performance von LINQ in neueren .NET-Versionen verbessert?', nl: '' },
  { id: 'Extra 169', en: '', de: 'Welche Cloud-Features sind in der aktuellen .NET-Version neu?', nl: '' },
  { id: 'Extra 170', en: '', de: 'Hat .NET mittlerweile bessere Cross-Platform-Unterstützung?', nl: '' }
];

// CSV mode removed (manual list only)

// Token from CLI or existing environment variable
const token = explicitToken || process.env.ACCESS_TOKEN || DEFAULT_TOKEN;
if (!token) {
  console.error('❌ Missing ACCESS_TOKEN. Provide via .env or --token.');
  process.exit(1);
}

// Validate op
if (!['discover', 'discoveryTest', 'both'].includes(endpointOpArg)) {
  console.error('❌ --endpoint must be "discover", "discoveryTest" or "both"');
  process.exit(1);
}

// ------------------------------
// Helpers
// ------------------------------
function readCsvRecords(filePath) {
  // CSV mode removed; keeping stub to avoid references
  return [];
}

function buildQuery(op) {
  // Request only fields we need to minimize payload
  if (op === 'discoveryTest') {
    return `query DiscoveryTest($question: String) {\n  discoveryTest(question: $question, enableRAG: false) {\n    keywords\n    results {\n      _id\n      title\n      parentGenre\n      contentType\n      indexBrandName\n      indexSeriesName\n      score\n      sortDate\n      experts {\n        name\n      }\n    }\n  }\n}`;
  }
  return `query ($question: String!) {\n  ${op}(question: $question, enableRAG: false) {\n    results {\n      _id\n      title\n      parentGenre\n      contentType\n      indexBrandName\n      indexSeriesName\n      score\n      sortDate\n      experts {\n        name\n      }\n    }\n  }\n}`;
}

function postGraphQL({ url, token, query, variables }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query, variables });
    const { hostname, pathname, protocol } = new URL(url);

    const options = {
      hostname,
      port: protocol === 'https:' ? 443 : 80,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'retrieval-automation/1.0',
        'access-token': token
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function runForEndpoint(op) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const languages = languagesArg.split(',').map(s => s.trim()).filter(Boolean);
  const queryString = buildQuery(op);
  const rows = [];
  const total = QUESTIONS_MANUAL.reduce((sum, rec) => {
    return sum + languages.filter((lang) => !!rec[lang]).length;
  }, 0);
  let processed = 0;

  for (const rec of QUESTIONS_MANUAL) {
    const questionId = rec.id;
    for (const lang of languages) {
      const question = rec[lang];
      if (!question) continue;

      const t0 = Date.now();
      const { status, data } = await postGraphQL({ url: apiUrl, token, query: queryString, variables: { question } });
      const ms = Date.now() - t0;
      processed++;
      if (getArg('--verbose', 'true') === 'true') {
        console.log(`${status === 200 ? '✅' : '❌'} ${op} ${processed}/${total} | ${questionId} [${lang}] (${ms}ms)`);
      }

      const container = (data && data.data && data.data[op]) || { results: [] };
      const results = Array.isArray(container.results) ? container.results : [];
      const keywords = op === 'discoveryTest' ? (container.keywords || '') : '';
      for (const item of results) {
        if (op === 'discoveryTest') {
          rows.push({
            questionId,
            endpoint: op,
            language: lang,
            question,
            keywords,
            _id: item._id || '',
            title: item.title || '',
            parentGenre: item.parentGenre || '',
            contentType: item.contentType || '',
            indexBrandName: item.indexBrandName || '',
            indexSeriesName: item.indexSeriesName || '',
            score: typeof item.score === 'number' ? item.score : '',
            sortDate: item.sortDate || '',
            experts: Array.isArray(item.experts) ? item.experts.map(e => (e && e.name) ? e.name : '').filter(Boolean) : []
          });
        } else {
          rows.push({
            questionId,
            endpoint: op,
            language: lang,
            question,
            keywords,
            _id: item._id || '',
            title: item.title || '',
            parentGenre: item.parentGenre || '',
            contentType: item.contentType || '',
            indexBrandName: item.indexBrandName || '',
            indexSeriesName: item.indexSeriesName || '',
            score: typeof item.score === 'number' ? item.score : '',
            sortDate: item.sortDate || '',
            experts: Array.isArray(item.experts) ? item.experts.map(e => (e && e.name) ? e.name : '').filter(Boolean) : []
          });
        }
      }
    }
  }

  if (getArg('--debug', 'false') === 'true') {
    console.log(`ℹ️  Collected rows: ${rows.length}`);
  }

  // Rename _id -> POC_Id for Excel output only (JSON keeps _id)
  const excelRows = rows.map(r => {
    const { _id, ...rest } = r;
    return { POC_Id: _id || '', ...rest };
  });
  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'results');

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outFile = path.join(outDir, `${op}_${ts}.xlsx`);
  XLSX.writeFile(workbook, outFile);
  console.log(`✅ Saved: ${outFile}`);

  if (getArg('--saveRaw', 'true') === 'true') {
    const rawDir = path.join(outDir, 'json');
    if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
    const rawPath = path.join(rawDir, `${op}_${ts}.json`);
    fs.writeFileSync(rawPath, JSON.stringify({ endpoint: op, url: apiUrl, questionMode: 'manual', languages, rows }, null, 2));
    if (getArg('--debug', 'false') === 'true') console.log(`📝 Raw saved: ${rawPath}`);
  }
}

async function main() {
  if (endpointOpArg === 'both') {
    await runForEndpoint('discoveryTest');
    await runForEndpoint('discover');
  } else {
    await runForEndpoint(endpointOpArg);
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});


