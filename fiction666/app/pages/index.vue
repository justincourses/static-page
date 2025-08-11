<template>
  <div class="story-container">
    <StoryScene :scene="currentScene" @choose="handleChoice" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import StoryScene from '../components/StoryScene.vue';
import storyData from '../../story.json';

const currentScene = ref(storyData[0]);

function handleChoice(nextId) {
  const nextScene = storyData.find(scene => scene.id === nextId);
  if (nextScene) {
    currentScene.value = nextScene;
  }
}
</script>

<style scoped>
.story-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f0f0f0;
  padding: 20px;
}
</style>
