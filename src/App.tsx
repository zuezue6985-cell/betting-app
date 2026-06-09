import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
} from "firebase/firestore";

/** ✅ 타입 정의 */
type PickType = {
  name: string;
  match: string;
  score: string;
};

const firebaseConfig = {
  apiKey: "AIzaSyDn...",
  authDomain: "world-f16fc.firebaseapp.com",
  projectId: "world-f16fc",
  storageBucket: "world-f16fc.firebasestorage.app",
  messagingSenderId: "470311560736",
  appId: "1:470311560736:web:def5a90645b54171a7e45",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const matches = [
  { id: 1, name: "[예선 1차전 6/12(금)]", teamA: "한국", teamB: "체코" },
  { id: 2, name: "[예선 2차전 6/19(금)]", teamA: "한국", teamB: "멕시코" },
  { id: 3, name: "[예선 3차전 6/25(목)]", teamA: "한국", teamB: "남아공" },
];

const scores = [0, 1, 2, 3, 4, 5];
const SLOT_PRICE = 2000;

export default function App() {
  const [name, setName] = useState<string>("");
  const [picks, setPicks] = useState<PickType[]>([]);
  const [tempPicks, setTempPicks] = useState<PickType[]>([]);
  const [ranking, setRanking] = useState<{ [key: string]: number }>({});
  const [showRules, setShowRules] = useState<boolean>(false);

  /** ✅ Firestore 데이터 */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "picks"), (snap) => {
      const data: PickType[] = snap.docs.map((doc) => doc.data() as PickType);
      setPicks(data);
    });
    return () => unsub();
  }, []);

  /** ✅ 랭킹 계산 */
  useEffect(() => {
    const r: { [key: string]: number } = {};
    picks.forEach((p) => {
      r[p.name] = (r[p.name] || 0) + 1;
    });
    setRanking(r);
  }, [picks]);

  /** ✅ 선택 */
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

  /** ✅ 제출 */
  const submitPicks = async () => {
    for (let p of tempPicks) {
      await addDoc(collection(db, "picks"), p);
    }
    setTempPicks([]);
  };

  /** ✅ 이름 표시 */
  const getNames = (match: string, score: string) => {
    const committed = picks
      .filter((p) => p.match === match && p.score === score)
      .map((p) => p.name);

    const tempMine = tempPicks
      .filter((p) => p.match === match && p.score === score)
      .map((p) => p.name + "(선택)");

    return [...committed, ...tempMine].join(", ");
  };

  /** ✅ 금액 */
  const totalByMatch = (match: string) => {
    const count = picks.filter((p) => p.match === match).length;
    return count * SLOT_PRICE;
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
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        {/* 룰 */}
        <div
          onClick={() => setShowRules(!showRules)}
          style={{
            background: "#111",
            padding: 10,
            borderRadius: 8,
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          📜 게임 룰 {showRules ? "▲" : "▼"}
          {showRules && (
            <div style={{ fontSize: 13 }}>
              <div>1. 슬롯당 2000원</div>
              <div>2. 경기당 최대 5개</div>
              <div>3. 동일 결과 N분할</div>
              <div>4. 단독 적중 Full</div>
              <div>5. 승자 없으면 환불</div>
            </div>
          )}
        </div>

        {/* 표 */}
        {matches.map((match) => (
          <div key={match.id} style={{ textAlign: "center", marginBottom: 30 }}>
            <h3>{match.name}</h3>

            <div style={{ marginBottom: 8 }}>
              💰 총 배팅금: {totalByMatch(match.name).toLocaleString()}원
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
                    <th key={s}>
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
                    {scores.map((b) => {
                      const score = `${a}:${b}`;
                      return (
                        <td
                          key={b}
                          onClick={() => addTempPick(match.name, a, b)}
                          style={{
                            border: "1px solid #0f0",
                            height: 40,
                            background: "white",
                            color: "black",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {getNames(match.name, score)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <button onClick={submitPicks} style={{ width: "100%", marginTop: 20 }}>
          ✅ 제출
        </button>

        {/* 랭킹 */}
        <div
          style={{
            marginTop: 30,
            padding: 20,
            border: "2px solid gold",
            borderRadius: 10,
          }}
        >
          <h2>🏆 RANKING</h2>

          {Object.entries(ranking)
            .sort((a, b) => b[1] - a[1])
            .map(([n, c], i) => (
              <div key={n}>{`${i + 1}. ${n} (${c}개)`}</div>
            ))}
        </div>
      </div>
    </div>
  );
}
