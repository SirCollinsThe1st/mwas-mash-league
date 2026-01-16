"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  query
} from "firebase/firestore";

const teams = ["Mwas", "Mash"];

function calculateTable(matches) {
  const table = {
    Mwas: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    Mash: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
  };

  matches.forEach(m => {
    table.Mwas.played++;
    table.Mash.played++;

    table.Mwas.gf += m.mwasGoals;
    table.Mwas.ga += m.mashGoals;
    table.Mash.gf += m.mashGoals;
    table.Mash.ga += m.mwasGoals;

    if (m.mwasGoals > m.mashGoals) {
      table.Mwas.won++;
      table.Mwas.points += 3;
      table.Mash.lost++;
    } else if (m.mwasGoals < m.mashGoals) {
      table.Mash.won++;
      table.Mash.points += 3;
      table.Mwas.lost++;
    } else {
      table.Mwas.drawn++;
      table.Mash.drawn++;
      table.Mwas.points++;
      table.Mash.points++;
    }
  });

  return table;
}

export default function Home() {
  const [allMatches, setAllMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [table, setTable] = useState(calculateTable([]));
  const [adminPin, setAdminPin] = useState("");

  const [mwasGoals, setMwasGoals] = useState(0);
  const [mashGoals, setMashGoals] = useState(0);

  const [pinInput, setPinInput] = useState("");
  const [modalAction, setModalAction] = useState(null);
  const [targetMatchId, setTargetMatchId] = useState(null);

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    loadAdminPin();
    loadMatches();
  }, []);

  async function loadAdminPin() {
    const snap = await getDoc(doc(db, "config", "admin"));
    if (snap.exists()) setAdminPin(snap.data().pin);
  }

  async function loadMatches() {
    const qAll = query(
      collection(db, "league", "matches", "list"),
      orderBy("timestamp", "asc")
    );
    const allSnap = await getDocs(qAll);
    const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    setAllMatches(all);
    setTable(calculateTable(all));

    setRecentMatches(all.slice(-10).reverse());
  }

  /* ---------- MODAL CONTROL ---------- */
  function openModal(action, matchId = null) {
    setModalAction(action);
    setTargetMatchId(matchId);
    setPinInput("");
  }

  function closeModal() {
    setModalAction(null);
    setTargetMatchId(null);
    setPinInput("");
  }

  function verifyPin() {
    if (pinInput !== adminPin) {
      alert("Incorrect PIN");
      return false;
    }
    return true;
  }

  /* ---------- ACTION HANDLERS ---------- */
  async function confirmAction() {
    if (!verifyPin()) return;

    if (modalAction === "add") {
      await addDoc(collection(db, "league", "matches", "list"), {
        mwasGoals: Number(mwasGoals),
        mashGoals: Number(mashGoals),
        timestamp: new Date()
      });
      setMwasGoals(0);
      setMashGoals(0);
    }

    if (modalAction === "delete" && targetMatchId) {
      await deleteDoc(doc(db, "league", "matches", "list", targetMatchId));
    }

    if (modalAction === "reset") {
      const snap = await getDocs(collection(db, "league", "matches", "list"));
      for (const d of snap.docs) await deleteDoc(d.ref);
    }

    closeModal();
    await loadMatches();
  }

  /* ---------- SORT TABLE ---------- */
  const sorted = teams
    .map(t => ({
      name: t,
      ...table[t],
      gd: table[t].gf - table[t].ga
    }))
    .sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.gd - a.gd
    );

  /* ---------- UI ---------- */
  return (
    <main className="container">
      <h1>Mwas vs Mash League</h1>

      <div className="card">
        <h2>Add Match</h2>
        <div className="score-row">
          <input type="number" value={mwasGoals} onChange={e => setMwasGoals(e.target.value)} />
          <span className="badge mwas">Mwas</span>
          <strong>vs</strong>
          <span className="badge mash">Mash</span>
          <input type="number" value={mashGoals} onChange={e => setMashGoals(e.target.value)} />
        </div>
        <button onClick={() => openModal("add")}>Submit Match</button>
      </div>

      <div className="card">
        <h2>League Table</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={t.name}>
                  <td>{i + 1}</td>
                  <td><span className={`badge ${t.name.toLowerCase()}`}>{t.name}</span></td>
                  <td>{t.played}</td>
                  <td>{t.won}</td>
                  <td>{t.drawn}</td>
                  <td>{t.lost}</td>
                  <td>{t.gf}</td>
                  <td>{t.ga}</td>
                  <td>{t.gd}</td>
                  <td>{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="danger" onClick={() => openModal("reset")}>
          Reset Season
        </button>
      </div>

      <div className="card">
        <h2>Last 10 Matches</h2>
        <ul>
          {recentMatches.map(m => (
            <li key={m.id}>
              <span className="badge mwas">Mwas</span> {m.mwasGoals}
              &nbsp;–&nbsp;
              {m.mashGoals} <span className="badge mash">Mash</span>
              <div className="timestamp">
                {new Date(m.timestamp.seconds * 1000).toLocaleString()}
              </div>
              <button className="danger small" onClick={() => openModal("delete", m.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {modalAction && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Enter PIN</h3>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={confirmAction}>Confirm</button>
              <button className="danger" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
