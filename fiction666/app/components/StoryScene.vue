<template>
  <div class="scene p-8 bg-black/30 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10">
    <h1 class="text-3xl font-bold mb-4 text-white">{{ scene.title }}</h1>
    <p class="text-lg mb-6 text-gray-200 leading-relaxed">{{ scene.content }}</p>
    <div class="options flex flex-wrap justify-center gap-4">
      <button v-for="option in scene.options" :key="option.nextId" @click="$emit('choose', option.nextId)"
        class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
        {{ option.text }}
      </button>
    </div>
  </div>
</template>

<script setup>
// 使用 defineProps 宏，无需显式导入

defineProps({
  scene: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.scene {
  max-width: 800px;
  margin: 20px auto;
}
</style>
