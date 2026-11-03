import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEducation } from '../src/services/educationParse.js';

const CASES: [string, string | null][] = [
  // never studied / below 10th
  ['I never went to school', 'below_10th'], ['main anpadh hun', 'below_10th'], ['मैं अनपढ़ हूँ', 'below_10th'],
  ['school nahi gaya', 'below_10th'], ['padhi likhi nahi hun', 'below_10th'], ['5th pass', 'below_10th'],
  ['8th', 'below_10th'], ['class 8', 'below_10th'], ['aathvi tak padhi', 'below_10th'], ['आठवीं तक पढ़ी हूँ', 'below_10th'],
  ['पाँचवीं पास', 'below_10th'], ['below 10th', 'below_10th'], ['dasvi se kam', 'below_10th'], ['10th fail', 'below_10th'],
  ['primary school', 'below_10th'], ['9th class tak', 'below_10th'], ['8', 'below_10th'],
  // 10th
  ['10th', '10th'], ['10th pass', '10th'], ['10 pass', '10th'], ['10', '10th'], ['class 10', '10th'], ['matric', '10th'],
  ['matriculation', '10th'], ['high school', '10th'], ['dasvi pass', '10th'], ['daswi tak', '10th'], ['das pass', '10th'],
  ['दसवीं पास', '10th'], ['दसवी', '10th'], ['10वीं', '10th'], ['१०वीं पास', '10th'], ['11th', '10th'], ['11th mein hun', '10th'],
  ['12th fail', '10th'], ['12th me padh raha hun', '10th'], ['SSC', '10th'], ['tenth', '10th'],
  // 12th
  ['12th', '12th'], ['12th pass', '12th'], ['12', '12th'], ['class 12', '12th'], ['12 pass', '12th'], ['intermediate', '12th'],
  ['inter pass', '12th'], ['plus two', '12th'], ['+2', '12th'], ['higher secondary', '12th'], ['senior secondary', '12th'],
  ['barahvi', '12th'], ['baarvi pass', '12th'], ['बारहवीं', '12th'], ['बारहवी पास', '12th'], ['12वीं', '12th'], ['12वी पास', '12th'],
  ['twelfth', '12th'], ['college chhod diya', '12th'], ['I dropped out of college', '12th'],
  // ITI / diploma
  ['ITI', 'iti_diploma'], ['ITI electrician', 'iti_diploma'], ['diploma', 'iti_diploma'], ['polytechnic diploma', 'iti_diploma'],
  ['आईटीआई किया है', 'iti_diploma'], ['डिप्लोमा', 'iti_diploma'],
  // college, still studying
  ['college second year', 'undergrad_ongoing'], ['college 2nd year', 'undergrad_ongoing'], ['2nd year', 'undergrad_ongoing'],
  ['BA 2nd year', 'undergrad_ongoing'], ['B.A. 2nd year', 'undergrad_ongoing'], ['B.Sc final year', 'undergrad_ongoing'],
  ['pursuing graduation', 'undergrad_ongoing'], ['graduation kar rahi hun', 'undergrad_ongoing'], ['I am in college', 'undergrad_ongoing'],
  ['ग्रेजुएशन कर रही हूँ', 'undergrad_ongoing'], ['मैं कॉलेज के दूसरे साल में हूँ', 'undergrad_ongoing'], ['बीए सेकंड ईयर', 'undergrad_ongoing'],
  ['first year engineering', 'undergrad_ongoing'], ['B.Com 3rd semester', 'undergrad_ongoing'],
  // graduate
  ['graduate', 'undergrad'], ['graduated', 'undergrad'], ['I graduated last year', 'undergrad'], ['graduation complete', 'undergrad'],
  ['B.A.', 'undergrad'], ['BA pass', 'undergrad'], ['B.Com', 'undergrad'], ['bcom kiya hai', 'undergrad'], ['B.Tech', 'undergrad'],
  ['BSc nursing', 'undergrad'], ['B.Ed', 'undergrad'], ['bachelor of arts', 'undergrad'], ['degree', 'undergrad'],
  ['ग्रेजुएट', 'undergrad'], ['मैंने ग्रेजुएशन किया है', 'undergrad'], ['बीए पास', 'undergrad'], ['स्नातक', 'undergrad'],
  ['MA first year', 'undergrad'], ['doing MBA', 'undergrad'],
  // postgraduate
  ['postgraduate', 'postgrad'], ['post graduate', 'postgrad'], ['postgraduated', 'postgrad'], ['M.A.', 'postgrad'], ['MA', 'postgrad'],
  ['M.Sc', 'postgrad'], ['MBA', 'postgrad'], ['M.Com kiya', 'postgrad'], ['PhD', 'postgrad'], ['masters', 'postgrad'],
  ['पोस्ट ग्रेजुएट', 'postgrad'], ['एमए किया है', 'postgrad'], ['स्नातकोत्तर', 'postgrad'], ['MBA completed', 'postgrad'],
  // not an education answer
  ['hello', null], ['', null], ['main silai karti hun', null],
];

test('education answers in English, Hinglish and Hindi map to the right level', () => {
  const wrong = CASES.map(([answer, expected]) => [answer, expected, parseEducation(answer)] as const).filter(([, e, got]) => e !== got);
  assert.deepEqual(wrong, [], `misread:\n${wrong.map(([a, e, g]) => `  "${a}" → ${g} (expected ${e})`).join('\n')}`);
});
