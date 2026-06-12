import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

type PickType = {
  name: string;
  match: string;
  score: string;
};

const firebaseConfig = {
  apiKey: "AIzaSyDn...",
  authDomain: "world-f16fc.firebaseapp.com",
  projectId: "world-f16fc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN = "신지예";

const DEADLINE = new Date("2026-06-12T10:00:00+09:00");

const matches = [
  { id: 1, name: "[예선 1차전 6/12(금)]", teamA: "한국", teamB: "체코" },
  {
    id: 2,
    name: "[예선 2차전 6/19(금)]",
    teamA: "한국",
    teamB: "멕시코",
  },
  {
    id: 3,
    name: "[예선 3차전 6/25(목)]",
    teamA: "한국",
    teamB: "남아공",
  },
];

const scores = [0, 1, 2, 3, 4, 5];
const SLOT_PRICE = 2000;

export default function App() {
  const [name, setName] = useState("");
  const [picks, setPicks] = useState<PickType[]>([]);
  const [tempPicks, setTempPicks] = useState<PickType[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const [ranking, setRanking] = useState<{ [key: string]: number }>({});
  const [results, setResults] = useState<{ [key: string]: string }>({});

  const isClosed = new Date() > DEADLINE;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "picks"), (snap) => {
      const data: PickType[] = snap.docs.map((doc) => doc.data() as PickType);
      setPicks(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const r: { [key: string]: number } = {};
    picks.forEach((p) => {
      r[p.name] = (r[p.name] || 0) + 1;
    });
    setRanking(r);
  }, [picks]);

  const addTempPick = (match: string, a: number, b: number) => {
    if (!name) return alert("이름 입력");

    const score = `${a}:${b}`;

    const exists = tempPicks.find(
      (p) => p.name === name && p.match === match && p.score === score
    );

    if (exists) {
      setTempPicks(tempPicks.filter((p) => p !== exists));
      return;
    }

    const myTotal = [...picks, ...tempPicks].filter(
      (p) => p.name === name && p.match === match
    ).length;

    if (myTotal >= 5) return alert("5슬롯 제한");

    setTempPicks([...tempPicks, { name, match, score }]);
  };

  const submitPicks = async () => {
    for (let p of tempPicks) {
      await addDoc(collection(db, "picks"), p);
    }
    setTempPicks([]);
    setSubmitted(true);
  };

  const cancelSubmit = () => {
    setSubmitted(false);
  };

  /** ✅ 🔥 Firestore 데이터 무조건 표시 */

  const getNames = (match: string, score: string) => {
    const committed = picks
      .filter((p) => p.match === match && p.score === score)
      .map((p) => p.name);

    const temp = tempPicks
      .filter((p) => p.match === match && p.score === score)
      .map((p) => p.name + " (선택)");

    return [...committed, ...temp].join(", ");
  };

  const totalByMatch = (match: string) => {
    if (!submitted) {
      const mine = tempPicks.filter((p) => p.match === match).length;
      return mine * SLOT_PRICE;
    }
    const count = picks.filter((p) => p.match === match).length;
    return count * SLOT_PRICE;
  };

  const handleResult = (match: string, value: string) => {
    setResults((prev) => ({ ...prev, [match]: value }));
  };

  const getWinners = (match: string) => {
    const result = results[match];
    if (!result) return [];
    return picks.filter((p) => p.match === match && p.score === result);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(270deg, #021, #063d06, #021)",
        color: "#fff",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center" }}>💰 WORLD CUP BETTING</h1>

        <input
          placeholder="이름 입력"
          value={name}
          disabled={isClosed && name !== ADMIN}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        {isClosed && (
          <div style={{ color: "red", textAlign: "center", marginBottom: 10 }}>
            🚫 참여가 마감되었습니다
          </div>
        )}

        {/* 룰 */}
        <div
          onClick={() => setShowRules(!showRules)}
          style={{
            marginBottom: 20,
            background: "#111",
            padding: 12,
            cursor: "pointer",
          }}
        >
          📜 게임 룰 / 📊 정산 방식 {showRules ? "▲" : "▼"}
          {showRules && (
            <div style={{ fontSize: 13 }}>
              <div>📜 게임 룰</div>
              <div>1. 슬롯당 2000원</div>
              <div>2. 경기당 최대 5개</div>
              <div>3. 동일 결과 N분배</div>
              <div>4. 단독 적중 Full</div>
              <div>5. 승자 없으면 환불</div>

              <div style={{ marginTop: 10 }}>
                <div>📊 정산 방식</div>
                <div>• 모든 경기 종료 후 "최종 순이익 기준" 정산</div>
                <div>• 순이익 = (총 당첨금 - 총 베팅금)</div>
                <div>• 마이너스(-) → 해당 금액 입금</div>
                <div>• 플러스(+) → 해당 금액 지급</div>
                <div>• 입금 확인 후 일괄 지급 진행</div>
                <div>• 💳 계좌 : 카카오 or 110-339-972323 (신한, 신지예)</div>
              </div>
            </div>
          )}
        </div>

        {matches.map((match) => (
          <div key={match.id} style={{ marginBottom: 30, textAlign: "center" }}>
            <h3>{match.name}</h3>

            <div>
              💰 총 베팅금:{" "}
              {(
                picks.filter((p) => p.match === match.name).length * SLOT_PRICE
              ).toLocaleString()}
              원
            </div>

            <table
              style={{
                margin: "0 auto",
                width: "80%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th></th>
                  {scores.map((s) => (
                    <th
                      key={s}
                      style={{
                        whiteSpace: "nowrap", // ✅ 줄바꿈 방지 핵심
                        fontSize: "11px", // ✅ 글씨도 살짝 줄이면 더 안정
                      }}
                    >
                      {match.teamA} {s}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {scores.map((a) => (
                  <tr key={a}>
                    <td>
                      {match.teamB} {a}
                    </td>
                    {scores.map((b) => (
                      <td
                        key={b}
                        onClick={() => {
                          if (isClosed && name !== ADMIN) return;
                          addTempPick(match.name, a, b);
                        }}
                        style={{
                          border: "1px solid #0f0",
                          height: 35,
                          background: "white",
                          color: "black",
                          cursor: "pointer",
                          fontSize: "11px",
                          lineHeight: "11px",
                          wordBreak: "break-all",
                          padding: "2px",
                        }}
                      >
                        {getNames(match.name, `${a}:${b}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ✅ 결과 */}
            <div style={{ marginTop: 10 }}>
              🎯 결과 :
              {name === ADMIN ? (
                <input
                  placeholder="예: 2:1"
                  value={results[match.name] || ""}
                  onChange={(e) => handleResult(match.name, e.target.value)}
                  style={{ marginLeft: 10 }}
                />
              ) : (
                <span style={{ marginLeft: 10 }}>
                  {results[match.name] || "-"}
                </span>
              )}
              <div>
                🏆 당첨자 :
                {getWinners(match.name)
                  .map((w) => w.name)
                  .join(", ") || " 없음"}
              </div>
              <div>
                💰 1인당 상금 :
                {(() => {
                  const total =
                    picks.filter((p) => p.match === match.name).length *
                    SLOT_PRICE;

                  const winners = getWinners(match.name);

                  if (winners.length === 0) return " 환불";

                  const per = Math.floor(total / winners.length);

                  return (
                    <>
                      {" "}
                      {total.toLocaleString()} ÷ {winners.length} ={" "}
                      {per.toLocaleString()}원
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}

        {!submitted && (
          <button onClick={submitPicks} style={{ width: "100%" }}>
            ✅ 제출
          </button>
        )}

        {/* ✅ 기존 랭킹 그대로 유지 */}
        <div style={{ marginTop: 30, padding: 20, border: "2px solid gold" }}>
          <h2>🏆 총 베팅액</h2>

          {Object.entries(ranking)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count], i) => (
              <div key={name}>
                {i + 1}. {name} ({count}개)
                <span style={{ marginLeft: 10 }}>
                  💰 {(count * SLOT_PRICE).toLocaleString()}원
                </span>
              </div>
            ))}

          <h2>🏆 최종 순이익 랭킹</h2>

          {Object.keys(ranking)
            .map((name) => {
              let profit = 0;

              matches.forEach((match) => {
                const result = results[match.name];
                if (!result) return;

                const all = picks.filter((p) => p.match === match.name);
                const total = all.length * SLOT_PRICE;

                const winners = all.filter((p) => p.score === result);
                if (winners.length === 0) return;

                const per = Math.floor(total / winners.length);

                const myWins = winners.filter((w) => w.name === name).length;
                const mySpend =
                  all.filter((p) => p.name === name).length * SLOT_PRICE;

                profit += per * myWins - mySpend;
              });

              return { name, profit };
            })
            .sort((a, b) => b.profit - a.profit)
            .map((p, i) => (
              <div key={p.name}>
                {i + 1}. {p.name}{" "}
                <span
                  style={{
                    marginLeft: 10,
                    color: p.profit >= 0 ? "#0f0" : "#f66",
                  }}
                >
                  {p.profit >= 0 ? "+" : ""}
                  {p.profit.toLocaleString()}원{i === 0 && " 🔥"}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
