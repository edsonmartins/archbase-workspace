import { atom } from 'jotai';

export const displayValueAtom = atom('0');
export const previousValueAtom = atom<string | null>(null);
export const operationAtom = atom<string | null>(null);
export const waitingForOperandAtom = atom(false);

export const inputDigitAtom = atom(null, (get, set, digit: string) => {
  const display = get(displayValueAtom);
  const waiting = get(waitingForOperandAtom);

  if (waiting) {
    set(displayValueAtom, digit);
    set(waitingForOperandAtom, false);
  } else {
    set(displayValueAtom, display === '0' ? digit : display + digit);
  }
});

export const inputDecimalAtom = atom(null, (get, set) => {
  const display = get(displayValueAtom);
  const waiting = get(waitingForOperandAtom);

  if (waiting) {
    set(displayValueAtom, '0.');
    set(waitingForOperandAtom, false);
    return;
  }

  if (!display.includes('.')) {
    set(displayValueAtom, display + '.');
  }
});

export const performOperationAtom = atom(null, (get, set, nextOp: string) => {
  const display = get(displayValueAtom);
  const previous = get(previousValueAtom);
  const operation = get(operationAtom);
  const currentValue = parseFloat(display);

  if (previous === null) {
    set(previousValueAtom, display);
  } else if (operation) {
    const previousValue = parseFloat(previous);
    let result: number;

    switch (operation) {
      case '+':
        result = previousValue + currentValue;
        break;
      case '-':
        result = previousValue - currentValue;
        break;
      case '*':
        result = previousValue * currentValue;
        break;
      case '/':
        result = currentValue !== 0 ? previousValue / currentValue : 0;
        break;
      default:
        result = currentValue;
    }

    const resultStr = String(parseFloat(result.toFixed(10)));
    set(displayValueAtom, resultStr);
    set(previousValueAtom, resultStr);
  }

  set(waitingForOperandAtom, true);
  set(operationAtom, nextOp);
});

export const calculateAtom = atom(null, (get, set) => {
  const display = get(displayValueAtom);
  const previous = get(previousValueAtom);
  const operation = get(operationAtom);

  if (!operation || previous === null) return;

  const currentValue = parseFloat(display);
  const previousValue = parseFloat(previous);
  let result: number;

  switch (operation) {
    case '+':
      result = previousValue + currentValue;
      break;
    case '-':
      result = previousValue - currentValue;
      break;
    case '*':
      result = previousValue * currentValue;
      break;
    case '/':
      result = currentValue !== 0 ? previousValue / currentValue : 0;
      break;
    default:
      result = currentValue;
  }

  set(displayValueAtom, String(parseFloat(result.toFixed(10))));
  set(previousValueAtom, null);
  set(operationAtom, null);
  set(waitingForOperandAtom, false);
});

export const clearAtom = atom(null, (_get, set) => {
  set(displayValueAtom, '0');
  set(previousValueAtom, null);
  set(operationAtom, null);
  set(waitingForOperandAtom, false);
});

export const toggleSignAtom = atom(null, (get, set) => {
  const display = get(displayValueAtom);
  const value = parseFloat(display);
  set(displayValueAtom, String(-value));
});

export const percentAtom = atom(null, (get, set) => {
  const display = get(displayValueAtom);
  const value = parseFloat(display);
  set(displayValueAtom, String(value / 100));
});
