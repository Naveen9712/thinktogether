/**
 * Arrow-key support for a group of role="radio" buttons (WAI-ARIA radio group pattern):
 * Left/Up = previous, Right/Down = next, Home/End = first/last. Focus follows the selection.
 */
export function radioKeyDown(e, values, current, select) {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  let index = values.indexOf(current);
  if (e.key in keys) index = (index + keys[e.key] + values.length) % values.length;
  else if (e.key === 'Home') index = 0;
  else if (e.key === 'End') index = values.length - 1;
  else return;
  e.preventDefault();
  select(values[index]);
  const buttons = e.currentTarget.querySelectorAll('[role="radio"]');
  if (buttons[index]) buttons[index].focus();
}
