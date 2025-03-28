import { getEmoji } from '../utils/emoji';

export default function Profile({ idx, user }) {
  const { name, image } = user;

  return (
    <li className="gallery-avatar">
      <img src={image} />
      <h3>{idx + 1}: {name} {getEmoji(idx)}</h3>
    </li>
  );
}
