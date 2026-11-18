import { describe, expect, it } from 'bun:test';
import {
  GUARDRAIL_CLASSIFIER_INSTRUCTION,
  OUT_OF_DOMAIN_REFUSAL,
  buildGuardrailClassifierPrompt,
  validateHealthDomain,
  type HealthDomainClassifier,
} from '@/lib/guardrails/intent';

describe('Health Guru LLM-Only Guardrail', () => {
  it('short-circuits empty and whitespace prompts without invoking the LLM classifier', async () => {
    let called = false;
    const classifier: HealthDomainClassifier = async () => {
      called = true;
      return { isPermitted: true };
    };

    const q1 = await validateHealthDomain('', { classifier });
    const q2 = await validateHealthDomain('   ', { classifier });

    expect(called).toBe(false);
    expect(q1.isPermitted).toBe(false);
    expect(q2.isPermitted).toBe(false);
    expect(q1.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
    expect(q2.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
  });

  it('delegates any non-empty prompt (including regional drug brands and typos) to the LLM classifier', async () => {
    const receivedInputs: string[] = [];
    const classifier: HealthDomainClassifier = async (input) => {
      receivedInputs.push(input);
      return { isPermitted: true, reason: 'Medication for cold symptoms' };
    };

    const res = await validateHealthDomain('is sinarest good for cold remedation ?', {
      classifier,
    });

    expect(res.isPermitted).toBe(true);
    expect(res.reason).toBe('Medication for cold symptoms');
    expect(receivedInputs[0]).toContain('<latest_user_message>');
    expect(receivedInputs[0]).toContain('is sinarest good for cold remedation ?');
  });

  it('rejects out-of-scope prompts with OUT_OF_DOMAIN_REFUSAL when LLM classifier returns isPermitted=false', async () => {
    const classifier: HealthDomainClassifier = async () => ({
      isPermitted: false,
      reason: 'Programming question unrelated to health',
    });

    const res = await validateHealthDomain('Write a Python function to sort an array', {
      classifier,
    });

    expect(res.isPermitted).toBe(false);
    expect(res.reason).toBe('Programming question unrelated to health');
    expect(res.responseMessage).toBe(OUT_OF_DOMAIN_REFUSAL);
  });

  it('includes recent conversation context when formatting follow-up prompts for classification', async () => {
    let capturedInput = '';
    const classifier: HealthDomainClassifier = async (input) => {
      capturedInput = input;
      return { isPermitted: true, reason: 'Follow-up on cold medication dosage' };
    };

    const res = await validateHealthDomain('what about for a 10 year old?', {
      recentContext: 'user: is sinarest good for cold?\nassistant: Sinarest contains paracetamol, phenylephrine, and chlorpheniramine.',
      classifier,
    });

    expect(res.isPermitted).toBe(true);
    expect(capturedInput).toContain('<recent_conversation>');
    expect(capturedInput).toContain('is sinarest good for cold?');
    expect(capturedInput).toContain('<latest_user_message>\nwhat about for a 10 year old?\n</latest_user_message>');
  });

  it('fails closed with a safe retry message when the LLM classifier throws', async () => {
    const failingClassifier: HealthDomainClassifier = async () => {
      throw new Error('503 UNAVAILABLE');
    };

    const res = await validateHealthDomain('is poha good for diabetes?', {
      classifier: failingClassifier,
    });

    expect(res.isPermitted).toBe(false);
    expect(res.reason).toBe('Domain verification failed');
    expect(res.responseMessage).toContain('try again');
  });

  it('prompt instructions explicitly cover global/regional medicines, typos, follow-ups, and non-health refusals', () => {
    expect(GUARDRAIL_CLASSIFIER_INSTRUCTION).toContain('Sinarest');
    expect(GUARDRAIL_CLASSIFIER_INSTRUCTION).toContain('spelling mistakes');
    expect(GUARDRAIL_CLASSIFIER_INSTRUCTION).toContain('Programming');
    expect(GUARDRAIL_CLASSIFIER_INSTRUCTION).toContain('Mathematics');
    expect(buildGuardrailClassifierPrompt('hello')).toBe('<latest_user_message>\nhello\n</latest_user_message>');
  });
});
