import { Provider, useAtomValue, useSetAtom } from 'jotai';
import { useWorkspace, useCommand, useSettingValue, useTheme } from '@archbase/workspace-sdk';
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
  isDark,
}: {
  label: string;
  onClick: () => void;
  span?: number;
  variant?: 'default' | 'operator' | 'function';
  isDark: boolean;
}) {
  const bgColors = isDark
    ? { default: '#374151', operator: '#f59e0b', function: '#4b5563' }
    : { default: '#e5e7eb', operator: '#f59e0b', function: '#d1d5db' };

  const textColor = isDark
    ? '#fff'
    : variant === 'operator' ? '#fff' : '#1f2937';

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
        color: textColor,
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
  const clearCalc = useSetAtom(clearAtom);
  const toggleSign = useSetAtom(toggleSignAtom);
  const percent = useSetAtom(percentAtom);

  const sdk = useWorkspace();
  const { isDark } = useTheme();
  const [precisionRaw] = useSettingValue<number>('calculator.decimalPrecision');
  const precision = precisionRaw ?? 2;

  // Register clear command
  useCommand('calculator.clear', () => {
    clearCalc();
    sdk.notifications.info('Calculator', 'Cleared');
  });

  // Format display based on precision setting
  const formattedDisplay = (() => {
    const num = parseFloat(display);
    if (isNaN(num) || display.endsWith('.')) return display;
    if (Number.isInteger(num)) return display;
    return num.toFixed(precision);
  })();

  const c = isDark
    ? { bg: '#1f2937', displayText: '#fff', opText: '#9ca3af' }
    : { bg: '#f9fafb', displayText: '#1f2937', opText: '#6b7280' };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: c.bg,
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
          color: c.displayText,
          fontFamily: 'monospace',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minHeight: 56,
        }}
      >
        {formattedDisplay}
      </div>

      {operation && (
        <div
          style={{
            textAlign: 'right',
            padding: '0 12px',
            fontSize: 14,
            color: c.opText,
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
        <CalcButton label="AC" onClick={() => clearCalc()} variant="function" isDark={isDark} />
        <CalcButton label="+/-" onClick={() => toggleSign()} variant="function" isDark={isDark} />
        <CalcButton label="%" onClick={() => percent()} variant="function" isDark={isDark} />
        <CalcButton label="/" onClick={() => performOperation('/')} variant="operator" isDark={isDark} />

        <CalcButton label="7" onClick={() => inputDigit('7')} isDark={isDark} />
        <CalcButton label="8" onClick={() => inputDigit('8')} isDark={isDark} />
        <CalcButton label="9" onClick={() => inputDigit('9')} isDark={isDark} />
        <CalcButton label="*" onClick={() => performOperation('*')} variant="operator" isDark={isDark} />

        <CalcButton label="4" onClick={() => inputDigit('4')} isDark={isDark} />
        <CalcButton label="5" onClick={() => inputDigit('5')} isDark={isDark} />
        <CalcButton label="6" onClick={() => inputDigit('6')} isDark={isDark} />
        <CalcButton label="-" onClick={() => performOperation('-')} variant="operator" isDark={isDark} />

        <CalcButton label="1" onClick={() => inputDigit('1')} isDark={isDark} />
        <CalcButton label="2" onClick={() => inputDigit('2')} isDark={isDark} />
        <CalcButton label="3" onClick={() => inputDigit('3')} isDark={isDark} />
        <CalcButton label="+" onClick={() => performOperation('+')} variant="operator" isDark={isDark} />

        <CalcButton label="0" onClick={() => inputDigit('0')} span={2} isDark={isDark} />
        <CalcButton label="." onClick={() => inputDecimal()} isDark={isDark} />
        <CalcButton label="=" onClick={() => calculate()} variant="operator" isDark={isDark} />
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
