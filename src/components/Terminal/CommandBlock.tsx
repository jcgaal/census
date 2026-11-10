import { useEffect, useState, type ReactNode } from 'react';

// One step of a command block: the command typed out character by
// character and a function that renders its output, called only
// once the command has finished typing so the output appears whole.
export interface Step {
  cmd: string;
  output: () => ReactNode;
}

const CHAR_MS = 25;
// Block keys that have already finished typing. The set lives outside
// React so it survives remounts, such as switching between layouts,
// and a block that has typed once is never typed again later on.
const typed = new Set<string>();
// Visitors who ask for reduced motion skip the typing effect, so
// every command and its output appears at once without the cursor
// moving across the line one character at a time for each step.
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// CommandBlock types each command at about 25ms a character, then
// prints its output at once and moves to the next step, and shows
// the optional footer only after the last step has been printed.
export function CommandBlock({ blockKey, steps, footer }: { blockKey: string; steps: Step[]; footer?: ReactNode }) {
  const skip = typed.has(blockKey) || reduceMotion();
  const [step, setStep] = useState(skip ? steps.length : 0);
  const [chars, setChars] = useState(0);

  // Each tick either types one more character or, once the command is
  // complete, waits a short pause before moving to the next step, and
  // marks the block as typed when every step has been printed.
  useEffect(() => {
    if (step >= steps.length) {
      typed.add(blockKey);
      return;
    }
    const cmd = steps[step].cmd;
    const t =
      chars < cmd.length
        ? window.setTimeout(() => setChars((c) => c + 1), CHAR_MS)
        : window.setTimeout(() => {
            setStep((s) => s + 1);
            setChars(0);
          }, 90);
    return () => window.clearTimeout(t);
  }, [step, chars, steps, blockKey]);

  return (
    <div className="cmd-block">
      {steps.map((s, i) => {
        if (i > step) return null;
        if (i === step)
          return (
            <pre key={s.cmd} className="command">
              {s.cmd.slice(0, chars)}
              <span className="cursor" />
            </pre>
          );
        return (
          <div key={s.cmd}>
            <pre className="command">{s.cmd}</pre>
            <div className="cmd-out">{s.output()}</div>
          </div>
        );
      })}
      {step >= steps.length && footer}
    </div>
  );
}
