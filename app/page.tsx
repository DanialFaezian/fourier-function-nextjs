"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  CircleHelp,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

type Point = { x: string; y: string };
type Coefficient = { k: number; a: number; b: number; nyquist?: boolean };

const example: Point[] = [
  { x: "0", y: "0" },
  { x: "1", y: "1" },
  { x: "2", y: "0" },
  { x: "3", y: "-1" },
  { x: "4", y: "0" },
  { x: "5", y: "1" },
  { x: "6", y: "0" },
  { x: "7", y: "-1" },
];

function clean(n: number, digits = 5) {
  if (Math.abs(n) < 1e-10) return "0";
  return Number(n.toFixed(digits)).toString();
}

type CalculationError = {
  error: string;
};

type CalculationSuccess = {
  error: null;
  data: { x: number; y: number }[];
  N: number;
  x0: number;
  h: number;
  period: number;
  a0: number;
  coeffs: Coefficient[];
  evaluate: (x: number) => number;
  residuals: { x: number; y: number; fitted: number; error: number }[];
  rmse: number;
};

function calculate(points: Point[]): CalculationError | CalculationSuccess {
  const data = points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));

  if (data.length < 3) {
    return { error: "Enter at least 3 data points." };
  }

  if (data.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return { error: "Every x and y value must be a valid number." };
  }

  const steps = data.slice(1).map((p, i) => p.x - data[i].x);
  const h = steps[0]!;

  if (
    h <= 0 ||
    steps.some((s) => Math.abs(s - h) > 1e-7 * Math.max(1, Math.abs(h)))
  ) {
    return {
      error: "The x values must be strictly increasing and equally spaced.",
    };
  }

  const N = data.length;
  const x0 = data[0]!.x;
  const period = h * N;
  const maxHarmonic = Math.floor(N / 2);
  const coeffs: Coefficient[] = [];
  const mean = data.reduce((s, p) => s + p.y, 0) / N;
  const a0 = 2 * mean;

  for (let k = 1; k <= maxHarmonic; k++) {
    const isNyquist = N % 2 === 0 && k === N / 2;
    let cosSum = 0;
    let sinSum = 0;

    data.forEach((p, j) => {
      const angle = (2 * Math.PI * k * j) / N;
      cosSum += p.y * Math.cos(angle);
      sinSum += p.y * Math.sin(angle);
    });

    const scale = isNyquist ? 1 / N : 2 / N;

    coeffs.push({
      k,
      a: cosSum * scale,
      b: isNyquist ? 0 : sinSum * scale,
      nyquist: isNyquist,
    });
  }

  const evaluate = (x: number) => {
    let y = a0 / 2;

    for (const c of coeffs) {
      const angle = (2 * Math.PI * c.k * (x - x0)) / period;
      y += c.a * Math.cos(angle) + c.b * Math.sin(angle);
    }

    return y;
  };

  const residuals = data.map((p) => ({
    ...p,
    fitted: evaluate(p.x),
    error: p.y - evaluate(p.x),
  }));

  const rmse = Math.sqrt(residuals.reduce((s, p) => s + p.error ** 2, 0) / N);

  return {
    error: null,
    data,
    N,
    x0,
    h,
    period,
    a0,
    coeffs,
    evaluate,
    residuals,
    rmse,
  };
}

function formatTerm(c: Coefficient, period: number, x0: number) {
  const angle =
    c.k === 1
      ? `2π(x − ${clean(x0)})/${clean(period)}`
      : `${c.k}·2π(x − ${clean(x0)})/${clean(period)}`;
  const terms: string[] = [];
  if (Math.abs(c.a) > 1e-8)
    terms.push(`${c.a < 0 ? "− " : "+ "}${clean(Math.abs(c.a))} cos(${angle})`);
  if (Math.abs(c.b) > 1e-8)
    terms.push(`${c.b < 0 ? "− " : "+ "}${clean(Math.abs(c.b))} sin(${angle})`);
  return terms;
}

export default function Home() {
  const [points, setPoints] = useState<Point[]>(example);
  const [showSteps, setShowSteps] = useState(true);
  const [harmonics, setHarmonics] = useState("all");
  const result = useMemo(() => calculate(points), [points]);
  const computed = "coeffs" in result ? result : null;
  const valid = computed !== null;
  const coeffs = computed
    ? harmonics === "all"
      ? computed.coeffs
      : computed.coeffs.filter((c) => c.k <= Number(harmonics))
    : [];
  const series = computed
    ? `f(x) = ${clean(computed.a0 / 2)}${coeffs
        .flatMap((c) => formatTerm(c, computed.period, computed.x0))
        .map((term) => ` ${term}`)
        .join("")}`
    : "";

  function updatePoint(index: number, field: keyof Point, value: string) {
    setPoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }
  function addRow() {
    setPoints((prev) => {
      const lastX = Number(prev[prev.length - 1]?.x ?? -1);
      return [
        ...prev,
        { x: String(Number.isFinite(lastX) ? lastX + 1 : prev.length), y: "0" },
      ];
    });
  }
  function loadExample() {
    setPoints(example);
    setHarmonics("all");
  }
  function exportCsv() {
    const rows = ["x,y", ...points.map((p) => `${p.x},${p.y}`)].join("\n");
    const url = URL.createObjectURL(
      new Blob([rows], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fourier-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Activity size={19} />
          </span>
          <span>
            Fourier<span className="brand-light">Lab</span>
          </span>
        </a>
        <div className="topbar-right">
          <span className="status-dot" /> DISCRETE FOURIER SERIES{" "}
          <span className="version">v1.0</span>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span className="eyebrow-line" /> DATA → FUNCTION
        </div>
        <h1>
          From data points
          <br />
          <span>to a Fourier function.</span>
        </h1>
        <p className="hero-copy">
          Enter your sampled values. Get the trigonometric series, its
          coefficients, and the calculation steps behind every term.
        </p>
        <div className="hero-tags">
          <span>∑ Harmonic analysis</span>
          <span>·</span>
          <span>Numerical calculation</span>
          <span>·</span>
          <span>Step-by-step</span>
        </div>
      </section>

      <div className="workspace">
        <section className="panel data-panel">
          <div className="panel-heading">
            <div>
              <div className="section-index">01 / INPUT</div>
              <h2>Sampled data</h2>
            </div>
            <button
              className="icon-button"
              title="Load example data"
              onClick={loadExample}
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
          <p className="muted">
            Provide at least 3 equally spaced points over one period. Do not
            repeat the endpoint.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  <th>
                    x <span>· input</span>
                  </th>
                  <th>
                    f(x) <span>· input</span>
                  </th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr key={i}>
                    <td className="row-number">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td>
                      <input
                        aria-label={`x value row ${i + 1}`}
                        value={p.x}
                        onChange={(e) => updatePoint(i, "x", e.target.value)}
                        inputMode="decimal"
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`y value row ${i + 1}`}
                        value={p.y}
                        onChange={(e) => updatePoint(i, "y", e.target.value)}
                        inputMode="decimal"
                      />
                    </td>
                    <td>
                      <button
                        className="delete-button"
                        aria-label={`Delete row ${i + 1}`}
                        disabled={points.length <= 3}
                        onClick={() =>
                          setPoints((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-actions">
            <button className="text-button" onClick={addRow}>
              <Plus size={15} /> Add data point
            </button>
            <button className="text-button" onClick={exportCsv}>
              <ArrowDownToLine size={15} /> Export CSV
            </button>
          </div>
          {result.error && <div className="error-box">{result.error}</div>}
          {computed && (
            <div className="data-summary">
              <div>
                <span>POINTS</span>
                <strong>{computed.N}</strong>
              </div>
              <div>
                <span>PERIOD T</span>
                <strong>{clean(computed.period)}</strong>
              </div>
              <div>
                <span>STEP Δx</span>
                <strong>{clean(computed.h)}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="panel result-panel">
          <div className="panel-heading">
            <div>
              <div className="section-index">02 / RESULT</div>
              <h2>Fourier series</h2>
            </div>
            <span className="live-pill">
              <span /> LIVE RESULT
            </span>
          </div>
          {computed ? (
            <>
              <div className="formula-card">
                <div className="formula-label">TRIGONOMETRIC FORM</div>
                <div className="formula">
                  f(x) ={" "}
                  <span className="formula-constant">
                    {clean(computed.a0 / 2)}
                  </span>
                  {coeffs.map((c) => (
                    <span key={c.k} className="formula-term">
                      {Math.abs(c.a) > 1e-8 && (
                        <>
                          {c.a < 0 ? " − " : " + "}
                          <span className="coefficient">
                            {clean(Math.abs(c.a))}
                          </span>{" "}
                          cos(
                          <span className="angle">
                            {c.k === 1 ? "" : `${c.k}·`}2π(x −{" "}
                            {clean(computed.x0)})/{clean(computed.period)}
                          </span>
                          )
                        </>
                      )}
                      {Math.abs(c.b) > 1e-8 && (
                        <>
                          {c.b < 0 ? " − " : " + "}
                          <span className="coefficient">
                            {clean(Math.abs(c.b))}
                          </span>{" "}
                          sin(
                          <span className="angle">
                            {c.k === 1 ? "" : `${c.k}·`}2π(x −{" "}
                            {clean(computed.x0)})/{clean(computed.period)}
                          </span>
                          )
                        </>
                      )}
                    </span>
                  ))}
                </div>
                <div className="formula-foot">
                  Periodic extension · T = {clean(computed.period)} ·{" "}
                  {computed.N} samples
                </div>
              </div>
              <div className="result-controls">
                <label htmlFor="harmonics">Displayed harmonics</label>
                <select
                  id="harmonics"
                  value={harmonics}
                  onChange={(e) => setHarmonics(e.target.value)}
                >
                  <option value="all">All (full interpolation)</option>
                  {computed.coeffs.map((c) => (
                    <option key={c.k} value={String(c.k)}>
                      Up to k = {c.k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="coefficient-grid">
                <div className="coefficient-card">
                  <span>a₀ / 2 · MEAN</span>
                  <strong>{clean(computed.a0 / 2)}</strong>
                </div>
                {computed.coeffs.map((c) => (
                  <div className="coefficient-card" key={c.k}>
                    <span>HARMONIC k = {c.k}</span>
                    <strong>
                      <i>a</i>
                      <sub>{c.k}</sub> = {clean(c.a)}
                    </strong>
                    <small>
                      <i>b</i>
                      <sub>{c.k}</sub> = {clean(c.b)}
                      {c.nyquist ? " · Nyquist" : ""}
                    </small>
                  </div>
                ))}
              </div>
              <div className="quality-row">
                <span>
                  Sample fit RMSE <b>{clean(computed.rmse, 7)}</b>
                </span>
                <span className="fit-label">
                  {computed.rmse < 1e-7 ? "EXACT AT SAMPLES" : "NUMERICAL FIT"}
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Activity size={28} />
              <p>
                Enter valid, equally spaced data to calculate the Fourier
                series.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="panel steps-panel">
        <div className="panel-heading steps-heading">
          <div>
            <div className="section-index">03 / METHOD</div>
            <h2>Calculation process</h2>
          </div>
          <button
            className="toggle-button"
            onClick={() => setShowSteps(!showSteps)}
          >
            {showSteps ? "Hide steps" : "Show steps"}{" "}
            <span>{showSteps ? "−" : "+"}</span>
          </button>
        </div>
        {showSteps && computed && (
          <div className="steps-content">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-body">
                <h3>Determine the sampling interval and period</h3>
                <p>
                  There are <b>N = {computed.N}</b> samples. Since the x-values
                  are equally spaced, Δx = {clean(computed.h)}. The period is T
                  = NΔx = {computed.N} × {clean(computed.h)} ={" "}
                  <b>{clean(computed.period)}</b>.
                </p>
                <div className="math-block">
                  θⱼ = 2πj/N, &nbsp; x = x₀ + jΔx
                </div>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-body">
                <h3>Calculate the average value</h3>
                <p>The constant term is the mean of all y-values.</p>
                <div className="math-block">
                  a₀/2 = (1/N) Σ yⱼ ={" "}
                  {computed.data.map((p) => clean(p.y)).join(" + ").length < 95
                    ? `(${computed.data.map((p) => clean(p.y)).join(" + ")}) / ${computed.N}`
                    : `sum of ${computed.N} y-values / ${computed.N}`}{" "}
                  = <b>{clean(computed.a0 / 2)}</b>
                </div>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-body">
                <h3>Compute each harmonic coefficient</h3>
                <p>
                  Project the samples onto cosine and sine waves at each
                  frequency k. For ordinary harmonics, both sums are scaled by
                  2/N. For an even-N Nyquist term, the cosine coefficient is
                  scaled by 1/N.
                </p>
                <div className="math-block">
                  aₖ = (2/N) Σ yⱼ cos(2πkj/N)
                  <br />
                  bₖ = (2/N) Σ yⱼ sin(2πkj/N)
                </div>
                <div className="coefficient-table-wrap">
                  <table className="coeff-table">
                    <thead>
                      <tr>
                        <th>k</th>
                        <th>cosine sum / scale</th>
                        <th>aₖ</th>
                        <th>bₖ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computed.coeffs.map((c) => (
                        <tr key={c.k}>
                          <td>{c.k}</td>
                          <td>
                            {c.nyquist
                              ? "Σ yⱼ(−1)ʲ / N"
                              : `2/N × Σ projection at k=${c.k}`}
                          </td>
                          <td>{clean(c.a)}</td>
                          <td>{clean(c.b)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-body">
                <h3>Assemble the Fourier series</h3>
                <p>
                  Add the constant term and each cosine/sine harmonic. The
                  argument uses the shifted coordinate x − x₀ so the first
                  sample can start at any x-value.
                </p>
                <div className="math-block">
                  f(x) = a₀/2 + Σ [aₖ cos(2πk(x − x₀)/T) + bₖ sin(2πk(x −
                  x₀)/T)]
                </div>
                <p className="muted small">
                  With all harmonics included, this discrete Fourier series
                  reproduces the input samples (up to floating-point precision).
                  Between samples it defines a periodic trigonometric
                  interpolant.
                </p>
              </div>
            </div>
          </div>
        )}
        {showSteps && !computed && (
          <p className="muted">
            Calculation steps will appear after the input data is valid.
          </p>
        )}
      </section>

      <footer>
        <div className="footer-brand">
          <Activity size={15} /> FourierLab
        </div>
        <p>Built for learning · Discrete Fourier series from sampled data</p>
        <span className="footer-note">
          <CircleHelp size={13} /> Assumes equally spaced samples over one
          period
        </span>
      </footer>
    </main>
  );
}
