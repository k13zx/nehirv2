/**
 * NEHİR & BEN - TIC TAC TOE - SHITPOST EDITION
 * Core Game Logic & Online Connectivity
 */

const CONFIG = {
    IMAGES: {
        CORRECT: 'pampa kedi.jpg',
        WRONG: 'soyese.jpg',
        WIN: 'download (1).jpg',
        LOSE: 'Enough said!!.jpg'
    },
    TEXTS: {
        CORRECT: 'CİŞLİ KEDİ GELDİ!',
        WRONG: 'BU NE REZALET?!',
        WIN: 'TEBRİKLER NEHİR! <3',
        LOSE: 'KAYBETTİN... SHITPOST ZAMANI'
    }
};

let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X'; // X starts (Usually local player or room creator)
let isGameActive = true;
let isOnline = false;
let peer = null;
let connection = null;
let myRole = 'X'; // Default for local or creator

const statusDisplay = document.getElementById('current-player');
const cells = document.querySelectorAll('.cell');
const feedbackOverlay = document.getElementById('feedback-overlay');
const feedbackImg = document.getElementById('feedback-img');
const feedbackText = document.getElementById('feedback-text');

// --- GAME LOGIC ---

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (board[clickedCellIndex] !== '' || !isGameActive) return;
    if (isOnline && currentPlayer !== myRole) return; // Prevent playing out of turn online

    // Evaluate move BEFORE making it (Minimax-ish)
    const moveQuality = evaluateMove(clickedCellIndex);

    makeMove(clickedCellIndex, currentPlayer);
    
    // Show feedback based on move quality
    showFeedback(moveQuality);

    if (isOnline && connection) {
        connection.send({ type: 'move', index: clickedCellIndex });
    }
}

function makeMove(index, player) {
    board[index] = player;
    const cell = cells[index];
    cell.classList.add(player.toLowerCase());
    
    checkResult();
}

function checkResult() {
    let roundWon = false;
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        isGameActive = false;
        statusDisplay.innerText = `${currentPlayer} Kazandı!`;
        return;
    }

    if (!board.includes('')) {
        isGameActive = false;
        statusDisplay.innerText = 'Berabere!';
        return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusDisplay.innerText = currentPlayer;
}

// --- EVALUATION (Correct vs Wrong) ---
// Simple version: if move leads to a win or blocks a loss, it's correct.
// If there was a better move available that would have won/blocked, it might be a blunder.
function evaluateMove(index) {
    // 1. If this move wins, it's definitely correct.
    const tempBoard = [...board];
    tempBoard[index] = currentPlayer;
    if (checkWin(tempBoard, currentPlayer)) return 'CORRECT';

    // 2. If the opponent could win on their next turn and we didn't block it (unless we won), then it's wrong.
    const opponent = currentPlayer === 'X' ? 'O' : 'X';
    let opponentCanWin = -1;
    for(let i=0; i<9; i++) {
        if(board[i] === '') {
            const b = [...board];
            b[i] = opponent;
            if(checkWin(b, opponent)) { opponentCanWin = i; break; }
        }
    }

    if (opponentCanWin !== -1 && index !== opponentCanWin) {
        return 'WRONG';
    }

    // Default to correct for simple cases
    return 'CORRECT';
}

function checkWin(b, p) {
    return winningConditions.some(cond => b[cond[0]] === p && b[cond[1]] === p && b[cond[2]] === p);
}

// --- UI FEEDBACK ---
function showFeedback(type) {
    feedbackImg.src = CONFIG.IMAGES[type];
    feedbackText.innerText = CONFIG.TEXTS[type];
    feedbackOverlay.setAttribute('data-type', type);
    
    feedbackOverlay.classList.remove('hidden');
    setTimeout(() => feedbackOverlay.classList.add('visible'), 10);

    setTimeout(() => {
        feedbackOverlay.classList.remove('visible');
        setTimeout(() => feedbackOverlay.classList.add('hidden'), 500);
    }, 1500);
}

// --- ONLINE CONNECTIVITY (PeerJS) ---

function initPeer() {
    peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('Peer ID:', id);
        document.getElementById('room-id').innerText = id;
        document.getElementById('room-display').classList.remove('hidden');
    });

    peer.on('connection', (conn) => {
        connection = conn;
        setupConnection();
        myRole = 'X'; // Creator is X
        isOnline = true;
        alert('Nehir (veya rakip) katıldı! Sen Xsin.');
    });
}

function setupConnection() {
    connection.on('data', (data) => {
        if (data.type === 'move') {
            makeMove(data.index, currentPlayer);
        } else if (data.type === 'reset') {
            resetGame(false);
        }
    });
}

document.getElementById('create-room').addEventListener('click', () => {
    initPeer();
});

document.getElementById('join-room').addEventListener('click', () => {
    const id = document.getElementById('join-room-input').value;
    if (!id) return alert('ID giriniz');
    
    peer = new Peer();
    peer.on('open', () => {
        connection = peer.connect(id);
        connection.on('open', () => {
            setupConnection();
            myRole = 'O'; // Joiner is O
            isOnline = true;
            alert('Odaya katıldın! Sen Osun.');
        });
    });
});

document.getElementById('copy-id').addEventListener('click', () => {
    const id = document.getElementById('room-id').innerText;
    navigator.clipboard.writeText(id);
    alert('Oda ID kopyalandı!');
});

// --- CONTROLLERS ---

function resetGame(sendNotify = true) {
    board = ['', '', '', '', '', '', '', '', ''];
    isGameActive = true;
    currentPlayer = 'X';
    statusDisplay.innerText = 'X';
    cells.forEach(cell => {
        cell.classList.remove('x', 'o');
    });

    if (sendNotify && isOnline && connection) {
        connection.send({ type: 'reset' });
    }
}

document.getElementById('reset-btn').addEventListener('click', () => resetGame(true));
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
