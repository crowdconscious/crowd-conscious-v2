/**
 * All words of the full report, computed from data only. Shared by the PDF
 * (report-pdf.ts) and the responsive web report so they never diverge.
 */
import { FIRM_THRESHOLD, MIN_GROUP, MIN_RESPONSES_FOR_HEADLINE, orderByFirmYes } from './firmness'
import { longDate } from './format'
import { mainSentence, phraseFor, readingHeadline } from './headline-copy'
import { questionTrend, responseRate, type ClientQuestion, type ClientReading } from './readings'

type Loc = 'es' | 'en'
const sgn = (n: number) => `${n >= 0 ? '+' : ''}${n}`

export type ReportContent = ReturnType<typeof buildReportContent>

export function buildReportContent(r: ClientReading, orgName: string, locale: Loc, earlier: ClientReading | null = null) {
  const es = locale === 'es'
  const L = (a: string, b: string) => (es ? a : b)
  const qs = r.questions
  const ordered = orderByFirmYes(qs)
  const num = (q: ClientQuestion) => qs.findIndex((x) => x.id === q.id) + 1
  const label = (q: ClientQuestion) => q.text[locale]
  const quote = (s: string) => (es ? `«${s}»` : `“${s}”`)
  const rate = responseRate(r)
  const nf = (n: number) => n.toLocaleString(es ? 'es-MX' : 'en-US')
  const hasInvited = r.invited > 0
  const opens = r.fieldOpens ? longDate(r.fieldOpens, locale) : ''
  const closes = r.fieldCloses ? longDate(r.fieldCloses, locale) : ''
  const yesTotal = qs.reduce((a, q) => a + q.stats.yesCount, 0)
  const yesCertAll = yesTotal ? qs.reduce((a, q) => a + q.stats.yesCertainty * q.stats.yesCount, 0) / yesTotal : 0

  const cover = {
    eyebrow: `${L('Lectura de satisfacción', 'Satisfaction reading')} · ${orgName} · ${r.period[locale]}`,
    title: r.title[locale],
    sub: L(
      `Lo que nos dijeron ${nf(r.responded)} personas, cada una con su certeza de 1 a 10. ${qs.length} ${qs.length === 1 ? 'pregunta' : 'preguntas'}, resultados sin editar.`,
      `What ${nf(r.responded)} people told us, each with their certainty from 1 to 10. ${qs.length} ${qs.length === 1 ? 'question' : 'questions'}, unedited results.`
    ),
    dates: opens && closes ? L(`Consulta abierta del ${opens} al ${closes}.`, `Open from ${opens} to ${closes}.`) : '',
    footer: L('Un reporte de Crowd Conscious', 'A Crowd Conscious report'),
    forWhom: L(`Para el equipo de ${orgName}, con agradecimiento`, `For the ${orgName} team, with thanks`),
  }

  const when = opens && closes ? L(`Entre el ${opens} y el ${closes}, `, `Between ${opens} and ${closes}, `) : ''
  const reach =
    r.sample.mode === 'random'
      ? L(`${when}invitamos a una muestra aleatoria de ${nf(r.invited)} personas y ${nf(r.responded)} respondieron (${rate}%).`, `${when}we invited a random sample of ${nf(r.invited)} people and ${nf(r.responded)} answered (${rate}%).`)
      : hasInvited
        ? L(`${when}ustedes compartieron la consulta con ${nf(r.invited)} personas y ${nf(r.responded)} respondieron (${rate}%).`, `${when}you shared the survey with ${nf(r.invited)} people and ${nf(r.responded)} answered (${rate}%).`)
        : L(`${when}${nf(r.responded)} personas respondieron.`, `${when}${nf(r.responded)} people answered.`)
  const letter = {
    title: L('Gracias por preguntar', 'Thank you for asking'),
    paragraphs: [
      L(`Querido equipo de ${orgName}:`, `Dear ${orgName} team,`),
      L(
        `Gracias por confiar en nosotros para escuchar a su gente. ${reach} Cada respuesta trae su certeza, de 1 a 10: no solo qué piensan, sino qué tan seguros están.`,
        `Thank you for trusting us to listen to your people. ${reach} Every answer carries its certainty, from 1 to 10: not only what people think, but how sure they are.`
      ),
      L(
        'Aquí están los resultados tal como llegaron. Ustedes no los editaron y nosotros tampoco. Empezamos por donde hay más duda, porque ahí suele estar lo que más vale la pena conversar.',
        'Here are the results exactly as they came in. You did not edit them and neither did we. We start where doubt is highest, because that is usually what is most worth discussing.'
      ),
      L(
        'Una aclaración honesta: esto es la voz de quienes respondieron, no de todas las personas a quienes llegó la consulta. Quien no responde puede pensar distinto; por eso reportamos la tasa de respuesta y no un margen de error.',
        'An honest caveat: this is the voice of those who answered, not of everyone the survey reached. Non-respondents may think differently; that is why we report the response rate and not a margin of error.'
      ),
      L('Gracias por la apertura. Ojalá este reporte les sirva en las conversaciones que vienen.', 'Thank you for your openness. We hope this report helps in the conversations ahead.'),
    ],
    signoff: L('Con cariño,', 'Warmly,'),
    signature: L('el equipo de Crowd Conscious', 'the Crowd Conscious team'),
  }

  const head = readingHeadline(qs, locale)
  const tiles = [
    ...(hasInvited ? [{ v: String(r.invited), l: L('personas a quienes llegó', 'people reached') }] : []),
    { v: String(r.responded), l: L('respondieron', 'responded') },
    ...(hasInvited ? [{ v: `${rate}%`, l: L('tasa de respuesta', 'response rate') }] : []),
    { v: yesCertAll.toFixed(1), l: L('certeza de los «sí» (1 a 10), todas las preguntas', 'certainty of "yes" answers (1-10), all questions') },
  ]

  const weakest = ordered[0]
  const strongest = ordered[ordered.length - 1]
  const mostFirmNo = [...qs].sort((a, b) => b.stats.split.firmNo - a.stats.split.firmNo)[0]
  const mostTepid = [...qs].sort((a, b) => b.stats.split.tentativeYes - a.stats.split.tentativeYes)[0]
  const leadTrend = earlier ? questionTrend(qs[0], 0, earlier) : { kind: 'none' as const }
  const insights = qs.length
    ? [
        {
          t: L('Donde más dudan', 'Where they hesitate most'),
          b: L(
            `${quote(label(weakest))}: ${weakest.stats.pctFirmOfYes}% de sus «sí» son firmes; ${weakest.stats.split.tentativeYes} de cada 100 respondieron sí sin firmeza.`,
            `${quote(label(weakest))}: ${weakest.stats.pctFirmOfYes}% of its yes answers are firm; ${weakest.stats.split.tentativeYes} in 100 said yes without firmness.`
          ),
        },
        {
          t: L('Donde hay más firmeza', 'Where they are firmest'),
          b: L(
            `${quote(label(strongest))}: ${strongest.stats.pctFirmOfYes}% de sus «sí» son firmes, con certeza de los «sí» de ${strongest.stats.yesCertainty.toFixed(1)}.`,
            `${quote(label(strongest))}: ${strongest.stats.pctFirmOfYes}% of its yes answers are firm, yes certainty ${strongest.stats.yesCertainty.toFixed(1)}.`
          ),
        },
        {
          t: L('El «no» con firmeza', 'The firm "no"'),
          b: L(
            `El mayor «no» firme está en ${quote(label(mostFirmNo))}: ${mostFirmNo.stats.split.firmNo}% de todas las respuestas.`,
            `The largest firm "no" is on ${quote(label(mostFirmNo))}: ${mostFirmNo.stats.split.firmNo}% of all answers.`
          ),
        },
        leadTrend.kind === 'delta'
          ? {
              t: L(`Contra ${leadTrend.prevPeriod.es}`, `Versus ${leadTrend.prevPeriod.en}`),
              b: L(
                `En ${quote(label(qs[0]))}, el sí cambió ${sgn(leadTrend.dYes)} puntos y el sí firme ${sgn(leadTrend.dFirmYes)} puntos.`,
                `On ${quote(label(qs[0]))}, yes moved ${sgn(leadTrend.dYes)} points and firm yes ${sgn(leadTrend.dFirmYes)} points.`
              ),
            }
          : {
              t: L('El «sí» tibio más grande', 'The largest tentative yes'),
              b: L(
                `${quote(label(mostTepid))}: ${mostTepid.stats.split.tentativeYes}% de todas las respuestas fueron sí con certeza menor a ${FIRM_THRESHOLD}.`,
                `${quote(label(mostTepid))}: ${mostTepid.stats.split.tentativeYes}% of all answers were yes with certainty below ${FIRM_THRESHOLD}.`
              ),
            },
      ]
    : []

  const deepDives = ordered.map((q, rank) => {
    const tr = earlier ? questionTrend(q, num(q) - 1, earlier) : { kind: 'none' as const }
    const seen = [
      L(
        `${q.stats.yesCount} de ${q.stats.responses} personas dijeron que sí (${q.stats.pctYes}%). De esos «sí», ${q.stats.pctFirmOfYes}% vino con certeza de ${FIRM_THRESHOLD} o más; los otros ${q.stats.tentativeYesCount} fueron «sí» tibios.`,
        `${q.stats.yesCount} of ${q.stats.responses} people said yes (${q.stats.pctYes}%). Of those, ${q.stats.pctFirmOfYes}% came with certainty ${FIRM_THRESHOLD} or higher; the other ${q.stats.tentativeYesCount} were tentative yes answers.`
      ),
      L(
        `El «no» suma ${q.stats.noCount} respuestas (${q.stats.split.tentativeNo + q.stats.split.firmNo}%); ${q.stats.split.firmNo} de cada 100 respuestas totales son «no» firmes.`,
        `"No" adds up to ${q.stats.noCount} answers (${q.stats.split.tentativeNo + q.stats.split.firmNo}%); ${q.stats.split.firmNo} in 100 of all answers are firm "no".`
      ),
    ]
    if (tr.kind === 'delta')
      seen.push(L(`Contra ${tr.prevPeriod.es} (misma redacción): sí ${sgn(tr.dYes)} puntos, sí firme ${sgn(tr.dFirmYes)} puntos.`, `Versus ${tr.prevPeriod.en} (same wording): yes ${sgn(tr.dYes)} points, firm yes ${sgn(tr.dFirmYes)} points.`))
    else if (tr.kind === 'modified') seen.push(L(`La redacción cambió respecto a ${tr.prevPeriod.es}; no la comparamos.`, `Wording changed since ${tr.prevPeriod.en}; not compared.`))
    return {
      q,
      num: num(q),
      eyebrow: `${L('Pregunta', 'Question')} ${num(q)} ${L('de', 'of')} ${qs.length} · ${
        rank === 0 ? L('la de menor firmeza', 'least firm') : rank === ordered.length - 1 ? L('la de mayor firmeza', 'most firm') : L(`${rank + 1}.ª en firmeza`, `#${rank + 1} by firmness`)
      }`,
      title: quote(label(q)),
      tiles: [
        { v: String(q.stats.responses), l: L('respuestas', 'responses') },
        { v: `${q.stats.pctYes}%`, l: L('dijo que sí', 'said yes') },
        { v: `${q.stats.pctFirmOfYes}%`, l: L(`de los «sí», firmes (certeza ${FIRM_THRESHOLD}-10)`, `of yes answers firm (certainty ${FIRM_THRESHOLD}-10)`) },
        { v: q.stats.yesCertainty.toFixed(1), l: L('certeza de los «sí» (1 a 10)', 'certainty of yes answers (1-10)') },
      ],
      // Always names the question (DB phrases are NOT NULL; fallback quotes the question).
      headline: q.stats.preliminary ? null : mainSentence(q.stats.pctYes, q.stats.pctFirmOfYes, phraseFor(q, locale), locale),
      preliminary: q.stats.preliminary
        ? { t: L('Lectura preliminar', 'Preliminary reading'), b: L(`Menos de ${MIN_RESPONSES_FOR_HEADLINE} respuestas: mostramos los números, pero no sacamos una conclusión.`, `Fewer than ${MIN_RESPONSES_FOR_HEADLINE} responses: we show the numbers but draw no conclusion.`) }
        : null,
      seen,
      wordsIntro: L(
        `${quote(label(q))}. Razones anónimas. Quitamos automáticamente nombres, teléfonos, correos, números de identificación y detalles médicos. Si un grupo tiene menos de ${MIN_GROUP} personas, no mostramos sus razones.`,
        `${quote(label(q))}. Anonymous reasons. We automatically remove names, phone numbers, emails, ID numbers and medical details. Groups under ${MIN_GROUP} people are not shown.`
      ),
      doubtTitle: L(`Por qué dudan (sí tibio · ${q.reasons.doubt.groupSize})`, `Why they hesitate (tentative yes · ${q.reasons.doubt.groupSize})`),
      noTitle: L(`Por qué no (${q.reasons.no.groupSize})`, `Why not (${q.reasons.no.groupSize})`),
    }
  })

  const hiddenNote = (n: number) =>
    L(`Grupo de ${n} ${n === 1 ? 'persona' : 'personas'}: menos de ${MIN_GROUP}, no mostramos razones para proteger el anonimato.`, `Group of ${n}: under ${MIN_GROUP}, reasons hidden to protect anonymity.`)

  const talk = [
    ...ordered.slice(0, 3).map((q) => ({
      t: quote(label(q)),
      b: L(
        `${q.stats.tentativeYesCount} personas dijeron que sí, pero sin firmeza. ¿Qué tendría que pasar para que ese «sí» sea firme la próxima vez?`,
        `${q.stats.tentativeYesCount} people said yes, but not firmly. What would have to happen for that yes to be firm next time?`
      ),
    })),
    {
      t: L('Volver a preguntar', 'Ask again'),
      b: L('Con la misma redacción, la siguiente lectura muestra si el «sí» firme sube o baja. Si cambian la pregunta, ya no se puede comparar.', 'With the same wording, the next reading shows whether firm yes goes up or down. If the wording changes, it can no longer be compared.'),
    },
  ]

  const sample =
    r.sample.mode === 'all'
      ? L('A quienes ustedes compartieron el enlace de la consulta.', 'Whoever you shared the survey link with.')
      : L(
          `Una muestra aleatoria de ${nf(r.sample.n)} personas, sorteada por Crowd Conscious el ${longDate(r.sample.drawnAt, locale)} de una base de ${nf(r.sample.base)}.`,
          `A random sample of ${nf(r.sample.n)} people drawn by Crowd Conscious on ${longDate(r.sample.drawnAt, locale)} from a base of ${nf(r.sample.base)}.`
        )
  const lockDate = r.visibilityLockedAt ? longDate(r.visibilityLockedAt, locale) : ''
  const method = [
    { t: L('A quién preguntamos', 'Who we asked'), b: `${sample} ${L('Crowd Conscious no recibe nombres, correos ni teléfonos de quienes responden, solo identificadores anónimos.', 'Crowd Conscious receives no names, emails or phone numbers from respondents, only anonymous IDs.')}` },
    { t: L('Cuándo', 'When'), b: opens && closes ? L(`Del ${opens} al ${closes}. Nadie, ni su organización, vio resultados antes del cierre.`, `From ${opens} to ${closes}. Nobody, including your organization, saw results before closing.`) : L('Nadie, ni su organización, vio resultados antes del cierre.', 'Nobody, including your organization, saw results before closing.') },
    { t: L('Cómo se respondía', 'How people answered'), b: L(`Sí o no, más una certeza de 1 a 10. Firme = certeza ${FIRM_THRESHOLD} a 10. «Certeza de los "sí"» es el promedio de certeza solo de quienes dijeron que sí.`, `Yes or no, plus a certainty from 1 to 10. Firm = certainty ${FIRM_THRESHOLD} to 10. "Certainty of yes answers" is the mean certainty of yes answers only.`) },
    { t: L('Los porcentajes', 'Percentages'), b: L('Los cuatro grupos suman 100% de las respuestas de cada pregunta. «X% de los "sí", firmes» se calcula sobre los «sí» de esa pregunta.', 'The four groups add up to 100% of each question\'s answers. "X% of yes answers firm" is computed on that question\'s yes answers.') },
    { t: L('Tamaño', 'Size'), b: L(`Con menos de ${MIN_RESPONSES_FOR_HEADLINE} respuestas una pregunta se marca como «lectura preliminar». Razones de grupos con menos de ${MIN_GROUP} personas no se muestran.`, `Under ${MIN_RESPONSES_FOR_HEADLINE} responses a question is marked "preliminary". Reasons from groups under ${MIN_GROUP} people are not shown.`) },
    { t: L('Visibilidad y edición', 'Visibility and editing'), b: L(`La visibilidad (${r.visibility === 'public' ? 'pública' : 'privada'}) se decidió${lockDate ? ` el ${lockDate}` : ''}, antes de abrir la consulta, y no puede cambiar. Ni su organización ni Crowd Conscious editaron los resultados.`, `Visibility (${r.visibility}) was decided${lockDate ? ` on ${lockDate}` : ''}, before opening, and cannot change. Neither your organization nor Crowd Conscious edited the results.`) },
    { t: L('Lo que no es', 'What it is not'), b: L('Reportamos tasa de respuesta, no margen de error. Quien no responde puede pensar distinto.', 'We report response rate, not a margin of error. Non-respondents may think differently.') },
  ]

  const about = {
    eyebrow: L('Sobre Crowd Conscious', 'About Crowd Conscious'),
    title: L('Sepa qué tan seguros están sus usuarios.', 'Know how sure your users really are.'),
    body: L(
      'Crowd Conscious es una plataforma mexicana para escuchar a las personas con su certeza de 1 a 10. Los resultados no los edita nadie y no pedimos datos personales a quienes responden. El 20% de cada contrato, antes de IVA, va al Fondo Consciente, que financia causas que la comunidad elige.',
      'Crowd Conscious is a Mexican platform for listening to people with their certainty from 1 to 10. Nobody edits the results and we ask respondents for no personal data. 20% of every contract, before VAT, goes to the Conscious Fund, which finances causes the community chooses.'
    ),
    url: 'crowdconscious.app/organizaciones',
    email: 'francisco@crowdconscious.app',
  }

  return {
    locale, es, cover, letter, head, tiles, insights, ordered, deepDives, hiddenNote, talk, method, about,
    glanceLabel: L('De un vistazo', 'At a glance'),
    eachQ: L('Cada pregunta, de menor a mayor firmeza:', 'Each question, least to most firm:'),
    caveat: L(`Las respuestas son de quienes respondieron (${r.responded}${hasInvited ? ` de ${r.invited}` : ''}), no de toda la población. Más detalle en «Cómo se hizo».`, `Answers come from those who responded (${r.responded}${hasInvited ? ` of ${r.invited}` : ''}), not the whole population. More in "How it was done".`),
    numLabel: (q: ClientQuestion) => `${L('P', 'Q')}${num(q)}`,
    qLine: (q: ClientQuestion) => `${q.stats.pctYes}% ${L('sí', 'yes')} · ${q.stats.pctFirmOfYes}% ${L('de los «sí», firmes', 'of yes firm')}`,
    firmDef: L(`Firme = certeza ${FIRM_THRESHOLD} a 10`, `Firm = certainty ${FIRM_THRESHOLD} to 10`),
    labels: {
      fourGroups: L('Todas las respuestas, en cuatro grupos', 'All answers, in four groups'),
      howSure: L('Qué tan seguros estaban', 'How sure they were'),
      howSureSub: L('Número de respuestas por nivel de certeza', 'Number of answers by certainty level'),
      chartKey: L(`Barra izquierda: sí · derecha: no · ${FIRM_THRESHOLD} a 10 = firme (color intenso)`, `Left bar: yes · right: no · ${FIRM_THRESHOLD} to 10 = firm (strong colour)`),
      seen: L('Lo que vemos', 'What we see'),
      wordsEyebrow: (n: number) => `${L('Pregunta', 'Question')} ${n} · ${L('en sus palabras', 'in their own words')}`,
      wordsTitle: L('Lo que escribieron', 'What they wrote'),
      wordsFoot: L('Elegidas para representar los temas que más se repiten; quitamos datos que identifican y no cambiamos nada más.', 'Chosen to represent the most repeated themes; identifying details removed, nothing else changed.'),
      noneLeft: L('Nadie de este grupo dejó una razón.', 'Nobody in this group left a reason.'),
      certainty: (n: number) => L(`certeza ${n}`, `certainty ${n}`),
      talkEyebrow: L('Para conversar con su equipo', 'To discuss with your team'),
      talkTitle: L('Preguntas que dejan los datos', 'Questions the data leaves open'),
      talkSub: L('No son recomendaciones: son preguntas que salen de los números para abrir la conversación.', 'These are not recommendations: they are questions raised by the numbers, to open the conversation.'),
      methodEyebrow: L('Notas para leer bien estos números', 'Notes for reading these numbers well'),
      methodTitle: L('Cómo se hizo', 'How it was done'),
      tableTitle: L('Las preguntas en números', 'The questions in numbers'),
      tableCols: [L('Pregunta', 'Question'), L('Resp.', 'Resp.'), L('Sí', 'Yes'), L('Firmes de los «sí»', 'Firm of yes'), L('Certeza «sí»', 'Yes certainty'), L('No firme', 'Firm no')],
      demo: L('FICTICIO · datos de demostración', 'FICTITIOUS · demo data'),
    },
  }
}
