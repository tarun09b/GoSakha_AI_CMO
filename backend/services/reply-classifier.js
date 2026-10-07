// backend/services/reply-classifier.js
// Rule-based classifier for hospital replies to cold outreach.
// Returns: { classification, confidence, matched_signals }

const RULES = [
  {
    classification: 'unsubscribe',
    confidence: 0.98,
    signals: [
      'unsubscribe', 'remove me', 'remove my', 'opt me out', 'opt-out',
      'stop emailing', 'stop contacting', 'do not contact', "don't contact",
      'please remove', 'take me off', 'no more emails',
    ],
  },
  {
    classification: 'out_of_office',
    confidence: 0.95,
    signals: [
      'out of office', 'out-of-office', 'ooo', 'auto-reply', 'automatic reply',
      'auto reply', 'on leave', 'on vacation', 'on holiday', 'will be back',
      'returning on', 'currently away', 'away from office',
    ],
  },
  {
    // Objection BEFORE positive — negation phrases must win
    classification: 'objection',
    confidence: 0.85,
    signals: [
      'not interested', 'not looking', 'not for us', 'not at this time',
      'not the right time', 'not a good time', 'not a good fit',
      'no thanks', 'no thank you', 'no, thank',
      'already have', 'already use', 'already using', 'already working with',
      'too expensive', 'no budget', 'not in budget',
      'not now', 'not right now', 'maybe later', 'next year',
      'no need', 'we pass', 'pass for now',
    ],
  },
  {
    classification: 'positive',
    confidence: 0.85,
    signals: [
      'interested', 'tell me more', 'schedule', 'demo', 'walkthrough',
      'sounds good', 'would like', 'would love', "let's talk", 'lets talk',
      'call me', 'give me a call', 'happy to', 'send me', 'book a',
      'set up a', 'yes please', 'that works', 'good to go', 'sounds great',
      'sounds perfect', 'perfect', 'great','sure thing', 'sure,', 'yes, that', 
      'definitely', 'absolutely',
    ],
  },
];

/**
 * Classify a reply's body (and optionally subject).
 *
 * @param {string} body
 * @param {string} [subject]
 * @returns {{ classification: string, confidence: number, matched_signals: string[] }}
 */
export function classifyReply(body, subject = '') {
  const normalized = `${subject}\n${body}`
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*on .{0,200}wrote:[\s\S]*$/i, '')
    .replace(/\n\s*-----\s*original message\s*-----[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length === 0) {
    return { classification: 'neutral', confidence: 0, matched_signals: [] };
  }

  for (const rule of RULES) {
    const matched = [];
    for (const signal of rule.signals) {
      const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i');
      if (re.test(normalized)) {
        matched.push(signal);
      }
    }
    if (matched.length > 0) {
      const bonus = Math.min(matched.length - 1, 3) * 0.03;
      const confidence = Math.round(Math.min(rule.confidence + bonus, 1.0) * 100) / 100;
      return {
        classification: rule.classification,
        confidence,
        matched_signals: matched,
      };
    }
  }

  return {
    classification: 'neutral',
    confidence: 0.3,
    matched_signals: [],
  };
}