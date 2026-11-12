// Run with: npm test   (Node's built-in test runner, no extra dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastStableId, mergeMessages } from './messages.js';
import { safeNext } from './auth.js';

const msg = (id, message, generation_status = 'completed') => ({ id, message, generation_status });

test('lastStableId skips the message that is still streaming', () => {
  assert.equal(lastStableId([]), 0);
  assert.equal(lastStableId([msg(1, 'a'), msg(2, 'b')]), 2);
  assert.equal(lastStableId([msg(1, 'a'), msg(2, 'b', 'generating')]), 1);
});

test('mergeMessages adds, orders and updates growing text', () => {
  let list = mergeMessages([], [msg(2, 'second'), msg(1, 'first')]);
  assert.deepEqual(list.map((m) => m.id), [1, 2]);
  list = mergeMessages(list, [msg(3, 'Hel', 'generating')]);
  list = mergeMessages(list, [msg(3, 'Hello there', 'generating')]);
  assert.equal(list[2].message, 'Hello there');
});

test('mergeMessages never lets an old "generating" copy overwrite a finished message', () => {
  const done = mergeMessages([], [msg(5, 'Final text', 'completed')]);
  const after = mergeMessages(done, [msg(5, 'Final te', 'generating')]);
  assert.equal(after, done);
  assert.equal(after[0].message, 'Final text');
});

test('mergeMessages returns the same array when nothing changed', () => {
  const list = mergeMessages([], [msg(1, 'a')]);
  assert.equal(mergeMessages(list, [msg(1, 'a')]), list);
  assert.equal(mergeMessages(list, []), list);
});

test('safeNext only allows in-app paths', () => {
  assert.equal(safeNext('/room/12'), '/room/12');
  assert.equal(safeNext('//evil.com'), '/');
  assert.equal(safeNext('/\\evil.com'), '/');
  assert.equal(safeNext('https://evil.com'), '/');
  assert.equal(safeNext(undefined), '/');
});
