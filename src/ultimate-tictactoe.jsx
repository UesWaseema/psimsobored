import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBGwziIeoKoPEJdr9qwJ23dlp7JVoqJl34",
  authDomain: "ultimate-tic-tac-toe-1d05d.firebaseapp.com",
  projectId: "ultimate-tic-tac-toe-1d05d",
  storageBucket: "ultimate-tic-tac-toe-1d05d.firebasestorage.app",
  messagingSenderId: "305157992111",
  appId: "1:305157992111:web:3d123e8aaf66d20bbe2e5a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helpers
const serialize = (arr) => {
  const result = {};
  arr.forEach((subArr, i) => {
    result[i] = subArr;
  });
  return result;
};

const deserialize = (obj) => {
  return Object.values(obj);
};

// Components
const Square = ({ value, onClick }) => (
  <button className="w-12 h-12 border border-gray-400 text-xl font-bold hover:bg-gray-100 transition" onClick={onClick}>
    {value}
  </button>
);

const Board = ({ squares, onClick }) => (
  <div className="grid grid-cols-3">
    {squares.map((value, i) => (
      <Square key={i} value={value} onClick={() => onClick(i)} />
    ))}
  </div>
);

const MiniBoard = ({ boardIndex, board, onPlay, isActive, winner }) => (
  <div className={`p-1 rounded-md shadow-md ${isActive ? 'bg-yellow-100' : 'bg-white'} ${winner ? 'border-4 border-green-400' : ''}`}>
    <Board
      squares={board}
      onClick={(i) => !winner && isActive && onPlay(boardIndex, i)}
    />
  </div>
);

const checkWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};

const checkMainWinner = (winners) => checkWinner(winners);

const UltimateTicTacToe = () => {
  const [gameId, setGameId] = useState('');
  const [boards, setBoards] = useState(Array(9).fill(null).map(() => Array(9).fill(null)));
  const [winners, setWinners] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [activeBoard, setActiveBoard] = useState(null);
  const [score, setScore] = useState({ X: 0, O: 0 });
  const [mainWinner, setMainWinner] = useState(null);

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, 'games', gameId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBoards(deserialize(data.boards));
        setWinners(data.winners);
        setXIsNext(data.xIsNext);
        setActiveBoard(data.activeBoard);
        setMainWinner(data.mainWinner || null);
        setScore(data.score || { X: 0, O: 0 });
      }
    });
    return () => unsub();
  }, [gameId]);

  const saveGame = async (newBoards, newWinners, nextTurn, newActiveBoard, newMainWinner, updatedScore) => {
    await setDoc(doc(db, 'games', gameId), {
      boards: serialize(newBoards),
      winners: newWinners,
      xIsNext: nextTurn,
      activeBoard: newActiveBoard,
      mainWinner: newMainWinner,
      score: updatedScore
    });
  };

  const handlePlay = (boardIdx, squareIdx) => {
    if (mainWinner || winners[boardIdx] || boards[boardIdx][squareIdx]) return;

    const newBoards = boards.map((b, i) =>
      i === boardIdx ? b.map((s, j) => (j === squareIdx ? (xIsNext ? 'X' : 'O') : s)) : b
    );
    const newWinners = winners.slice();
    newWinners[boardIdx] = checkWinner(newBoards[boardIdx]) || newWinners[boardIdx];

    const newMainWinner = checkMainWinner(newWinners);
    const updatedScore = { ...score };
    if (newMainWinner) updatedScore[newMainWinner] += 1;

    const newActiveBoard =
      !newWinners[squareIdx] && newBoards[squareIdx].includes(null)
        ? squareIdx
        : null;

    saveGame(newBoards, newWinners, !xIsNext, newActiveBoard, newMainWinner, updatedScore);
  };

  const createGame = async () => {
    const newId = prompt('Enter a game ID to create:');
    if (!newId) return;
    const newBoards = Array(9).fill(null).map(() => Array(9).fill(null));
    const newWinners = Array(9).fill(null);
    await setDoc(doc(db, 'games', newId), {
      boards: serialize(newBoards),
      winners: newWinners,
      xIsNext: true,
      activeBoard: null,
      mainWinner: null,
      score: { X: 0, O: 0 }
    });
    setGameId(newId);
  };

  const joinGame = async () => {
    const joinId = prompt('Enter the game ID to join:');
    if (!joinId) return;
    const docSnap = await getDoc(doc(db, 'games', joinId));
    if (docSnap.exists()) {
      setGameId(joinId);
    } else {
      alert('Game not found!');
    }
  };

  const resetGame = async () => {
    if (!gameId) return;
    const resetBoards = Array(9).fill(null).map(() => Array(9).fill(null));
    const resetWinners = Array(9).fill(null);
    await setDoc(doc(db, 'games', gameId), {
      boards: serialize(resetBoards),
      winners: resetWinners,
      xIsNext: true,
      activeBoard: null,
      mainWinner: null,
      score: score
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 bg-gray-50 rounded-lg shadow">
      <h1 className="text-3xl font-bold text-center">Ultimate Tic-Tac-Toe Online</h1>
      {!gameId && (
        <div className="space-x-2 text-center">
          <button onClick={createGame} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Create Game</button>
          <button onClick={joinGame} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Join Game</button>
        </div>
      )}
      {gameId && (
        <>
          <div className="flex justify-between items-center">
            <p>Game ID: <code className="bg-white px-2 py-1 rounded text-sm border">{gameId}</code></p>
            <p className="font-medium">Next player: <span className="font-bold">{xIsNext ? 'X' : 'O'}</span></p>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded shadow-inner">
            {boards.map((board, i) => (
              <MiniBoard
                key={i}
                boardIndex={i}
                board={board}
                onPlay={handlePlay}
                isActive={activeBoard === null || activeBoard === i}
                winner={winners[i]}
              />
            ))}
          </div>
          {mainWinner && <p className="text-xl text-center font-bold text-green-600">🏆 Winner of this game: {mainWinner}</p>}
          <div className="text-center mt-4">
            <h2 className="text-lg font-semibold mb-2">Scoreboard</h2>
            <div className="inline-flex gap-6 text-base">
              <span className="bg-gray-200 px-4 py-1 rounded">X: {score.X}</span>
              <span className="bg-gray-200 px-4 py-1 rounded">O: {score.O}</span>
            </div>
          </div>
          <div className="text-center mt-4 space-x-2">
            <button onClick={resetGame} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">New Game (Same ID)</button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Leave</button>
          </div>
        </>
      )}
    </div>
  );
};

export default UltimateTicTacToe;
