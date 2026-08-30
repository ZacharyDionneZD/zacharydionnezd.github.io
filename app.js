const NOTES = [
    { id: "C",  name: "Do",       file: "C4.wav" },
    { id: "C#", name: "Do♯",      file: "Csharp4.wav" },
    { id: "D",  name: "Ré",       file: "D4.wav" },
    { id: "D#", name: "Ré♯",      file: "Dsharp4.wav" },
    { id: "E",  name: "Mi",       file: "E4.wav" },
    { id: "F",  name: "Fa",       file: "F4.wav" },
    { id: "F#", name: "Fa♯",      file: "Fsharp4.wav" },
    { id: "G",  name: "Sol",      file: "G4.wav" },
    { id: "G#", name: "Sol♯",     file: "Gsharp4.wav" },
    { id: "A",  name: "La",       file: "A4.wav" },
    { id: "A#", name: "La♯",      file: "Asharp4.wav" },
    { id: "B",  name: "Si",       file: "B4.wav" }
];

let totalQuestions = 100;
let current = 0;
let currentNote = null;
let results = [];
let testNotes = [];

const setup = document.getElementById("setup");
const test = document.getElementById("test");
const resultsBox = document.getElementById("results");

const questionCount = document.getElementById("questionCount");
const answer = document.getElementById("answer");

const startBtn = document.getElementById("startBtn");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

const audio = document.getElementById("audio");
const answerArea = document.getElementById("answerArea");
const progress = document.getElementById("progress");
const message = document.getElementById("message");

function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function generateTest(count) {
    const pool = [];

    while (pool.length < count) {
        pool.push(...shuffle(NOTES));
    }

    return pool.slice(0, count);
}

function startTest() {
    totalQuestions = Number(questionCount.value);
    current = 0;
    results = [];
    testNotes = generateTest(totalQuestions);

    setup.style.display = "none";
    resultsBox.style.display = "none";
    test.style.display = "block";

    loadQuestion();
}

function loadQuestion() {
    currentNote = testNotes[current];

    progress.textContent = `${current + 1} / ${totalQuestions}`;

    answer.value = "";
    answerArea.style.display = "none";
    message.textContent = "";

    audio.src = `sounds/${currentNote.file}`;
    audio.load();

    playBtn.disabled = false;
    playBtn.textContent = "▶ Jouer la note";
}

async function playNote() {
    try {
        audio.currentTime = 0;
        await audio.play();

        answerArea.style.display = "block";
        message.textContent = "";
        answer.focus();
    } catch (error) {
        message.textContent =
            "Impossible de jouer le fichier. Vérifie le nom du fichier et le dossier sounds/.";
        console.error(error);
    }
}

function submitAnswer() {
    const answerValue = answer.value;

    if (!answerValue) {
        message.textContent = "Choisis une réponse avant de continuer.";
        answer.focus();
        return;
    }

    const selectedOption = Array.from(answer.children)
        .find(option => option instanceof AppOption && option.selected);

    results.push({
        question: current + 1,
        expected: currentNote.id,
        expectedName: currentNote.name,
        answer: answerValue,
        answerName: selectedOption?.textContent.trim() ?? "",
        correct: answerValue === currentNote.id
    });

    current++;

    if (current >= totalQuestions) {
        showResults();
    } else {
        loadQuestion();
    }
}

function showResults() {
    test.style.display = "none";
    resultsBox.style.display = "block";

    const correct = results.filter(result => result.correct).length;
    const percentage = Math.round(correct / totalQuestions * 100);

    document.getElementById("score").innerHTML =
        `<strong>${correct} / ${totalQuestions} — ${percentage} %</strong>`;

    const stats = {};

    for (const note of NOTES) {
        stats[note.id] = {
            name: note.name,
            total: 0,
            correct: 0
        };
    }

    for (const result of results) {
        stats[result.expected].total++;

        if (result.correct) {
            stats[result.expected].correct++;
        }
    }

    let table = `
        <table>
            <tr>
                <th>Note</th>
                <th>Correct</th>
                <th>Total</th>
                <th>Précision</th>
            </tr>
    `;

    for (const note of NOTES) {
        const stat = stats[note.id];
        const percentage = stat.total
            ? Math.round(stat.correct / stat.total * 100)
            : 0;

        table += `
            <tr>
                <td>${stat.name}</td>
                <td>${stat.correct}</td>
                <td>${stat.total}</td>
                <td>${percentage} %</td>
            </tr>
        `;
    }

    table += "</table>";
    document.getElementById("byNote").innerHTML = table;

    const mistakes = results.filter(result => !result.correct);

    if (mistakes.length === 0) {
        document.getElementById("mistakes").innerHTML =
            "<p class='ok'>Aucune erreur ! 🎉</p>";
    } else {
        let table2 = `
            <table>
                <tr>
                    <th>#</th>
                    <th>Réponse donnée</th>
                    <th>Bonne réponse</th>
                </tr>
        `;

        for (const result of mistakes) {
            table2 += `
                <tr>
                    <td>${result.question}</td>
                    <td>${result.answerName}</td>
                    <td>${result.expectedName}</td>
                </tr>
            `;
        }

        table2 += "</table>";
        document.getElementById("mistakes").innerHTML = table2;
    }
}

startBtn.addEventListener("click", startTest);
playBtn.addEventListener("click", playNote);
nextBtn.addEventListener("click", submitAnswer);

restartBtn.addEventListener("click", () => {
    resultsBox.style.display = "none";
    setup.style.display = "block";
    questionCount.focus();
});
