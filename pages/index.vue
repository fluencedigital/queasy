<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <div class="flex items-center justify-center py-16 lg:py-32 min-h-screen px-6">
      <div class="text-center max-w-4xl mx-auto">
        <div class="mb-8">
          <h1 class="text-6xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent mb-4">
            Queasy
          </h1>
          <p class="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            Real-time multiplayer quizzes with instant feedback and live competition
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
          <div class="bg-gray-800 p-6 rounded-lg">
            <div class="text-3xl mb-3">⚡</div>
            <h3 class="text-lg font-semibold mb-2">Real-time</h3>
            <p class="text-gray-400 text-sm">Live multiplayer quizzes with instant results and WebSocket technology</p>
          </div>
          <div class="bg-gray-800 p-6 rounded-lg">
            <div class="text-3xl mb-3">🏆</div>
            <h3 class="text-lg font-semibold mb-2">Competitive</h3>
            <p class="text-gray-400 text-sm">Compete with friends and see live leaderboards with scoring based on speed and accuracy</p>
          </div>
          <div class="bg-gray-800 p-6 rounded-lg">
            <div class="text-3xl mb-3">🔢</div>
            <h3 class="text-lg font-semibold mb-2">Math Support</h3>
            <p class="text-gray-400 text-sm">LaTeX rendering for mathematical expressions and STEM questions</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <UButton 
            @click="navigateTo('/join')" 
            class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 hover:scale-105"
            size="xl"
          >
            <Icon name="heroicons:play-circle" class="mr-2" />
            Start Playing
          </UButton>
          
          <UButton 
            @click="navigateTo('/learn')" 
            variant="outline"
            class="border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 hover:scale-105"
            size="xl"
          >
            <Icon name="heroicons:academic-cap" class="mr-2" />
            Solo Practice
          </UButton>
        </div>

        <div class="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-400">WebSocket</div>
            <div class="text-sm text-gray-400">Real-time sync</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-400">Multiplayer</div>
            <div class="text-sm text-gray-400">Up to 10 players</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-400">LaTeX</div>
            <div class="text-sm text-gray-400">Math expressions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-400">Live Scores</div>
            <div class="text-sm text-gray-400">Instant feedback</div>
          </div>
        </div>

        <div class="mt-16 max-w-2xl mx-auto">
          <h2 class="text-2xl font-bold mb-8">How it Works</h2>
          <div class="grid gap-6 md:grid-cols-3">
            <div class="text-center">
              <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span class="text-xl font-bold">1</span>
              </div>
              <h3 class="font-semibold mb-2">Create or Join</h3>
              <p class="text-sm text-gray-400">Start a new session or join with a session code</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span class="text-xl font-bold">2</span>
              </div>
              <h3 class="font-semibold mb-2">Answer Questions</h3>
              <p class="text-sm text-gray-400">Race against time and other players</p>
            </div>
            <div class="text-center">
              <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span class="text-xl font-bold">3</span>
              </div>
              <h3 class="font-semibold mb-2">See Results</h3>
              <p class="text-sm text-gray-400">View live leaderboards and final rankings</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="bottom-0 left-0 right-0 p-6 text-center text-gray-500 text-sm">
      <p>&copy; {{ currentYear }} Queasy. Built for interactive learning and real-time competition. Made by <NuxtLink class="underline hover:text-primary" to="https://fluencesoftware.com">FluenceSoftware</NuxtLink>.</p>
    </footer>
  </div>
</template>

<script setup>
const currentYear = new Date().getFullYear();

useHead({
  title: 'Queasy - Real-time Multiplayer Quizzes',
  meta: [
    { name: 'description', content: 'Real-time multiplayer quizzes with mathematical support, live leaderboards, and instant feedback.' }
  ]
})
</script>