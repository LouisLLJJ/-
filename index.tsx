import { useState, useEffect } from "react";

// ── Default questions (editable) ──────────────────────────────────
const DEFAULT_QUESTIONS = [
  { id: "gratitude", label: "今日の感謝　三つ", placeholder: "① \n② \n③ " },
  { id: "seeking", label: "私は何を求めているのか？", placeholder: "今、自分が本当に求めているものは…" },
  { id: "important", label: "私にとって一番大切なものは何か？", placeholder: "最も大切にしている価値観や存在は…" },
  { id: "books", label: "私が本に求めているものは？", placeholder: "知識、癒し、刺激、インスピレーション…" },
  { id: "doing", label: "その為に「今」何をしているのか？", placeholder: "具体的な行動を書いてみよう…" },
  { id: "effective", label: "その行動は私の求めているものを手に入れるのに効果的か？", placeholder: "正直に振り返ろう…" },
  { id: "better", label: "もっと良い方法を考え出し、実行してみよう", placeholder: "新しいアプローチやアイデアは…" },
];

const JOURNAL_KEY = "reflection_journal_v3";
const QUESTIONS_KEY = "reflection_questions_v3";

function getTodayKey() { return new Date().toISOString().split("T")[0]; }
function formatDate(d) {
  return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}
function loadJ() { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}"); } catch { return {}; } }
function loadQ() { try { return JSON.parse(localStorage.getItem(QUESTIONS_KEY)) || DEFAULT_QUESTIONS; } catch { return DEFAULT_QUESTIONS; } }
function persistJ(d) { localStorage.setItem(JOURNAL_KEY, JSON.stringify(d)); }
function persistQ(q) { localStorage.setItem(QUESTIONS_KEY, JSON.stringify(q)); }
function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Styles ────────────────────────────────────────────────────────
const sand = "#f2ede4";
const ink = "#1a1208";
const muted = "#9a8060";
const accent = "#c47a20";
const borderCol = "#ddd5c4";
const white = "#fff";

function iSt(extra = {}) {
  return {
    padding: "9px 11px", borderRadius: "8px",
    border: `1.5px solid ${borderCol}`, background: white,
    fontSize: "13px", color: ink, outline: "none",
    fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", ...extra
  };
}
function btnSt(extra = {}) {
  return {
    border: "none", borderRadius: "8px", cursor: "pointer",
    fontFamily: "sans-serif", fontSize: "13px", ...extra
  };
}

// ── KPI Row ───────────────────────────────────────────────────────
function KpiRow({ kpi, onChange, onRemove }) {
  const rate = kpi.target > 0 ? Math.round((kpi.actual / kpi.target) * 100) : null;
  const rateColor = rate === null ? muted : rate >= 100 ? "#2a7a4a" : rate >= 80 ? "#c07020" : "#b03020";
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
      <input value={kpi.name} onChange={e => onChange({ ...kpi, name: e.target.value })}
        placeholder="項目名" style={iSt({ flex: "2 1 100px" })} />
      <input value={kpi.target || ""} onChange={e => onChange({ ...kpi, target: parseFloat(e.target.value) || 0 })}
        type="number" placeholder="目標" style={iSt({ width: "68px" })} />
      <input value={kpi.actual || ""} onChange={e => onChange({ ...kpi, actual: parseFloat(e.target.value) || 0 })}
        type="number" placeholder="実績" style={iSt({ width: "68px" })} />
      <input value={kpi.unit} onChange={e => onChange({ ...kpi, unit: e.target.value })}
        placeholder="単位" style={iSt({ width: "44px" })} />
      {rate !== null && <span style={{ fontSize: "13px", fontWeight: 700, color: rateColor, minWidth: "40px" }}>{rate}%</span>}
      <button onClick={onRemove} style={btnSt({ background: "none", color: "#c0a080", fontSize: "18px", padding: "0 4px" })}>×</button>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────
function AIPanel({ entries, kpis: analyzeKpis, questions, onClose }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sorted = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));

      // Build KPI summary text
      const kpiSummary = analyzeKpis.length > 0
        ? analyzeKpis.map(k => {
          const rate = k.target > 0 ? Math.round((k.actual / k.target) * 100) : null;
          return `・${k.name}：目標 ${k.target}${k.unit} → 実績 ${k.actual}${k.unit}${rate !== null ? `（達成率 ${rate}%）` : ""}`;
        }).join("\n")
        : "（未入力）";

      const journalText = sorted.map(([date, rec]) => {
        const answers = questions.map(q => `【${q.label}】\n${rec.answers?.[q.id] || "（未記入）"}`).join("\n\n");
        return `=== ${formatDate(date)} ===\n${answers}`;
      }).join("\n\n━━━━━━━━━━━━━━━━━\n\n");

      const prompt = `あなたは内省・パフォーマンスの専門コーチです。
以下のデータを分析してください。

【今回の仕事の結果（目標 vs 実績）】
${kpiSummary}

【振り返りジャーナル（複数日分）】
${journalText}

このデータを深く読み込み、以下の観点で洞察をまとめてください。日本語で、率直かつ温かみのある文体で書いてください。

**① 振り返りと結果の相関**
「こういう振り返りをしていた期間に、こういう結果が出ている」という具体的なパターンを指摘してください。振り返りの質・内容と数値達成率の関係を読み解いてください。

**② あなたが今いる状態**
振り返りの言葉と数字の両方から読み取れる、このユーザーの現在の精神・行動状態を正直かつ思いやりを持って伝えてください。

**③ 変化の兆しや固定化しているもの**
日を追うごとに変わってきていること、または繰り返されているパターンは何ですか？

**④ 次のステップへの提言**
データに基づいた、具体的で実行可能な一つのアドバイスをください。

ユーザーの実際の言葉や数字を引用しながら分析してください。`;

      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const data = await res.json();
        setResult(data.content?.map(b => b.text || "").join("") || "分析できませんでした。");
      } catch {
        setResult("エラーが発生しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "680px", maxHeight: "88vh", overflowY: "auto", background: "#f7f4ee", borderRadius: "20px 20px 0 0", padding: "28px 24px 48px", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: muted, marginBottom: "3px", fontFamily: "sans-serif" }}>AI INSIGHT</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: ink }}>あなたの傾向分析</div>
          </div>
          <button onClick={onClose} style={btnSt({ background: "#e8e2d8", borderRadius: "50%", width: "36px", height: "36px", fontSize: "16px", color: "#5a4a30" })}>✕</button>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: muted }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", animation: "pulse 1.5s ease-in-out infinite" }}>◎</div>
            <div style={{ fontSize: "13px", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>分析中…</div>
          </div>
        ) : (
          <div style={{ fontSize: "14px", lineHeight: 1.95, color: "#2a1e10", whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{
              __html: result.replace(/\*\*(.*?)\*\*/g,
                '<strong style="color:#8b5e2a;display:block;margin-top:22px;margin-bottom:6px;font-size:12px;letter-spacing:0.1em;font-family:sans-serif;">$1</strong>')
            }}
          />
        )}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    </div>
  );
}

// ── Question Editor Modal ─────────────────────────────────────────
function QuestionEditor({ questions, onSave, onClose }) {
  const [draft, setDraft] = useState(questions.map(q => ({ ...q })));

  function update(idx, field, val) {
    setDraft(d => d.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  }
  function addQ() {
    setDraft(d => [...d, { id: uid(), label: "", placeholder: "" }]);
  }
  function removeQ(idx) {
    setDraft(d => d.filter((_, i) => i !== idx));
  }
  function moveQ(idx, dir) {
    const next = [...draft];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setDraft(next);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "680px", maxHeight: "92vh", overflowY: "auto", background: "#f7f4ee", borderRadius: "20px 20px 0 0", padding: "28px 24px 48px", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: muted, marginBottom: "3px", fontFamily: "sans-serif" }}>SETTINGS</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: ink }}>質問の編集</div>
          </div>
          <button onClick={onClose} style={btnSt({ background: "#e8e2d8", borderRadius: "50%", width: "36px", height: "36px", fontSize: "16px", color: "#5a4a30" })}>✕</button>
        </div>
        <div style={{ fontSize: "12px", color: muted, marginBottom: "20px", fontFamily: "sans-serif", lineHeight: 1.6 }}>
          質問の追加・編集・並び替え・削除ができます。<br />
          ※ 過去の回答データはそのまま保持されます。
        </div>

        {draft.map((q, i) => (
          <div key={q.id} style={{ background: white, border: `1px solid ${borderCol}`, borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", color: muted, fontFamily: "sans-serif" }}>Q{i + 1}</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => moveQ(i, -1)} disabled={i === 0} style={btnSt({ background: i === 0 ? "#f0ebe0" : "#e8e2d4", color: i === 0 ? "#ccc" : muted, padding: "4px 8px" })}>↑</button>
                <button onClick={() => moveQ(i, 1)} disabled={i === draft.length - 1} style={btnSt({ background: i === draft.length - 1 ? "#f0ebe0" : "#e8e2d4", color: i === draft.length - 1 ? "#ccc" : muted, padding: "4px 8px" })}>↓</button>
                <button onClick={() => removeQ(i)} style={btnSt({ background: "#fde8e0", color: "#b03020", padding: "4px 10px" })}>削除</button>
              </div>
            </div>
            <input value={q.label} onChange={e => update(i, "label", e.target.value)}
              placeholder="質問文を入力…" style={{ ...iSt({ width: "100%", boxSizing: "border-box", marginBottom: "8px", fontSize: "14px" }) }} />
            <input value={q.placeholder} onChange={e => update(i, "placeholder", e.target.value)}
              placeholder="プレースホルダー（任意）" style={iSt({ width: "100%", boxSizing: "border-box", fontSize: "12px", color: muted })} />
          </div>
        ))}

        <button onClick={addQ} style={btnSt({
          width: "100%", padding: "13px", marginTop: "8px", marginBottom: "16px",
          background: "#ebe5d8", color: muted, border: `1.5px dashed ${borderCol}`, borderRadius: "12px", fontSize: "14px"
        })}>＋ 質問を追加</button>

        <button onClick={() => onSave(draft)} style={btnSt({
          width: "100%", padding: "16px", background: ink, color: white,
          fontSize: "15px", fontWeight: 700, borderRadius: "12px", letterSpacing: "0.08em"
        })}>保存する</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("today");
  const [allData, setAllData] = useState(loadJ);
  const [questions, setQuestions] = useState(loadQ);
  const [todayAnswers, setTodayAnswers] = useState(() => loadJ()[getTodayKey()]?.answers || {});
  const [saved, setSaved] = useState(false);

  // Analyze tab state
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [analyzeKpis, setAnalyzeKpis] = useState([]);
  const [showAI, setShowAI] = useState(false);
  const [aiEntries, setAiEntries] = useState({});

  // Modals
  const [showEditor, setShowEditor] = useState(false);

  const todayKey = getTodayKey();

  function setAnswer(id, val) { setTodayAnswers(p => ({ ...p, [id]: val })); }

  function handleSave() {
    const updated = { ...allData, [todayKey]: { answers: todayAnswers } };
    setAllData(updated);
    persistJ(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSaveQuestions(newQs) {
    setQuestions(newQs);
    persistQ(newQs);
    setShowEditor(false);
  }

  function addKpi() { setAnalyzeKpis(p => [...p, { id: uid(), name: "", target: 0, actual: 0, unit: "" }]); }
  function updateKpi(id, kpi) { setAnalyzeKpis(p => p.map(k => k.id === id ? kpi : k)); }
  function removeKpi(id) { setAnalyzeKpis(p => p.filter(k => k.id !== id)); }

  function handleAnalyze() {
    const filtered = Object.fromEntries(
      Object.entries(allData).filter(([d]) => (!rangeFrom || d >= rangeFrom) && (!rangeTo || d <= rangeTo))
    );
    if (!Object.keys(filtered).length) return alert("該当する記録がありません。");
    setAiEntries(filtered);
    setShowAI(true);
  }

  const sortedDates = Object.keys(allData).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ minHeight: "100vh", background: sand, fontFamily: "'Hiragino Mincho ProN','Noto Serif JP',Georgia,serif", color: ink }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 0 100px" }}>

        {/* Header */}
        <div style={{ padding: "36px 24px 0", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.35em", color: muted, marginBottom: "6px", fontFamily: "sans-serif" }}>DAILY REFLECTION</div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 900, letterSpacing: "0.02em" }}>内省ジャーナル</h1>
            </div>
            <button onClick={() => setShowEditor(true)} style={btnSt({
              background: "none", border: `1px solid ${borderCol}`, color: muted,
              padding: "7px 13px", borderRadius: "20px", fontSize: "12px", marginTop: "8px"
            })}>⚙ 質問編集</button>
          </div>
          <div style={{ fontSize: "13px", color: muted, marginTop: "4px" }}>{formatDate(todayKey)}</div>
          <div style={{ height: "2px", background: `linear-gradient(90deg, ${accent}, transparent)`, marginTop: "16px" }} />
        </div>

        {/* Tab Nav */}
        <div style={{ display: "flex", borderBottom: `1px solid ${borderCol}`, marginBottom: "32px", padding: "0 24px" }}>
          {[["today", "今日"], ["history", "過去"], ["analyze", "分析"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={btnSt({
              padding: "10px 20px", background: "none",
              borderBottom: tab === key ? `2px solid ${accent}` : "2px solid transparent",
              marginBottom: "-1px", fontSize: "13px", fontWeight: tab === key ? 700 : 400,
              color: tab === key ? accent : muted, fontFamily: "sans-serif", letterSpacing: "0.06em"
            })}>{label}</button>
          ))}
        </div>

        {/* ── TODAY ── */}
        {tab === "today" && (
          <div style={{ padding: "0 24px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.25em", color: muted, fontFamily: "sans-serif", marginBottom: "20px" }}>REFLECTION</div>

            {questions.map((q, i) => (
              <div key={q.id} style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", fontFamily: "sans-serif", color: accent, letterSpacing: "0.1em", paddingTop: "5px", minWidth: "18px" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <label style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.5, letterSpacing: "0.02em" }}>{q.label}</label>
                </div>
                <textarea
                  value={todayAnswers[q.id] || ""}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={q.id === "gratitude" || i === 0 ? 4 : 3}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "13px 14px",
                    borderRadius: "10px", border: `1.5px solid ${todayAnswers[q.id] ? accent : borderCol}`,
                    background: todayAnswers[q.id] ? "#fffdf9" : white,
                    fontSize: "14px", lineHeight: 1.8, color: ink, resize: "vertical",
                    outline: "none", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
                    transition: "border-color 0.2s, background 0.2s"
                  }}
                />
                {i < questions.length - 1 && (
                  <div style={{ height: "1px", background: borderCol, margin: "16px 0 0", opacity: 0.5 }} />
                )}
              </div>
            ))}

            <button onClick={handleSave} style={btnSt({
              width: "100%", padding: "16px", background: saved ? "#3a8a5a" : ink,
              color: white, fontSize: "15px", fontWeight: 700, letterSpacing: "0.08em",
              borderRadius: "12px", transition: "background 0.3s"
            })}>
              {saved ? "✓ 保存しました" : "今日の記録を保存する"}
            </button>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === "history" && (
          <div style={{ padding: "0 24px" }}>
            {sortedDates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: muted, fontFamily: "sans-serif" }}>まだ記録がありません</div>
            ) : sortedDates.map(date => {
              const rec = allData[date];
              const answered = Object.values(rec.answers || {}).filter(v => v).length;
              return (
                <details key={date} style={{ marginBottom: "10px", borderRadius: "12px", border: `1px solid ${borderCol}`, overflow: "hidden", background: white }}>
                  <summary style={{ padding: "16px 20px", cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#faf7f2" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{formatDate(date)}</span>
                    <span style={{ fontSize: "11px", color: muted, fontFamily: "sans-serif" }}>{answered}問回答</span>
                  </summary>
                  <div style={{ padding: "20px" }}>
                    {questions.map(q => (
                      <div key={q.id} style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", color: accent, marginBottom: "3px", fontFamily: "sans-serif" }}>{q.label}</div>
                        <div style={{ fontSize: "13px", lineHeight: 1.75, color: rec.answers?.[q.id] ? ink : "#bbb", whiteSpace: "pre-wrap", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
                          {rec.answers?.[q.id] || "（未記入）"}
                        </div>
                      </div>
                    ))}
                    {/* Show answers for any old question IDs not in current questions list */}
                    {Object.entries(rec.answers || {}).filter(([id, v]) => v && !questions.find(q => q.id === id)).map(([id, val]) => (
                      <div key={id} style={{ marginBottom: "16px", opacity: 0.5 }}>
                        <div style={{ fontSize: "10px", color: muted, marginBottom: "3px", fontFamily: "sans-serif" }}>（削除済み質問）</div>
                        <div style={{ fontSize: "13px", lineHeight: 1.75, color: ink, whiteSpace: "pre-wrap", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {/* ── ANALYZE ── */}
        {tab === "analyze" && (
          <div style={{ padding: "0 24px" }}>

            {/* Period */}
            <div style={{ background: white, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "20px", marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: muted, marginBottom: "14px", fontFamily: "sans-serif" }}>STEP 1 — 分析期間</div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} style={{ ...iSt({ flex: 1 }) }} />
                <span style={{ color: muted, fontFamily: "sans-serif", fontSize: "12px" }}>〜</span>
                <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} style={{ ...iSt({ flex: 1 }) }} />
              </div>
              <div style={{ fontSize: "11px", color: muted, marginTop: "8px", fontFamily: "sans-serif" }}>空欄で全期間（記録数：{sortedDates.length}日）</div>
            </div>

            {/* KPI Input */}
            <div style={{ background: white, border: `1px solid ${borderCol}`, borderRadius: "14px", padding: "20px", marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: muted, fontFamily: "sans-serif" }}>STEP 2 — 仕事の結果入力</div>
                <button onClick={addKpi} style={btnSt({ background: "#ebe5d8", color: accent, padding: "6px 12px", borderRadius: "20px", fontSize: "12px" })}>＋ 追加</button>
              </div>
              {analyzeKpis.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: muted, fontSize: "13px", background: "#faf7f2", borderRadius: "10px", fontFamily: "sans-serif" }}>
                  「＋ 追加」から目標と実績を入力してください
                </div>
              ) : analyzeKpis.map(k => (
                <KpiRow key={k.id} kpi={k} onChange={kpi => updateKpi(k.id, kpi)} onRemove={() => removeKpi(k.id)} />
              ))}
            </div>

            {/* Analyze Button */}
            <button onClick={handleAnalyze} style={btnSt({
              width: "100%", padding: "17px",
              background: `linear-gradient(135deg, #8b4513, ${accent})`,
              color: white, fontSize: "15px", fontWeight: 700,
              letterSpacing: "0.1em", borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(196,122,32,0.3)"
            })}>
              AIで傾向を分析する
            </button>

            <div style={{ marginTop: "16px", background: "#faf7f2", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "11px", color: muted, fontFamily: "sans-serif", lineHeight: 1.8 }}>
                AIは振り返りの内容と入力した数値を照合して、<br />
                「こういう状態のときこういう結果が出ている」という<br />
                あなたの傾向とパターンを教えてくれます。
              </div>
            </div>
          </div>
        )}
      </div>

      {showAI && (
        <AIPanel
          entries={aiEntries}
          kpis={analyzeKpis}
          questions={questions}
          onClose={() => setShowAI(false)}
        />
      )}
      {showEditor && (
        <QuestionEditor
          questions={questions}
          onSave={handleSaveQuestions}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
