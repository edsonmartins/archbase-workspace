import { Provider, useAtomValue, useSetAtom } from 'jotai';
import {
  displayValueAtom,
  operationAtom,
  inputDigitAtom,
  inputDecimalAtom,
  performOperationAtom,
  calculateAtom,
  clearAtom,
  toggleSignAtom,
  percentAtom,
} from './state/atoms';

function CalcButton({
  label,
  onClick,
  span = 1,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  span?: number;
  variant?: 'default' | 'operator' | 'function';
}) {
  const bgColors = {
    default: '#374151',
    operator: '#f59e0b',
    function: '#4b5563',
  };

  return (
    <button
      onClick={onClick}
      style={{
        gridColumn: span > 1 ? `span ${span}` : undefined,
        padding: '12px 0',
        fontSize: 18,
        fontWeight: 500,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: bgColors[variant],
        color: '#fff',
        transition: 'opacity 0.1s',
      }}
      onMouseDown={(e) => { (e.target as HTMLElement).style.opacity = '0.7'; }}
      onMouseUp={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
    >
      {label}
    </button>
  );
}

function CalculatorUI() {
  const display = useAtomValue(displayValueAtom);
  const operation = useAtomValue(operationAtom);
  const inputDigit = useSetAtom(inputDigitAtom);
  const inputDecimal = useSetAtom(inputDecimalAtom);
  const performOperation = useSetAtom(performOperationAtom);
  const calculate = useSetAtom(calculateAtom);
  const clear = useSetAtom(clearAtom);
  const toggleSign = useSetAtom(toggleSignAtom);
  const percent = useSetAtom(percentAtom);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1f2937',
        padding: 12,
        gap: 8,
      }}
    >
      {/* Display */}
      <div
        style={{
          textAlign: 'right',
          padding: '16px 12px',
          fontSize: 32,
          fontWeight: 300,
          color: '#fff',
          fontFamily: 'monospace',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minHeight: 56,
        }}
      >
        {display}
      </div>

      {operation && (
        <div
          style={{
            textAlign: 'right',
            padding: '0 12px',
            fontSize: 14,
            color: '#9ca3af',
          }}
        >
          {operation}
        </div>
      )}

      {/* Keypad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          flex: 1,
        }}
      >
        <CalcButton label="AC" onClick={() => clear()} variant="function" />
        <CalcButton label="+/-" onClick={() => toggleSign()} variant="function" />
        <CalcButton label="%" onClick={() => percent()} variant="function" />
        <CalcButton label="/" onClick={() => performOperation('/')} variant="operator" />

        <CalcButton label="7" onClick={() => inputDigit('7')} />
        <CalcButton label="8" onClick={() => inputDigit('8')} />
        <CalcButton label="9" onClick={() => inputDigit('9')} />
        <CalcButton label="*" onClick={() => performOperation('*')} variant="operator" />

        <CalcButton label="4" onClick={() => inputDigit('4')} />
        <CalcButton label="5" onClick={() => inputDigit('5')} />
        <CalcButton label="6" onClick={() => inputDigit('6')} />
        <CalcButton label="-" onClick={() => performOperation('-')} variant="operator" />

        <CalcButton label="1" onClick={() => inputDigit('1')} />
        <CalcButton label="2" onClick={() => inputDigit('2')} />
        <CalcButton label="3" onClick={() => inputDigit('3')} />
        <CalcButton label="+" onClick={() => performOperation('+')} variant="operator" />

        <CalcButton label="0" onClick={() => inputDigit('0')} span={2} />
        <CalcButton label="." onClick={() => inputDecimal()} />
        <CalcButton label="=" onClick={() => calculate()} variant="operator" />
      </div>
    </div>
  );
}

export default function Calculator() {
  return (
    <Provider>
      <CalculatorUI />
    </Provider>
  );
}
