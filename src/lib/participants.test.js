import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillSeats, metaFor, orderedParticipants, participantMap, personalityOf, seatStyle, stanceLabel } from './participants.js';
import { parseRichText } from './richText.js';

const discussion = {
  participants: [
    { key: 'gamma', name: 'AI Gamma', role: 'moderator', seat: 0, personality: { name: 'Moderator & Skeptic', icon: 'moderator' }, stance: null },
    { key: 'beta', name: 'AI Beta', role: 'participant', seat: 2, personality: { name: 'Critical Thinker', icon: 'critical' }, stance: 'against' },
    { key: 'alpha', name: 'AI Alpha', role: 'participant', seat: 1, personality: { name: 'Analytical Thinker', icon: 'analytical' }, stance: 'for' },
  ],
};

test('participants are shown by seat, with Gamma last', () => {
  assert.deepEqual(orderedParticipants(discussion).map((p) => p.key), ['alpha', 'beta', 'gamma']);
});

test('older discussions without a participant list show Alpha and Beta', () => {
  assert.deepEqual(orderedParticipants({}).map((p) => p.key), ['alpha', 'beta']);
  assert.equal(participantMap(null).beta.label, 'Philosophical Thinker');
});

test('meta carries name, personality, stance and colours', () => {
  const map = participantMap(discussion);
  assert.equal(map.beta.label, 'Critical Thinker');
  assert.equal(map.beta.stance, 'against');
  assert.equal(map.gamma.moderator, true);
  assert.equal(map.gamma.label, 'Moderator & Skeptic');
  assert.equal(map.user.name, 'You');
  assert.equal(seatStyle('delta').text, 'text-delta');
  assert.equal(seatStyle('eta').text, 'text-alpha');
  assert.equal(metaFor(map, 'zeta').name, 'AI Zeta');
  assert.equal(stanceLabel('for'), 'For');
});

test('point-by-point replies become a paragraph plus a list', () => {
  const blocks = parseRichText('Beta, I see it differently.\n- First point.\n- Second point.\nAlpha, what do you think?');
  assert.deepEqual(blocks, [
    { type: 'p', text: 'Beta, I see it differently.' },
    { type: 'ul', items: ['First point.', 'Second point.'] },
    { type: 'p', text: 'Alpha, what do you think?' },
  ]);
});

test('other bullet styles and continuation lines are handled', () => {
  const blocks = parseRichText('* one\n• two\n1. three\n   still three');
  assert.deepEqual(blocks, [{ type: 'ul', items: ['one', 'two', 'three still three'] }]);
});

test('plain prose (older messages) stays as paragraphs; a dash inside a sentence is not a bullet', () => {
  assert.deepEqual(parseRichText('A normal line - with a dash.\n\nSecond paragraph.'), [
    { type: 'p', text: 'A normal line - with a dash.' },
    { type: 'p', text: 'Second paragraph.' },
  ]);
  assert.deepEqual(parseRichText(''), []);
  assert.deepEqual(parseRichText('- '), [{ type: 'p', text: '-' }]);
});

test('fillSeats keeps choices, drops missing or duplicate ones, and fills from the defaults', () => {
  const options = {
    builtin: ['analytical', 'critical', 'philosophical', 'creative', 'scientific', 'skeptical'].map((ref) => ({ ref })),
    custom: [{ ref: 'custom:7' }],
    default_order: ['analytical', 'philosophical', 'critical', 'creative', 'scientific', 'skeptical'],
  };
  assert.deepEqual(fillSeats(options, 2), ['analytical', 'philosophical']);
  assert.deepEqual(fillSeats(options, 3, ['custom:7', 'custom:9', 'custom:7']), ['custom:7', 'analytical', 'philosophical']);
  assert.deepEqual(fillSeats(options, 2, ['creative', 'scientific', 'skeptical']), ['creative', 'scientific']);
  assert.equal(new Set(fillSeats(options, 5, ['analytical'])).size, 5);
});

test('personalityOf reads both the list shape and the room shape', () => {
  assert.deepEqual(personalityOf({ key: 'alpha', personality: 'Analytical Thinker', icon: 'analytical' }), { name: 'Analytical Thinker', icon: 'analytical' });
  assert.deepEqual(personalityOf({ key: 'beta', personality: { ref: 'critical', name: 'Critical Thinker', description: 'x', icon: 'critical' } }), { name: 'Critical Thinker', icon: 'critical' });
  assert.deepEqual(personalityOf({ key: 'delta' }), { name: '', icon: '' });
  assert.equal(typeof personalityOf({ personality: { name: 'X' } }).name, 'string');
});
