// In-memory storage for game sessions
const sessions = new Map()
const connections = new Map()

// Validation constants
const VALIDATION_RULES = {
  sessionName: { minLength: 1, maxLength: 50 },
  playerName: { minLength: 1, maxLength: 30 },
  sessionId: { length: 6, pattern: /^[A-Z0-9]{6}$/ },
  question: { minLength: 1, maxLength: 500 },
  option: { minLength: 1, maxLength: 200 },
  maxOptions: 6,
  minOptions: 2,
  maxQuestions: 100,
  timeLimit: { min: 5, max: 300 }
}

// Input validation functions
function validateString(value, rules, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }
  
  const trimmed = value.trim()
  if (trimmed.length < rules.minLength) {
    throw new Error(`${fieldName} must be at least ${rules.minLength} characters`)
  }
  if (trimmed.length > rules.maxLength) {
    throw new Error(`${fieldName} must be at most ${rules.maxLength} characters`)
  }
  
  return trimmed
}

function validateSessionId(sessionId) {
  if (typeof sessionId !== 'string') {
    throw new Error('Session ID must be a string')
  }
  if (!VALIDATION_RULES.sessionId.pattern.test(sessionId)) {
    throw new Error('Invalid session ID format')
  }
  return sessionId
}

function validateNumber(value, rules, fieldName) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a number`)
  }
  if (value < rules.min || value > rules.max) {
    throw new Error(`${fieldName} must be between ${rules.min} and ${rules.max}`)
  }
  return value
}

function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    throw new Error('Questions must be an array')
  }
  if (questions.length === 0) {
    throw new Error('At least one question is required')
  }
  if (questions.length > VALIDATION_RULES.maxQuestions) {
    throw new Error(`Maximum ${VALIDATION_RULES.maxQuestions} questions allowed`)
  }
  
  return questions.map((question, index) => {
    if (!question || typeof question !== 'object') {
      throw new Error(`Question ${index + 1} must be an object`)
    }
    
    const validatedQuestion = validateString(
      question.question, 
      VALIDATION_RULES.question, 
      `Question ${index + 1} text`
    )
    
    if (!Array.isArray(question.options)) {
      throw new Error(`Question ${index + 1} options must be an array`)
    }
    if (question.options.length < VALIDATION_RULES.minOptions) {
      throw new Error(`Question ${index + 1} must have at least ${VALIDATION_RULES.minOptions} options`)
    }
    if (question.options.length > VALIDATION_RULES.maxOptions) {
      throw new Error(`Question ${index + 1} must have at most ${VALIDATION_RULES.maxOptions} options`)
    }
    
    const validatedOptions = question.options.map((option, optIndex) => {
      return validateString(
        option, 
        VALIDATION_RULES.option, 
        `Question ${index + 1} option ${optIndex + 1}`
      )
    })
    
    if (typeof question.answer !== 'number' || isNaN(question.answer)) {
      throw new Error(`Question ${index + 1} answer must be a number`)
    }
    if (question.answer < 0 || question.answer >= validatedOptions.length) {
      throw new Error(`Question ${index + 1} answer index is out of range`)
    }
    
    return {
      question: validatedQuestion,
      options: validatedOptions,
      answer: question.answer
    }
  })
}

// Generate unique session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Generate unique player ID
function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15)
}

// Calculate points based on time remaining (max 1000 points)
function calculatePoints(timeRemaining, timeLimit) {
  const timeBonus = Math.floor((timeRemaining / timeLimit) * 500)
  return 500 + timeBonus // Base 500 + time bonus up to 500
}

// Broadcast message to all players in a session
function broadcastToSession(sessionId, message, excludePlayerId = null) {
  const session = sessions.get(sessionId)
  if (!session) return
  
  session.players.forEach(player => {
    if (player.id !== excludePlayerId) {
      const connection = connections.get(player.id)
      if (connection) {
        try {
          connection.send(JSON.stringify(message))
        } catch (error) {
          console.error('Error broadcasting message:', error)
        }
      }
    }
  })
}

// Send message to specific player
function sendToPlayer(playerId, message) {
  const connection = connections.get(playerId)
  console.log('Sending to player:', playerId, 'Connection exists:', !!connection)
  
  if (connection) {
    try {
      const messageStr = JSON.stringify(message)
      console.log('Sending message:', messageStr)
      connection.send(messageStr)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  } else {
    console.log('No connection found for player:', playerId)
  }
}

// Clean up disconnected players
function cleanupPlayer(playerId) {
  const connection = connections.get(playerId)
  if (connection) {
    connections.delete(playerId)
  }
  
  // Find and remove player from all sessions
  for (const [sessionId, session] of sessions.entries()) {
    const playerIndex = session.players.findIndex(p => p.id === playerId)
    if (playerIndex !== -1) {
      const player = session.players[playerIndex]
      session.players.splice(playerIndex, 1)
      
      // If this was the host and there are other players, make the first one host
      if (session.hostId === playerId && session.players.length > 0) {
        session.hostId = session.players[0].id
      }
      
      // If no players left, delete session
      if (session.players.length === 0) {
        sessions.delete(sessionId)
      } else {
        // Notify remaining players
        broadcastToSession(sessionId, {
          type: 'player_left',
          data: {
            players: session.players,
            leftPlayer: player.name
          }
        })
      }
      break
    }
  }
}

// Handle WebSocket messages
function handleMessage(ws, playerId, message) {
  try {
    if (typeof message !== 'string') {
      throw new Error('Message must be a string')
    }
    
    const data = JSON.parse(message)
    console.log('(Server) Received message:', data.type, data.data)
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid message format')
    }
    
    if (typeof data.type !== 'string') {
      throw new Error('Message type must be a string')
    }
    
    if (!data.data || typeof data.data !== 'object') {
      throw new Error('Message data must be an object')
    }
    
    switch (data.type) {
      case 'create_session':
        console.log('Creating session for player:', playerId);
        handleCreateSession(ws, playerId, data.data)
        break
        
      case 'join_session':
        handleJoinSession(ws, playerId, data.data)
        break
        
      case 'upload_questions':
        handleUploadQuestions(ws, playerId, data.data)
        break
        
      case 'start_game':
        handleStartGame(ws, playerId, data.data)
        break
        
      case 'submit_answer':
        handleSubmitAnswer(ws, playerId, data.data)
        break
        
      default:
        throw new Error('Unknown message type')
    }
  } catch (error) {
    console.error('Error handling message:', error)
    sendToPlayer(playerId, {
      type: 'error',
      message: error.message || 'Invalid message format'
    })
  }
}

function handleCreateSession(ws, playerId, data) {
  try {
    const sessionName = validateString(data.sessionName, VALIDATION_RULES.sessionName, 'Session name')
    const playerName = validateString(data.playerName, VALIDATION_RULES.playerName, 'Player name')
    
    const sessionId = generateSessionId()
    const player = {
      id: playerId,
      name: playerName,
      score: 0
    }
    
    const session = {
      id: sessionId,
      name: sessionName,
      hostId: playerId,
      players: [player],
      state: 'waiting',
      questions: [],
      currentQuestionIndex: 0,
      questionStartTime: null,
      timeLimit: 30,
      playerAnswers: new Map(),
      questionTimeout: null
    }
    
    sessions.set(sessionId, session)
    connections.set(playerId, ws)

    console.log(`Session created: ${sessionId} by player: ${playerId}`)
    
    sendToPlayer(playerId, {
      type: 'session_created',
      data: {
        session: {
          id: session.id,
          name: session.name
        },
        player: player,
        players: session.players,
        isHost: true
      }
    })
  } catch (error) {
    sendToPlayer(playerId, {
      type: 'error',
      message: error.message
    })
  }
}

function handleJoinSession(ws, playerId, data) {
  try {
    const sessionId = validateSessionId(data.sessionId)
    const playerName = validateString(data.playerName, VALIDATION_RULES.playerName, 'Player name')
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (session.state !== 'waiting') {
      throw new Error('Game already in progress')
    }
    
    // Check if player name already exists
    if (session.players.some(p => p.name === playerName)) {
      throw new Error('Player name already taken')
    }
    
    const player = {
      id: playerId,
      name: playerName,
      score: 0
    }
    
    session.players.push(player)
    connections.set(playerId, ws)
    
    // Notify all players in session
    broadcastToSession(sessionId, {
      type: 'player_joined',
      data: {
        session: {
          id: session.id,
          name: session.name
        },
        players: session.players,
        newPlayer: player.name
      }
    })
    
    // Send join confirmation to new player
    sendToPlayer(playerId, {
      type: 'player_joined',
      data: {
        session: {
          id: session.id,
          name: session.name
        },
        player: player,
        players: session.players,
        isHost: session.hostId === playerId
      }
    })
  } catch (error) {
    sendToPlayer(playerId, {
      type: 'error',
      message: error.message
    })
  }
}

function handleUploadQuestions(ws, playerId, data) {
  try {
    const sessionId = validateSessionId(data.sessionId)
    const questions = validateQuestions(data.questions)
    const timeLimit = data.timeLimit ? 
      validateNumber(data.timeLimit, VALIDATION_RULES.timeLimit, 'Time limit') : 30
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (session.hostId !== playerId) {
      throw new Error('Only host can upload questions')
    }
    
    session.questions = questions
    session.timeLimit = timeLimit
    
    sendToPlayer(playerId, {
      type: 'questions_uploaded',
      data: {
        questionCount: session.questions.length,
        timeLimit: session.timeLimit
      }
    })
    
    // Notify other players that questions are ready
    broadcastToSession(sessionId, {
      type: 'questions_ready',
      data: {
        questionCount: session.questions.length
      }
    }, playerId)
  } catch (error) {
    sendToPlayer(playerId, {
      type: 'error',
      message: error.message
    })
  }
}

function handleStartGame(ws, playerId, data) {
  try {
    const sessionId = validateSessionId(data.sessionId)
    
    const session = sessions.get(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    
    if (session.hostId !== playerId) {
      throw new Error('Only host can start the game')
    }
    
    if (session.questions.length === 0) {
      throw new Error('No questions uploaded')
    }
    
    session.state = 'playing'
    session.currentQuestionIndex = 0
    
    // Reset all player scores
    session.players.forEach(player => {
      player.score = 0
    })
    
    startQuestion(session)
  } catch (error) {
    sendToPlayer(playerId, {
      type: 'error',
      message: error.message
    })
  }
}

function handleSubmitAnswer(ws, playerId, data) {
  try {
    const sessionId = validateSessionId(data.sessionId)
    
    if (typeof data.questionIndex !== 'number' || isNaN(data.questionIndex)) {
      throw new Error('Question index must be a number')
    }
    
    if (typeof data.answer !== 'number' || isNaN(data.answer)) {
      throw new Error('Answer must be a number')
    }
    
    if (typeof data.timeRemaining !== 'number' || isNaN(data.timeRemaining)) {
      throw new Error('Time remaining must be a number')
    }
    
    const session = sessions.get(sessionId)
    if (!session || session.state !== 'playing') {
      return
    }
    
    if (data.questionIndex !== session.currentQuestionIndex) {
      return // Old question, ignore
    }
    
    if (session.playerAnswers.has(playerId)) {
      return // Already answered
    }
    
    // Validate answer is within valid range
    const currentQuestion = session.questions[session.currentQuestionIndex]
    if (data.answer < 0 || data.answer >= currentQuestion.options.length) {
      return // Invalid answer index
    }
    
    session.playerAnswers.set(playerId, {
      answer: data.answer,
      timeRemaining: Math.max(0, data.timeRemaining) // Ensure non-negative
    })
    
    // Check if all players have answered
    if (session.playerAnswers.size === session.players.length) {
      // Clear the automatic timeout since all players answered
      if (session.questionTimeout) {
        clearTimeout(session.questionTimeout)
        session.questionTimeout = null
      }
      processQuestionResults(session)
    }
  } catch (error) {
    console.error('Error in handleSubmitAnswer:', error)
    // Don't send error back for submit answer to avoid disrupting game flow
  }
}

function startQuestion(session) {
  if (session.currentQuestionIndex >= session.questions.length) {
    endGame(session)
    return
  }
  
  const question = session.questions[session.currentQuestionIndex]
  session.questionStartTime = Date.now()
  session.playerAnswers.clear()
  
  // Send question to all players (without the correct answer)
  const questionData = {
    question: question.question,
    options: question.options
  }
  
  broadcastToSession(session.id, {
    type: 'question_start',
    data: {
      question: questionData,
      index: session.currentQuestionIndex,
      total: session.questions.length,
      timeLimit: session.timeLimit
    }
  })
  
  // Store the timeout ID so we can clear it later
  session.questionTimeout = setTimeout(() => {
    processQuestionResults(session)
  }, session.timeLimit * 1000 + 1000) // Extra second for network delay
}

function processQuestionResults(session) {
  // Clear any existing timeout
  if (session.questionTimeout) {
    clearTimeout(session.questionTimeout)
    session.questionTimeout = null
  }
  
  const question = session.questions[session.currentQuestionIndex]
  const results = []
  
  // Calculate scores for each player
  session.players.forEach(player => {
    const playerAnswer = session.playerAnswers.get(player.id)
    const isCorrect = playerAnswer && playerAnswer.answer === question.answer
    const points = isCorrect ? calculatePoints(playerAnswer.timeRemaining, session.timeLimit) : 0
    
    if (isCorrect) {
      player.score += points
    }
    
    results.push({
      playerId: player.id,
      playerName: player.name,
      answer: playerAnswer ? playerAnswer.answer : null,
      correct: isCorrect,
      points: points,
      totalScore: player.score
    })
  })
  
  // Sort leaderboard by score
  const leaderboard = [...session.players]
    .sort((a, b) => b.score - a.score)
    .map(player => ({
      id: player.id,
      name: player.name,
      score: player.score
    }))
  
  // Send results to all players
  broadcastToSession(session.id, {
    type: 'question_results',
    data: {
      question: question,
      results: results,
      leaderboard: leaderboard
    }
  })
  
  // Move to next question after 5 seconds
  setTimeout(() => {
    session.currentQuestionIndex++
    startQuestion(session)
  }, 5000)
}

function endGame(session) {
  session.state = 'finished'
  
  const leaderboard = [...session.players]
    .sort((a, b) => b.score - a.score)
    .map(player => ({
      id: player.id,
      name: player.name,
      score: player.score
    }))
  
  broadcastToSession(session.id, {
    type: 'game_finished',
    data: {
      leaderboard: leaderboard
    }
  })
}

export class GameDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.connections = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    return new Response('Game server ready', { status: 200 });
  }

  async handleWebSocket(request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const playerId = generatePlayerId();
    this.connections.set(playerId, server);

    server.accept();
    
    // Send welcome message
    server.send(JSON.stringify({
      type: 'welcome',
      data: {
        playerId: playerId,
        message: 'Welcome to the game!'
      }
    }));

    server.addEventListener('message', (event) => {
      this.handleMessage(server, playerId, event.data);
    });

    server.addEventListener('close', () => {
      console.log('WebSocket connection closed:', playerId);
      this.cleanupPlayer(playerId);
    });

    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.cleanupPlayer(playerId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  handleMessage(ws, playerId, message) {
    try {
      if (typeof message !== 'string') {
        throw new Error('Message must be a string')
      }
      
      const data = JSON.parse(message)
      console.log('(Server) Received message:', data.type, data.data)
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid message format')
      }
      
      if (typeof data.type !== 'string') {
        throw new Error('Message type must be a string')
      }
      
      if (!data.data || typeof data.data !== 'object') {
        throw new Error('Message data must be an object')
      }
      
      switch (data.type) {
        case 'create_session':
          console.log('Creating session for player:', playerId);
          this.handleCreateSession(ws, playerId, data.data)
          break
          
        case 'join_session':
          this.handleJoinSession(ws, playerId, data.data)
          break
          
        case 'upload_questions':
          this.handleUploadQuestions(ws, playerId, data.data)
          break
          
        case 'start_game':
          this.handleStartGame(ws, playerId, data.data)
          break
          
        case 'submit_answer':
          this.handleSubmitAnswer(ws, playerId, data.data)
          break
          
        default:
          throw new Error('Unknown message type')
      }
    } catch (error) {
      console.error('Error handling message:', error)
      this.sendToPlayer(playerId, {
        type: 'error',
        message: error.message || 'Invalid message format'
      })
    }
  }

  handleCreateSession(ws, playerId, data) {
    try {
      const sessionName = validateString(data.sessionName, VALIDATION_RULES.sessionName, 'Session name')
      const playerName = validateString(data.playerName, VALIDATION_RULES.playerName, 'Player name')
      
      const sessionId = generateSessionId()
      const player = {
        id: playerId,
        name: playerName,
        score: 0
      }
      
      const session = {
        id: sessionId,
        name: sessionName,
        hostId: playerId,
        players: [player],
        state: 'waiting',
        questions: [],
        currentQuestionIndex: 0,
        questionStartTime: null,
        timeLimit: 30,
        playerAnswers: new Map(),
        questionTimeout: null
      }
      
      this.sessions.set(sessionId, session)

      console.log(`Session created: ${sessionId} by player: ${playerId}`)
      
      this.sendToPlayer(playerId, {
        type: 'session_created',
        data: {
          session: {
            id: session.id,
            name: session.name
          },
          player: player,
          players: session.players,
          isHost: true
        }
      })
    } catch (error) {
      this.sendToPlayer(playerId, {
        type: 'error',
        message: error.message
      })
    }
  }

  handleJoinSession(ws, playerId, data) {
    try {
      const sessionId = validateSessionId(data.sessionId)
      const playerName = validateString(data.playerName, VALIDATION_RULES.playerName, 'Player name')
      
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
      
      if (session.state !== 'waiting') {
        throw new Error('Game already in progress')
      }
      
      // Check if player name already exists
      if (session.players.some(p => p.name === playerName)) {
        throw new Error('Player name already taken')
      }
      
      const player = {
        id: playerId,
        name: playerName,
        score: 0
      }
      
      session.players.push(player)
      
      // Notify all players in session
      this.broadcastToSession(sessionId, {
        type: 'player_joined',
        data: {
          session: {
            id: session.id,
            name: session.name
          },
          players: session.players,
          newPlayer: player.name
        }
      })
      
      // Send join confirmation to new player
      this.sendToPlayer(playerId, {
        type: 'player_joined',
        data: {
          session: {
            id: session.id,
            name: session.name
          },
          player: player,
          players: session.players,
          isHost: session.hostId === playerId
        }
      })
    } catch (error) {
      this.sendToPlayer(playerId, {
        type: 'error',
        message: error.message
      })
    }
  }

  handleUploadQuestions(ws, playerId, data) {
    try {
      const sessionId = validateSessionId(data.sessionId)
      const questions = validateQuestions(data.questions)
      const timeLimit = data.timeLimit ? 
        validateNumber(data.timeLimit, VALIDATION_RULES.timeLimit, 'Time limit') : 30
      
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
      
      if (session.hostId !== playerId) {
        throw new Error('Only host can upload questions')
      }
      
      session.questions = questions
      session.timeLimit = timeLimit
      
      this.sendToPlayer(playerId, {
        type: 'questions_uploaded',
        data: {
          questionCount: session.questions.length,
          timeLimit: session.timeLimit
        }
      })
      
      // Notify other players that questions are ready
      this.broadcastToSession(sessionId, {
        type: 'questions_ready',
        data: {
          questionCount: session.questions.length
        }
      }, playerId)
    } catch (error) {
      this.sendToPlayer(playerId, {
        type: 'error',
        message: error.message
      })
    }
  }

  handleStartGame(ws, playerId, data) {
    try {
      const sessionId = validateSessionId(data.sessionId)
      
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
      
      if (session.hostId !== playerId) {
        throw new Error('Only host can start the game')
      }
      
      if (session.questions.length === 0) {
        throw new Error('No questions uploaded')
      }
      
      session.state = 'playing'
      session.currentQuestionIndex = 0
      
      // Reset all player scores
      session.players.forEach(player => {
        player.score = 0
      })
      
      this.startQuestion(session)
    } catch (error) {
      this.sendToPlayer(playerId, {
        type: 'error',
        message: error.message
      })
    }
  }

  handleSubmitAnswer(ws, playerId, data) {
    try {
      const sessionId = validateSessionId(data.sessionId)
      
      if (typeof data.questionIndex !== 'number' || isNaN(data.questionIndex)) {
        throw new Error('Question index must be a number')
      }
      
      if (typeof data.answer !== 'number' || isNaN(data.answer)) {
        throw new Error('Answer must be a number')
      }
      
      if (typeof data.timeRemaining !== 'number' || isNaN(data.timeRemaining)) {
        throw new Error('Time remaining must be a number')
      }
      
      const session = this.sessions.get(sessionId)
      if (!session || session.state !== 'playing') {
        return
      }
      
      if (data.questionIndex !== session.currentQuestionIndex) {
        return // Old question, ignore
      }
      
      if (session.playerAnswers.has(playerId)) {
        return // Already answered
      }
      
      // Validate answer is within valid range
      const currentQuestion = session.questions[session.currentQuestionIndex]
      if (data.answer < 0 || data.answer >= currentQuestion.options.length) {
        return // Invalid answer index
      }
      
      session.playerAnswers.set(playerId, {
        answer: data.answer,
        timeRemaining: Math.max(0, data.timeRemaining) // Ensure non-negative
      })
      
      // Check if all players have answered
      if (session.playerAnswers.size === session.players.length) {
        // Clear the automatic timeout since all players answered
        if (session.questionTimeout) {
          clearTimeout(session.questionTimeout)
          session.questionTimeout = null
        }
        this.processQuestionResults(session)
      }
    } catch (error) {
      console.error('Error in handleSubmitAnswer:', error)
      // Don't send error back for submit answer to avoid disrupting game flow
    }
  }

  startQuestion(session) {
    if (session.currentQuestionIndex >= session.questions.length) {
      this.endGame(session)
      return
    }
    
    const question = session.questions[session.currentQuestionIndex]
    session.questionStartTime = Date.now()
    session.playerAnswers.clear()
    
    // Send question to all players (without the correct answer)
    const questionData = {
      question: question.question,
      options: question.options
    }
    
    this.broadcastToSession(session.id, {
      type: 'question_start',
      data: {
        question: questionData,
        index: session.currentQuestionIndex,
        total: session.questions.length,
        timeLimit: session.timeLimit
      }
    })
    
    // Store the timeout ID so we can clear it later
    session.questionTimeout = setTimeout(() => {
      this.processQuestionResults(session)
    }, session.timeLimit * 1000 + 1000) // Extra second for network delay
  }

  processQuestionResults(session) {
    // Clear any existing timeout
    if (session.questionTimeout) {
      clearTimeout(session.questionTimeout)
      session.questionTimeout = null
    }
    
    const question = session.questions[session.currentQuestionIndex]
    const results = []
    
    // Calculate scores for each player
    session.players.forEach(player => {
      const playerAnswer = session.playerAnswers.get(player.id)
      const isCorrect = playerAnswer && playerAnswer.answer === question.answer
      const points = isCorrect ? calculatePoints(playerAnswer.timeRemaining, session.timeLimit) : 0
      
      if (isCorrect) {
        player.score += points
      }
      
      results.push({
        playerId: player.id,
        playerName: player.name,
        answer: playerAnswer ? playerAnswer.answer : null,
        correct: isCorrect,
        points: points,
        totalScore: player.score
      })
    })
    
    // Sort leaderboard by score
    const leaderboard = [...session.players]
      .sort((a, b) => b.score - a.score)
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }))
    
    // Send results to all players
    this.broadcastToSession(session.id, {
      type: 'question_results',
      data: {
        question: question,
        results: results,
        leaderboard: leaderboard
      }
    })
    
    // Move to next question after 5 seconds
    setTimeout(() => {
      session.currentQuestionIndex++
      this.startQuestion(session)
    }, 5000)
  }

  endGame(session) {
    session.state = 'finished'
    
    const leaderboard = [...session.players]
      .sort((a, b) => b.score - a.score)
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }))
    
    this.broadcastToSession(session.id, {
      type: 'game_finished',
      data: {
        leaderboard: leaderboard
      }
    })
  }

  // Broadcast message to all players in a session
  broadcastToSession(sessionId, message, excludePlayerId = null) {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    session.players.forEach(player => {
      if (player.id !== excludePlayerId) {
        const connection = this.connections.get(player.id)
        if (connection) {
          try {
            connection.send(JSON.stringify(message))
          } catch (error) {
            console.error('Error broadcasting message:', error)
          }
        }
      }
    })
  }

  // Send message to specific player
  sendToPlayer(playerId, message) {
    const connection = this.connections.get(playerId)
    console.log('Sending to player:', playerId, 'Connection exists:', !!connection)
    
    if (connection) {
      try {
        const messageStr = JSON.stringify(message)
        console.log('Sending message:', messageStr)
        connection.send(messageStr)
      } catch (error) {
        console.error('Error sending message:', error)
      }
    } else {
      console.log('No connection found for player:', playerId)
    }
  }

  // Clean up disconnected players
  cleanupPlayer(playerId) {
    const connection = this.connections.get(playerId)
    if (connection) {
      this.connections.delete(playerId)
    }
    
    // Find and remove player from all sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      const playerIndex = session.players.findIndex(p => p.id === playerId)
      if (playerIndex !== -1) {
        const player = session.players[playerIndex]
        session.players.splice(playerIndex, 1)
        
        // If this was the host and there are other players, make the first one host
        if (session.hostId === playerId && session.players.length > 0) {
          session.hostId = session.players[0].id
        }
        
        // If no players left, delete session
        if (session.players.length === 0) {
          this.sessions.delete(sessionId)
        } else {
          // Notify remaining players
          this.broadcastToSession(sessionId, {
            type: 'player_left',
            data: {
              players: session.players,
              leftPlayer: player.name
            }
          })
        }
        break
      }
    }
  }
}