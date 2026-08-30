const NOTES = [
    { id: "C",  name: "Do",       file: "C4.opus" },
    { id: "C#", name: "Do♯",      file: "Csharp4.opus" },
    { id: "D",  name: "Ré",       file: "D4.opus" },
    { id: "D#", name: "Ré♯",      file: "Dsharp4.opus" },
    { id: "E",  name: "Mi",       file: "E4.opus" },
    { id: "F",  name: "Fa",       file: "F4.opus" },
    { id: "F#", name: "Fa♯",      file: "Fsharp4.opus" },
    { id: "G",  name: "Sol",      file: "G4.opus" },
    { id: "G#", name: "Sol♯",     file: "Gsharp4.opus" },
    { id: "A",  name: "La",       file: "A4.opus" },
    { id: "A#", name: "La♯",      file: "Asharp4.opus" },
    { id: "B",  name: "Si",       file: "B4.opus" }
];

let totalQuestions = 100;
let current = 0;
let currentNote = null;
let results = [];
let testNotes = [];

const setup = document.getElementById("setup");
const test = document.getElementById("test");
const resultsBox = document.getElementById("results");

const startBtn = document.getElementById("startBtn");
const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");

const audio = document.getElementById("audio");
const answerArea = document.getElementById("answerArea");
const answer = document.getElementById("answer");
const progress = document.getElementById("progress");
const message = document.getElementById("message");

function registerServiceWorker() {
    // Vérifie si le navigateur supporte les Service Workers
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker enregistré avec succès. Scope:', registration.scope);
            })
            .catch(error => {
                console.error('Échec de l\'enregistrement du Service Worker:', error);
            });
        });
    }
}

function getCustomSelect(id) {
    return document.getElementById(id);
}

function getCustomSelectValue(id) {
    return getCustomSelect(id).value;
}

function getCustomSelectLabel(id) {
    const select = getCustomSelect(id);
    const option = Array.from(select.children)
        .find(option =>
            option.tagName.toLowerCase() === "app-option" &&
            option.getAttribute("value") === select.value
        );

    return option?.textContent.trim() ?? "";
}

function setCustomSelectValue(id, value) {
    getCustomSelect(id).value = value;
}

function shuffle(array) {
    const a = [...array];

    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

    return a;
}

function generateTest(count) {
    if (count <= 0) {
        return [];
    }

    // Pour un quiz plus court que le nombre de notes, chaque note ne peut
    // évidemment pas être représentée. On prend simplement des notes
    // différentes et on les mélange.
    if (count < NOTES.length) {
        const test = shuffle(NOTES).slice(0, count);

        // Garantit l'absence de doublon consécutif (ce cas est déjà garanti
        // puisque toutes les notes du tableau sont distinctes).
        return test;
    }

    const test = [];
    const fullCycles = Math.floor(count / NOTES.length);
    const remainder = count % NOTES.length;

    // Chaque cycle contient toutes les notes exactement une fois.
    // On ajuste son premier élément pour éviter une répétition à la
    // jonction avec le cycle précédent.
    for (let cycle = 0; cycle < fullCycles; cycle++) {
        const notes = shuffle(NOTES);

        if (test.length > 0 && notes[0].id === test[test.length - 1].id) {
            const swapIndex = notes.findIndex(
                note => note.id !== test[test.length - 1].id
            );

            [notes[0], notes[swapIndex]] = [notes[swapIndex], notes[0]];
        }

        test.push(...notes);
    }

    // Ajoute le reste du quiz à partir d'un sous-ensemble de notes.
    if (remainder > 0) {
        const notes = shuffle(NOTES).slice(0, remainder);

        if (notes[0].id === test[test.length - 1].id) {
            if (notes.length > 1) {
                const swapIndex = notes.findIndex(
                    note => note.id !== test[test.length - 1].id
                );

                [notes[0], notes[swapIndex]] = [notes[swapIndex], notes[0]];
            } else {
                // Avec un seul emplacement restant, il faut choisir une
                // autre note. Cela n'affecte pas la garantie de couverture :
                // toutes les notes ont déjà été jouées dans les cycles.
                notes[0] = shuffle(
                    NOTES.filter(note => note.id !== test[test.length - 1].id)
                )[0];
            }
        }

        test.push(...notes);
    }

    return test;
}

function startTest() {
    totalQuestions = Number(
        getCustomSelectValue("questionCount")
    );

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
    setCustomSelectValue("answer", "");
    answerArea.style.display = "none";
    message.textContent = "";

    // Important : aucune réponse n'est affichée ici.
    audio.src = "sounds/" + currentNote.file;
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
    } catch (error) {
        message.textContent =
            "Impossible de jouer le fichier.";

        console.error(error);
    }
}

function submitAnswer() {
    if (!getCustomSelectValue("answer")) {
        message.textContent = "Choisis une réponse avant de continuer.";
        return;
    }

    // La réponse réelle n'est révélée nulle part ici.
    results.push({
        question: current + 1,
        expected: currentNote.id,
        expectedName: currentNote.name,
        answer: getCustomSelectValue("answer"),
        answerName: getCustomSelectLabel("answer"),
        correct: getCustomSelectValue("answer") === currentNote.id
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

    const correct = results.filter(r => r.correct).length;
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

registerServiceWorker();

startBtn.addEventListener("click", startTest);
playBtn.addEventListener("click", playNote);
nextBtn.addEventListener("click", submitAnswer);

restartBtn.addEventListener("click", () => {
    resultsBox.style.display = "none";
    setup.style.display = "block";
});

