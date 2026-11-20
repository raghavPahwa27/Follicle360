// All static content in one place: products, usage guidance, what-to-expect notes and tips.
// Wording is deliberately general: no diagnosis, no guaranteed results, no dosing. Labels and doctors come first.

const STOP = 'Stop using it and speak to a doctor or pharmacist if you get scalp irritation, a rash, swelling, or any symptom that worries you.';

// Each product expands into routine steps (`items`). `slot` only decides the default time. `days` (0 = Sun) limits a step to weekdays.
export const PRODUCTS = [
  { id: 'kit', name: 'Stage 1 Hairfall Kit', type: 'Starter kit',
    about: 'A starter kit that bundles several hair-care steps. The leaflet in the pack lists exactly what is included.',
    mayFit: 'People who want a simple, gentle starting routine for hair fall or general scalp and hair care.',
    check: ['Which products are in the kit and how often to use each one', 'The full ingredient list, especially if you have allergies or a sensitive scalp'],
    usage: { how: 'Follow the order and frequency printed on the kit leaflet.',
      tips: ['Pick one fixed time of day so the steps become a habit.', 'Keep the kit where you will see it, such as next to your toothbrush.'], stop: STOP },
    items: [{ id: 'kit', name: 'Use your kit routine', slot: 'morning', hint: 'Follow the steps on the kit pack' }] },

  { id: 'minoxidil', name: 'Minoxidil 5%', type: 'Topical solution',
    about: 'A topical solution containing minoxidil, one of the most studied non-prescription ingredients for pattern hair loss. Check the strength printed on your pack.',
    mayFit: 'Adults with gradual thinning at the crown or hairline who are comfortable using a scalp product every day.',
    check: ['Who should not use it, including pregnancy, breastfeeding, and heart or blood-pressure conditions', 'Whether your scalp is irritated or has a skin condition', 'The strength and directions on the label'],
    usage: { how: 'Apply to a dry scalp, using the amount and frequency on your product label or advised by your doctor. Do not apply more often than directed, and wash your hands afterwards.',
      tips: ['Some people notice extra shedding in the first weeks. If it is heavy, patchy or worries you, ask a doctor.', 'Benefits, if any, take months to judge and may fade if you stop.', 'Keep it away from children and pets.'],
      stop: 'Labels for topical minoxidil usually advise stopping and getting medical advice for chest pain, rapid heartbeat, dizziness, sudden weight gain, swollen hands or feet, or scalp irritation. Check your own label.' },
    items: [
      { id: 'minoxidil-am', name: 'Apply minoxidil', slot: 'morning', hint: 'On a dry scalp, as per the label' },
      { id: 'minoxidil-pm', name: 'Apply minoxidil', slot: 'night', hint: 'On a dry scalp, as per the label' }] },

  { id: 'minoxifin', name: 'Minoxifin Advanced', type: 'Topical product',
    about: 'A topical hair-regrowth-support product from the range. Its exact ingredients and strength are on the pack, so read the label before comparing it with plain minoxidil.',
    mayFit: 'Adults looking at a topical option who have read the label and are comfortable with a daily scalp product.',
    check: ['Active ingredients and strength on the label', 'Who should not use it, and any warnings printed on the pack', 'Whether you are already using another minoxidil product (do not combine without advice)'],
    usage: { how: 'Use exactly as the label directs, or as your doctor advises.',
      tips: ['Use one topical product at a time unless a doctor says otherwise.', 'Judge it over months, not days, and keep dated photos to compare.'], stop: STOP },
    items: [
      { id: 'minoxifin-am', name: 'Apply Minoxifin', slot: 'morning', hint: 'As per the label' },
      { id: 'minoxifin-pm', name: 'Apply Minoxifin', slot: 'night', hint: 'As per the label' }] },

  { id: 'serum', name: 'Procapil Serum', type: 'Scalp serum',
    about: 'A leave-on scalp serum built around a peptide-based ingredient blend. Published evidence for these ingredients is limited, so treat it as an optional extra.',
    mayFit: 'People who want an extra leave-on scalp step and understand the evidence is still limited.',
    check: ['The ingredient list, if your skin is sensitive or allergy-prone', 'Directions for how much to apply and how often', 'Whether to patch test first, as the label suggests'],
    usage: { how: 'Apply to the scalp as directed on the pack and massage in gently.',
      tips: ['Applying at night can be an easy habit to pair with brushing your teeth.', 'Patch test on a small area if you have sensitive skin.'], stop: STOP },
    items: [{ id: 'serum', name: 'Apply serum', slot: 'night', hint: 'Massage gently into the scalp' }] },

  { id: 'gummies', name: 'Hair Gummies', type: 'Supplement',
    about: 'A daily supplement for hair health. Supplements help most when a nutrient is actually low, and they do not replace a balanced diet.',
    mayFit: 'People who want nutritional support alongside other care and have no conflicting conditions.',
    check: ['Daily amount on the label (do not exceed it)', 'Ingredients that may not suit you, such as allergens', 'Whether you are pregnant, on medication or have a medical condition, in which case ask a doctor first'],
    usage: { how: 'Take the amount shown on the label, at the same time each day.',
      tips: ['Pair it with breakfast so it sticks.', 'If you take biotin, tell your doctor before blood tests, as it can affect some results.'], stop: STOP },
    items: [{ id: 'gummies', name: 'Take your gummy', slot: 'morning', hint: 'Pair it with breakfast so it sticks' }] },

  { id: 'shampoo', name: 'Hair Shampoo', type: 'Shampoo',
    about: 'A shampoo for regular washing. It supports a clean scalp, and on its own it is not a treatment for hair loss.',
    mayFit: 'Anyone who wants a gentle wash-day product to pair with other care.',
    check: ['Ingredients, if you have a sensitive scalp or skin condition', 'How long the label says to leave it on before rinsing'],
    usage: { how: 'Wash as directed on the label, massage the scalp gently and rinse well.',
      tips: ['Use lukewarm water rather than very hot water.', 'Pick wash days you can stick to.'], stop: STOP },
    items: [{ id: 'shampoo', name: 'Wash with shampoo', slot: 'morning', hint: 'Wash days: Mon, Wed, Sat', days: [1, 3, 6] }] },
];

// What is commonly reported over time. Hedged on purpose: results vary and are never guaranteed.
export const PHASES = [
  { from: 1, to: 4, title: 'First month', weeks: 'Weeks 1-4',
    expect: 'Nothing may be visible yet, and that is normal. Some people notice extra shedding early on. If it is heavy or worries you, speak to a doctor.',
    focus: 'Take baseline photos and build the habit.' },
  { from: 5, to: 12, title: 'Early weeks', weeks: 'Weeks 5-12',
    expect: 'Changes, if any, are usually small at this stage. Compare photos from the same angle and light rather than judging by the mirror.',
    focus: 'Keep photos regular, every two to four weeks.' },
  { from: 13, to: 24, title: 'Months 3 to 6', weeks: 'Weeks 13-24',
    expect: 'Many treatments are judged after about 3 to 6 months. Results vary from person to person, and some people see no change.',
    focus: 'Compare your earliest and latest photos.' },
  { from: 25, to: 9999, title: 'Beyond 6 months', weeks: 'Week 25+',
    expect: 'Benefits from some treatments can fade if you stop. If results have stalled or you are unsure, a dermatologist can review your plan.',
    focus: 'Review your photos and plan with a doctor if needed.' },
];

export const TIPS = [
  'Attach each step to a habit you already have, like brushing your teeth. Habits stick when they have an anchor.',
  'Keep products where you will see them, such as next to your coffee machine or toothbrush.',
  'Missed a step? Do not double up unless your label says so. Just carry on with the next scheduled one.',
  'Stress, poor sleep and crash diets can increase shedding. Treat the routine as one part of looking after yourself.',
  'The mirror lies day to day. Dated photos in the same light tell a clearer story.',
  'Heavy, sudden or patchy hair loss, or scalp pain, is worth a visit to a doctor rather than a new product.',
  'Set reminders at times you are usually free, not at times you hope to be free.',
];

// General evidence summary for common hair-care ingredients (not specific to any brand's formula).
export const INGREDIENTS = [
  { name: 'Minoxidil', keys: ['minoxidil'], level: 'strong', what: 'A topical treatment with good clinical evidence for pattern hair loss. Benefits generally continue only while it is used, and some people notice extra shedding early on.' },
  { name: 'Finasteride', keys: ['finasteride'], level: 'strong', what: 'A prescription-only medicine with strong evidence for male pattern hair loss. It needs a doctor, so it is not sold as an over-the-counter product.' },
  { name: 'Ketoconazole', keys: ['ketoconazole'], level: 'moderate', what: 'An anti-dandruff ingredient. Some studies suggest a modest benefit for hair, and it can help scalp health.' },
  { name: 'Caffeine', keys: ['caffeine'], level: 'limited', what: 'Small lab and clinical studies suggest a possible benefit, but the evidence is still limited.' },
  { name: 'Procapil', keys: ['procapil', 'biotinoyl', 'oleanolic', 'apigenin'], level: 'limited', what: 'A peptide-based blend. Most published studies are small and company-supported, so the evidence is limited.' },
  { name: 'Redensyl', keys: ['redensyl'], level: 'limited', what: 'A newer ingredient. Early studies are mostly from the manufacturer, so independent evidence is limited.' },
  { name: 'Biotin', keys: ['biotin', 'vitamin b7'], level: 'limited', what: 'Helps if you are deficient, but there is little evidence that it regrows hair in people who are not.' },
  { name: 'Zinc', keys: ['zinc'], level: 'limited', what: 'Useful if you are deficient. Evidence for regrowth in people with normal levels is limited.' },
  { name: 'Saw palmetto', keys: ['saw palmetto'], level: 'limited', what: 'A plant extract with mixed and limited evidence.' },
  { name: 'Rosemary oil', keys: ['rosemary'], level: 'limited', what: 'One small study compared it with low-strength minoxidil. More research is needed.' },
];

export const LEVELS = { strong: 'Strong evidence', moderate: 'Some evidence', limited: 'Limited evidence' };

// Steps for checking an order when it arrives
export const PACK_STEPS = [
  { id: 'box', q: 'Outer box or courier packet is sealed and undamaged', issue: 'Outer packaging was damaged or opened' },
  { id: 'seal', q: 'Product seal or cap ring is intact', issue: 'Product seal was broken or missing' },
  { id: 'label', q: 'Batch number and expiry date are printed and readable', issue: 'Batch number or expiry date was missing or unreadable' },
  { id: 'match', q: 'Product name and strength match what you ordered', issue: 'Product received did not match the order' },
  { id: 'condition', q: 'No leakage, dents or unusual smell', issue: 'Product showed leakage, dents or an unusual smell' },
];

export const ANGLES = ['Front hairline', 'Crown / top', 'Left side', 'Right side', 'Back', 'Other'];

export const WEEKDAYS = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun']];
