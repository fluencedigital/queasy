<template>
  <div class="min-h-screen bg-gray-900 text-gray-100 p-6">
    <div class="max-w-md py-16 lg:py-32 mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-2">
          Join Quiz
        </h1>
        <p class="text-gray-400">Enter a session code or create a new game</p>
      </div>

      <!-- Join Session Form -->
      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Join Existing Session</h2>
        <form @submit.prevent="joinSession" class="space-y-4">
          <div>
            <UInput class="w-full" v-model="joinForm.sessionId" placeholder="Session Code" size="lg" :disabled="connecting" />
          </div>
          <div>
            <UInput class="w-full" v-model="joinForm.playerName" placeholder="Your Name" size="lg" :disabled="connecting" />
          </div>
          <UButton type="submit" block size="lg" :loading="connecting"
            :disabled="!joinForm.sessionId || !joinForm.playerName">
            Join Session
          </UButton>
        </form>
      </div>

      <!-- Create Session Form -->
      <div class="bg-gray-800 rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Create New Session</h2>
        <form @submit.prevent="createSession" class="space-y-4">
          <div>
            <UInput class="w-full" v-model="createForm.sessionName" placeholder="Session Name" size="lg" :disabled="connecting" />
          </div>
          <div>
            <UInput class="w-full" v-model="createForm.playerName" placeholder="Your Name" size="lg" :disabled="connecting" />
          </div>
          <UButton type="submit" block size="lg" variant="outline" :loading="connecting"
            :disabled="!createForm.sessionName || !createForm.playerName">
            Create Session
          </UButton>
        </form>
      </div>

      <!-- Error Display -->
      <UAlert v-if="error" color="red" variant="subtle" :title="error" class="mt-4" @close="error = ''" />

      <!-- Back Link -->
      <div class="text-center mt-8">
        <UButton @click="navigateTo('/')" variant="ghost" size="sm">
          ← Back to Home
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
const joinForm = ref({
  sessionId: '',
  playerName: ''
})

const createForm = ref({
  sessionName: '',
  playerName: ''
})

const connecting = ref(false)
const error = ref('')

async function joinSession() {
  if (connecting.value) return

  connecting.value = true
  error.value = ''

  if (!joinForm.value.sessionId || !joinForm.value.playerName) {
    error.value = 'Please enter both session code and your name'
    connecting.value = false
    return
  }

  // Validate session ID format (e.g., alphanumeric, length)
  const sessionIdPattern = /^[A-Z0-9]{6}$/;
  if (!sessionIdPattern.test(joinForm.value.sessionId)) {
    error.value = 'Invalid session code format. Please use exactly 6 alphanumeric characters.'
    connecting.value = false
    return
  }

  if (!joinForm.value.playerName || joinForm.value.playerName.length < 3 || joinForm.value.playerName.length > 30) {
    error.value = 'Player name must be between 3 and 30 characters long'
    connecting.value = false
    return
  }

  joinForm.value.sessionId = joinForm.value.sessionId.toUpperCase()
  joinForm.value.playerName = encodeURIComponent(joinForm.value.playerName)

  try {
    await navigateTo(`/game?session=${joinForm.value.sessionId}&name=${joinForm.value.playerName}&mode=join`)
  } catch (err) {
    error.value = 'Failed to join session'
    connecting.value = false
  }
}

async function createSession() {
  if (connecting.value) return

  connecting.value = true
  error.value = ''

  try {
    await navigateTo(`/game?sessionName=${encodeURIComponent(createForm.value.sessionName)}&name=${encodeURIComponent(createForm.value.playerName)}&mode=create`)
  } catch (err) {
    error.value = 'Failed to create session'
    connecting.value = false
  }
}

useHead({
  title: 'Join Quiz - Queasy',
  meta: [
    { name: 'description', content: 'Join or create a real-time quiz session' }
  ]
})
</script>