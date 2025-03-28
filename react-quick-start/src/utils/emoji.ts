export const getEmoji = (idx: number) => {
  let emoji = '🚀';

  if (idx % 3 === 1) {
    emoji = '👍';
  } else if (idx % 3 === 2) {
    emoji = '👏';
  }

  if (idx === 4) {
    emoji = '🀄️';
  }

  return emoji;
};
