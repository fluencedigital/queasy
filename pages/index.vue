<template>
    <div class="flex h-screen bg-gray-900 text-gray-100">
        <div class="flex-3 flex justify-center items-center p-4">
            <div class="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl">
                <h2 class="text-2xl font-bold mb-2 text-center">{{ config.name }}</h2>
                <p class="text-center text-gray-400 mb-6">{{ config.description }}</p>
                <div v-if="currentQuestion">
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <div class="prose prose-invert prose-headings:text-2xl prose-headings:font-bold"
                                v-html="renderMath(currentQuestion.question)"></div>
                            <UButton icon="i-mdi-flag" color="yellow" variant="ghost" @click="toggleFlag()"
                                :class="{'text-yellow-400': flaggedQuestions.has(currentQuestion.originalIndex)}">
                            </UButton>
                        </div>
                        <ul class="space-y-4">
                            <li v-for="(opt, i) in currentQuestion.options" :key="i">
                                <div @click="!feedback && selectAnswer(i)"
                                    class="w-full text-left px-4 py-3 rounded-lg cursor-pointer border transition"
                                    :class="{
                                        'bg-green-700 border-green-500': feedback === 'correct' && selected === i,
                                        'bg-red-700 border-red-500': feedback === 'incorrect' && selected === i,
                                        'hover:bg-gray-700 border-gray-600': !feedback
                                    }">
                                    <span class="prose prose-invert" v-html="renderMath(opt)"></span>
                                </div>
                            </li>
                        </ul>
                        <div v-if="feedback" class="text-center">
                            <span v-if="feedback === 'correct'"
                                class="text-green-400 text-lg font-semibold mr-4">:D</span>
                            <span v-else class="text-red-400 text-lg font-semibold mr-4">:(</span>
                            <UButton
                                class="mt-4 inline-block cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg"
                                @click="nextQuestion()">
                                Następne pytanie
                            </UButton>
                        </div>
                    </div>
                </div>
                <div v-else class="text-center text-xl">
                    <p>Koniec pytań!</p>
                    <p class="text-gray-400">Wynik: {{ questions.length - wrongAnswers.size }} / {{ questions.length }}</p>
                    <div class="mt-6 flex flex-row gap-4">
                        <UButton class="w-full bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg"
                            @click="resetQuiz('all')">
                            Zacznij od początku
                        </UButton>
                        <UButton v-if="wrongAnswers.size > 0"
                            class="w-full bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg"
                            @click="resetQuiz('wrong')">
                            Powtórz pytania z błędami ({{ wrongAnswers.size }})
                        </UButton>
                        <UButton v-if="flaggedQuestions.size > 0"
                            class="w-full bg-yellow-600 hover:bg-yellow-500 text-white px-5 py-2 rounded-lg"
                            @click="resetQuiz('flagged')">
                            Powtórz oflagowane pytania ({{ flaggedQuestions.size }})
                        </UButton>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex-1 bg-gray-800 p-6 border-l border-gray-700 overflow-auto sticky top-0">
            <h3 class="text-xl font-semibold mb-4">Notes</h3>
            <UPopover mode="hover" class="absolute top-4 right-4">
                <template #content>
                    <div class="text-sm bg-neutral-800 p-4 rounded-lg text-white">
                        <p class="mb-2">Użyj <code>$\LaTeX$</code> do zapisu wzorów matematycznych.</p>
                        <p class="mb-2">Notatki są automatycznie zapisywane w lokalnej pamięci przeglądarki.</p>
                        <p class="mb-2">Możesz pobrać swoje notatki jako plik .md.</p>
                    </div>
                </template>
                <span class="text-gray-400 cursor-pointer">?</span>
            </UPopover>
            <textarea v-model="note" placeholder="Probably something important..."
                class="w-full h-40 bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 mb-4 resize-y"></textarea>
            <div v-if="note" class="prose prose-invert prose-headings:text-2xl prose-headings:font-bold bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4 max-h-60 overflow-auto"
                v-html="renderMath(note)"></div>
            <div class="flex justify-end">
                <UButton icon="i-mdi-download" variant="ghost" color="white" class="w-fit px-4 py-2 rounded-lg"
                    @click="downloadNotes">
                </UButton>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import mathjax3 from 'markdown-it-mathjax3';

const md = MarkdownIt({ html: true }).use(mathjax3);
const questions = ref([]);
const current = ref(0);
const selected = ref(null);
const feedback = ref('');
const note = ref('');
const wrongAnswers = ref(new Set());
const flaggedQuestions = ref(new Set());
const originalQuestions = ref([]);

const config = ref({ name: '', description: '' });

const loadConfig = async () => {
    const res = await fetch('/config.json');
    config.value = await res.json();
};

const loadQuestions = async () => {
    const res = await fetch('/questions.json');
    originalQuestions.value = await res.json();
    console.log('Loaded questions:', originalQuestions.value);
    resetQuiz('all');
}

const currentQuestion = computed(() => questions.value[current.value] || null);

function selectAnswer(i) {
    console.log(`Selected answer: ${i}, Correct answer: ${currentQuestion.value.answer}`);
    selected.value = i;
    const isCorrect = i === currentQuestion.value.answer;
    feedback.value = isCorrect ? 'correct' : 'incorrect';

    if (!isCorrect) {
        wrongAnswers.value.add(currentQuestion.value.originalIndex);
    }
}

function nextQuestion() {
    selected.value = null;
    feedback.value = '';
    current.value++;
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/[&<>"']/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];
    });
}

function renderMath(text) {
    if (typeof text === 'string') {
        return md.render(escapeHtml(text));
    }
    console.warn('renderMath received non-string input:', text);
    return '';
}

function downloadNotes() {
    const blob = new Blob([note.value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `notatki-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function resetQuiz(mode) {
    selected.value = null;
    feedback.value = '';
    current.value = 0;
    let selectedIndices = [];
    
    if (mode === 'all') {
        // All questions
        selectedIndices = [...Array(originalQuestions.value.length).keys()];
        wrongAnswers.value.clear();
        flaggedQuestions.value.clear();
    } else if (mode === 'wrong') {
        // Only wrong questions
        selectedIndices = Array.from(wrongAnswers.value);
        wrongAnswers.value.clear();
    } else if (mode === 'flagged') {
        // Only flagged questions
        selectedIndices = Array.from(flaggedQuestions.value);
    }

    selectedIndices = shuffleArray(selectedIndices);

    questions.value = selectedIndices.map(index => {
        const question = JSON.parse(JSON.stringify(originalQuestions.value[index]));
        const correctAnswer = question.options[question.answer];
        question.options = shuffleArray(question.options);
        question.answer = question.options.indexOf(correctAnswer);
        question.originalIndex = index;
        return question;
    });
}

function toggleFlag() {
    const originalIndex = currentQuestion.value.originalIndex;
    if (flaggedQuestions.value.has(originalIndex)) {
        flaggedQuestions.value.delete(originalIndex);
    } else {
        flaggedQuestions.value.add(originalIndex);
    }
}

onMounted(() => {
    loadConfig();
    loadQuestions();
    note.value = localStorage.getItem('quiz-notes') || '';
})

watch(note, (val) => {
    localStorage.setItem('quiz-notes', val);
}, { flush: 'post' });
</script>