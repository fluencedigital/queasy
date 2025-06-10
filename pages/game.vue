<template>
  <div class="min-h-screen bg-gray-900 py-16 lg:py-32 text-gray-100">
    <!-- Loading State -->
    <div v-if="gameState === 'connecting'" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p class="text-xl">Connecting to game...</p>
      </div>
    </div>

    <!-- Waiting Lobby -->
    <div v-else-if="gameState === 'waiting'" class="p-6">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-5xl font-bold mb-14">The {{ session?.name }} Quiz</h1>
          <div class="bg-gray-800 inline-block px-7 py-5 rounded-lg">
            <p class="text-lg text-gray-400">Session Code</p>
            <p class="text-4xl font-bold text-blue-400">{{ session?.id }}</p>
          </div>
        </div>

        <!-- Question Upload (Host Only) -->
        <QuestionUpload v-if="isHost" :session-id="session?.id" :websocket="ws"
          @questions-uploaded="onQuestionsUploaded" />

        <!-- Questions Status -->
        <div v-if="questionsStatus" class="bg-gray-800 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold">Questions Ready</h3>
              <p class="text-sm text-gray-400">
                {{ questionsStatus.count }} questions, {{ questionsStatus.timeLimit }}s per question
              </p>
            </div>
            <div class="text-green-400">✓</div>
          </div>
        </div>

        <!-- Players List -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">Players ({{ players.length }})</h2>
          <div class="space-y-2">
            <div v-for="player in players" :key="player.id"
              class="flex items-center justify-between bg-gray-700 p-3 rounded">
              <span>{{ player.name }}</span>
              <div class="flex items-center space-x-2">
                <span v-if="player.id === session?.hostId" class="text-yellow-400 text-sm">Host</span>
                <span v-if="player.id === currentPlayer?.id" class="text-green-400 text-sm">You</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Start Game Button (for host) -->
        <div class="text-center">
          <UButton v-if="isHost" @click="startGame" size="lg" :disabled="players.length < 1 || !questionsStatus">
            {{ questionsStatus ? 'Start Game' : 'Upload Questions First' }}
          </UButton>
          <p v-else class="text-gray-400">
            {{ questionsStatus ? 'Waiting for host to start the game...' : 'Waiting for host to upload questions...' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Active Game -->
    <div v-else-if="gameState === 'question'" class="p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Question Header -->
        <div class="text-center mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm text-gray-400">
              Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}
            </div>
            <div class="text-2xl font-bold" :class="timeRemaining <= 5 ? 'text-red-400' : 'text-blue-400'">
              {{ timeRemaining }}s
            </div>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2 mb-6">
            <div class="bg-blue-400 h-2 rounded-full transition-all duration-1000"
              :style="{ width: `${(timeRemaining / timeLimit) * 100}%` }"></div>
          </div>
        </div>

        <!-- Question -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 class="text-2xl font-bold mb-6">{{ currentQuestion?.question }}</h2>
          <div class="grid gap-4">
            <button v-for="(option, index) in currentQuestion?.options" :key="index" @click="selectAnswer(index)"
              :disabled="selectedAnswer !== null || timeRemaining <= 0"
              class="p-4 text-left rounded-lg border-2 transition-all duration-200" :class="getOptionClass(index)">
              <span class="font-semibold mr-3">{{ String.fromCharCode(65 + index) }}.</span>
              <span v-html="option"></span>
            </button>
          </div>
        </div>

        <!-- Players Status -->
        <div class="bg-gray-800 rounded-lg p-4">
          <div class="flex flex-wrap gap-2">
            <div v-for="player in players" :key="player.id" class="px-3 py-1 rounded-full text-sm"
              :class="hasPlayerAnswered(player.id) ? 'bg-green-600' : 'bg-gray-600'">
              {{ player.name }} {{ hasPlayerAnswered(player.id) ? '✓' : '...' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Question Results -->
    <div v-else-if="gameState === 'results'" class="p-6">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold mb-4">Question Results</h2>
        </div>

        <!-- Question Review -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-bold mb-4" v-html="questionResults?.question?.question"></h3>
          <div class="grid gap-3">
            <div v-for="(option, index) in questionResults?.question?.options" :key="index"
              class="p-3 rounded-lg border-2" :class="getResultOptionClass(index)">
              <span class="font-semibold mr-3">{{ String.fromCharCode(65 + index) }}.</span>
              <span v-html="option"></span>
              <span v-if="index === questionResults?.question?.answer" class="ml-2 text-green-400">✓ Correct</span>
            </div>
          </div>
        </div>

        <!-- Player Results -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-bold mb-4">Player Scores</h3>
          <div class="space-y-2">
            <div v-for="result in questionResults?.results" :key="result.playerId"
              class="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div class="flex items-center">
                <span class="mr-3">{{ result.playerName }}</span>
                <span v-if="result.correct" class="text-green-400 text-sm">+{{ result.points }} pts</span>
                <span v-else class="text-red-400 text-sm">+0 pts</span>
              </div>
              <span class="font-bold">{{ result.totalScore }} pts</span>
            </div>
          </div>
        </div>

        <!-- Next Question Countdown -->
        <div class="text-center">
          <p class="text-gray-400">Next question in {{ nextQuestionCountdown }}s...</p>
        </div>
      </div>
    </div>

    <!-- Final Results -->
    <div v-else-if="gameState === 'finished'" class="p-6">
      <div class="max-w-2xl mx-auto text-center">
        <h1 class="text-4xl font-bold mb-8">🎉 Game Finished! 🎉</h1>

        <!-- Leaderboard -->
        <div class="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 class="text-2xl font-bold mb-6">Final Leaderboard</h2>
          <div class="space-y-3">
            <div v-for="(player, index) in leaderboard" :key="player.id"
              class="flex items-center justify-between p-4 rounded-lg"
              :class="index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-gray-600' : index === 2 ? 'bg-orange-600' : 'bg-gray-700'">
              <div class="flex items-center">
                <span class="text-2xl mr-3">
                  {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}` }}
                </span>
                <span class="font-semibold">{{ player.name }}</span>
                <span v-if="player.id === currentPlayer?.id" class="ml-2 text-green-400">(You)</span>
              </div>
              <span class="text-xl font-bold">{{ player.score }} pts</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-4 gap-4">
          <UButton @click="navigateTo('/join')" size="lg">
            Play Again
          </UButton>
          <UButton @click="navigateTo('/')" variant="outline" size="lg">
            Back to Home
          </UButton>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md mx-auto p-6">
        <div class="text-6xl mb-4">❌</div>
        <h2 class="text-2xl font-bold mb-4">Connection Error</h2>
        <p class="text-gray-400 mb-6">{{ error }}</p>
        <UButton @click="navigateTo('/join')">
          Try Again
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const gameState = ref('connecting')
const ws = ref(null)
const error = ref('')

// Game data
const session = ref(null)
const currentPlayer = ref(null)
const players = ref([])
const isHost = ref(false)
const questionsStatus = ref(null)

// Question data
const currentQuestion = ref(null)
const currentQuestionIndex = ref(0)
const totalQuestions = ref(0)
const timeLimit = ref(30)
const timeRemaining = ref(30)
const selectedAnswer = ref(null)
const questionResults = ref(null)
const leaderboard = ref([])

// Timers
const timer = ref(null)
const nextQuestionCountdown = ref(5)
const nextQuestionTimer = ref(null)

onMounted(() => {
  initializeWebSocket()
})

onBeforeUnmount(() => {
  cleanup()
})

function initializeWebSocket() {
  try {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.host}/ws`

    ws.value = new WebSocket(wsUrl)

    ws.value.addEventListener("open", () => {
      console.log('(Client) WebSocket connected')
      handleConnection()
    });

    ws.value.addEventListener("message", async (event) => {
      console.log('(Client) WebSocket message received:', event.data)
      const message = JSON.parse(event.data)
      handleMessage(message)
    });

    ws.value.addEventListener("close", () => {
      console.log('(Client) WebSocket disconnected')
      if (gameState.value !== 'finished') {
        error.value = 'Connection lost'
      }
    });

    ws.value.addEventListener("error", () => {
      console.error('(Client) WebSocket error:', err)
      error.value = 'Failed to connect to game server'
    });

  } catch (err) {
    console.error('(Client) Failed to initialize WebSocket:', err)
    error.value = 'Failed to initialize connection'
  }
}

function handleConnection() {
  const mode = route.query.mode

  if (mode === 'join') {
    // Join existing session
    sendMessage({
      type: 'join_session',
      data: {
        sessionId: route.query.session,
        playerName: route.query.name
      }
    })
  } else if (mode === 'create') {
    // Create new session
    isHost.value = true
    sendMessage({
      type: 'create_session',
      data: {
        sessionName: route.query.sessionName,
        playerName: route.query.name
      }
    })
  } else {
    error.value = 'Invalid game mode'
  }
}

function handleMessage(message) {
  console.log('(Client) Received message:', message)

  switch (message.type) {
    case 'session_created':
      session.value = message.data.session
      currentPlayer.value = message.data.player
      players.value = message.data.players
      gameState.value = 'waiting'
      break

    case 'player_joined':
      session.value = message.data.session
      players.value = message.data.players
      if (!currentPlayer.value) {
        currentPlayer.value = message.data.player
      }
      gameState.value = 'waiting'
      break

    case 'questions_ready':
      if (!isHost.value) {
        questionsStatus.value = {
          count: message.data.questionCount,
          timeLimit: 30 // Default, will be updated when game starts
        }
      }
      break

    case 'question_start':
      currentQuestion.value = message.data.question
      currentQuestionIndex.value = message.data.index
      totalQuestions.value = message.data.total
      timeLimit.value = message.data.timeLimit
      timeRemaining.value = message.data.timeLimit
      selectedAnswer.value = null
      gameState.value = 'question'
      startTimer()
      break

    case 'question_results':
      questionResults.value = message.data
      leaderboard.value = message.data.leaderboard
      gameState.value = 'results'
      clearTimer()
      startNextQuestionCountdown()
      break

    case 'game_finished':
      leaderboard.value = message.data.leaderboard
      gameState.value = 'finished'
      clearTimer()
      break

    case 'player_left':
      players.value = message.data.players
      break

    case 'error':
      error.value = message.message
      break
  }
}

function sendMessage(message) {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify(message))
  }
}

function onQuestionsUploaded(data) {
  questionsStatus.value = data
}

function startGame() {
  if (!questionsStatus.value) {
    error.value = 'Please upload questions first'
    return
  }

  sendMessage({
    type: 'start_game',
    data: {
      sessionId: session.value.id
    }
  })
}

function selectAnswer(answerIndex) {
  if (selectedAnswer.value !== null || timeRemaining.value <= 0) return

  selectedAnswer.value = answerIndex

  sendMessage({
    type: 'submit_answer',
    data: {
      sessionId: session.value.id,
      questionIndex: currentQuestionIndex.value,
      answer: answerIndex,
      timeRemaining: timeRemaining.value
    }
  })
}

function startTimer() {
  clearTimer()
  timer.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      clearTimer()
    }
  }, 1000)
}

function clearTimer() {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

function startNextQuestionCountdown() {
  nextQuestionCountdown.value = 5
  nextQuestionTimer.value = setInterval(() => {
    if (nextQuestionCountdown.value > 0) {
      nextQuestionCountdown.value--
    } else {
      clearInterval(nextQuestionTimer.value)
    }
  }, 1000)
}

function cleanup() {
  [timer, nextQuestionTimer].forEach(t => {
    if (t.value) {
      clearInterval(t.value)
      t.value = null
    }
  })
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close(1000, 'Component unmounting')
  }
}

function getOptionClass(index) {
  if (selectedAnswer.value === null) {
    return 'border-gray-600 hover:border-blue-400 hover:bg-gray-700'
  }
  if (selectedAnswer.value === index) {
    return 'border-blue-400 bg-blue-900'
  }
  return 'border-gray-600 bg-gray-700 opacity-50'
}

function getResultOptionClass(index) {
  const isCorrect = index === questionResults.value?.question?.answer
  const wasSelected = questionResults.value?.results?.find(r => r.playerId === currentPlayer.value?.id)?.answer === index

  if (isCorrect) {
    return 'border-green-400 bg-green-900'
  }
  if (wasSelected && !isCorrect) {
    return 'border-red-400 bg-red-900'
  }
  return 'border-gray-600 bg-gray-700'
}

function hasPlayerAnswered(playerId) {
  return questionResults.value?.results?.some(r => r.playerId === playerId) || false
}

useHead({
  title: 'Game - Queasy',
  meta: [
    { name: 'description', content: 'Real-time quiz game session' }
  ]
})
</script>