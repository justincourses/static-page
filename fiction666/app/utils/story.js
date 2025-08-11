import storyData from '../../story.json';

export function getSceneById(id) {
  return storyData.find(scene => scene.id === id);
}
