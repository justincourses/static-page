<template>
  <div class="scene p-6 bg-gray-800 rounded-lg shadow-lg">
    <h1 class="text-3xl font-bold mb-4">{{ scene.title }}</h1>
    <p class="text-lg mb-6">{{ scene.content }}</p>
    <div class="options flex flex-wrap justify-center gap-4">
      <button v-for="option in scene.options" :key="option.nextId" @click="$emit('choose', option.nextId)"
        class="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-yellow-500 transition">
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
