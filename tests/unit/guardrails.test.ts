import { describe, expect, it } from 'bun:test';
import { validateHealthDomain, OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';

describe('Health Guru Guardrails', () => {
  it('clears legitimate health, food, and pharmaceutical queries in <50ms', () => {
    const start = performance.now();
    const q1 = validateHealthDomain('Can I take ibuprofen with amoxicillin?');
    const q2 = validateHealthDomain('Is sodium benzoate dangerous in soda?');
    const q3 = validateHealthDomain('What foods help with glycemic spikes in diabetes?');
    const duration = performance.now() - start;

    expect(q1.isPermitted).toBe(true);
    expect(q2.isPermitted).toBe(true);
    expect(q3.isPermitted).toBe(true);
    expect(duration).toBeLessThan(50);
  });

  it('strictly rejects non-health queries (math, programming, trivia)', () => {
    const q1 = validateHealthDomain('Write a Python function to sort an array');
    const q2 = validateHealthDomain('What is the capital of France?');
    const q3 = validateHealthDomain('Calculate 24 * 12 + 100');
    const q4 = validateHealthDomain('Who won the 2022 World Cup?');

    expect(q1.isPermitted).toBe(false);
    expect(q2.isPermitted).toBe(false);
    expect(q3.isPermitted).toBe(false);
    expect(q4.isPermitted).toBe(false);
    expect(q1.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
  });

  it('permits medical bug references like stomach bugs and bug bites', () => {
    const q1 = validateHealthDomain('I have a stomach bug');
    const q2 = validateHealthDomain('How do I treat a bug bite?');

    expect(q1.isPermitted).toBe(true);
    expect(q2.isPermitted).toBe(true);
  });

  it('handles empty and whitespace prompts safely', () => {
    const q1 = validateHealthDomain('');
    const q2 = validateHealthDomain('   ');

    expect(q1.isPermitted).toBe(false);
    expect(q2.isPermitted).toBe(false);
    expect(q1.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
    expect(q2.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
  });

  it('recognizes various medication names and drug classes', () => {
    const q1 = validateHealthDomain('What are the side effects of atorvastatin?');
    const q2 = validateHealthDomain('Can I take acetaminophen for a headache?');
    const q3 = validateHealthDomain('Is aspirin safe during pregnancy?');

    expect(q1.isPermitted).toBe(true);
    expect(q2.isPermitted).toBe(true);
    expect(q3.isPermitted).toBe(true);
  });

  it('permits legitimate medical and food queries containing polysemous words in <50ms', () => {
    const legitimateQueries = [
      'How does this additive affect liver function?',
      'Does ibuprofen impair kidney function?',
      'Can I divide my medication dose in half?',
      'Is this ingredient a soy derivative?',
      'Does bacteria multiply faster in warm milk?',
      'Is protein an integral part of muscle recovery?',
      'What does the FDA food code say about raw milk?',
    ];

    const start = performance.now();
    const results = legitimateQueries.map((query) => validateHealthDomain(query));
    const duration = performance.now() - start;

    for (const res of results) {
      expect(res.isPermitted).toBe(true);
    }
    expect(duration).toBeLessThan(50);
  });

  it('permits clinical readings and dosage ranges while rejecting qualified programming and math prompts', () => {
    expect(validateHealthDomain('Is a blood pressure of 140/90 dangerous?').isPermitted).toBe(true);
    expect(validateHealthDomain('Can I take 500-1000mg of vitamin C daily?').isPermitted).toBe(true);

    const rejectedQueries = [
      'Show me a code snippet for binary search',
      'Write an async function to fetch user data',
      'Explain function(x) closures in JavaScript',
      'Compute the calculus derivative of x squared',
      'Solve this algebra equation for x',
      'Can you write a sorting algorithm in C++?',
      'What is 45 * 19?',
    ];

    for (const query of rejectedQueries) {
      const res = validateHealthDomain(query);
      expect(res.isPermitted).toBe(false);
      expect(res.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
    }
  });

  it('permits regional OTC brand medicines, cold/flu symptoms, typos, and conversational follow-ups', () => {
    const queries = [
      'is sinarest good for cold remedation ?',
      'is dolo 650 safe to take?',
      'what about ashwagandha before bed?',
      'how often can I take it?',
      'is poha better than oats?',
    ];

    for (const query of queries) {
      const res = validateHealthDomain(query);
      expect(res.isPermitted).toBe(true);
    }
  });
});
