<template>
  <div class="bg-gray-800 rounded-lg p-6 mb-6">
    <h3 class="text-xl font-semibold mb-4">Upload Your Question Set</h3>

    <!-- File Upload -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">
        Question Set (JSON file)
      </label>
      <input ref="fileInput" type="file" accept=".json" @change="handleFileUpload"
        class="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer" />
    </div>

    <!-- Time Limit Setting -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">
        Time per Question (seconds)
      </label>
      <select v-model="timeLimit"
        class="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-400">
        <option value="15">15 seconds</option>
        <option value="20">20 seconds</option>
        <option value="30">30 seconds</option>
        <option value="45">45 seconds</option>
        <option value="60">60 seconds</option>
      </select>
    </div>

    <!-- Upload Status -->
    <div v-if="uploadStatus" class="mb-4">
      <div class="p-3 rounded-lg text-sm"
        :class="uploadStatus.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'">
        {{ uploadStatus.message }}
      </div>
    </div>

    <!-- Questions Preview -->
    <div v-if="questions.length > 0" class="mb-4">
      <h4 class="text-lg font-medium mb-2">
        Questions Preview ({{ questions.length }} questions)
      </h4>
      <div class="max-h-40 overflow-y-auto bg-gray-700 rounded p-3">
        <div v-for="(question, index) in questions.slice(0, 3)" :key="index" class="mb-2 text-sm">
          <strong>{{ index + 1 }}.</strong> {{ question.question.substring(0, 100) }}{{ question.question.length > 100 ?
            '...' : '' }}
        </div>
        <div v-if="questions.length > 3" class="text-gray-400 text-sm">
          ... and {{ questions.length - 3 }} more questions
        </div>
      </div>
    </div>

    <!-- Upload Button -->
    <UButton @click="uploadQuestions" :disabled="questions.length === 0 || uploading" :loading="uploading" size="lg"
      class="w-fit">
      {{ uploading ? 'Uploading...' : 'Upload Questions' }}
    </UButton>

    <!-- Example Format -->
    <details class="mt-4">
      <summary class="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
        Show expected JSON format
      </summary>
      <pre class="mt-2 text-xs bg-gray-900 p-3 rounded overflow-x-auto text-gray-300">{{ exampleFormat }}</pre>
    </details>
  </div>
</template>

<script setup>
const props = defineProps({
  sessionId: {
    type: String,
    required: true
  },
  websocket: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['questions-uploaded'])

const fileInput = ref(null)
const questions = ref([])
const timeLimit = ref(30)
const uploading = ref(false)
const uploadStatus = ref(null)

const exampleFormat = `[
  {
    "question": "What is the capital of France?",
    "options": [
      "London",
      "Paris",
      "Berlin",
      "Madrid"
    ],
    "answer": 1
  }
]`

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  uploadStatus.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result)

      // Validate the JSON structure
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON must be an array of questions')
      }

      for (let i = 0; i < jsonData.length; i++) {
        const q = jsonData[i]
        if (!q.question || !Array.isArray(q.options) ||
          q.options.length < 2 || typeof q.answer !== 'number' ||
          q.answer < 0 || q.answer >= q.options.length) {
          throw new Error(`Invalid question format at index ${i}`)
        }
      }

      questions.value = jsonData
      uploadStatus.value = {
        type: 'success',
        message: `Successfully loaded ${jsonData.length} questions`
      }

    } catch (error) {
      uploadStatus.value = {
        type: 'error',
        message: `Error reading file: ${error.message}`
      }
      questions.value = []
    }
  }

  reader.onerror = () => {
    uploadStatus.value = {
      type: 'error',
      message: 'Error reading file'
    }
  }

  reader.readAsText(file)
}

function uploadQuestions() {
  if (questions.value.length === 0) return

  uploading.value = true
  uploadStatus.value = null

  try {
    props.websocket.send(JSON.stringify({
      type: 'upload_questions',
      data: {
        sessionId: props.sessionId,
        questions: questions.value,
        timeLimit: timeLimit.value
      }
    }))
  } catch (error) {
    uploadStatus.value = {
      type: 'error',
      message: 'Failed to send questions to server'
    }
    uploading.value = false
  }
}

// Listen for upload confirmation from WebSocket
const originalOnMessage = props.websocket.onmessage
props.websocket.onmessage = (event) => {
  const message = JSON.parse(event.data)

  if (message.type === 'questions_uploaded') {
    uploading.value = false
    uploadStatus.value = {
      type: 'success',
      message: `Questions uploaded successfully! ${message.data.questionCount} questions ready.`
    }
    emit('questions-uploaded', {
      count: message.data.questionCount,
      timeLimit: message.data.timeLimit
    })
  } else if (message.type === 'error' && uploading.value) {
    uploading.value = false
    uploadStatus.value = {
      type: 'error',
      message: message.message
    }
  }

  // Call original handler
  if (originalOnMessage) {
    originalOnMessage(event)
  }
}
</script>