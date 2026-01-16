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
  query,
  limit
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
  const [matches, setMatches] = useState([]);
  const [table, setTable] = useState(calculateTable([]));
  const [mwasGoals, setMwasGoals] = useState(0);
  const [mashGoals, setMashGoals] = useState(0);
  const [pin, setPin] = useState("");
  const [adminPin, setAdminPin] = useState("");

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    loadAdminPin();
    loadMatches();
  }, []);

  async function loadAdminPin() {
    const snap = await getDoc(doc(db, "config", "admin"));
    if (snap.exists()) {
      setAdminPin(snap.data().pin);
    }
  }

  async function loadMatches() {
    const q = query(
      collection(db, "league", "matches", "list"),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setMatches(data);
    setTable(calculateTable(data));
  }

  /* ---------- PIN CHECK ---------- */
  function verifyPin() {
    if (pin !== adminPin) {
      alert("Incorrect PIN");
      return false;
    }
    return true;
  }

  /* ---------- ADD MATCH ---------- */
  async function submitMatch() {
    if (!verifyPin()) return;

    await addDoc(collection(db, "league", "matches", "list"), {
      mwasGoals: Number(mwasGoals),
      mashGoals: Number(mashGoals),
      timestamp: new Date()
    });

    setMwasGoals(0);
    setMashGoals(0);
    setPin("");

    await trimMatches();
    await loadMatches();
  }

  /* ---------- DELETE MATCH ---------- */
  async function deleteMatch(id) {
    const confirmed = window.confirm("Delete this match?");
    if (!confirmed) return;
    if (!verifyPin()) return;

    await deleteDoc(doc(db, "league", "matches", "list", id));
    setPin("");
    await loadMatches();
  }

  /* ---------- LIMIT TO 10 ---------- */
  async function trimMatches() {
    const q = query(
      collection(db, "league", "matches", "list"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    const excess = snap.docs.slice(10);
    for (const d of excess) {
      await deleteDoc(d.ref);
    }
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
        <h2>Add Match (PIN Required)</h2>
        <div className="score-row">
          <input type="number" value={mwasGoals} onChange={e => setMwasGoals(e.target.value)} />
          <span className="badge mwas">Mwas</span>
          <strong>vs</strong>
          <span className="badge mash">Mash</span>
          <input type="number" value={mashGoals} onChange={e => setMashGoals(e.target.value)} />
        </div>

        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="4-digit PIN"
          value={pin}
          onChange={e => setPin(e.target.value.slice(0, 4))}
        />

        <button onClick={submitMatch}>Submit Match</button>
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
      </div>

      <div className="card">
        <h2>Match History (Last 10)</h2>
        <ul>
          {matches.map(m => (
            <li key={m.id}>
              <span className="badge mwas">Mwas</span> {m.mwasGoals}
              &nbsp;–&nbsp;
              {m.mashGoals} <span className="badge mash">Mash</span>
              <div className="timestamp">
                {new Date(m.timestamp.seconds * 1000).toLocaleString()}
              </div>
              <button className="danger small" onClick={() => deleteMatch(m.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
