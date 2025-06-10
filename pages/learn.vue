<template>
    <div class="flex h-screen bg-gray-900 text-gray-100">
        <!-- Quiz Selection Screen -->
        <div v-if="!quizSelected" class="flex-1 flex justify-center items-center p-4">
            <div class="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-4xl">
                <h2 class="text-3xl font-bold mb-2 text-center">Choose Your Quiz</h2>
                <p class="text-center text-gray-400 mb-8">Select a premade quiz or upload your own</p>
                
                <!-- Premade Quizzes -->
                <div class="mb-8">
                    <h3 class="text-xl font-semibold mb-4">Premade Quizzes</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div v-for="quiz in premadeQuizzes" :key="quiz.id"
                            @click="selectPremadeQuiz(quiz)"
                            class="bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition border border-gray-600 hover:border-blue-500">
                            <h4 class="font-semibold text-lg mb-2">{{ quiz.name }}</h4>
                            <p class="text-gray-400 text-sm mb-2">{{ quiz.description }}</p>
                            <p class="text-blue-400 text-sm">{{ quiz.questionCount }} questions</p>
                        </div>
                    </div>
                </div>

                <!-- Upload Custom Quiz -->
                <div class="border-t border-gray-700 pt-8">
                    <h3 class="text-xl font-semibold mb-4">Upload Custom Quiz</h3>
                    <div class="bg-gray-700 p-6 rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 transition">
                        <input type="file" @change="handleFileUpload" accept=".json" class="hidden" ref="fileInput">
                        <div @click="$refs.fileInput.click()" class="text-center cursor-pointer">
                            <div class="text-4xl mb-4">📁</div>
                            <p class="text-lg mb-2">Click to upload JSON file</p>
                            <p class="text-gray-400 text-sm">Upload your custom quiz in JSON format</p>
                        </div>
                    </div>
                    
                    <!-- JSON Format Info -->
                    <div class="mt-4 p-4 bg-gray-700 rounded-lg">
                        <p class="text-sm text-gray-300 mb-2">Expected JSON format:</p>
                        <pre class="text-xs text-gray-400 bg-gray-800 p-2 rounded overflow-x-auto">
{
  "name": "Quiz Name",
  "description": "Quiz Description",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": 0
    }
  ]
}</pre>
                    </div>
                </div>

                <div v-if="uploadError" class="mt-4 p-4 bg-red-800 text-red-200 rounded-lg">
                    {{ uploadError }}
                </div>
            </div>
        </div>

        <!-- Main Quiz Interface -->
        <div v-else class="flex-3 flex justify-center items-center p-4">
            <div class="bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl">
                <!-- Back Button -->
                <div class="flex justify-between items-center mb-4">
                    <UButton icon="i-mdi-arrow-left" variant="ghost" color="gray" @click="goBackToSelection">
                        Back to Quiz Selection
                    </UButton>
                </div>
                
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
        
        <!-- Notes Panel -->
        <div v-if="quizSelected" class="flex-1 bg-gray-800 p-6 border-l border-gray-700 overflow-auto sticky top-0">
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
const quizSelected = ref(false);
const uploadError = ref('');

const premadeQuizzes = ref([
    {
        id: 'math-basics',
        name: 'Math Basics',
        description: 'Basic mathematics questions',
        questionCount: 20,
        file: '/questions.json'
    },
    {
        id: 'science',
        name: 'General Science',
        description: 'Physics, Chemistry, and Biology',
        questionCount: 15,
        file: '/science-questions.json'
    },
    {
        id: 'history',
        name: 'World History',
        description: 'Historical events and figures',
        questionCount: 25,
        file: '/history-questions.json'
    }
]);

const config = ref({ name: '', description: '' });

const loadQuestions = async () => {
    const res = await fetch('/questions.json');
    const data = await res.json();
    
    if (Array.isArray(data)) {
        originalQuestions.value = data;
        config.value = { name: 'Default Quiz', description: 'Default quiz questions' };
    } else {
        originalQuestions.value = data.questions || [];
        config.value = { 
            name: data.name || 'Default Quiz', 
            description: data.description || 'Default quiz questions' 
        };
    }
    
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

const selectPremadeQuiz = async (quiz) => {
    try {
        const res = await fetch(quiz.file);
        if (!res.ok) {
            // Fallback to default questions.json if premade quiz file doesn't exist
            const fallbackRes = await fetch('/questions.json');
            const fallbackData = await fallbackRes.json();
            if (Array.isArray(fallbackData)) {
                originalQuestions.value = fallbackData;
                config.value = { name: quiz.name, description: quiz.description };
            } else {
                originalQuestions.value = fallbackData.questions || [];
                config.value = { 
                    name: fallbackData.name || quiz.name, 
                    description: fallbackData.description || quiz.description 
                };
            }
        } else {
            const data = await res.json();
            if (Array.isArray(data)) {
                originalQuestions.value = data;
                config.value = { name: quiz.name, description: quiz.description };
            } else {
                originalQuestions.value = data.questions || [];
                config.value = { 
                    name: data.name || quiz.name, 
                    description: data.description || quiz.description 
                };
            }
        }
        console.log('Loaded questions:', originalQuestions.value);
        resetQuiz('all');
        quizSelected.value = true;
        uploadError.value = '';
    } catch (error) {
        console.error('Error loading quiz:', error);
        uploadError.value = 'Error loading quiz. Please try again.';
    }
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Add file size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
        uploadError.value = 'File too large. Maximum size is 5MB.';
        return;
    }

    // Ensure it's a JSON file
    if (!file.name.toLowerCase().endsWith('.json')) {
        uploadError.value = 'Please upload a JSON file.';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Enhanced validation
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid JSON: Root must be an object');
            }
            
            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid format: questions array is required');
            }
            
            if (data.questions.length === 0) {
                throw new Error('Quiz must contain at least one question');
            }
            
            if (data.questions.length > 1000) {
                throw new Error('Too many questions. Maximum is 1000.');
            }
            
            // Validate each question with string length limits
            for (let i = 0; i < data.questions.length; i++) {
                const q = data.questions[i];
                
                if (!q.question || typeof q.question !== 'string' || q.question.length > 2000) {
                    throw new Error(`Invalid or too long question at index ${i}`);
                }
                
                if (!q.options || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10) {
                    throw new Error(`Invalid options array at question ${i} (must have 2-10 options)`);
                }
                
                if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
                    throw new Error(`Invalid answer index at question ${i}`);
                }
                
                // Validate option strings
                for (let j = 0; j < q.options.length; j++) {
                    if (typeof q.options[j] !== 'string' || q.options[j].length > 1000) {
                        throw new Error(`Invalid or too long option at question ${i}, option ${j}`);
                    }
                }
            }
            
            // Validate name and description if present
            if (data.name && (typeof data.name !== 'string' || data.name.length > 200)) {
                throw new Error('Quiz name must be a string with max 200 characters');
            }
            
            if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
                throw new Error('Quiz description must be a string with max 500 characters');
            }
            
            originalQuestions.value = data.questions;
            config.value = {
                name: data.name || 'Custom Quiz',
                description: data.description || 'Uploaded custom quiz'
            };
            
            console.log('Loaded custom questions:', originalQuestions.value);
            resetQuiz('all');
            quizSelected.value = true;
            uploadError.value = '';
            
        } catch (error) {
            console.error('Error parsing JSON:', error);
            uploadError.value = `Error parsing file: ${error.message}`;
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
};

const goBackToSelection = () => {
    quizSelected.value = false;
    current.value = 0;
    selected.value = null;
    feedback.value = '';
    wrongAnswers.value.clear();
    flaggedQuestions.value.clear();
    uploadError.value = '';
};

onMounted(() => {
    // Remove automatic loading, let user choose
    note.value = localStorage.getItem('quiz-notes') || '';
})

watch(note, (val) => {
    localStorage.setItem('quiz-notes', val);
}, { flush: 'post' });
</script>