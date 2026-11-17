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
});
