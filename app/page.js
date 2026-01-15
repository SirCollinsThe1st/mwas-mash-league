"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  deleteDoc,
  limit
} from "firebase/firestore";

const teams = ["Mwas", "Mash"];

function emptyTable() {
  return {
    Mwas: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    Mash: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
  };
}

export default function Home() {
  const [table, setTable] = useState(emptyTable());
  const [matches, setMatches] = useState([]);
  const [mwasGoals, setMwasGoals] = useState(0);
  const [mashGoals, setMashGoals] = useState(0);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    async function loadData() {
      const tableSnap = await getDoc(doc(db, "league", "table"));
      if (tableSnap.exists()) setTable(tableSnap.data());

      const q = query(
        collection(db, "league", "matches", "list"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    loadData();
  }, []);

  /* ---------------- SUBMIT MATCH ---------------- */
  async function submitMatch() {
    const updated = { ...table };

    updated.Mwas.played++;
    updated.Mash.played++;

    updated.Mwas.gf += Number(mwasGoals);
    updated.Mwas.ga += Number(mashGoals);
    updated.Mash.gf += Number(mashGoals);
    updated.Mash.ga += Number(mwasGoals);

    if (mwasGoals > mashGoals) {
      updated.Mwas.won++;
      updated.Mwas.points += 3;
      updated.Mash.lost++;
    } else if (mwasGoals < mashGoals) {
      updated.Mash.won++;
      updated.Mash.points += 3;
      updated.Mwas.lost++;
    } else {
      updated.Mwas.drawn++;
      updated.Mash.drawn++;
      updated.Mwas.points++;
      updated.Mash.points++;
    }

    await setDoc(doc(db, "league", "table"), updated);

    // Add new match
    await addDoc(collection(db, "league", "matches", "list"), {
      mwasGoals: Number(mwasGoals),
      mashGoals: Number(mashGoals),
      timestamp: new Date()
    });

    // Enforce max 10 matches
    const q = query(
      collection(db, "league", "matches", "list"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    const excess = snap.docs.slice(10);
    for (const d of excess) {
      await deleteDoc(d.ref);
    }

    // Reload match list
    const limited = snap.docs.slice(0, 10);
    setMatches(limited.map(d => ({ id: d.id, ...d.data() })));

    setTable(updated);
    setMwasGoals(0);
    setMashGoals(0);
  }

  /* ---------------- RESET SEASON ---------------- */
  async function resetSeason() {
    const confirmed = window.confirm(
      "This will reset the season and delete all matches. Continue?"
    );
    if (!confirmed) return;

    await setDoc(doc(db, "league", "table"), emptyTable());

    const snap = await getDocs(collection(db, "league", "matches", "list"));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    setTable(emptyTable());
    setMatches([]);
  }

  /* ---------------- TABLE SORTING ---------------- */
  const sortedTeams = teams
    .map(team => ({
      name: team,
      ...table[team],
      gd: table[team].gf - table[team].ga
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.gd - a.gd;
    });

  /* ---------------- UI ---------------- */
  return (
    <main className="container">
      <h1>Mwas vs Mash League</h1>

      <div className="card">
        <h2>Enter Match</h2>
        <div className="score-row">
          <input type="number" value={mwasGoals} onChange={e => setMwasGoals(e.target.value)} />
          <span className="badge mwas">Mwas</span>
          <strong>vs</strong>
          <span className="badge mash">Mash</span>
          <input type="number" value={mashGoals} onChange={e => setMashGoals(e.target.value)} />
        </div>
        <button className="animate" onClick={submitMatch}>Submit Match</button>
        <button className="danger" onClick={resetSeason}>Reset Season</button>
      </div>

      <div className="card table-card">
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
              {sortedTeams.map((team, index) => (
                <tr key={team.name}>
                  <td>{index + 1}</td>
                  <td>
                    <span className={`badge ${team.name.toLowerCase()}`}>
                      {team.name}
                    </span>
                  </td>
                  <td>{team.played}</td>
                  <td>{team.won}</td>
                  <td>{team.drawn}</td>
                  <td>{team.lost}</td>
                  <td>{team.gf}</td>
                  <td>{team.ga}</td>
                  <td>{team.gd}</td>
                  <td>{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Last 10 Matches</h2>
        <ul>
          {matches.map(m => (
            <li key={m.id}>
              <span className="badge mwas">Mwas</span> {m.mwasGoals}
              &nbsp;–&nbsp;
              {m.mashGoals} <span className="badge mash">Mash</span>
              <div className="timestamp">
                {new Date(m.timestamp.seconds * 1000).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
