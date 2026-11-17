export const OUT_OF_DOMAIN_REFUSAL =
  'I specialize exclusively in human health, nutrition, dietary habits, food ingredients, and medications. I cannot assist with programming, mathematics, or general non-health topics.';

export interface HealthDomainValidationResult {
  isPermitted: boolean;
  reason?: string;
  responseMessage?: string;
}

const HEALTH_KEYWORDS: RegExp[] = [
  /\b(health|nutrition|diet|dietary|calorie|calories|protein|fat|fats|carb|carbs|carbohydrate|carbohydrates|vitamin|vitamins|mineral|minerals|supplement|supplements)\b/i,
  /\b(food|foods|eat|eating|drink|drinking|beverage|beverages|snack|snacks|cereal|dairy|milk|soy|meat|vegan|vegetarian|gluten|allergy|allergic|allergen|allergens|meal|recipe|soda|juice|water)\b/i,
  /\b(ingredient|ingredients|additive|additives|preservative|preservatives|sweetener|sweeteners|colorant|colorants|emulsifier|emulsifiers|toxic|toxicity|toxicology|efsa|fda)\b/i,
  /\b(medicine|medicines|medication|medications|drug|drugs|pill|pills|pharmacy|dose|dosage|side effect|side effects|statin|statins|antibiotic|antibiotics|vaccine|vaccines)\b/i,
  /\b(ibuprofen|amoxicillin|acetaminophen|paracetamol|aspirin|omeprazole|metformin|adderall|xanax|advil|tylenol|antihistamine|antihistamines|painkiller|painkillers|insulin)\b/i,
  /\b(\w*cillin|\w*statin|\w*olol|\w*pril|\w*sartan|\w*zepam|\w*zolam|\w*prazole|\w*mycin|\w*dipine)\b/i,
  /\b(disease|diseases|diabetes|hypertension|blood pressure|cholesterol|kidney|liver|heart|cardiac|pregnancy|pregnant|headache|fever|infection|bacteria|bacterial|symptom|symptoms|pain|treat|treatment|remedy|remedies|cure|bite|rash|wound|injury)\b/i,
  /\b(glycemic|sodium|sugar|sugars|potassium|calcium|iron|zinc|gut|stomach|digestion|bloating|metabolism|muscle|workout|exercise|fitness)\b/i,
];

const NON_HEALTH_INDICATORS: RegExp[] = [
  /\b(source code|code snippet|write code|coding|programming|python|javascript|typescript|async function|def \w+|script|sql|html|css|software bug|code bug|debug|git|repo|repository|compiler|algorithm|sorting algorithm)\b/i,
  /\bfunction\s*\(|(?<![a-z0-9_])c\+\+(?![a-z0-9_])/i,
  /\b(math|maths|calculus|algebra|equation|equations|math derivative|first derivative|second derivative|definite integral|indefinite integral|calculate\s+\d+)\b/i,
  /\b\d+\s*\*\s*\d+\b|\b\d+\s+\+\s+\d+\b|\b(divided by|multiplied by)\s+\d+\b/i,
  /\b(capital of|who won|world cup|football|soccer|basketball|baseball|movie|movies|song|songs|lyrics|president|politics|election)\b/i,
  /\b(write a poem|write an essay|write a story|write python|write code)\b/i,
];

const CHEMICAL_HEURISTICS = /\b(e\d{3}[a-z]?|acid|benzoate|sorbate|sulfate|oxide|chloride)\b/i;

export function validateHealthDomain(prompt: string): HealthDomainValidationResult {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      isPermitted: false,
      reason: 'Empty prompt',
      responseMessage: OUT_OF_DOMAIN_REFUSAL,
    };
  }

  // Fast check: Check for clear non-health indicators first
  for (const pattern of NON_HEALTH_INDICATORS) {
    if (pattern.test(trimmed)) {
      return {
        isPermitted: false,
        reason: 'Non-health domain detected',
        responseMessage: OUT_OF_DOMAIN_REFUSAL,
      };
    }
  }

  // Check for presence of health markers
  for (const pattern of HEALTH_KEYWORDS) {
    if (pattern.test(trimmed)) {
      return { isPermitted: true };
    }
  }

  // Fallback heuristic: If prompt mentions chemical names or numbers, allow
  if (CHEMICAL_HEURISTICS.test(trimmed)) {
    return { isPermitted: true };
  }

  return {
    isPermitted: false,
    reason: 'No health or nutrition domain markers found',
    responseMessage: OUT_OF_DOMAIN_REFUSAL,
  };
}
